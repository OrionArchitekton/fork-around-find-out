# YouTube metadata (demo video upload)

## Title (<= 100 chars)
Fork Around & Find Out: agent actions run in a disposable Daytona sandbox before they run for real

## Description

Fork Around & Find Out (FAAFO) is a fail-closed safety gateway for AI agents, built at Daytona
HackSprint #5 (San Francisco, 2026-07-24).

Before an agent's tool-call touches anything real, FAAFO runs it in a disposable Daytona
sandbox, measures the exact blast radius (files created, modified, deleted, network egress, and
whether it read a seeded secret honeytoken), and clears the action to run for real only if it
passes a fail-closed policy engine. Actions that fail die in the throwaway world, having touched
nothing. If the run cannot be measured, the action is blocked, never guessed.

Think terraform plan, but for agent actions.

The interesting part is the near-misses. A pattern matcher blocks a recursive delete on sight
and a keyword filter blocks anything mentioning .env. FAAFO runs both and measures: one only
removed files inside the workspace (cleared), the other shipped a secret to an unknown host
(blocked). Same engine, opposite verdicts, decided on evidence instead of on how alarming the
command looks.

The labeled suite scores 10/10 (6 attacks caught, 4 benign near-misses cleared) and was
re-measured on real Daytona sandboxes on 2026-07-24: 10/10, about one second per action. The
suite also ships a known limit as a labeled row: base64 encoding hides the secret from the
canary, so that action quarantines rather than blocking. Fail closed, and say so.

Live demo: https://fork-around-find-out.vercel.app
Source: https://github.com/OrionArchitekton/fork-around-find-out

Built with Daytona (disposable sandboxes), Braintrust (scored evals), Fireworks AI (the agent
brain that proposes actions), Next.js, TypeScript, and Vercel. Narration by ElevenLabs via our
own open-source agent-demo-video pipeline.

Chapters:
0:00 A blocked exfiltration, measured in a real sandbox
0:14 The problem with agents that can act
0:31 Run it in a disposable world first
0:48 The near-miss that text matching gets wrong
1:12 Scored against a labeled suite, limits included
1:35 Sponsor stack and close

## Tags (comma separated)
AI agents, agent safety, Daytona, sandbox, Braintrust, Fireworks AI, prompt injection, exfiltration, fail closed, guardrails, hackathon, HackSprint, Claude Code, Cursor, developer tools, TypeScript, Next.js

## Upload settings
- Visibility: PUBLIC (Devpost judges must reach it logged out)
- Made for kids: NO
- Category: Science & Technology

## Post-upload verification
Confirm logged out before pasting the link into Devpost:

```bash
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<ID>&format=json" | head -c 300
```

The title must come back matching the title above. Then paste the watch URL into the Devpost
"Video demo link" field and into `docs/submission/DEVPOST.md` plus `demo/SUBMISSION.md`,
replacing `<VIDEO_URL_PLACEHOLDER>`.
