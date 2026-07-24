import { describe, expect, it } from "vitest";
import {
  computeBlastRadius,
  diffSnapshots,
  parseNetworkAttempt,
  type RawObservation,
} from "./blastRadius";

describe("diffSnapshots", () => {
  it("classifies created, modified, and deleted files", () => {
    const before = { "a.txt": "h1", "b.txt": "h2" };
    const after = { "a.txt": "h1-changed", "c.txt": "h3" };
    const d = diffSnapshots(before, after);
    expect(d.filesModified).toEqual(["a.txt"]);
    expect(d.filesCreated).toEqual(["c.txt"]);
    expect(d.filesDeleted).toEqual(["b.txt"]);
  });

  it("returns empty diffs for identical snapshots", () => {
    const snap = { "a.txt": "h1" };
    const d = diffSnapshots(snap, { ...snap });
    expect(d.filesCreated).toEqual([]);
    expect(d.filesModified).toEqual([]);
    expect(d.filesDeleted).toEqual([]);
  });
});

describe("parseNetworkAttempt", () => {
  it("splits host:port", () => {
    expect(parseNetworkAttempt("evil.com:443")).toEqual({
      host: "evil.com",
      port: 443,
    });
  });
  it("handles a bare host", () => {
    expect(parseNetworkAttempt("evil.com")).toEqual({ host: "evil.com", port: 0 });
  });
  it("ignores empty input", () => {
    expect(parseNetworkAttempt("   ")).toBeNull();
  });
  it("keeps ipv6-ish host, defaults an unparseable port to 0", () => {
    const r = parseNetworkAttempt("host:notaport");
    expect(r?.host).toBe("host");
    expect(r?.port).toBe(0);
  });
});

describe("computeBlastRadius", () => {
  const base: RawObservation = {
    before: { "/workspace/a": "1" },
    after: { "/workspace/a": "1", "/workspace/b": "2" },
    bytesWritten: 4,
    exitCode: 0,
    networkEgress: ["api.host:443", ""],
    secretsRead: ["/workspace/.env", "/workspace/.env"],
    measurementComplete: true,
  };

  it("builds a full structured blast radius and dedupes secrets", () => {
    const br = computeBlastRadius(base);
    expect(br.filesCreated).toEqual(["/workspace/b"]);
    expect(br.secretsRead).toEqual(["/workspace/.env"]);
    expect(br.networkEgress).toEqual([{ host: "api.host", port: 443 }]);
    expect(br.measurementComplete).toBe(true);
  });

  it("clamps negative bytesWritten to 0", () => {
    expect(computeBlastRadius({ ...base, bytesWritten: -9 }).bytesWritten).toBe(0);
  });

  it("marks measurement incomplete when the flag is not strictly true", () => {
    // A missing/loose flag must not read as a trustworthy measurement.
    const br = computeBlastRadius({
      ...base,
      measurementComplete: undefined as unknown as boolean,
    });
    expect(br.measurementComplete).toBe(false);
  });
});
