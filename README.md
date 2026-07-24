# Fork Around & Find Out

**Your agent's next action happens in a parallel universe first.**

Autonomous agents are getting write access to real systems: shells, repos, cloud accounts,
payment APIs. The moment an agent can *act*, one bad tool-call (a prompt injection, a
hallucinated `rm -rf`, a secret quietly POSTed to a pastebin) is irreversible. Text-based
guardrails try to guess whether an action is dangerous by reading it. **We don't guess. We run
it in a fork and watch what it actually does.**

Fork Around & Find Out (FAAFO) is a fail-closed decision gateway for agent tool-calls:

1. An agent proposes an action (a shell command).
2. Instead of running it for real, the gateway **forks the Daytona sandbox** (an isolated clone
   of the workspace) and runs the action **in the fork**.
3. We measure the exact **blast radius**: files created / modified / deleted, network egress,
   and whether the action read a seeded secret honeytoken (caught even when the secret is sent
   in a request *body*, not just echoed to stdout).
4. A **fail-closed policy engine** turns that blast radius into `ALLOW` / `QUARANTINE` /
   `BLOCK`. Only an `ALLOW` is cleared to run for real. Everything else dies in the fork, having
   touched nothing real.
5. Every verdict is scored against a **labeled attack suite** and the scored rows are logged to
   **Braintrust**, so the catch-rate is a real number, not a vibe.

If the fork can't be measured, the action is **blocked, never guessed.**

## Why this is different

The winning pattern at past HackSprints is "agents that test agents", but those run
*pre-production*. FAAFO is a **runtime gateway**: it sits in front of *every* action an agent
takes, live, and decides per-action. It's the difference between a crash test and a seatbelt.

It is a **decide-only** gateway by design: it returns an `ALLOW` / `QUARANTINE` / `BLOCK`
verdict measured in a disposable fork. Wiring the `ALLOW` verdict to the executor that then
runs the action for real is the host's job; FAAFO's job is to make that decision safely, on
evidence, before anything irreversible happens.

## The safety model (Rule of Two, made executable)

A single action that both **reads a secret** and **opens a network connection** is the classic
exfiltration shape, so FAAFO blocks it outright even though each half looks benign alone. That
rule, and the others, are *data*, so the demo shows you the exact rule that fired. See
[`src/lib/policy.ts`](src/lib/policy.ts).

## Sponsor stack

- **Daytona** is the fork/sandbox world. Actions execute in a *forked* sandbox
  ([`src/lib/daytona.ts`](src/lib/daytona.ts)) using Daytona's sandbox fork primitive. File
  blast radius, exit code, and canary-based secret reads are measured on the real fork.
- **Braintrust** is the verification leg. The gate's decisions are scored against the labeled
  attack suite, and each scored row is logged to a Braintrust project
  ([`src/lib/braintrust.ts`](src/lib/braintrust.ts)).
- **Fireworks AI** is the agent "brain" that proposes actions
  ([`src/lib/llm.ts`](src/lib/llm.ts)), running *outside* the sandbox by design.

## Run it

```bash
pnpm install
pnpm test        # 31 unit tests over the policy engine, blast-radius diff, parser, gateway
pnpm dev         # http://localhost:3000
```

With **no keys**, the app runs in deterministic **mock mode** and fully demos: the attack
suite, the blast-radius readout, and the scored catch-rate all work offline. Add keys (see
[`.env.example`](.env.example)) to run on real Daytona forks, log to Braintrust, and use a
Fireworks brain.

## What's measured live vs. deterministic

Honesty matters here, so the boundary is explicit:

- **Live mode** (Daytona key set): the action runs on a real fork. **File blast radius, exit
  code, and secret reads are genuinely measured.** Secret reads are detected with a canary
  honeytoken seeded into `/workspace/.env`; the network shim captures both `@file` arguments
  and piped stdin, so a secret sent in a request body is caught, not just one echoed to stdout.
  Network egress is captured for standard tools (`curl`/`wget`/`nc`) via a PATH shim that logs
  the target host. If no real fork or snapshot isolation is available, the run fails closed
  (`BLOCK`), never silently running in the base world.
- **Mock mode** (no key): the attack-suite scenarios return recorded real observations; the
  free-text box uses a transparent static reading of the command. Labeled `world: mock` in the
  UI. The policy engine, blast-radius diff, and scoring are the **same code** in both modes;
  only the source of the observation differs.

## Built at

Daytona HackSprint #5 (San Francisco, 2026-07-24). The completely new feature built at the
event is the entire gateway: fork-based speculative execution, the fail-closed policy engine,
the blast-radius diff, and the Braintrust-scored attack suite.
