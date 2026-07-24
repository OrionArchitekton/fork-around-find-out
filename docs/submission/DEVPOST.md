# Devpost submission: Fork Around & Find Out

Paste-ready for https://daytona-hacksprint-sf-jul-2026.devpost.com/ (deadline 3:30 PM PDT sharp).

---

## Team name
Fork Around & Find Out

## Team members
- Dan Mercede: dan.mercede@gmail.com, GitHub [@OrionArchitekton](https://github.com/OrionArchitekton), X [@danmercede](https://x.com/danmercede), [danmercede.com](https://danmercede.com)

(Solo build.)

## Elevator pitch (one line)
Your agent's next action happens in a parallel universe first: every risky tool-call runs in a forked Daytona sandbox, gets scored, and is only cleared to run for real if it passes a fail-closed policy gate.

## Demo video
<VIDEO_URL_PLACEHOLDER>  (YouTube, under 2 minutes)

## Public GitHub repo
https://github.com/OrionArchitekton/fork-around-find-out

## Live demo
https://fork-around-find-out.vercel.app

(The public demo runs in deterministic mock mode: recorded real observations through the
exact same policy and blast-radius code path as live mode; only the observation source
differs. With Daytona keys set it measures on real forks.)

---

## Project description

**Summary (2-3 sentences).** Fork Around & Find Out (FAAFO) is a fail-closed safety gateway
for autonomous agents. Before an agent's tool-call touches anything real, FAAFO forks a
Daytona sandbox, runs the action in the fork, measures the exact blast radius, and only clears
the action to run for real if it passes policy. The dangerous actions die in the fork, having
touched nothing.

**The problem and its impact.** Autonomous agents are getting write access to real systems:
shells, repos, cloud accounts, payment APIs. The moment an agent can act, one bad tool-call (a
prompt injection, a hallucinated `rm -rf`, a secret quietly POSTed to a pastebin) is
irreversible. Today's guardrails try to *guess* whether an action is dangerous by reading its
text. FAAFO doesn't guess: it runs the action in a disposable copy of the world and watches
what it actually does. This is the difference between a crash test (pre-production) and a
seatbelt (every action, live).

**Key technical architecture and components.**
- **Fork-based speculative execution.** On each proposed action, FAAFO forks a Daytona
  sandbox (Daytona's sandbox fork primitive), runs the action in the fork, and throws the fork
  away. A rejected action is never cleared to run for real.
- **Blast-radius measurement.** The fork run is diffed to a structured reading: files
  created / modified / deleted, network egress (captured via a PATH shim over `curl`/`wget`/`nc`,
  including IP-literal targets), and secret reads detected by a canary honeytoken seeded into
  the workspace `.env`. The shim also captures request payloads (`@file` arguments and piped
  stdin), so a secret sent in a request *body* is caught, not just one echoed to stdout.
- **Fail-closed policy engine.** Pure, deterministic rules turn the blast radius into
  `ALLOW` / `QUARANTINE` / `BLOCK`. The signature rule encodes the "Rule of Two": an action
  that both reads a secret and opens a network connection is the exfiltration shape and is
  blocked outright. If the fork can't be measured (or no real isolation is available), the
  action is blocked, never guessed.
- **Braintrust-scored attack suite.** Every verdict is scored against a labeled dataset of
  benign and malicious actions, producing a real catch-rate (harmful caught) and pass-rate
  (benign cleared); scored rows are logged to a Braintrust project.
- **Fireworks agent brain.** A natural-language task is turned into a concrete action by a
  Fireworks-hosted model that runs *outside* the sandbox by design (the model proposes, the
  fork disposes).
- 31 unit tests over the policy engine, blast-radius diff, parser, and gateway. Next.js +
  server routes; runs in deterministic mock mode with no keys and on real Daytona forks when
  keys are set.

**Sponsor tools used and how they were integrated.**
- **Daytona**: the core primitive. Actions execute in a *forked* Daytona sandbox
  (sandbox fork / snapshot); file blast radius, exit code, and canary-based secret reads
  (including secrets sent in a request body) are measured on the real fork. `src/lib/daytona.ts`.
- **Braintrust**: the verification leg. The gate's decisions are scored against the labeled
  attack suite and the scored rows are logged to a Braintrust project. `src/lib/braintrust.ts`.
- **Fireworks AI**: the agent brain that proposes actions from a natural-language task.
  `src/lib/llm.ts`.
- **CodeRabbit / CopilotKit / WorkOS / ElevenLabs**: not integrated in this build; we
  targeted the Daytona + Braintrust + Fireworks loop where the safety story is load-bearing
  rather than garnish.

**What was built at the event.** The entire gateway is new, built at HackSprint #5: fork-based
speculative execution, the fail-closed policy engine, the blast-radius diff, and the
Braintrust-scored attack suite. Nothing was scaffolded before the build window.
