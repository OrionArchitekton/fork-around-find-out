import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, evaluate, moreSevere } from "./policy";
import type { BlastRadius, PolicyContext, PolicyRule } from "./types";

const ctx: PolicyContext = {
  writeAllowlist: ["/workspace/"],
  networkAllowlist: ["api.internal", "registry.npmjs.org"],
};

function br(overrides: Partial<BlastRadius> = {}): BlastRadius {
  return {
    filesCreated: [],
    filesModified: [],
    filesDeleted: [],
    bytesWritten: 0,
    exitCode: 0,
    networkEgress: [],
    secretsRead: [],
    measurementComplete: true,
    ...overrides,
  };
}

describe("moreSevere", () => {
  it("orders BLOCK > QUARANTINE > ALLOW", () => {
    expect(moreSevere("ALLOW", "QUARANTINE")).toBe("QUARANTINE");
    expect(moreSevere("QUARANTINE", "BLOCK")).toBe("BLOCK");
    expect(moreSevere("BLOCK", "ALLOW")).toBe("BLOCK");
  });
});

describe("evaluate: the fail-closed gate", () => {
  it("ALLOWs and merges a benign in-workspace write", () => {
    const d = evaluate(
      br({ filesCreated: ["/workspace/out.txt"], bytesWritten: 12 }),
      ctx,
    );
    expect(d.verdict).toBe("ALLOW");
    expect(d.merged).toBe(true);
    expect(d.findings).toHaveLength(0);
  });

  it("BLOCKs the exfiltration shape: secret read + network egress", () => {
    const d = evaluate(
      br({
        secretsRead: ["/workspace/.env"],
        networkEgress: [{ host: "evil.example.com", port: 443 }],
      }),
      ctx,
    );
    expect(d.verdict).toBe("BLOCK");
    expect(d.merged).toBe(false);
    expect(d.findings.map((f) => f.ruleId)).toContain(
      "exfiltration-secret-plus-egress",
    );
  });

  it("fails CLOSED when measurement is incomplete", () => {
    const d = evaluate(br({ measurementComplete: false }), ctx);
    expect(d.verdict).toBe("BLOCK");
    expect(d.findings.map((f) => f.ruleId)).toContain(
      "fail-closed-incomplete-measurement",
    );
  });

  it("BLOCKs a destructive delete outside the workspace", () => {
    const d = evaluate(br({ filesDeleted: ["/etc/passwd"] }), ctx);
    expect(d.verdict).toBe("BLOCK");
  });

  it("does NOT block deletes inside the workspace", () => {
    const d = evaluate(br({ filesDeleted: ["/workspace/tmp.log"] }), ctx);
    expect(d.verdict).toBe("ALLOW");
  });

  it("QUARANTINEs an unapproved network host (no secret)", () => {
    const d = evaluate(
      br({ networkEgress: [{ host: "unknown.host", port: 80 }] }),
      ctx,
    );
    expect(d.verdict).toBe("QUARANTINE");
    expect(d.merged).toBe(false);
  });

  it("allows an approved network host", () => {
    const d = evaluate(
      br({ networkEgress: [{ host: "registry.npmjs.org", port: 443 }] }),
      ctx,
    );
    expect(d.verdict).toBe("ALLOW");
  });

  it("takes the MOST severe verdict when several rules fire", () => {
    const d = evaluate(
      br({
        secretsRead: ["/workspace/.env"],
        networkEgress: [{ host: "evil.host", port: 443 }],
        filesModified: ["/workspace/ok.txt"],
      }),
      ctx,
    );
    // secret-access (QUARANTINE) + exfiltration (BLOCK) both fire -> BLOCK.
    expect(d.verdict).toBe("BLOCK");
    expect(d.findings.length).toBeGreaterThanOrEqual(2);
  });

  it("treats a rule that THROWS as firing (never silently passes)", () => {
    const boom: PolicyRule = {
      id: "boom",
      severity: "BLOCK",
      description: "explodes",
      test: () => {
        throw new Error("kaboom");
      },
    };
    const d = evaluate(br(), ctx, [boom]);
    expect(d.verdict).toBe("BLOCK");
    expect(d.findings[0].ruleId).toBe("boom");
  });

  it("ships a non-empty default policy", () => {
    expect(DEFAULT_RULES.length).toBeGreaterThanOrEqual(5);
  });
});

describe("network allowlist matches hosts, not string prefixes", () => {
  // An attacker registers a domain that STARTS WITH an allowlisted one. A
  // prefix test would wave the exfiltration straight through.
  it("does not treat api.internal.evil.com as the allowlisted api.internal", () => {
    const d = evaluate(
      br({ networkEgress: [{ host: "api.internal.evil.com", port: 443 }] }),
      ctx,
      DEFAULT_RULES,
    );
    expect(d.verdict).toBe("QUARANTINE");
    expect(d.findings.map((f) => f.ruleId)).toContain("unapproved-network-egress");
  });

  it("does not treat registry.npmjs.org.attacker.net as approved", () => {
    const d = evaluate(
      br({ networkEgress: [{ host: "registry.npmjs.org.attacker.net", port: 443 }] }),
      ctx,
      DEFAULT_RULES,
    );
    expect(d.verdict).toBe("QUARANTINE");
  });

  it("still allows the exact host and its subdomains", () => {
    expect(
      evaluate(br({ networkEgress: [{ host: "api.internal", port: 443 }] }), ctx, DEFAULT_RULES)
        .verdict,
    ).toBe("ALLOW");
    expect(
      evaluate(
        br({ networkEgress: [{ host: "eu.api.internal", port: 443 }] }),
        ctx,
        DEFAULT_RULES,
      ).verdict,
    ).toBe("ALLOW");
  });

  it("is case-insensitive and tolerates a trailing dot", () => {
    expect(
      evaluate(br({ networkEgress: [{ host: "API.Internal.", port: 443 }] }), ctx, DEFAULT_RULES)
        .verdict,
    ).toBe("ALLOW");
  });
});
