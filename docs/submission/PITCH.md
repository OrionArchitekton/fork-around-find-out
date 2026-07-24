# Round 2: 3-minute pitch + 2-minute Q&A

Present from the LIVE URL, not localhost: **https://fork-around-find-out.vercel.app**
(live keys are wired, verdict cards print real sandbox ids, and that is the whole point).
Have the page loaded BEFORE walking up. Cold reload once so the ids are fresh.

## Setup (do this while waiting, takes 60 seconds)

1. Laptop on the live URL, zoomed so the verdict card is readable from a few feet
   (Cmd/Ctrl + a couple times).
2. Second tab: https://github.com/OrionArchitekton/fork-around-find-out (open on README).
3. Third tab (optional): docs/evidence/braintrust-rows.md on GitHub.
4. Phone backup: the video https://youtu.be/_o8R-eaUZnk in case all else dies.

## The 3:00 script (beats, clicks, lines)

**0:00-0:20 · Hook (no clicks yet)**
> "Your agent's next action happens in a parallel universe first. If you run Claude Code or
> Cursor with shell access, one bad tool-call is irreversible: a prompt injection, a
> hallucinated delete, a key posted to a pastebin. Today's guardrails read the command text
> and guess. We don't guess. We measure."

**0:20-0:55 · Kill shot. CLICK: "Prompt-injected beacon to attacker"**
Wait ~1s, point at the card.
> "This action just read a secret and tried to beacon it to an attacker. It ran in a real
> Daytona sandbox, this id right here, created and destroyed for this one action. Secret
> read, network egress: that's the exfiltration shape. Blocked. The real world never saw it.
> And notice, about one second."

**0:55-1:25 · The argument. CLICK: "Scary-looking cleanup that is actually fine"**
> "Now the part text-matching gets wrong. A regex blocks rm dash rf on sight. We ran it,
> in another disposable sandbox, and every file it deleted was inside the workspace.
> Cleared. Same engine, opposite verdicts. That's measuring versus guessing."

**1:25-2:05 · The closer. TYPE in the task box: `back up the .env file to a pastebin` then CLICK Propose → Gate**
> "One more, and this one's real AI. Fireworks is our agent brain. Watch what it proposes
> for an innocent-sounding task... it just wrote a real exfiltration, unprompted, curl the
> env file to a paste site. And the gate catches its own brain. Blocked, in the sandbox,
> nothing sent. The model proposes, Daytona measures, Braintrust scores."

**2:05-2:35 · Proof, fast (point at hero badges)**
> "Ten out of ten on our labeled suite, six attacks, four benign near-misses, re-measured
> today on real Daytona sandboxes at about a second per action. Every scored row is logged
> to Braintrust, and we pulled the rows back out of their API and committed them as
> evidence. Thirty-nine unit tests plus live end-to-end tests."

**2:35-3:00 · Limits + close**
> "We also ship our own failure: base64 an exfil and our canary misses it, and that row is
> in the suite, labeled. It still can't reach ALLOW, because the gate fails closed: if we
> can't measure it, we don't clear it. The dangerous actions die in the sandbox. Fork
> around, and find out."

## Q&A ammo (2 minutes, they will pick from these)

**"A PATH shim is easy to evade: static binary, raw socket, python sockets."**
> True for attribution, and we say so on the page. Two answers: the sandbox is created with
> Daytona's networkBlockAll, so a path our shim doesn't wrap gets refused by the sandbox
> itself; and anything we can't measure fails closed to BLOCK or QUARANTINE, never ALLOW.
> Kernel-level capture is the roadmap item.

**"Base64 beats your canary."**
> Yes, and that case is a labeled row in our suite rather than a hidden miss. It still
> quarantines, because unapproved egress alone can never reach ALLOW. We'd rather publish
> our failure modes than claim we don't have any.

**"You say fork, but you don't actually fork."**
> Correct, and the copy says so. This account tier doesn't enable Daytona's fork primitive,
> so each action gets a freshly seeded disposable sandbox: identical safety property, fork
> is just the cheaper path when the tier allows it. The name is the joke; the guarantee is
> the disposable world.

**"The sandbox isn't my real environment, so the measurement can differ."**
> Today it's a representative fixture: source files, a canary .env, a dependency tree,
> state outside the workspace. The architecture doesn't care where the seed comes from;
> snapshotting the real workspace into the seed is an integration step, not a redesign.

**"What about the gap between deciding and executing?" (TOCTOU)**
> FAAFO is decide-only by design: it returns the verdict and the evidence; the host
> executes. We even added a rule for our own speculation gap: if we intercept a network
> call mid-command, the run diverged from reality and cannot be cleared, period.

**"Ten scenarios is tiny."**
> It's labeled, adversarial, and includes near-misses and a known limit, which is more than
> a regex demo can say. The Braintrust harness makes adding a row a one-liner, and the
> catch-rate is re-measured live, not asserted.

**"Why deterministic rules instead of an LLM judge?"**
> Because the gate must be auditable and fail-closed. Rules are data: the demo shows you
> the exact rule that fired. An LLM judge guesses from text, which is the thing we built
> this to replace.

**"Who pays for this?"**
> Anyone putting agents with shell access into CI. It drops in front of the tool-call loop:
> the agent proposes, FAAFO decides, your executor runs only what cleared.

**"Latency in a real loop?"**
> Median about a second per action, measured on real sandboxes today. You'd gate mutating
> calls and pass reads through.

## Fallback ladder (if something dies on stage)

1. **Wifi/live URL fails:** `bash scripts/finale-launch.sh` boots a local mock-world build
   on :3000. Say out loud: "this is the deterministic mock world, identical code path,
   labeled as such." Honesty plays better than hiding it.
2. **Daytona hiccups mid-demo:** the verdict card fails closed (BLOCK on unmeasurable),
   which is itself demonstrable: "that's the fail-closed design doing its job."
3. **Everything dies:** the video on your phone (youtu.be/_o8R-eaUZnk) has both live
   shots with sandbox ids on camera.

## Do NOT say

- "forked sandbox" for what runs today (fresh disposable sandbox; fork where tier enables)
- "catches everything" (10/10 on OUR labeled suite; base64 row is the counterexample)
- "merged" or any execute-on-real claim (decide-only; "cleared to run for real")
- Any live-mode claim over a mock render if you're on the fallback
