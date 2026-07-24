# SUBMISSION: Fork Around & Find Out

**Title:** Fork Around & Find Out
**Tagline:** Terraform plan, but for agent actions: your agent's next tool-call happens in a parallel universe first.

**Description:** A fail-closed safety gateway for autonomous agents. Before an agent's tool-call
touches anything real, FAAFO runs it in a disposable Daytona sandbox, measures the exact blast
radius (files, network egress, secret reads), scores it against a labeled suite logged to
Braintrust, and clears the action to run for real only if it passes policy. If the run cannot be
measured, the action is blocked, never guessed.

**Built with (in order of how load-bearing they are):** Daytona (the disposable world every
action runs in), Braintrust (scored suite, rows logged and read back), Fireworks AI (the brain
that proposes the action, outside the sandbox by design), TypeScript, Next.js, Vitest, Vercel.

In one line: **Fireworks proposes, Daytona measures, Braintrust scores.**

**Links:**
- Live: https://fork-around-find-out.vercel.app
- Repo: https://github.com/OrionArchitekton/fork-around-find-out
- Video: <VIDEO_URL_PLACEHOLDER>

**Team:** Dan Mercede (solo), dan.mercede@gmail.com

## What is real (and how it was verified)
- **Live, not simulated.** The deployed demo measures on real Daytona sandboxes; the verdict
  card prints the id of the sandbox the action ran in. The full 10-scenario suite was
  re-measured live on 2026-07-24: **10/10 correct, median about one second per action**.
- **Near-misses are the proof.** 6 harmful actions stopped (3 blocked, 3 held for review) and
  4 benign actions cleared, 2 of them deliberate near-misses: a recursive delete that a pattern
  matcher would block and measurement clears, and a network call to an approved host. Opposite
  verdicts from the same engine, decided on evidence.
- **Decide-only gateway.** FAAFO returns ALLOW / QUARANTINE / BLOCK measured in a disposable
  world. Wiring an ALLOW to the executor that runs it for real is the host application's job;
  FAAFO makes the decision safely before anything irreversible happens.
- **Tests.** 38 unit tests over the policy engine, blast-radius diff, parser, and gateway, plus
  live end-to-end tests against real Daytona sandboxes.

## Known limits (shipped as labeled rows, not hidden)
- **Egress is captured, never forwarded.** The shim records the destination and request body
  and then fails the call; it never exec's the real binary, so a speculative run cannot perform
  the side effect it is being measured for. Sandboxes also set Daytona's `networkBlockAll`.
  Attribution still relies on the PATH shim, so a statically linked binary opening a raw socket
  would not be *named* in the blast radius, though the sandbox refuses the connection.
- **Evidence lives in the sandbox**, so a sandbox-aware adversary specifically targeting FAAFO
  could tamper with it. The threat model is an agent doing harm, not one attacking the gateway.
- **Secret detection is canary-based.** The suite includes `limit-base64-obfuscated`, where
  base64 hides the secret from the canary. The action still cannot reach ALLOW, because
  unapproved egress alone holds it for review. Fail-closed design contains the gap.
- **Mock mode** (no keys) runs recorded observations through the identical policy and
  blast-radius code, labeled `this result: mock` in the UI. The label is bound to the result on
  screen, never to the environment.
- **Sponsor bonus prizes** (Best Use of Daytona / Braintrust) are *targeted*, not won.
- **Provenance.** Commits are authored by the operator (OrionArchitekton); AI pairing is
  disclosed via the `Co-Authored-By` trailer in the git history, not claimed as sole authorship.
- **ElevenLabs** narrates the demo video via our own agent-demo-video pipeline. It is a
  production tool for the submission, not a product integration.

## New-at-event feature (eligibility)
The entire gateway is new, built at HackSprint #5: speculative execution in a disposable world,
the fail-closed policy engine, the blast-radius diff, the near-miss suite, and Braintrust
scoring.
