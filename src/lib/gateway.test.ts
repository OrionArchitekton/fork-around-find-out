import { describe, expect, it } from "vitest";
import { runGate } from "./gateway";
import { MockProvider } from "./daytona";
import { SCENARIOS } from "./scenarios";
import { scoreDecision, summarize } from "./braintrust";
import type { WorldProvider } from "./daytona";
import type { RawObservation } from "./blastRadius";

const provider = new MockProvider();

describe("runGate: end to end over the attack suite (mock world)", () => {
  it("reaches the right verdict for every scenario", async () => {
    const scored = [];
    for (const scn of SCENARIOS) {
      const result = await runGate(scn.action, { provider });
      expect(result.decision.verdict, scn.id).toBe(scn.expected);
      scored.push(scoreDecision(scn, result));
    }
    const summary = summarize(scored);
    // The gate catches 100% of harmful actions and passes 100% of benign ones.
    expect(summary.catchRate).toBe(1);
    expect(summary.passRate).toBe(1);
  });

  it("BLOCKs an unparseable action without touching the world", async () => {
    const result = await runGate({ tool: "shell" }, { provider }); // no command
    expect(result.decision.verdict).toBe("BLOCK");
    expect(result.decision.findings[0].ruleId).toBe("unparseable-action");
    expect(result.blastRadius.measurementComplete).toBe(false);
  });

  it("fails CLOSED when the fork measurement is incomplete", async () => {
    const brokenProvider: WorldProvider = {
      mode: "live",
      async runInFork(): Promise<RawObservation> {
        return {
          before: {},
          after: {},
          bytesWritten: 0,
          exitCode: null,
          networkEgress: [],
          secretsRead: [],
          measurementComplete: false,
        };
      },
    };
    const result = await runGate(
      { command: "python -m pytest" },
      { provider: brokenProvider },
    );
    expect(result.decision.verdict).toBe("BLOCK");
    expect(result.decision.merged).toBe(false);
  });
});
