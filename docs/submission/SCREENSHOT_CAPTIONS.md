# Devpost gallery captions (upload order, each under 140 chars)

Screenshots live in `docs/screenshots/`, captured from the live deploy. Shots 1, 2 and 4 are
real Daytona runs and each prints the id of the sandbox it measured in.

**1. `01-block-exfiltration.png`**
> A prompt-injected beacon reads the .env and calls an attacker host. Measured in a real Daytona sandbox, blocked, nothing sent.

**2. `02-allow-near-miss.png`**
> The near-miss: a regex blocks this recursive delete on sight. Measured, every file removed was inside the workspace, so it clears.

**3. `03-landing-suite.png`**
> The labeled suite: 6 harmful, 4 benign, scored 10/10 and logged to Braintrust. Deterministic mock render, labeled as such.

**4. `04-quarantine-secret-read.png`**
> Reading a secret with no egress is not exfiltration. Held for review rather than blocked, so the gate is not a blunt keyword filter.

**5. `05-mobile.png`** (optional, only if the gallery has room)
> The demo is usable on a phone, so a judge can check it from the floor.

If the gallery allows a sixth, screenshot the Braintrust project rows
(`docs/evidence/braintrust-rows.md` has the same data, read back from the API):
> Every verdict scored against ground truth and logged to Braintrust, then read back out of the API to prove the rows are really there.
