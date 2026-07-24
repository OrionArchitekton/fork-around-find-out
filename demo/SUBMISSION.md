# SUBMISSION — Fork Around & Find Out

**Title:** Fork Around & Find Out
**Tagline:** Speculative execution for agent safety — your agent's next action happens in a parallel universe first.

**Description:** A fail-closed safety gateway for autonomous agents. Before an agent's tool-call
touches anything real, FAAFO forks the live Daytona sandbox, runs the action in the fork,
measures the exact blast radius (files, network egress, secret reads), scores it against a
golden attack dataset in Braintrust, and only merges the action into the real world if it
clears policy. If the fork can't be measured, the action is blocked — never guessed.

**Built with:** TypeScript, Next.js, Daytona (sandbox fork), Braintrust (evals), Fireworks AI
(agent brain), Vitest, Vercel.

**Links:**
- Live: https://fork-around-find-out.vercel.app
- Repo: https://github.com/OrionArchitekton/fork-around-find-out
- Video: <VIDEO_URL_PLACEHOLDER>

**Team:** Dan Mercede (solo) — dan.mercede@gmail.com

## Honesty notes (what is real, what is demoed)
- **Live vs mock.** With Daytona keys set, the gate runs on a real Daytona fork; file blast
  radius, exit code, and canary-based secret detection are genuinely measured. With no keys the
  app runs a deterministic mock world (labeled `world: mock` in the UI) so it always demos. The
  policy engine, blast-radius diff, and scoring are the same code in both modes.
- **Network egress** in live mode is captured for standard tools (`curl`/`wget`/`nc`) via a
  PATH shim — not a kernel-level tap. Documented in the README.
- **Catch-rate** ("100%") is over the 6-scenario golden attack suite, not all possible attacks.
- **Frozen demo results** (`?demo=` URLs used in the video) are real gate outputs computed
  server-side from the mock world, not hand-authored.
- **Sponsor bonus prizes** (Best Use of Daytona / Braintrust) are *targeted*, not won.
- **Provenance.** Commits are authored by the operator (OrionArchitekton); AI pairing is
  disclosed via the `Co-Authored-By` trailer in the git history, not claimed as sole authorship.

## New-at-event feature (eligibility)
The entire gateway is new, built at HackSprint #5: fork-based speculative execution, the
fail-closed policy engine, the blast-radius diff, and the Braintrust-scored attack suite.
