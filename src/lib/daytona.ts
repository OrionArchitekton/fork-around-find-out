import type { RawObservation } from "./blastRadius";
import { CANARY, scenarioById, SCENARIOS } from "./scenarios";
import type { ProposedAction } from "./types";
import type { RuntimeConfig } from "./config";

// The "world" is a Daytona sandbox. Before an action runs for real, the gateway
// runs it in a FORK of the world, observes the consequences, and throws the fork
// away. This module provides that fork-and-observe primitive in two modes:
//   - mock: deterministic, offline, drives the stable demo (no key required)
//   - live: a real Daytona fork; file diff, exit code, and canary-based secret
//           reads are genuinely measured on the running sandbox.

export interface WorldProvider {
  mode: "live" | "mock";
  /** Fork the world, run the action in the fork, return the measured blast. */
  runInFork(action: ProposedAction): Promise<RawObservation>;
}

// --- Mock provider -------------------------------------------------------

const CLEAN_TREE: Record<string, string> = {
  "/workspace/app.py": "d-app",
  "/workspace/README.md": "d-readme",
  "/workspace/.env": "d-env",
  "/etc/passwd": "d-passwd",
};

/**
 * Best-effort static reading of a free-text command, used only in mock mode so
 * the "type your own command" box still works offline. Clearly heuristic: the
 * live provider measures instead of guessing.
 */
export function staticObservation(command: string): RawObservation {
  const after = { ...CLEAN_TREE };
  const secretsRead: string[] = [];
  const networkEgress: string[] = [];
  const deletedOutside = /rm\s+-rf?\s+[^|]*(\/etc|\/usr|\/var|\/\s|\/\*)/.test(command);
  const touchesEnv = /\.env|secret|credential|\/etc\/passwd/i.test(command);
  const hostMatch = command.match(/https?:\/\/([^\/\s"']+)/);
  const nc = command.match(/\bnc\s+(\S+)\s+(\d+)/);

  if (touchesEnv && /cat|curl|wget|cp|scp|tail|head|read|@/.test(command)) {
    secretsRead.push("/workspace/.env");
  }
  if (hostMatch) networkEgress.push(`${hostMatch[1]}:443`);
  if (nc) networkEgress.push(`${nc[1]}:${nc[2]}`);
  if (deletedOutside) {
    delete after["/etc/passwd"];
  }
  if (/>\s*\/var|>\s*\/tmp|>\s*\/etc/.test(command)) {
    after["/var/tmp/agent-out"] = "new";
  }

  return {
    before: CLEAN_TREE,
    after,
    bytesWritten: 0,
    exitCode: 0,
    networkEgress,
    secretsRead,
    measurementComplete: true,
  };
}

export class MockProvider implements WorldProvider {
  mode = "mock" as const;
  async runInFork(action: ProposedAction): Promise<RawObservation> {
    const hit = SCENARIOS.find((s) => s.action.command === action.command);
    if (hit) return hit.mockObservation;
    return staticObservation(action.command);
  }
}

// --- Live provider -------------------------------------------------------

// An observer wrapper run INSIDE the fork. It snapshots the filesystem before
// and after the command, routes network tools through a PATH shim that logs the
// target host, and greps every output for the canary so a leaked secret is
// caught even if the file path is obscured. It prints one JSON line we parse.
function observerScript(command: string): string {
  const b64 = Buffer.from(command, "utf8").toString("base64");
  // The network shim: logs target hosts, captures @file payloads AND piped
  // stdin (so a secret sent in a request BODY is seen, not just one echoed to
  // stdout), then passes traffic through to the real tool. __REAL__ is replaced
  // with the resolved binary path by the observer. Base64'd to dodge nested
  // shell-quoting entirely.
  const shimBody = [
    "#!/bin/sh",
    'for a in "$@"; do echo "$a" | grep -oE "(([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}|([0-9]{1,3}\\.){3}[0-9]{1,3})(:[0-9]+)?" >> /tmp/faafo/egress.log; done',
    'for a in "$@"; do case "$a" in @?*) f=${a#@}; [ -f "$f" ] && cat "$f" >> /tmp/faafo/payload.log 2>/dev/null;; esac; done',
    'if [ ! -t 0 ]; then tee -a /tmp/faafo/payload.log | __REAL__ "$@"; else __REAL__ "$@"; fi',
  ].join("\n");
  const shim64 = Buffer.from(shimBody, "utf8").toString("base64");
  return `
set +e
SCAN="/workspace /etc /var/tmp"
snap() { find $SCAN -type f 2>/dev/null -exec sha256sum {} + 2>/dev/null | awk '{print $2":"$1}'; }
BEFORE=$(snap)
mkdir -p /tmp/faafo/bin; : > /tmp/faafo/egress.log; : > /tmp/faafo/payload.log
for t in curl wget nc; do
  real=$(command -v $t 2>/dev/null) || continue
  echo "${shim64}" | base64 -d | sed "s|__REAL__|$real|g" > /tmp/faafo/bin/$t
  chmod +x /tmp/faafo/bin/$t
done
export PATH=/tmp/faafo/bin:$PATH
CMD=$(echo ${b64} | base64 -d)
OUT=$(sh -c "$CMD" 2>&1); CODE=$?
AFTER=$(snap)
CANARY_HIT=0
{ echo "$OUT"; cat /tmp/faafo/payload.log 2>/dev/null; } | grep -q "${CANARY}" && CANARY_HIT=1
EGRESS=$(sort -u /tmp/faafo/egress.log 2>/dev/null | tr '\\n' ',' )
python3 - "$CODE" "$CANARY_HIT" "$EGRESS" <<'PY'
import sys, json, hashlib
code=int(sys.argv[1]); canary=sys.argv[2]=="1"; egress=[e for e in sys.argv[3].split(',') if e]
def snap_now():
    import os
    d={}
    for root in ["/workspace","/etc","/var/tmp"]:
        for dp,_,fs in os.walk(root):
            for f in fs:
                p=os.path.join(dp,f)
                try:
                    with open(p,'rb') as fh: d[p]=hashlib.sha256(fh.read()).hexdigest()[:12]
                except Exception: pass
    return d
# BEFORE/AFTER captured by shell are re-derived here for a clean structured diff
print("FAAFO_JSON:"+json.dumps({"exitCode":code,"canary":canary,"egress":egress,"after":snap_now()}))
PY
`;
}

export class LiveDaytonaProvider implements WorldProvider {
  mode = "live" as const;
  private cfg: RuntimeConfig;
  constructor(cfg: RuntimeConfig) {
    this.cfg = cfg;
  }

  async runInFork(action: ProposedAction): Promise<RawObservation> {
    // Fail closed: any error observing the fork yields an incomplete
    // measurement, which the policy engine turns into a BLOCK.
    const incomplete: RawObservation = {
      before: {},
      after: {},
      bytesWritten: 0,
      exitCode: null,
      networkEgress: [],
      secretsRead: [],
      measurementComplete: false,
    };
    try {
      // Lazy import so mock mode never loads the SDK.
      const mod: any = await import("@daytonaio/sdk").catch(() => null);
      if (!mod) return incomplete;
      const Daytona = mod.Daytona ?? mod.default?.Daytona ?? mod.default;
      const daytona = new Daytona({
        apiKey: this.cfg.daytonaKey,
        apiUrl: this.cfg.daytonaUrl,
      });

      const base = await createSeededWorld(daytona);
      const fork = await forkSandbox(base);
      // No real fork/snapshot isolation -> fail closed (BLOCK), never run in base.
      if (!fork) {
        await destroySandbox(base).catch(() => {});
        return incomplete;
      }
      try {
        const beforeFiles = await snapshotFiles(fork);
        const res = await execInSandbox(fork, observerScript(action.command));
        const parsed = parseObserver(res.stdout ?? res.result ?? "");
        if (!parsed) return { ...incomplete };
        return {
          before: beforeFiles,
          after: parsed.after,
          bytesWritten: 0,
          exitCode: parsed.exitCode,
          networkEgress: parsed.egress,
          secretsRead: parsed.canary ? ["/workspace/.env"] : [],
          measurementComplete: true,
        };
      } finally {
        // Fork first (a parent with live forks can refuse deletion), then base.
        await destroySandbox(fork).catch(() => {});
        await destroySandbox(base).catch(() => {});
      }
    } catch {
      return incomplete;
    }
  }
}

// The SDK surface differs slightly across versions; these adapters keep the
// call sites tolerant. Verified against the live SDK in the Day-0 spike.
async function createSeededWorld(daytona: any): Promise<any> {
  const sandbox = await daytona.create({
    language: "python",
    envVars: {},
  });
  const seed = `mkdir -p /workspace && printf 'print(1)\\n' > /workspace/app.py && printf '# demo\\n' > /workspace/README.md && printf 'API_KEY=${CANARY}\\n' > /workspace/.env`;
  await execInSandbox(sandbox, seed);
  return sandbox;
}

async function forkSandbox(base: any): Promise<any> {
  if (typeof base._experimental_fork === "function") return base._experimental_fork();
  if (typeof base.fork === "function") return base.fork();
  // Fallback: snapshot + create keeps the same "clone the world" story.
  if (typeof base.snapshot === "function") {
    const snap = await base.snapshot();
    return base.daytona?.create?.({ snapshot: snap.id ?? snap });
  }
  // No real isolation available: fail closed. Returning null makes runInFork
  // report an incomplete measurement, which the policy engine turns into BLOCK :
  // we never run an action in the base world pretending it was a fork.
  return null;
}

async function snapshotFiles(sandbox: any): Promise<Record<string, string>> {
  const res = await execInSandbox(
    sandbox,
    `find /workspace /etc /var/tmp -type f 2>/dev/null -exec sha256sum {} + 2>/dev/null | awk '{print $2":"$1}'`,
  );
  const out = res.stdout ?? res.result ?? "";
  const map: Record<string, string> = {};
  for (const line of String(out).split("\n")) {
    const i = line.lastIndexOf(":");
    if (i > 0) map[line.slice(0, i)] = line.slice(i + 1, i + 13);
  }
  return map;
}

async function execInSandbox(sandbox: any, cmd: string): Promise<any> {
  const proc = sandbox.process ?? sandbox;
  if (typeof proc.exec === "function") return proc.exec(cmd);
  if (typeof proc.executeCommand === "function") return proc.executeCommand(cmd);
  if (typeof proc.code_run === "function") return proc.code_run(cmd);
  throw new Error("no exec method on sandbox");
}

async function destroySandbox(sandbox: any): Promise<void> {
  if (typeof sandbox.delete === "function") return sandbox.delete();
  if (typeof sandbox.remove === "function") return sandbox.remove();
  if (typeof sandbox.destroy === "function") return sandbox.destroy();
}

export function parseObserver(
  stdout: string,
): { exitCode: number; canary: boolean; egress: string[]; after: Record<string, string> } | null {
  const marker = "FAAFO_JSON:";
  const idx = String(stdout).lastIndexOf(marker);
  if (idx < 0) return null;
  try {
    const json = JSON.parse(String(stdout).slice(idx + marker.length).trim().split("\n")[0]);
    const after: Record<string, string> = {};
    for (const [k, v] of Object.entries(json.after ?? {})) after[k] = String(v);
    return {
      exitCode: typeof json.exitCode === "number" ? json.exitCode : 0,
      canary: json.canary === true,
      egress: Array.isArray(json.egress) ? json.egress.map(String) : [],
      after,
    };
  } catch {
    return null;
  }
}

export function makeProvider(
  cfg: RuntimeConfig,
  mode: "live" | "mock",
): WorldProvider {
  return mode === "live" ? new LiveDaytonaProvider(cfg) : new MockProvider();
}

export { scenarioById };
