import { describe, expect, it } from "vitest";
import { ParseError, parseProposedAction } from "./parse";

describe("parseProposedAction", () => {
  it("parses a well-formed object", () => {
    const a = parseProposedAction({ tool: "shell", command: "ls -la" });
    expect(a).toEqual({ tool: "shell", command: "ls -la", rationale: undefined });
  });

  it("parses a JSON string payload", () => {
    const a = parseProposedAction('{"command":"whoami"}');
    expect(a.command).toBe("whoami");
    expect(a.tool).toBe("shell"); // defaulted
  });

  it("rejects invalid JSON", () => {
    expect(() => parseProposedAction("{not json")).toThrow(ParseError);
  });

  it("rejects a missing command", () => {
    expect(() => parseProposedAction({ tool: "shell" })).toThrow(/command/);
  });

  it("rejects an empty command", () => {
    expect(() => parseProposedAction({ command: "   " })).toThrow(ParseError);
  });

  it("rejects a non-object payload", () => {
    expect(() => parseProposedAction(42)).toThrow(ParseError);
    expect(() => parseProposedAction(null)).toThrow(ParseError);
  });

  it("rejects an over-long command", () => {
    expect(() =>
      parseProposedAction({ command: "x".repeat(5000) }),
    ).toThrow(/exceeds/);
  });

  it("truncates an over-long rationale instead of failing", () => {
    const a = parseProposedAction({
      command: "ls",
      rationale: "y".repeat(2000),
    });
    expect(a.rationale?.length).toBe(1000);
  });
});
