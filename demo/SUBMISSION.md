# SUBMISSION: Fork Around & Find Out

**Title:** Fork Around & Find Out
**Tagline:** Terraform plan, but for agent actions: your agent's next tool-call happens in a parallel universe first.

**Description:** A fail-closed safety gateway for autonomous agents. Before an agent's tool-call
touches anything real, FAAFO runs it in a disposable Daytona sandbox, measures the exact blast
radius (files, network egress, secret reads), scores it against a labeled suite logged to
Braintrust, and clears the action to run for real only if it passes policy. If the run cannot be
measured, the action is blocked, never guessed.

**Built with:** TypeScript, Next.js, Daytona (disposable sandboxes), Braintrust (evals),
Fireworks AI (agent brain), Vitest, Vercel.

**Links:**
- Live: https://fork-around-find-out.vercel.app
- Repo: https://github.com/OrionArchitekton/fork-around-find-out
- Video: <VIDEO_URL_PLACEHOLDER>

**Team:** Dan Mercede (solo), dan.mercede@gmail.com

## What is real (and how it was verified)
- **Live, not simulated.** The deployed demo measures on real Daytona sandboxes; the verdict
  card prints the id of the sandbox the action ran in. The full 10-scenario suite was
  re-measured live on 2026-07-24: **10/10 correct, about one second per action**.
- **Near-misses are the proof.** 6 attacks and 4 benign near-misses, including a recursive
  delete that a regex would block and measurement clears, and a network call to an approved
  host. Opposite verdicts from the same engine, decided on evidence.
- **Decide-only gateway.** FAAFO returns ALLOW / QUARANTINE / BLOCK measured in a disposable
  world. Wiring an ALLOW to the executor that runs it for real is the host application's job;
  FAAFO makes the decision safely before anything irreversible happens.
- **Tests.** 34 unit tests over the policy engine, blast-radius diff, parser, and gateway, plus
  live end-to-end tests against real Daytona sandboxes.

## Known limits (shipped as labeled rows, not hidden)
- **Egress capture** uses a PATH shim over `curl`/`wget`/`nc`, not a kernel-level tap: a
  statically linked binary opening a raw socket would evade it.
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
