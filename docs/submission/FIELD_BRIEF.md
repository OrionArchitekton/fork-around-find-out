# Field brief: who you are actually up against (48 entries)

## The one fact that defuses the worst question

**Every same-lane rival is ALSO decide-only.** Verified in their code/writeups: SafeCommit
terminates at `SAFE_TO_COMMIT` with `productionCommitExecuted=false`; Airlock has no
execute/release/promote path anywhere in source. So "you don't actually run the cleared action"
is a property of the whole category, not a FAAFO weakness. Do not get defensive about it.

> "Nobody in this category executes, including the entries you just saw. Deciding safely before
> anything irreversible IS the product; wiring ALLOW to your executor is a one-line integration."

## The five entries that can beat you

| Entry | Why it is dangerous | Your counter |
|---|---|---|
| **SafeCommit** | Closest thing to a twin: fail-closed gate, same sponsor stack, deeper Braintrust (named dataset, hard-gate scorers, 2 experiments), measures REAL MySQL state | It gates one domain (DB commits). You gate any shell tool-call, and you show DISCRIMINATION: same engine clears the scary action and blocks the benign-looking one. Also decide-only. |
| **RabbitWall (Aegis)** | Closes the loop (generates fix, opens counter-PR), 5 sponsor lanes, same vocabulary | Their gate was only ever observed PASSING (0.996). No labeled suite, no adversarial ground truth. Ask yourself: how do they know it blocks anything? You have 10/10 on labeled attacks re-measured live. |
| **Airlock** (Nelson Lai) | Real novel finding against a real shipping package (@insforge/cli@0.2.1), owns CodeRabbit lane | Different object: they admit/deny a package at INSTALL time, you gate every tool-call at RUNTIME. Crash test vs seatbelt. Also decide-only. |
| **Reactor** | Harder threat model (temporal rug-pull across serves), which single-snapshot analysis cannot see | Real and worth conceding gracefully. But their Daytona is opt-in (`REACTOR_DRIVER=daytona`), default chamber is a local throwaway tree, and they have ZERO Braintrust at a Braintrust-sponsored event. |
| **Katena** | 24 exploit rows vs your 10, explicit false-positive control, 241 tests | No demo video, no live surface, terminal tables only. You can land a verdict on stage in ~1s with a real sandbox id. |

## Sponsor lanes, honestly

**Best Daytona** — your strongest lane but NOT a lock. **Ovehacked** (6 concurrent sandboxes in
~1.5s, per-agent isolation) is a harder Daytona workload than your serial cold-seed, and
**SafeCommit** ships a custom pre-baked MySQL snapshot. Your claim: Daytona is the *decision
substrate*, not a compute pool. Every verdict prints the id of the sandbox it was measured in,
and if no sandbox can be created the action is BLOCKED, never guessed. Isolation is load-bearing
for correctness, not just parallelism.

**Best Braintrust** — you are NOT the deepest here. ForkLab (root trace + 8 child spans + 3 eval
suites), SafeCommit, Katena, and Significance Layer all use more native Braintrust surface than
your `initLogger` path. Your honest edge: you *read the rows back out of the API* and committed
them as evidence, so the catch-rate is auditable rather than asserted. Lead with auditability,
not depth, and do not claim to be the deepest integration.

**Best Fireworks** — Test with Kevin and SafeCommit are ahead. Do not chase it.

## Q&A landmines (they WILL ask these)

**"How is this different from Airlock / SafeCommit?"**
> Same instinct, different object. Airlock admits or denies a package at install time; SafeCommit
> gates database commits. FAAFO gates any tool-call at runtime, and the thing neither shows is
> discrimination: the same engine clears `rm -rf ./node_modules` and blocks `cat .env | curl`.
> That contrast is the product.

**"RabbitWall actually fixes the problem. You just say no."**
> Their gate has only been observed passing; there is no labeled adversarial suite behind it.
> Ours is 10/10 against labeled attacks AND benign near-misses, re-measured live today. A gate
> you have never watched fire is not a demonstrated gate.

**"Katena has 24 scenarios with false-positive control. You have 10."**
> Fair, and theirs is a good suite. Mine has explicit benign near-misses, which IS false-positive
> control, plus a shipped known-limit row. And I can land a verdict live on a real sandbox in
> about a second; they ship terminal tables.

**"Reactor catches rug-pulls over time. You only see one action."**
> True, and that is a genuinely harder threat model. Different axis: they admit artifacts, I gate
> actions. Worth noting their Daytona path is opt-in and their default chamber is a local tree.

## Pitch adjustments given this field

1. **Lead harder on the near-miss.** It is your only genuinely uncontested differentiator. In a
   field of five sandbox-and-quarantine entries, you are the one showing the gate CLEARING
   something scary. Move it earlier if you sense the judges have seen an Airlock.
2. **Say "decide-only" first, proudly**, before anyone frames it as a gap. Everyone here is.
3. **Do not oversell Braintrust depth.** Say "auditable": rows read back out of the API.
4. **Keep the base64 limit line.** In this field, several entries claim gates nobody watched
   fire. Shipping your own failure is a credibility move that lands harder than another 9s.
