import GateConsole from "./GateConsole";
import { SCENARIOS, scenarioById } from "@/lib/scenarios";
import { loadConfig, worldMode } from "@/lib/config";
import { runGate } from "@/lib/gateway";
import { MockProvider } from "@/lib/daytona";
import { scoreDecision, summarize } from "@/lib/braintrust";
import type { GateResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const scenariosLite = SCENARIOS.map((s) => ({
  id: s.id,
  label: s.label,
  command: s.action.command,
  harmful: s.harmful,
}));

// Compute the golden-suite catch-rate on the server with the deterministic mock
// world (independent of live/mock mode, so a live-keyed deploy never runs six
// real forks on every page load). This is the "real catch-rate, not a vibe"
// number, visible before a judge clicks anything.
async function suiteStat() {
  const provider = new MockProvider();
  const scored = [];
  for (const s of SCENARIOS) {
    scored.push(scoreDecision(s, await runGate(s.action, { provider })));
  }
  return summarize(scored);
}

// The page is a server component. When ?demo=<scenarioId> is present (or on the
// bare URL, which defaults to the exfil scenario) we compute a real gate result
// on the server and bake it into the SSR HTML, so a first-time judge sees a
// finished verdict with zero clicks and a video-capture browser sees a
// frozen-but-real result without any client round-trip racing the capture.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const cfg = loadConfig();
  const mode = worldMode(cfg);
  const params = await searchParams;

  const scn = scenarioById(params.demo ?? "exfil-curl-env") ?? SCENARIOS[0];
  const initialResult: GateResult = await runGate(scn.action, {
    provider: new MockProvider(),
  });
  const suite = await suiteStat();
  const harmful = SCENARIOS.filter((s) => s.harmful).length;

  const wired = {
    daytona: Boolean(cfg.daytonaKey),
    braintrust: Boolean(cfg.braintrustKey),
    fireworks: Boolean(cfg.fireworksKey),
    anthropic: Boolean(cfg.anthropicKey),
  };

  return (
    <div className="wrap">
      <header className="hero">
        <h1>Fork Around &amp; Find Out</h1>
        <p className="tag">
          <span className="hook">Your agent&apos;s next action happens in a parallel universe first.</span>{" "}
          Every risky tool-call runs in a forked Daytona sandbox, we measure the exact blast
          radius, and only actions that clear policy are cleared to run for real. The dangerous
          ones die in the fork, having touched nothing real.
        </p>
        <div className="badges">
          <span className="badge on">
            {Math.round(suite.catchRate * 100)}% of attacks caught · {suite.correct}/{suite.total} correct
          </span>
          <span className="badge">fail-closed</span>
          <span className={`badge ${wired.daytona ? "on" : ""}`}>Daytona fork</span>
          <span className={`badge ${wired.braintrust ? "on" : ""}`}>Braintrust evals</span>
          <span className={`badge ${wired.fireworks ? "on" : ""}`}>Fireworks brain</span>
          <span className={`badge ${mode === "live" ? "on" : "mock"}`}>
            world: {mode}
          </span>
        </div>
        {mode === "mock" && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Running the <b>mock world</b>: recorded real observations, run through the exact same
            policy engine and blast-radius code as a live Daytona fork. Set a Daytona key to
            measure on real forks.
          </p>
        )}
      </header>

      <GateConsole scenarios={scenariosLite} initialResult={initialResult} />

      <div className="foot">
        <p>
          <b>How it works.</b> An agent proposes a shell action. Instead of running it, the
          gateway forks a Daytona sandbox (filesystem state), runs the action in the fork, and
          measures what it did: files created/modified/deleted, network egress, and whether it
          read a seeded secret honeytoken (caught even when the secret is sent in a request
          body). A <code className="inline">fail-closed</code> policy engine turns that blast
          radius into <code className="inline">ALLOW</code> /{" "}
          <code className="inline">QUARANTINE</code> / <code className="inline">BLOCK</code>. Only an{" "}
          <code className="inline">ALLOW</code> is cleared to run for real; if the fork cannot be
          measured, the action is blocked, never guessed.
        </p>
        <p>
          Every verdict is scored against a labeled attack suite ({SCENARIOS.length} scenarios,{" "}
          {harmful} harmful) and logged to a Braintrust project: a real catch-rate, not a vibe.
          Built at Daytona HackSprint #5.{" "}
          <a href="https://github.com/OrionArchitekton/fork-around-find-out">Source →</a>
        </p>
      </div>
    </div>
  );
}
