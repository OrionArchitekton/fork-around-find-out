# DEMO_SCRIPT: Fork Around & Find Out (under 2:00, Devpost Round-1 instrument)

Round 1 is judged from this video plus the description, so the video carries the whole
argument. Structure follows what judges actually do: they decide in the first ten seconds
whether to keep watching, so the money beat opens the video instead of arriving at 0:54.

Capture against a LOCAL prod server with the sponsor keys loaded
(`pnpm build && doppler run -p daytona -c prd -- pnpm start`), so the live shots are real.
Each shot self-navigates via `goto` to a URL that server-renders a finished result into
the SSR HTML, so nothing races the capture.

- `?demo=<id>` renders the deterministic mock world (stable, identical every take).
- `?demo=<id>&live=1` measures on a REAL Daytona sandbox during SSR and prints the sandbox
  id on the verdict card. Use this for the live beats.

Target: 6 shots, about 1:45. One focus element per shot, one narration line.

---

### Shot 1: Cold open on the kill (0:00-0:12) <- the hook
**Goto:** `/?demo=injection-beacon&live=1`
**On screen:** red BLOCK verdict, "Secrets read: 1", "Net egress: 1", the fired rule
`exfiltration-secret-plus-egress`, and the real sandbox id on the verdict card.
**Narration:** "This agent just read a secret and tried to beacon it to an attacker. It
happened inside a throwaway Daytona sandbox, so the real world never saw it. That is Fork
Around and Find Out."

### Shot 2: The problem, fast (0:12-0:28)
**Goto:** `/` (hero)
**On screen:** hero headline and tagline.
**Narration:** "If you run Claude Code, Cursor, or any agent with shell access, one bad
tool-call is irreversible: a prompt injection, a hallucinated delete, a key posted to a
pastebin. Today's guardrails read the command text and guess."

### Shot 3: The idea (0:28-0:44)
**Goto:** `/` (the 5-step flow row)
**On screen:** Propose, fork world, run in fork, measure blast, decide.
**Narration:** "FAAFO does not guess. It runs the action in a disposable copy of your
world first, measures exactly what it touched, and only then decides. Think terraform
plan, but for agent actions."

### Shot 4: The near-miss, the whole differentiator (0:44-1:08) <- the argument
**Goto:** `/?demo=near-miss-rm-workspace&live=1`
**On screen:** green ALLOW on a recursive-delete command, "Files deleted: 1" visible, and
the sandbox id on the card.
**Narration:** "Here is the part text-matching gets wrong. A regex blocks this recursive
delete on sight. We ran it, measured it, and every file it removed was inside the
workspace. Cleared. The same engine that blocked the exfiltration clears the safe cleanup,
because it measured instead of guessing."

### Shot 5: Scored, with the limits shown (1:08-1:32)
**Goto:** `/` then the suite panel
**On screen:** "10/10 correct, 6 attacks, 4 benign near-misses", per-scenario ticks, and
the `limit-base64-obfuscated` row visible as QUARANTINE.
**Narration:** "Every verdict is scored against a labeled suite and logged to Braintrust.
Ten out of ten, and we re-ran the whole suite on real Daytona sandboxes at about a second
per action. We also ship our own failure: base64 hides the secret from our canary, so that
row only quarantines instead of blocking. Fail closed, and say so."

### Shot 6: Close (1:32-1:45)
**Goto:** `/` (footer and source link)
**On screen:** fail-closed badge, GitHub source link, "Built at Daytona HackSprint #5".
**Narration:** "Daytona for the disposable world, Braintrust for the proof, Fireworks for
the agent brain. The dangerous actions die in the fork. Fork around, and find out."

---

## Honesty notes (bind these before recording)

- Shots 1 and 4 are captured with `&live=1` against a real Daytona sandbox, with the
  sandbox id visible on screen. Never narrate "live Daytona" over a mock render. If a live
  shot fails to capture, fall back to the mock URL AND soften that line to "in a disposable
  sandbox", dropping the live claim.
- "10/10" is over the 10-scenario labeled suite. Say "ten out of ten on our labeled suite",
  never "catches everything".
- The live re-measurement (10/10, about a second per action) was run 2026-07-24. If the
  suite changes, re-run
  `FAAFO_LIVE_E2E=1 doppler run -p daytona -c prd -- npx vitest run suite.live`
  before repeating the number.
- Decide-only framing: ALLOW is "cleared to run for real", never "merged". No
  execute-to-real step exists in the product and the narration must not imply one.
- The base64 limitation is stated out loud in Shot 5. Keep it: a shown limit buys more
  credibility than a hidden one costs.
- Voiceover is ElevenLabs TTS via the agent-demo-video pipeline, which is why ElevenLabs
  appears in the Devpost sponsor list as a production tool, not a product integration. Do
  not imply it is wired into the gateway.
