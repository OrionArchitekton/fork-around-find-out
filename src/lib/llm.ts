import type { RuntimeConfig } from "./config";
import type { ProposedAction } from "./types";

// The agent "brain". Given a natural-language task it proposes a concrete
// shell action. The brain runs OUTSIDE the sandbox (Daytona Tier-1 restricts
// sandbox egress), which is exactly the separation we want: the model proposes,
// the fork disposes. Fireworks is a sponsor and is preferred when its key is
// present; Anthropic is the fallback; with no key we return a transparent stub
// so the UI still works.

const SYSTEM = `You are an autonomous DevOps agent operating in a sandboxed workspace at /workspace.
Given a task, respond with ONLY a JSON object: {"tool":"shell","command":"<one shell command>","rationale":"<why>"}.
Do not add commentary. The command will be safety-checked before it can run.`;

export interface Brain {
  name: string;
  propose(task: string): Promise<ProposedAction>;
}

function extractJson(text: string): ProposedAction | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    if (typeof o.command === "string" && o.command.trim()) {
      return {
        tool: typeof o.tool === "string" ? o.tool : "shell",
        command: o.command,
        rationale: typeof o.rationale === "string" ? o.rationale : undefined,
      };
    }
  } catch {
    /* fall through */
  }
  return null;
}

// Model choice is load-bearing, not incidental. llama-v3p1-70b-instruct is no
// longer served on this account (the API returns NOT_FOUND), which silently
// demoted every proposal to the stub. Of the models actually available,
// gpt-oss-120b is the one that returns the bare JSON object this prompt asks
// for; the reasoning-style models narrate before answering and fail extraction.
const FIREWORKS_MODEL = "accounts/fireworks/models/gpt-oss-120b";

class FireworksBrain implements Brain {
  name = "fireworks:gpt-oss-120b";
  constructor(private key: string) {}
  async propose(task: string): Promise<ProposedAction> {
    const res = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({
        model: FIREWORKS_MODEL,
        temperature: 0,
        max_tokens: 300,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: task },
        ],
      }),
    });
    const data = await res.json();
    // Surface WHY we fell back. A stub labelled only "parse-failed" hid a dead
    // model id for as long as nobody read the rationale.
    if (data?.error) {
      return stub(task, `fireworks-api: ${String(data.error.message ?? data.error).slice(0, 80)}`);
    }
    const text = data?.choices?.[0]?.message?.content ?? "";
    return extractJson(text) ?? stub(task, "fireworks-parse-failed");
  }
}

class AnthropicBrain implements Brain {
  name = "anthropic:claude";
  constructor(private key: string) {}
  async propose(task: string): Promise<ProposedAction> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 300,
        temperature: 0,
        system: SYSTEM,
        messages: [{ role: "user", content: task }],
      }),
    });
    const data = await res.json();
    const text = data?.content?.[0]?.text ?? "";
    return extractJson(text) ?? stub(task, "anthropic-parse-failed");
  }
}

function stub(task: string, why: string): ProposedAction {
  return {
    tool: "shell",
    command: `echo ${JSON.stringify(task).slice(0, 60)}`,
    rationale: `stub brain (${why})`,
  };
}

class StubBrain implements Brain {
  name = "stub";
  async propose(task: string): Promise<ProposedAction> {
    return stub(task, "no-llm-key");
  }
}

export function makeBrain(cfg: RuntimeConfig): Brain {
  if (cfg.fireworksKey) return new FireworksBrain(cfg.fireworksKey);
  if (cfg.anthropicKey) return new AnthropicBrain(cfg.anthropicKey);
  return new StubBrain();
}
