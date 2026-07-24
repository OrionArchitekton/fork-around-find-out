import { computeBlastRadius } from "./blastRadius";
import { loadConfig, worldMode, type RuntimeConfig } from "./config";
import { makeProvider, type WorldProvider } from "./daytona";
import { DEFAULT_RULES, evaluate } from "./policy";
import { ParseError, parseProposedAction } from "./parse";
import { SCENARIOS, type Scenario } from "./scenarios";
import {
  logExperiment,
  scoreDecision,
  summarize,
  type EvalSummary,
} from "./braintrust";
import type { GateResult, PolicyContext, ProposedAction } from "./types";

// The default world policy for the demo workspace.
export const DEMO_CONTEXT: PolicyContext = {
  writeAllowlist: ["/workspace/"],
  networkAllowlist: ["registry.npmjs.org", "pypi.org", "api.internal"],
};

/**
 * The allowlist means "the agent's own workspace", but its absolute path
 * depends on the sandbox tier. Anchor the policy to the workspace the world
 * actually reported, so a legitimate in-workspace write is not flagged as an
 * out-of-bounds write just because the tier mounts it elsewhere.
 *
 * This widens nothing: every path outside that one workspace root stays
 * out of bounds, and a world that reports no root keeps the strict default.
 */
export function contextForWorkspace(
  base: PolicyContext,
  workspaceRoot?: string,
): PolicyContext {
  if (!workspaceRoot) return base;
  const root = workspaceRoot.endsWith("/") ? workspaceRoot : `${workspaceRoot}/`;
  if (base.writeAllowlist.includes(root)) return base;
  return { ...base, writeAllowlist: [...base.writeAllowlist, root] };
}

// A monotonic-ish clock that also works in the edge/runtime without Date.now
// surprises in tests (tests inject their own provider + clock).
function now(): number {
  return typeof performance !== "undefined" ? performance.now() : 0;
}

/**
 * Run one proposed action through the gate: fork the world, measure the blast
 * radius, decide. A parse failure is itself a fail-closed BLOCK: we never run
 * a command we could not validate.
 */
export async function runGate(
  input: unknown,
  opts: { provider: WorldProvider; context?: PolicyContext },
): Promise<GateResult> {
  const context = opts.context ?? DEMO_CONTEXT;
  const started = now();

  let action: ProposedAction;
  try {
    action = parseProposedAction(input);
  } catch (e) {
    const reason = e instanceof ParseError ? e.message : "unparseable action";
    return {
      action: { tool: "unknown", command: String((input as any)?.command ?? "") },
      blastRadius: {
        filesCreated: [],
        filesModified: [],
        filesDeleted: [],
        bytesWritten: 0,
        exitCode: null,
        networkEgress: [],
        secretsRead: [],
        measurementComplete: false,
      },
      decision: {
        verdict: "BLOCK",
        findings: [
          {
            ruleId: "unparseable-action",
            severity: "BLOCK",
            description: `Refused to run: ${reason}.`,
          },
        ],
        merged: false,
      },
      elapsedMs: Math.round(now() - started),
      mode: opts.provider.mode,
    };
  }

  const obs = await opts.provider.runInFork(action);
  const blastRadius = computeBlastRadius(obs);
  const decision = evaluate(
    blastRadius,
    contextForWorkspace(context, obs.workspaceRoot),
    DEFAULT_RULES,
  );

  return {
    action,
    blastRadius,
    decision,
    elapsedMs: Math.round(now() - started),
    mode: opts.provider.mode,
    world: obs.worldId || obs.isolation
      ? { id: obs.worldId || undefined, isolation: obs.isolation }
      : undefined,
  };
}

/** Convenience wrapper that builds the provider from environment config. */
export async function runGateFromEnv(
  input: unknown,
  cfg: RuntimeConfig = loadConfig(),
): Promise<GateResult> {
  const provider = makeProvider(cfg, worldMode(cfg));
  return runGate(input, { provider });
}

/**
 * Run the whole attack suite through the gate and score it against ground truth
 *: this is the Braintrust eval. Returns the catch-rate summary plus, when a
 * Braintrust key is present, the logged experiment link.
 */
export async function runSuite(
  cfg: RuntimeConfig = loadConfig(),
  scenarios: Scenario[] = SCENARIOS,
): Promise<{ summary: EvalSummary; results: GateResult[] }> {
  const provider = makeProvider(cfg, worldMode(cfg));
  const results: GateResult[] = [];
  const scored = [];

  for (const scn of scenarios) {
    const result = await runGate(scn.action, { provider });
    const score = scoreDecision(scn, result);
    results.push(result);
    scored.push({ scn, result, score });
  }

  const base = summarize(scored.map((s) => s.score));
  const logRes = await logExperiment(cfg, scored);
  const summary: EvalSummary = {
    ...base,
    experimentUrl: logRes.url,
    logged: logRes.logged,
  };
  return { summary, results };
}
