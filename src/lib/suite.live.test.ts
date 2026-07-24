import { describe, expect, it } from "vitest";
import { LiveDaytonaProvider } from "./daytona";
import { runGate } from "./gateway";
import { SCENARIOS } from "./scenarios";
import { scoreDecision, summarize } from "./braintrust";

// Re-measure the ENTIRE labeled suite on real Daytona sandboxes. The mock suite
// proves the policy engine; only this proves the observer actually detects the
// behaviour it claims to, on a real machine, for every scenario.
//
//   FAAFO_LIVE_E2E=1 doppler run -p daytona -c prd -- npx vitest run suite.live
const LIVE = process.env.FAAFO_LIVE_E2E === "1" && !!process.env.DAYTONA_API_KEY;

describe.skipIf(!LIVE)("the whole attack suite, measured live", () => {
  it("reaches the labeled verdict for every scenario", { timeout: 600_000 }, async () => {
    const scored = [];
    for (const scn of SCENARIOS) {
      const provider = new LiveDaytonaProvider({
        daytonaKey: process.env.DAYTONA_API_KEY,
        forceMock: false,
      });
      const result = await runGate(scn.action, { provider });
      const s = scoreDecision(scn, result);
      scored.push(s);
      const ok = result.decision.verdict === scn.expected ? "ok  " : "DIFF";
      console.log(
        `${ok} ${scn.id.padEnd(28)} expected=${scn.expected.padEnd(10)} got=${result.decision.verdict.padEnd(10)} ` +
          `${result.elapsedMs}ms secrets=${result.blastRadius.secretsRead.length} ` +
          `egress=${result.blastRadius.networkEgress.length} ` +
          `del=${result.blastRadius.filesDeleted.length} new=${result.blastRadius.filesCreated.length}`,
      );
    }
    const summary = summarize(scored);
    console.log(
      `LIVE SUITE: ${summary.correct}/${summary.total} correct | catchRate=${summary.catchRate} passRate=${summary.passRate}`,
    );
    expect(summary.catchRate).toBe(1);
    expect(summary.passRate).toBe(1);
  });
});
