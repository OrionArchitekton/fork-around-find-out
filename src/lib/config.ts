// Central config + mode selection. The whole app degrades cleanly to a
// deterministic mock when sponsor keys are absent, so it always demos.

export interface RuntimeConfig {
  daytonaKey?: string;
  daytonaUrl?: string;
  braintrustKey?: string;
  fireworksKey?: string;
  anthropicKey?: string;
  /** Force mock even if keys exist (used by the demo mode). */
  forceMock: boolean;
}

export function loadConfig(): RuntimeConfig {
  return {
    daytonaKey: process.env.DAYTONA_API_KEY,
    daytonaUrl: process.env.DAYTONA_API_URL,
    braintrustKey: process.env.BRAINTRUST_API_KEY,
    fireworksKey: process.env.FIREWORKS_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    forceMock: process.env.FAAFO_FORCE_MOCK === "1",
  };
}

export function worldMode(cfg: RuntimeConfig): "live" | "mock" {
  return !cfg.forceMock && cfg.daytonaKey ? "live" : "mock";
}

/**
 * Hosts the workspace is allowed to talk to.
 *
 * The sandbox needs this too, not just the policy engine. The network shim
 * never sends anything, but it has to decide what EXIT STATUS to hand back, and
 * that choice changes control flow: `curl <approved> && rm -rf <data>` only
 * reaches the delete if curl reports success. Failing an approved call would
 * silently truncate the run and we would measure a blast radius the real
 * command would never have had.
 */
export const APPROVED_HOSTS = ["registry.npmjs.org", "pypi.org", "api.internal"];
