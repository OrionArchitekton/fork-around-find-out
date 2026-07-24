# FAAFO demo video (pipeline script, generated from docs/DEMO_SCRIPT.md)

Under 2:00 hard cap. Shots 1 and 4 render against a real Daytona sandbox (&live=1).

### SHOT kill
- target: dashboard
- url: /?demo=injection-beacon&live=1
- narration: This agent just read a secret and tried to beacon it out to an attacker. It happened inside a throwaway Daytona sandbox, so the real world never saw it. That is Fork Around and Find Out.
- action: goto url="/?demo=injection-beacon&live=1"
- action: wait ms=1200
- action: highlight selector=".verdict"
- action: wait ms=1200

### SHOT problem
- target: dashboard
- url: /
- narration: If you run Claude Code, Cursor, or any agent with shell access, one bad tool call is irreversible. A prompt injection, a hallucinated delete, a key posted to a pastebin. Most of today's guardrails read the command text and guess.
- action: goto url="/"
- action: wait ms=900
- action: highlight selector=".hero"
- action: wait ms=1200

### SHOT idea
- target: dashboard
- url: /
- narration: FAAFO does not guess. It runs the action in a disposable stand-in for your world, measures what it actually touched, and only then decides. Think terraform plan, but for agent actions.
- action: goto url="/"
- action: wait ms=900
- action: scroll selector=".foot"
- action: wait ms=1600

### SHOT nearmiss
- target: dashboard
- url: /?demo=near-miss-rm-workspace&live=1
- narration: Here is the part that text matching gets wrong. A pattern matcher would block this recursive delete on sight. We ran it, measured it, and every file it removed was inside the workspace. Cleared. The same engine that blocked the exfiltration clears the safe cleanup, because it measured instead of guessing.
- action: goto url="/?demo=near-miss-rm-workspace&live=1"
- action: wait ms=1200
- action: highlight selector=".verdict"
- action: wait ms=1200
- action: highlight selector=".blast"
- action: wait ms=1400

### SHOT scored
- target: dashboard
- url: /
- narration: The labeled suite is scored end to end, and those scored rows log to Braintrust. Ten out of ten, and we re-ran the whole suite on real Daytona sandboxes at about a second per action. We also ship our own failure. Base64 hides the secret from our canary, so that row only quarantines instead of blocking. Fail closed, and say so.
- action: goto url="/"
- action: wait ms=800
- action: highlight selector=".badges"
- action: wait ms=1800

### SHOT close
- target: dashboard
- url: /
- narration: Daytona for the disposable world, Braintrust for the proof, Fireworks for the agent brain. The dangerous actions die in a throwaway sandbox. Fork around, and find out.
- action: goto url="/"
- action: wait ms=700
- action: scroll selector=".foot"
- action: wait ms=1600
