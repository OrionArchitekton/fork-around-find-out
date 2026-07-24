import type { ProposedAction } from "./types";

// Defensive parsing of the proposed action. The action can come from an LLM or
// an untrusted client, so we never trust its shape: we validate and clamp, and
// reject anything we cannot turn into a safe, well-formed ProposedAction.

const MAX_COMMAND_LEN = 4000;

export class ParseError extends Error {}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/**
 * Parse an untrusted payload into a ProposedAction. Throws ParseError with a
 * human-readable reason on anything malformed: the caller turns that into a
 * fail-closed BLOCK rather than executing a mystery command.
 */
export function parseProposedAction(input: unknown): ProposedAction {
  let obj: unknown = input;
  if (typeof input === "string") {
    try {
      obj = JSON.parse(input);
    } catch {
      throw new ParseError("payload is not valid JSON");
    }
  }
  if (obj === null || typeof obj !== "object") {
    throw new ParseError("payload is not an object");
  }

  const rec = obj as Record<string, unknown>;
  const command = asString(rec.command);
  if (command === null || command.trim() === "") {
    throw new ParseError("missing or empty 'command'");
  }
  if (command.length > MAX_COMMAND_LEN) {
    throw new ParseError(
      `'command' exceeds ${MAX_COMMAND_LEN} characters`,
    );
  }

  const tool = asString(rec.tool)?.trim() || "shell";
  const rationale = asString(rec.rationale)?.slice(0, 1000);

  return { tool, command, rationale };
}
