---
lane: garden
title: Section 2: Recognition Garden (renderer id 2)
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-garden
review: sonnet-5 on landing
depends_on: base
updated: 2026-09-12T04:58Z
---

## Work order

Section 2 brings Recognition Garden (renderer id 2) to the Plan 15 standard, routing initial bubble generation and slot layout through Section A drawSlots with readerBounds to achieve one-page fit and slot growth without overlap per decision 8, switching initial bubble draws and gardenReplace to chooseRandom per decision 1, migrating garden.spec.ts to the shared loadRenderer harness from helpers.ts without altering Plan 13 assertions, and verifying that messages up to 320 characters avoid pagination indicators while 500-character messages paginate at most twice with verbatim integrity.

## Result

### Functions and call sites changed

1. `/Users/anthony/.claude/worktrees/mothers-love-tv-garden/public/color-polish/scenes/garden.js`
   - `garden` (lines 10-31):
     - Prioritizes `S.forceId` when present by finding the record in `records()`.
     - Draws five eligible records using `chooseRandom` instead of `choose`.
     - Sorts selected records descending by message length to ensure the longest record maps to the primary 508 px slot.
     - Routes layout and markup through `drawSlots(chosen, ps, { readerBounds: { maxW: 1786, maxH: 623 } })`, replacing direct `addOrb` mapping with neighbor-constrained slot growth.
   - `gardenReplace` (lines 255-274):
     - Identifies the earliest steady actor eligible for replacement.
     - Selects the replacement record using `chooseRandom(exclude, a.expression)` instead of `replaceActor(ready[0], 'petals')` (which called `choose`).
     - Directly initiates swelling and exit kinematics (`life: 'swelling'`, `exitDX`, `exitDY`), logging `bubble_exit_start` with kind `petals` and `garden_replacement`.

2. `/Users/anthony/.claude/worktrees/mothers-love-tv-garden/tests/color-polish-scenes/garden.spec.ts`
   - Dropped the local `setupGardenHarness` helper (previously lines 72-162) and associated Node filesystem imports (`readFile`, `resolve`, `publicFolder`).
   - Imported `loadRenderer`, `buildActiveDisplayFixture`, and `recognition` from `./helpers`.
   - Updated `test('petals are carried, not dropped')` (lines 72-102) to initialize through `await loadRenderer(page, { scene: 2 })`, preserving every existing assertion verbatim.
   - Preserved all existing common scene spec tests: circular bubbles and no overflow at 14 s, garden fill and replacement over 60 s, dual depth layers, circularity across life phases, and still mode under reduced motion.
   - Added `test('with the mostly-long fixture, no page indicator is visible up to 320 chars and grown slots stay circular, inside root, and disjoint')` (lines 150-244): validates that messages up to 320 characters render with hidden page indicators, grown slots stay circular within one pixel, stay inside the 1812 by 636 scene root, and have non-intersecting bounding rects.
   - Added `test('a 500-character message paginates at most twice and logs verbatim true')` (lines 246-291): validates that a maximum-length 500-character recognition paginates at most twice and logs `circular_pagination` with `verbatim: true`.

### Existing assertions replaced or tightened

- In `tests/color-polish-scenes/garden.spec.ts`:
  - `test('petals are carried, not dropped')` previously relied on local `setupGardenHarness(page)` which duplicated route fulfillment and iframe bootstrapping; it now uses `loadRenderer(page, { scene: 2 })`. All internal petal count checks and runtime stepping remain untouched.
  - No existing assertions were weakened or removed.

### Acceptance items not executed in this environment

- Playwright direct-renderer specs (`tests/color-polish-scenes/garden.spec.ts`) and the visual probe (`scripts/color-polish-renderer-probe.mjs`): per hard rule 2 and rule 8, running Playwright, browser processes, or starting preview servers is not permitted in this lane; the coordinator runs all end-to-end browser and probe checks after landing.
- Static verification passed: `npm run typecheck` (tsc clean), `npm test` (39 files, 222 tests passing), `npm run lint` (18 baseline problems, 0 in modified files), and `node scripts/color-polish-globals-check.mjs` (scanned 21 files, 196 declarations, 0 collisions).

## Review
