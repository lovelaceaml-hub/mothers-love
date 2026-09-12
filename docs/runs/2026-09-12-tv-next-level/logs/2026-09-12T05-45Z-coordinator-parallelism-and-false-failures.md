# Running every lane at once, and the false failures it produces

2026-09-12T05:45Z, coordinator (Opus 5 high). Anthony's instruction: "you should be running every single section at the same time in its own lane. One being reworked or stopped shouldn't affect the other work."

## What changed

Lane **writing** was already fully concurrent; up to six agy dispatches ran at once. What was serial was lane **verification**: the Playwright suites ran one lane at a time, on the Plan 13 runner lesson that parallel suites flake. That serialization is what made a reworked lane appear to hold up the others, and it is now gone. Each lane verifies in its own worktree, on its own port, through `scratchpad/full-lane.sh`: typecheck, vitest, lint, globals, build, seven probe runs, then its own Playwright suite at `--workers=1`, all lanes at once.

## The cost, measured rather than assumed

With eight lanes verifying simultaneously on a machine with the CPU count recorded above, four lanes reported vitest failures at once. They were not real:

- transitions: 2 failed, both in `tests/color-polish-data/query.test.ts`
- status: 7 failed, in the same file plus the strict-TLS pool tests
- expressions and garden: the same shape

Every one is a **timeout**, at 5089 ms, 6010 ms, 5167 ms, 5092 ms and so on, in tests that assert on database transaction and TLS pool timing. No lane in this plan touches `tests/color-polish-data/` or the TLS pool. They failed because eight concurrent Next builds, eight production servers and eight Chromium instances left no CPU for a test that expects a client to settle inside a few seconds.

## The rule the coordinator now follows

Full concurrency stays, because Anthony asked for it and because the wall-clock gain is real. But **a timing-sensitive failure in a file the lane did not touch is re-run alone before it is believed**, exactly as load flakes already were. A fabricated failure costs more time than the parallelism saves if it is acted on, and acting on one would also mean sending a writer to fix code that is not broken.

Concretely: after the heavy phase finishes, the affected lanes' vitest suites are re-run on a quiet machine, and only a failure that survives that re-run is treated as real. The same already applies to `usable.spec.ts:409`, the documented legacy-fallback artifact that fails on the untouched baseline too, and to `milestone.spec.ts` "extreme depth", which passes three times out of three alone.

This is worth stating plainly to Anthony rather than hiding: running everything at once makes the run faster and the signal noisier, and the noise is handled by re-running, not by lowering the bar.

## Milestone round 3: a fix that traded one defect for a readability risk

Round 3 found the real cause of the missing gold rim, and it was the third of the three the order listed: `buildMilestoneSnapshot()` set `insights.goal.expressionId` to 3 while the test looked for expression 1, and overwriting the first six fixture records had moved the only expression-1 record outside the active week, so the predicate could never be true. The code was correct throughout. That is a good diagnosis.

The rail overflow fix needs a second look. To fit catalog phrase 2 it shrank `.goal-phrase` to 22 px, `.threshold` to 20 px, the section h2 to **14 px**, and the medallion to 52 px. Nothing is truncated and the hierarchy still holds (the goal name at 44 px is the largest text), so the letter of both requirements is met. But 14 px on a stage that is scaled to a television, read from across a room, is not legible, and this display's whole purpose is to be read from across a room. The plan's cross-cutting rule sets an 18 px floor for message text specifically, so a 14 px label does not violate it literally, which is exactly why it needs a human judgment rather than a test.

Recorded here as a should-fix for this lane's landing review rather than patched blind: the right fix is almost certainly to take the space out of the secondary milestone rail's padding and the medallion, which Section 9's own gap report G1 already demotes, instead of out of type sizes.
