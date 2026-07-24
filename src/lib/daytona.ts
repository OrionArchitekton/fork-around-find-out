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
function observerScript(command: string, workspace: string): string {
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
    // Tee ONLY for a genuine pipe. `! -t 0` is wrong: with no stdin the shim
    // still enters tee, which then consumes the observer script's own stdin and
    // swallows the rest of the script (the JSON emitter never runs).
    'if [ -p /dev/stdin ]; then tee -a /tmp/faafo/payload.log | __REAL__ "$@"; else __REAL__ "$@"; fi',
  ].join("\n");
  const shim64 = Buffer.from(shimBody, "utf8").toString("base64");
  // One self-contained exec: snapshot before, run under the shim, snapshot
  // after, emit a single JSON line. Doing before/after in the SAME exec is what
  // makes the diff atomic (a separate pre-pass could drift).
  return `
set +e
WS=${JSON.stringify(workspace)}
mkdir -p /tmp/faafo/bin; : > /tmp/faafo/egress.log; : > /tmp/faafo/payload.log
python3 - "$WS" > /tmp/faafo/before.json <<'PY'
import sys, json, hashlib, os
ws=sys.argv[1]; d={}
for root in [ws,"/etc","/var/tmp"]:
    for dp,_,fs in os.walk(root):
        for f in fs:
            p=os.path.join(dp,f)
            try:
                with open(p,'rb') as fh: d[p]=hashlib.sha256(fh.read()).hexdigest()[:12]
            except Exception: pass
print(json.dumps(d))
PY
for t in curl wget nc; do
  real=$(command -v $t 2>/dev/null) || continue
  echo "${shim64}" | base64 -d | sed "s|__REAL__|$real|g" > /tmp/faafo/bin/$t
  chmod +x /tmp/faafo/bin/$t
done
export PATH=/tmp/faafo/bin:$PATH
CMD=$(echo ${b64} | base64 -d)
# </dev/null: the action must never inherit THIS script's stdin. A tool that
# reads stdin would otherwise eat the rest of the observer (including the JSON
# emitter below) and the measurement would come back silently empty.
OUT=$(cd "$WS" && sh -c "$CMD" 2>&1 </dev/null); CODE=$?
CANARY_HIT=0
{ echo "$OUT"; cat /tmp/faafo/payload.log 2>/dev/null; } | grep -q "${CANARY}" && CANARY_HIT=1
EGRESS=$(sort -u /tmp/faafo/egress.log 2>/dev/null | tr '\\n' ',' )
python3 - "$CODE" "$CANARY_HIT" "$EGRESS" "$WS" <<'PY'
import sys, json, hashlib, os
code=int(sys.argv[1]); canary=sys.argv[2]=="1"
egress=[e for e in sys.argv[3].split(',') if e]; ws=sys.argv[4]
def snap(ws):
    d={}
    for root in [ws,"/etc","/var/tmp"]:
        for dp,_,fs in os.walk(root):
            for f in fs:
                p=os.path.join(dp,f)
                try:
                    with open(p,'rb') as fh: d[p]=hashlib.sha256(fh.read()).hexdigest()[:12]
                except Exception: pass
    return d
try:
    before=json.load(open('/tmp/faafo/before.json'))
except Exception:
    before=None
out={"exitCode":code,"canary":canary,"egress":egress,"after":snap(ws)}
if before is not None: out["before"]=before
print("FAAFO_JSON:"+json.dumps(out))
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

      // The isolation guarantee is "this action runs in a disposable copy of the
      // world, never the real one". Two ways to get that, in preference order:
      //   1. fork the warm base sandbox (Daytona's fork primitive), or
      //   2. seed a fresh disposable sandbox for this action alone.
      // Both are throwaway worlds; (1) is just cheaper when the tier enables it.
      // If neither is available we fail closed rather than run anywhere real.
      const world = await acquireDisposableWorld(daytona);
      if (!world) return incomplete;
      const { sandbox, parent, workspace } = world;
      try {
        const res = await execInSandbox(sandbox, observerScript(action.command, workspace));
        const parsed = parseObserver(res.stdout ?? res.result ?? "");
        // No parseable observation -> incomplete -> BLOCK. Never guess.
        if (!parsed || !parsed.before) return { ...incomplete };
        return {
          before: parsed.before,
          after: parsed.after,
          bytesWritten: 0,
          exitCode: parsed.exitCode,
          networkEgress: parsed.egress,
          secretsRead: parsed.canary ? [`${workspace}/.env`] : [],
          measurementComplete: true,
          workspaceRoot: workspace,
        };
      } finally {
        // Child first (a parent with live forks can refuse deletion), then base.
        await destroySandbox(sandbox).catch(() => {});
        if (parent) await destroySandbox(parent).catch(() => {});
      }
    } catch {
      return incomplete;
    }
  }
}

// The SDK surface differs slightly across versions; these adapters keep the
// call sites tolerant. Verified against the live SDK in the Day-0 spike.

export interface DisposableWorld {
  /** The throwaway sandbox the action will run in. Always deleted after. */
  sandbox: any;
  /** The warm base, when the sandbox is a fork of it. Also deleted after. */
  parent: any | null;
  /** Writable workspace root inside the sandbox (tier-dependent). */
  workspace: string;
  isolation: "fork" | "fresh-world";
}

/**
 * Acquire a disposable world for exactly one action.
 *
 * Preference order is a real Daytona fork of a warm base, then a freshly seeded
 * sandbox. Both give the property the gate depends on: the action runs in a
 * copy that is destroyed afterwards and is never the agent's real environment.
 * Fork is the cheaper path when the account tier enables it; on tiers where it
 * is disabled (container-class sandboxes return "Forking is not supported"),
 * the fresh world is the honest equivalent, not a downgrade in safety.
 *
 * Returns null if no disposable world could be created, which makes the caller
 * report an incomplete measurement, which the policy engine turns into BLOCK.
 */
async function acquireDisposableWorld(daytona: any): Promise<DisposableWorld | null> {
  let base: any = null;
  try {
    base = await daytona.create({ language: "python" });
    const workspace = await resolveWorkspace(base);
    await execInSandbox(base, seedCommand(workspace));

    const fork = await tryFork(base);
    if (fork) return { sandbox: fork, parent: base, workspace, isolation: "fork" };

    // No fork on this tier: the seeded sandbox IS this action's disposable
    // world. It is used once and destroyed by the caller.
    return { sandbox: base, parent: null, workspace, isolation: "fresh-world" };
  } catch {
    if (base) await destroySandbox(base).catch(() => {});
    return null;
  }
}

/** Where we can actually write. `/workspace` is not writable on every tier. */
async function resolveWorkspace(sandbox: any): Promise<string> {
  try {
    if (typeof sandbox.getUserRootDir === "function") {
      const root = await sandbox.getUserRootDir();
      if (root) return `${String(root).replace(/\/+$/, "")}/workspace`;
    }
  } catch {
    /* fall through to the default */
  }
  return "/workspace";
}

function seedCommand(workspace: string): string {
  return [
    `mkdir -p ${workspace}`,
    `printf 'print(1)\\n' > ${workspace}/app.py`,
    `printf '# demo\\n' > ${workspace}/README.md`,
    `printf 'API_KEY=${CANARY}\\n' > ${workspace}/.env`,
  ].join(" && ");
}

async function tryFork(base: any): Promise<any | null> {
  try {
    if (typeof base._experimental_fork === "function") return await base._experimental_fork();
    if (typeof base.fork === "function") return await base.fork();
  } catch {
    // Tier does not permit forking. The caller falls back to a fresh world,
    // which carries the same disposability guarantee.
  }
  return null;
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

export function parseObserver(stdout: string): {
  exitCode: number;
  canary: boolean;
  egress: string[];
  after: Record<string, string>;
  before?: Record<string, string>;
} | null {
  const marker = "FAAFO_JSON:";
  const idx = String(stdout).lastIndexOf(marker);
  if (idx < 0) return null;
  try {
    const json = JSON.parse(String(stdout).slice(idx + marker.length).trim().split("\n")[0]);
    const after: Record<string, string> = {};
    for (const [k, v] of Object.entries(json.after ?? {})) after[k] = String(v);
    const parsed = {
      exitCode: typeof json.exitCode === "number" ? json.exitCode : 0,
      canary: json.canary === true,
      egress: Array.isArray(json.egress) ? json.egress.map(String) : [],
      after,
    } as {
      exitCode: number;
      canary: boolean;
      egress: string[];
      after: Record<string, string>;
      before?: Record<string, string>;
    };
    if (json.before && typeof json.before === "object") {
      const before: Record<string, string> = {};
      for (const [k, v] of Object.entries(json.before)) before[k] = String(v);
      parsed.before = before;
    }
    return parsed;
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
