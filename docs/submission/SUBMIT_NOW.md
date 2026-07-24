# SUBMIT NOW: two operator steps, everything else is staged

Deadline: **3:30 PM PDT sharp, today (2026-07-24)**. Target submitting by 3:00.

---

## Step 1: upload the video to YouTube (about 3 minutes)

The finished cut is on your Windows desktop: **`FAAFO-demo.mp4`** (1:43, 17 MB, 1080p).
Captions are next to it as `FAAFO-captions.srt` (optional, YouTube auto-captions are fine).

1. Go to https://studio.youtube.com and click **Create > Upload videos**.
2. Drop in `FAAFO-demo.mp4`.
3. Under Thumbnail, upload **`FAAFO-thumbnail.png`** from the desktop.
4. Paste the title and description from
   [`docs/submission/YOUTUBE.md`](YOUTUBE.md) (title, description with chapters, tags all
   written and dash-clean).
4. **Not made for kids.**
5. Visibility: **PUBLIC** (judges must reach it while logged out).
6. Publish, then copy the watch URL.

Verify it is reachable logged out:

```bash
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<ID>&format=json" | head -c 200
```

## Step 1b: gallery screenshots (30 seconds)

Four screenshots are on your desktop too (`01-` through `04-`), captured from the live
deploy. Three are real Daytona runs and print the sandbox id they measured in. Captions,
already under Devpost's 140-character limit, are in
[`SCREENSHOT_CAPTIONS.md`](SCREENSHOT_CAPTIONS.md). Upload them in numbered order.

## Step 2: create the Devpost project and paste

Devpost's "Create project" is invisible-reCAPTCHA gated and re-challenges every automated
click, so this step is yours; you pass it instantly as a human.

1. Go to https://daytona-hacksprint-sf-jul-2026.devpost.com/ and start a project.
2. Copy each field from [`docs/submission/DEVPOST.md`](DEVPOST.md). It is written to paste
   straight in: team name, team members, elevator pitch, full description (problem, the
   near-miss table, architecture, verification, stated limits, sponsor tools), repo link,
   live link.
3. Paste the YouTube URL into the video field.
4. Submit.

---

## The 60-second judge path (if a judge asks what to click)

1. Open https://fork-around-find-out.vercel.app (a finished BLOCK verdict is already on
   screen, no clicks needed).
2. Click **Prompt-injected beacon to attacker**. It measures on a real Daytona sandbox and
   prints the sandbox id it ran in.
3. Click **Scary-looking cleanup that is actually fine**. Same engine, ALLOW, because the
   recursive delete stayed inside the workspace.

That contrast is the whole pitch: measuring beats guessing.

## Numbers that are safe to say out loud

- **10/10** on the labeled suite: 6 harmful stopped (3 blocked, 3 held for review), 4 benign
  cleared, 2 of them deliberate near-misses.
- The suite was **re-measured on real Daytona sandboxes today**, 10/10, median about a
  second per action.
- **38 unit tests** plus live end-to-end tests against real sandboxes.
- Network calls are **captured, never forwarded**: the shim records destination and body and
  fails the call, so a speculative run cannot perform the side effect.

## What NOT to claim

- Do not say we fork a sandbox per action. Forking is unavailable on this account tier, so
  each action gets its own freshly seeded disposable sandbox. Same guarantee, different
  mechanism, and the copy already says so.
- Do not say the gate catches everything. Base64 encoding defeats the canary; that case is
  shipped as a labeled row and quarantines instead of blocking.
- ALLOW means "cleared to run for real", never "merged". FAAFO decides; the host executes.
