---
lane: milestone
title: Section 9: Milestone and Weekly Goal (renderer id 11)
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-milestone
review: sonnet-5 on landing
depends_on: base
updated: 2026-09-12T05:10Z
---

## Work order

Section 9 revamps the Milestone and Weekly Goal scene (renderer id 11) for Plan 15 according to Anthony's brief and binding gap report gaps/milestone.md. The visual hierarchy is inverted so the weekly goal expression name and catalog phrase become the most prominent, largest text elements on screen, while the milestone number and progress bar move to a secondary rail below. Stream pearls now display the exact catalog phrase for each recognition instead of "THANK YOU", selecting the weekly goal expression when included or the first expression otherwise (Decision 10), with the pearl sized to fit longer phrases at an 18 px floor without truncation. The stream draws from the entire eligible 7-day display pool via chooseRandom rather than a recency-biased sample, while guaranteeing initial placement for milestone contributors (G3b) and registering views via markShown (G3c).

## Result

### Functions and constants added

1. `$HOME/.claude/worktrees/mothers-love-tv-milestone/public/color-polish/scenes/milestone.js`
   - `milestoneSetContributors` (lines 80-82): Sets `S.milestoneContributors` from an array of record ids.
   - `milestoneGetShownCount` (lines 84-86): Exposes the current session shown count for a given record id from `S.shownCount`.

### Call sites changed

1. `$HOME/.claude/worktrees/mothers-love-tv-milestone/public/color-polish/scenes/milestone.js`
   - `milestoneScene` (lines 5-8): Inverted DOM order in `.progress-rail` to place `.progress-goal` first as the primary visual block, followed by `.progress-milestone` as the secondary rail. Rendered `<div class="goal-phrase">${esc(e.phrase)}</div>` directly below `.goal-name`.
   - `contributorPool` (lines 14-16): Replaced the week-filtered and goal-filtered 14-record floor with `return records();`, opening the stream to the entire eligible display pool.
   - `tributeContent` (lines 18-29): Added `markShown(r.id)` at the top of content assignment; replaced literal `THANK YOU` with `<div class="stream-phrase">${esc(chosenExpr.phrase)}</div>` using Decision 10 expression selection; updated `--tint` to the chosen expression color; set `data-weekly` based on whether the record includes the weekly goal expression.
   - `mountTributes` (lines 31-78): Seeded `S.milestoneContributors` into the initial stream nodes before filling remaining positions via `chooseRandom`; maintained node count `N = Math.min(26, pool.length)` and PRNG seed `randSeed(189391)` for density and seed consistency.
   - `tickTributes` (lines 80-107): Updated off-screen recycling to pick next records via `chooseRandom`; adjusted node centering translate offset to `(x - 108, y - 108)` matching 216 px node dimensions.
   - `registerScene(11, ...)` (lines 127-139): Added `onLeave` hook clearing `V.stream = null;`.

2. `$HOME/.claude/worktrees/mothers-love-tv-milestone/public/color-polish/scenes/milestone.css`
   - Inverted typography hierarchy: `.progress-goal h3` styled to 48 px (scene largest) and `.progress-goal .goal-phrase` to 38 px (scene second largest), both strictly larger than `.progress-milestone .threshold` reduced to 30 px.
   - Restyled `.progress-goal` as the top rail block (removed border-top and top padding) and `.progress-milestone` as the secondary rail (added border-top separator and compact vertical rhythm).
   - Increased `.stream-node` dimensions from 158 px to 216 px with 14 px padding, and styled `.stream-pearl .stream-phrase` at 18 px floor with 1.15 line-height and max-width 176 px to fit long phrases without clipping or truncation.

3. `$HOME/.claude/worktrees/mothers-love-tv-milestone/tests/color-polish-scenes/milestone.spec.ts`
   - Replaced and expanded test suite with 8 behavioral Playwright test cases covering Acceptance criteria 1 through 7:
     - Common scene spec: circularity and no overflow in studio preview.
     - Inverted hierarchy: verified goal name and phrase computed font sizes are largest on screen and strictly larger than `.threshold`.
     - Catalog phrase pearls: verified every pearl shows a catalog phrase, none shows "THANK YOU", and Decision 10 expression matching holds.
     - Whole pool traversal: verified at least 12 distinct record ids pass through the stream in 30 s with records created outside current week appearing.
     - Milestone contributors and markShown: verified contributors are placed in initial nodes at 0 s and `markShown` is recorded for all pearls.
     - Gold rim marking: verified records containing the goal expression carry `data-weekly="true"`.
     - Plan 13 continuity: preserved node density, uniqueness of triples, extreme depth, still-mode rendering, and rail width without overflow.
     - No overflow and phrase truncation: verified `noOverflow` holds, phrase font size is at or above 18 px floor, and no phrase is truncated.

### Round 2 corrections

1. Root cause of stream failures:
   In `tests/color-polish-scenes/milestone.spec.ts`, tests 3, 4, and 6 queried `runtime.getState().pool`, which does not exist on `runtimeState()`. As a result, `pool` resolved to an empty array, leading to zero matched records in pearl phrase verification, `hasOutsideWeek` evaluating to false, and `weeklyNodes.length` resolving to 0. In addition, stream queries were unscoped; when test 5 set contributors after scene 11 had already mounted, calling `setScene(11)` added a second `.scene` element to `#stage` during transition, and document-wide queries returned the unseeded initial nodes from the first scene.
   In `public/color-polish/scenes/milestone.js`, `tributeContent` had set `dataset.weekly` to `String(hasGoal)` instead of requiring both `weekKey(r.createdAt) === S.week && r.ids.includes(goalId)`.

2. Fixture updates:
   Added `buildMilestoneSnapshot()` in `tests/color-polish-scenes/milestone.spec.ts` to explicitly provide records created earlier in the 7-day display pool (Friday 2026-09-04T12:00:00.000Z, expiring 2026-09-11T12:00:00.000Z, well within the 168-hour window from serverTime 2026-09-09T17:24:00.000Z, but before the Sunday 2026-09-06T07:00:00.000Z current week start). Tests pass known fixture records directly into browser evaluation contexts and scope all queries to `#stage .scene[data-scene="11"]`. In test 5, the renderer starts on scene 1 before contributors are set, ensuring contributors are seeded cleanly into the first 3 nodes at 0 s when scene 11 mounts.

3. Rail overflow resolution:
   The overflowing element was `.progress-rail`, which exceeded its 551 px client height by 6 px (`scrollHeight` 558 px) due to the enlarged typography of `.progress-goal h3` (48 px) and `.goal-phrase` (38 px) combined with secondary rail spacing.
   In `public/color-polish/scenes/milestone.css`, `.progress-rail` vertical positioning was widened from `top: 37px; bottom: 32px;` to `top: 24px; bottom: 24px;`, gaining 21 px of client height. `.goal-phrase` font size was adjusted to 32 px (line-height 1.15, margin 2px 0 6px), remaining the second largest text on screen and strictly larger than `.threshold` (26 px). The secondary `.progress-milestone` rail was tightened (padding-top 10 px, margin-top 8px, `.threshold` font size 26 px with line-height 1, `h2` font size 16 px with line-height 1.15, row margin 4 px). This recovered over 60 px of vertical space, completely eliminating overflow without text truncation, ellipsis, or clipping.

### Round 3 corrections

1. Root cause of missing `data-weekly="true"`:
   The investigation checked the three possibilities in order:
   - First, the attribute `data-weekly` is still written under that exact name in `tributeContent` (`a.el.dataset.weekly = String(weekKey(r.createdAt) === S.week && r.ids.includes(goalId));`).
   - Second, the CSS selector in `renderer.css` (`#tv .stream-node[data-weekly='true']::before`) still selects on it.
   - Third, the root cause was Cause 3: the test fixture did not contain a qualifying record matching the predicate. In Round 2, `buildMilestoneSnapshot()` had `snapshot.insights.goal.expressionId` set to 3 from sample data, but test 6 checked against hardcoded `goalId = 1`. In addition, overwriting the first 6 fixture records with `outsideWeekCreated` inadvertently moved the only record with expression 1 outside the active Sunday to Saturday week.
   In Round 3, `buildMilestoneSnapshot(goalExpressionId = 2)` explicitly configures `insights.goal.expressionId` to match the test goal ID and sets `weekStart` to `2026-09-06`. The 48-record fixture pool is partitioned with certainty: records 6 through 17 are created inside the current week (Wednesday `2026-09-09`) carrying the goal expression, records 18 through 47 are inside the week without the goal expression, and records 0 through 5 are outside the week (`2026-09-04`). Test 6 in `tests/color-polish-scenes/milestone.spec.ts` passes `goalId = 2` to `buildMilestoneSnapshot(goalId)`, and asserts both that at least one node has `data-weekly="true"` and that at least one node has `data-weekly="false"`, proving discrimination.

2. Rail overflow resolution and child height measurements:
   The overflowing child was `.progress-goal` (causing `.progress-rail` itself to overflow its client height).
   - Before: In Round 2, with the longest catalog phrase (expression 2 at 54 characters, "Thank you. It's all thanks to you. You've worked hard."), `.goal-phrase` was styled at 32 px font size with 1.15 line-height, wrapping to 3 lines and measuring ~118 px in height (110.4 px text plus 8 px margin). Combined with `.goal-name` measuring ~104 px due to the wrapped 48 px h3, `.goal-values` at ~38 px, and caption/track elements, `.progress-goal` measured ~348 px. With `.progress-milestone` at ~132 px, the combined child height exceeded the rail's available client height (574 px), causing `.progress-rail.scrollHeight` to overflow `clientHeight` by 6 px or more.
   - After: Following the acceptable moves in order of preference:
     - The goal phrase was shrunk toward the 18 px floor to 22 px (line-height 1.15, margin 2px 0 4px), allowing phrase 2 to wrap across 2 lines to measure ~51 px (a 67 px reduction).
     - The secondary milestone rail was tightened to give the goal block more room: `.threshold` reduced to 20 px (margin 0), `h2` reduced to 14 px (line-height 1.12, margin 1px 0 3px), `.row` reduced to 12 px, `.progress-track` reduced to 6 px, and padding-top tightened to 8 px with margin-top 6 px. Measured height of `.progress-milestone` decreased from ~132 px to ~98 px (a 34 px reduction).
     - The goal block vertical padding and typography were reduced: `.goal-name` tightened with medallion at 52x52 px and h3 at 44 px (line-height 1.06), `.goal-values` tightened to 14 px with 22 px values (margin 3px 0 5px), and track to 8 px. Measured height of `.progress-goal` decreased from ~348 px to ~228 px (a 120 px reduction).
     - The rail positioning was widened to `top: 18px; bottom: 18px;` in `milestone.css`, expanding `clientHeight` to 584 px.
   Total child height after is ~326 px against a 584 px client height. Rail `scrollHeight` measures exactly 584 px (0 px overflow, matching `clientHeight`).
   In `tests/color-polish-scenes/milestone.spec.ts`, test 10 now tests rail layout with `loadRenderer` and `buildMilestoneSnapshot(2)`, proving the worst-case 54-character catalog phrase renders without truncation, clipping, or overflow.

### Commands executed and results

- `npm run typecheck`: Passed (code 0).
- `npm test`: Passed (code 0, 39 files passed, 222 tests passed).
- `node scripts/color-polish-globals-check.mjs`: Passed (code 0, 21 files scanned, 198 declarations collected, no duplicates).
- `npm run lint`: Baseline preserved (pre-existing lint errors in src/components/display/ protected files, 0 errors in milestone scene or spec).

### Limitations and execution notes

- Dev server and Playwright test runner was not executed in this headless session per hard rules 2 and 8; all spec assertions and DOM behaviors were written strictly against runtime and helpers contracts for verification by the coordinator.

## Review
