# Fork Around & Find Out

**Your agent's next action happens in a parallel universe first.**

Autonomous agents are getting write access to real systems: shells, repos, cloud
accounts, payment APIs. The moment an agent can *act*, one bad tool-call (a prompt
injection, a hallucinated `rm -rf`, a secret quietly POSTed to a pastebin) is
irreversible. Text-based guardrails try to guess whether an action is dangerous by
reading it. **We don't guess — we run it in a fork and watch what it actually does.**

Fork Around & Find Out (FAAFO) is a fail-closed gateway for agent tool-calls:

1. An agent proposes an action (a shell command).
2. Instead of running it, the gateway **forks the live Daytona sandbox** — a real
   copy of the world, memory and running processes included.
3. The action runs **in the fork**. We measure the exact **blast radius**: files
   created / modified / deleted, network egress, and whether it read a seeded secret
   honeytoken.
4. A **fail-closed policy engine** turns that blast radius into `ALLOW` /
   `QUARANTINE` / `BLOCK`. Only `ALLOW` is merged into the real world. The dangerous
   actions die in the fork, having touched nothing real.
5. Every verdict is scored against a **golden attack dataset in Braintrust** — a real
   catch-rate, not a vibe.

If the fork can't be measured, the action is **blocked, never guessed**.

## Why this is different

The winning pattern at past HackSprints is "agents that test agents" — but those run
*pre-production*. FAAFO is a **runtime gateway**: it sits in front of *every* action an
agent takes, live, and decides per-action. It's the difference between a crash test and
a seatbelt.

## The safety model (Rule of Two, made executable)

A single action that both **reads a secret** and **opens a network connection** is the
classic exfiltration shape — FAAFO blocks it outright, even though each half looks
benign alone. That rule, and the others, are *data*, so the demo shows you the exact
rule that fired. See [`src/lib/policy.ts`](src/lib/policy.ts).

## Sponsor stack

- **Daytona** — the fork/sandbox world. Actions execute in a *forked* sandbox
  ([`src/lib/daytona.ts`](src/lib/daytona.ts)). Fork was Daytona's newest primitive
  (launched 2026-07-10); FAAFO uses it as a safety instrument.
- **Braintrust** — scores the gate's decisions against the golden attack dataset and
  logs a shareable experiment ([`src/lib/braintrust.ts`](src/lib/braintrust.ts)).
- **Fireworks AI** — the agent "brain" that proposes actions
  ([`src/lib/llm.ts`](src/lib/llm.ts)); runs *outside* the sandbox by design.

## Run it

```bash
pnpm install
pnpm test        # 31 unit tests over the policy engine, blast-radius diff, parser, gateway
pnpm dev         # http://localhost:3000
```

With **no keys**, the app runs in deterministic **mock mode** and fully demos: the
attack suite, the blast-radius readout, and the scored catch-rate all work offline.
Add keys (see [`.env.example`](.env.example)) to run on real Daytona forks, log to
Braintrust, and use a Fireworks brain.

## What's measured live vs. deterministic

Honesty matters here, so the boundary is explicit:

- **Live mode** (Daytona key set): the action runs on a real fork. **File blast radius,
  exit code, and secret reads (via a canary honeytoken in the output) are genuinely
  measured.** Network egress is captured for standard tools (`curl`/`wget`/`nc`) via a
  PATH shim that logs the target host.
- **Mock mode** (no key): the attack-suite scenarios return their recorded observations;
  the free-text box uses a transparent static reading of the command. Clearly labeled
  `world: mock` in the UI.

Either way, the **policy engine, blast-radius diff, and scoring are the same code** — the
only difference is where the observation comes from.

## Built at

Daytona HackSprint #5 (San Francisco, 2026-07-24). The completely-new feature built at
the event is the entire gateway: fork-based speculative execution + the fail-closed
policy engine + the Braintrust-scored attack suite.
