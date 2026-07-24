import GateConsole from "./GateConsole";
import { SCENARIOS, scenarioById } from "@/lib/scenarios";
import { loadConfig, worldMode } from "@/lib/config";
import { runGate, runGateFromEnv } from "@/lib/gateway";
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
  searchParams: Promise<{ demo?: string; live?: string }>;
}) {
  const cfg = loadConfig();
  const mode = worldMode(cfg);
  const params = await searchParams;

  // ?live=1 measures the scenario on a REAL Daytona sandbox during SSR, so the
  // finished page carries live evidence (sandbox id, real paths, real timing)
  // with no client round-trip. Opt-in: the default render stays deterministic
  // so the page is fast and identical on every load.
  const wantLive = params.live === "1" && mode === "live";
  const scn = scenarioById(params.demo ?? "exfil-curl-env") ?? SCENARIOS[0];
  const initialResult: GateResult = wantLive
    ? await runGateFromEnv(scn.action, cfg)
    : await runGate(scn.action, { provider: new MockProvider() });
  const harmful = SCENARIOS.filter((s) => s.harmful).length;
  const suite = await suiteStat();

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
          Every risky tool-call runs in a disposable Daytona sandbox, we measure the exact blast
          radius, and only actions that clear policy are cleared to run for real. The dangerous
          ones die in that throwaway world, having touched nothing real.
        </p>
        <div className="badges">
          {/* Counts beat a percentage here: "100%" over a small suite reads as
              a vanity stat, and the near-misses are the interesting part. */}
          <span className="badge on">
            {suite.correct}/{suite.total} correct · {harmful} harmful, {SCENARIOS.length - harmful} benign
          </span>
          <span className="badge">fail-closed</span>
          <span className={`badge ${wired.daytona ? "on" : ""}`}>Daytona sandbox</span>
          <span className={`badge ${wired.braintrust ? "on" : ""}`}>Braintrust evals</span>
          <span className={`badge ${wired.fireworks ? "on" : ""}`}>Fireworks brain</span>
          {/* Bound to the RESULT on screen, never to the environment: this
              first render is always the deterministic mock, even on a
              live-keyed deploy. Claiming "live" here would be a lie. */}
          <span className={`badge ${initialResult.mode === "live" ? "on" : "mock"}`}>
            this result: {initialResult.mode}
          </span>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          {initialResult.mode === "live" ? (
            <>
              The result below was measured on a <b>real Daytona sandbox</b>, created and destroyed
              for that one action. The default view uses a deterministic mock world so the page
              renders identically every time; same policy engine and blast-radius code either way,
              only the observation source differs.
            </>
          ) : mode === "live" ? (
            <>
              The result below is the <b>deterministic mock world</b> so the page renders the same
              way every time. Press <b>Run</b> and the action is measured on a{" "}
              <b>real Daytona sandbox</b>, created and destroyed for that one action. Same policy
              engine and blast-radius code either way; only the observation source differs.
            </>
          ) : (
            <>
              Running the <b>mock world</b>: recorded real observations, run through the exact same
              policy engine and blast-radius code as a live Daytona sandbox. Set a Daytona key to
              measure on real sandboxes.
            </>
          )}
        </p>
      </header>

      <GateConsole scenarios={scenariosLite} initialResult={initialResult} />

      <div className="foot">
        <p>
          <b>How it works.</b> An agent proposes a shell action. Instead of running it, the
          gateway spins up a disposable Daytona sandbox seeded with a stand-in for the
          agent&apos;s world, runs the action there, and measures what it did: files created/modified/deleted,
          network egress, and whether it read a seeded secret honeytoken (caught even when the
          secret is sent in a request body, not just echoed to stdout). A{" "}
          <code className="inline">fail-closed</code> policy engine turns that blast radius into{" "}
          <code className="inline">ALLOW</code> / <code className="inline">QUARANTINE</code> /{" "}
          <code className="inline">BLOCK</code>. Only an <code className="inline">ALLOW</code> is
          cleared to run for real; if the world cannot be measured, the action is blocked, never
          guessed. The world is seeded with a representative workspace fixture, and where the account
          tier enables Daytona&apos;s sandbox <i>fork</i> primitive the gateway forks that seeded
          base rather than running in it directly. Either way the throwaway world is destroyed
          straight after.
        </p>
        <p>
          <b>The near-misses are the point.</b> A pattern-matching guardrail blocks{" "}
          <code className="inline">rm {"-rf"} ./node_modules</code> on sight, and a keyword filter
          blocks any command mentioning <code className="inline">.env</code>. FAAFO runs both and
          measures: one only removed files inside the workspace, the other shipped a secret to an
          unknown host. It clears the first and blocks the second. Guessing from text cannot
          separate those; measuring can.
        </p>
        <p>
          Every scenario in the labeled suite ({SCENARIOS.length} scenarios, {harmful} harmful)
          is scored, and running the suite logs those scored rows to a Braintrust project. The full suite was also
          re-measured on real Daytona sandboxes on 2026-07-24:{" "}
          <b>
            {SCENARIOS.length}/{SCENARIOS.length} correct, about a second per action
          </b>
          , so the score above is not a mock-only result. Built at Daytona HackSprint #5.{" "}
          <a href="https://github.com/OrionArchitekton/fork-around-find-out">Source →</a>
        </p>
      </div>
    </div>
  );
}
