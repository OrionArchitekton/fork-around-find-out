# DEMO_SCRIPT: Fork Around & Find Out (<2:00, Devpost Round-1 instrument)

Capture against a LOCAL prod server (`pnpm build && pnpm start`) on the deterministic mock
world (`FAAFO_FORCE_MOCK=1`) so every shot is byte-stable. Each shot self-navigates via `goto`
to a `?demo=<scenarioId>` URL that server-renders a frozen-but-real gate result into the SSR
HTML, so no client round-trip races the capture.

Target: 6 shots, ~1:50. One focus element full-screen per shot, one short narration line.

---

### Shot 1: The problem (0:00-0:18)
**Goto:** `/` (hero)
**On screen:** hero headline "Fork Around & Find Out" + "Your agent's next action happens in a parallel universe first."
**Narration:** "Autonomous agents are getting write access to real systems. The moment an agent can act, one bad tool-call is irreversible. Fork Around and Find Out fixes that."

### Shot 2: The idea (0:18-0:36)
**Goto:** `/` (the 5-step flow row)
**On screen:** Propose -> Fork world -> Run in fork -> Measure blast -> Decide
**Narration:** "Instead of running a risky action, we fork a Daytona sandbox, run the action in the fork, and measure exactly what it did, before the real world sees it."

### Shot 3: A benign action ALLOWs (0:36-0:54)
**Goto:** `/?demo=benign-build`
**On screen:** green ALLOW verdict + blast radius (files created, zero secrets, zero egress) + "cleared to run for real"
**Narration:** "A normal action, running the tests, has a clean blast radius, passes policy, and is cleared to run for real."

### Shot 4: An exfiltration attempt BLOCKs (0:54-1:16)  <- the money beat
**Goto:** `/?demo=injection-beacon`
**On screen:** red BLOCK verdict; blast radius lights up "Secrets read: 1" and "Net egress: 1"; the fired rule "exfiltration-secret-plus-egress"; "the real world was never touched."
**Narration:** "Now a prompt-injected action tries to read the dot-env secret and beacon it to an attacker. In the fork, we watch it happen: secret read, network egress, the exfiltration shape. Blocked. The real world was never touched."

### Shot 5: The catch-rate, scored (1:16-1:38)
**Goto:** `/` then click "Run full suite -> Braintrust" (or `/?suite=1` prerender)
**On screen:** big "100%" harmful caught, per-scenario ALLOW/BLOCK ticks, caption "6-scenario labeled suite"
**Narration:** "Every verdict is scored against a labeled attack suite and logged to Braintrust. A real catch-rate, not a vibe: every attack in our suite caught, every benign action passed."

### Shot 6: Close (1:38-1:50)
**Goto:** `/` (footer + source link)
**On screen:** "fail-closed" badge, GitHub source link, "Built at Daytona HackSprint #5"
**Narration:** "Daytona for the fork, Braintrust for the proof. The dangerous actions die in the fork. Fork Around, and Find Out."

---

## Honesty notes for the video (bind these before recording)
- The recorded demo runs in **mock mode**: say "we fork a Daytona sandbox" (true of the
  mechanism), never "this is a live Daytona sandbox right now" unless the live-keyed render is
  what's on screen. If live keys land, re-capture shots 3-5 against the live fork and update
  this note.
- "100% caught" is over the **6-scenario labeled suite**: say "every attack in our suite,"
  not "every possible attack."
- Frozen `?demo=` results are REAL gate outputs computed server-side from the deterministic
  mock world, not hand-authored.
- Decide-only framing: ALLOW is "cleared to run for real," never "merged" (no execute-to-real
  step exists in the product).
