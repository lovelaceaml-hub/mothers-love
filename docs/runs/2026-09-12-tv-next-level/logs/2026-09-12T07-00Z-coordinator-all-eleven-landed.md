# All eleven sections landed and merged

2026-09-12T07:00Z, coordinator (Opus 5 high).

tv15/pick at 363ab40 merges tv15/base (Sections A and B) with all ten scene and arrival branches. **Zero merge conflicts**, which is the disjoint-file ownership model working exactly as the plan intended.

## Merged-branch verification

typecheck clean. 222 vitest tests pass. eslint at 18 problems, identical to the untouched baseline tv/pick 463ce8d. Globals check clean at 21 files and 253 declarations, no duplicate top-level names, which is the real proof that eleven sections of work did not collide in the renderer's single shared script scope. Production build clean. All seven renderer probe runs clean at 1920 and 3840 across ms 0, 6000 and 14000: 10 scenes each, no issues, and the arrival style sequence still singles 1,5,2,3,4,0 then groups 2,4,3,1,0, byte-identical to the baseline.

## Per-lane spec results, each run alone on a production server

welcome 19 of 19. garden 8 of 8. arrivals 90 of 91. featured 100 of 101. peacemakers 14 of 14. status 12 of 12. expressions 13 of 13. peace-in-practice 92 of 92. orbit 12 of 12. milestone 11 of 11. transitions 94 of 96 before its round 5 rebuild. Where a single failure remains in a lane's full-suite run it is `usable.spec.ts:409`, the legacy-fallback artifact that fails on the untouched baseline too.

## How much of this run was defects versus measurement mistakes

Worth recording honestly, because it should change how the next plan's orders are written. Of roughly thirty failures across the eleven lanes, the large majority were tests measuring the wrong thing:

- **Screen pixels compared against stage units.** Four lanes independently did this. The renderer draws a fixed 1812 by 636 stage that the host scales to the TV, so a DOM rect is in screen pixels while every number in a gap report is in stage units. Peacemakers' hold-zone gap read 53 against a 59.5 threshold that meant 80; welcome's bubbles reported out of bounds while sitting exactly where the CSS put them.
- **Counting elements the helper also counts.** `circularity()` measures `.orb-slot`, `.orb` and `.event-orb`, so six welcome bubbles are twelve measured elements.
- **Fixed time offsets against a clock that pauses.** V.clock only advances while no transition runs, and Section B lengthened transitions from 1.15 s to about 2.5 s, which pushed status's coin cadence, expressions' bloom and its scene changes past their assumptions.
- **Harness swaps that silently changed the data.** Moving garden.spec.ts onto loadRenderer replaced the Studio's many-record sample with a one-record fixture, and its petal assertion then had nothing to swap.
- **Literals from the wrong data source.** Status asserted count values from loadRenderer's fixture while rendering through the Studio; milestone's gold-rim predicate could never be true because the fixture's goal expression was 3 while the test looked for 1.

Real code defects, for contrast, and every one found by reading a diff or measuring rather than by a test: production scene code monkey-patching `window.colorPolishRuntime` to expose internal state for a test that had already been deleted; a still-mode path showing only the first 85 characters of any long message; a fit loop measuring a flex container that is always full height, turning a 500 character message into 74 pages of seven characters; a globe that deleted the card it had just placed and slowly emptied; an orbit seed that never varied so the centre showed one expression forever; a garden replacement that reimplemented a shared helper and broke the petal chain; and Peacemakers never cutting its pieces from the artwork at all.

**What to carry into the next plan's orders:** state the unit of every geometric threshold, name which clock an animation is driven by, and say which harness supplies the data. Those three sentences would have prevented most of this run's churn.

## Two limitations for Anthony, not hidden in a lane file

- **Garden's four smaller bubbles hold about 130 characters** at the 18 px floor once the name, chips and like count take their share. Only its one 508 px slot fits a maximum-length message whole. Lifting that means fewer, larger bubbles in that scene, which he has not asked for.
- **A 500 character message cannot be shown whole on a Peacemakers piece.** It needs roughly 550 px of text height and the card has about 110. Still mode shows page one with the page count stated on screen and the rest explicitly hidden rather than clipped. With the new 249 grapheme limit this is largely moot.

## Not in tv15/pick

The 249 grapheme message limit is on its own branch, change/message-limit-249 at 0357a68, deliberately not merged. It changes src/ and the product contract rather than the renderer, and Plan 15 states the server bound is outside its scope.
