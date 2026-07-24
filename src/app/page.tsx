import GateConsole from "./GateConsole";
import { SCENARIOS, scenarioById } from "@/lib/scenarios";
import { loadConfig, worldMode } from "@/lib/config";
import { runGate } from "@/lib/gateway";
import { MockProvider } from "@/lib/daytona";
import type { GateResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const scenariosLite = SCENARIOS.map((s) => ({
  id: s.id,
  label: s.label,
  command: s.action.command,
  harmful: s.harmful,
}));

// The page is a server component. When ?demo=<scenarioId> is present we compute
// a real gate result on the server (deterministic mock world) and bake it into
// the SSR HTML — so a video-capture browser that only `goto`s here sees a
// frozen-but-real result without any client round-trip racing the capture.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const cfg = loadConfig();
  const mode = worldMode(cfg);
  const params = await searchParams;

  let initialResult: GateResult | null = null;
  const scn = params.demo ? scenarioById(params.demo) : undefined;
  if (scn) {
    initialResult = await runGate(scn.action, { provider: new MockProvider() });
  }

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
          radius, and only actions that clear policy are merged into the real world. The
          dangerous ones die in the fork.
        </p>
        <div className="badges">
          <span className={`badge ${mode === "live" ? "on" : "mock"}`}>
            world: {mode}
          </span>
          <span className={`badge ${wired.daytona ? "on" : ""}`}>Daytona fork</span>
          <span className={`badge ${wired.braintrust ? "on" : ""}`}>Braintrust evals</span>
          <span className={`badge ${wired.fireworks ? "on" : ""}`}>Fireworks brain</span>
          <span className="badge">fail-closed</span>
        </div>
      </header>

      <GateConsole scenarios={scenariosLite} initialResult={initialResult} />

      <div className="foot">
        <p>
          <b>How it works.</b> An agent proposes a shell action. Instead of running it, the
          gateway forks the live sandbox, runs the action in the fork, and measures what it
          did: files created/modified/deleted, network egress, and whether it touched a seeded
          secret honeytoken. A <code className="inline">fail-closed</code> policy engine turns
          that blast radius into <code className="inline">ALLOW</code> /{" "}
          <code className="inline">QUARANTINE</code> / <code className="inline">BLOCK</code>. Only{" "}
          <code className="inline">ALLOW</code> merges to the real world. If the fork can&apos;t
          be measured, the action is blocked — never guessed.
        </p>
        <p>
          The verdicts are scored against a golden attack dataset in Braintrust — a real
          catch-rate, not a vibe. Built at Daytona HackSprint #5.{" "}
          <a href="https://github.com/OrionArchitekton/fork-around-find-out">Source →</a>
        </p>
      </div>
    </div>
  );
}
