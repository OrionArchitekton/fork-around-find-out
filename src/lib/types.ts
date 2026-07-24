// Core domain types for Fork Around & Find Out (FAAFO).
// The gateway intercepts a proposed agent action, executes it in a *forked* copy
// of the live world, measures the blast radius, and only merges the action into
// the real world if it clears policy. Nothing here talks to the network — these
// are pure data shapes so the safety decision stays deterministic and testable.

export type Verdict = "ALLOW" | "QUARANTINE" | "BLOCK";

/** A tool-call an agent proposes to run. `command` executes inside the sandbox. */
export interface ProposedAction {
  tool: string;
  command: string;
  rationale?: string;
}

/** One outbound network attempt observed while the action ran in the fork. */
export interface NetworkAttempt {
  host: string;
  port: number;
}

/**
 * The measured consequence of running an action inside the fork. Every field is
 * an observation, not a guess. `measurementComplete: false` means the fork run
 * did not yield a trustworthy reading — policy MUST fail closed on it.
 */
export interface BlastRadius {
  filesCreated: string[];
  filesModified: string[];
  filesDeleted: string[];
  bytesWritten: number;
  exitCode: number | null;
  networkEgress: NetworkAttempt[];
  /** Known-sensitive paths the command read (seeded honeytokens in the demo). */
  secretsRead: string[];
  measurementComplete: boolean;
}

/** A single policy rule evaluated against a BlastRadius. */
export interface PolicyRule {
  id: string;
  severity: Verdict; // the verdict this rule votes for when it fires
  description: string;
  test: (br: BlastRadius, ctx: PolicyContext) => boolean;
}

/** Deployment-specific policy context (what "outside the workspace" means, etc). */
export interface PolicyContext {
  /** Paths the agent is permitted to write/delete under. */
  writeAllowlist: string[];
  /** Network hosts the agent is permitted to reach. */
  networkAllowlist: string[];
}

export interface PolicyFinding {
  ruleId: string;
  severity: Verdict;
  description: string;
}

export interface PolicyDecision {
  verdict: Verdict;
  findings: PolicyFinding[];
  /** True when the action was merged into the real world (verdict === ALLOW). */
  merged: boolean;
}

/** The full record of one gateway evaluation — logged to Braintrust as a trace. */
export interface GateResult {
  action: ProposedAction;
  blastRadius: BlastRadius;
  decision: PolicyDecision;
  /** Wall-clock ms the fork+measure+decide loop took. */
  elapsedMs: number;
  /** Whether the fork ran on a live Daytona sandbox or the deterministic mock. */
  mode: "live" | "mock";
}
