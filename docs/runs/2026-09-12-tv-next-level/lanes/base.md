---
lane: base
title: Shared primitives on tv15/base
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-base
review: sonnet-5 on landing
depends_on: none
updated: 2026-09-12T01:17Z
---

## Work order

Section A builds the shared foundation primitives for Plan 15 on tv15/base, including weighted random pool selection (chooseRandom) and shown counters (markShown), lifecycle cleanup through onLeave hooks across transition, still-mode, and safe-state switches, slot growth and pagination via drawSlots with non-overlapping bounding-geometry caps, animated speech bubble anchors (mountSpeech, tickSpeech) from artwork characters, classic script duplicate globals validation, and shared scene test harnesses (loadRenderer, cardShape, CIRCULARITY_EXEMPT).

## Result

### Functions added across both rounds

1. `$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/state.js`
   - `markShown` (lines 130-133): Increments the session shown counter map S.shownCount for a given recognition id.
   - `chooseRandom` (lines 135-151): Selects a record weighted inversely by (1 + times shown) with deterministic PRNG seeding.

2. `$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/orbs.js`
   - `drawSlots` (lines 18-70): Assigns records to scene positions with preference for short records, computing each slot's grow cap against readerBounds and neighboring slots without overlap.

3. `$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/speech.js`
   - `nextSpeechPhrase` (lines 4-21): Shuffles catalog phrases with a non-repeating bag.
   - `mountSpeech` (lines 23-45): Attaches speech bubble DOM elements at designated speaker coordinates.
   - `tickSpeech` (lines 47-76): Animates speech bubble fade in, presentation, and fade out cycles.

4. `$HOME/.claude/worktrees/mothers-love-tv-base/tests/color-polish-scenes/helpers.ts`
   - `CIRCULARITY_EXEMPT` (lines 337-340): Typed map of scene slugs to exempt card selectors (peacemakers puzzle cards and peace-in-practice heart cards).
   - `circularity` (lines 347-427): Updated circularity evaluator that skips elements matching exempt selectors for the active scene.
   - `cardShape` (lines 433-495): Evaluates non-circular card geometry, verifying non-zero size, non-50% border radius, scene root containment, and aspect ratio bounds.
   - `loadRenderer` (lines 501-602): Reusable direct-renderer test harness for Playwright tests, serving /probe with mocked routes and MessageChannel control.

5. `$HOME/.claude/worktrees/mothers-love-tv-base/scripts/color-polish-globals-check.mjs`
   - `parseVarNamesFromStatement` (lines 7-79): Parses top-level declaration variable names from JavaScript statements.
   - `extractColumnZeroDeclarations` (lines 81-197): Extracts column-zero function, class, const, let, and var declarations from classic scripts.
   - `checkGlobals` (lines 199-282): Validates that scripts loaded by renderer.html share unique global names without collision.

### Call sites changed

1. `$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/orbs.js`
   - Line 12: `markShown(r.id)` called inside `addOrb` when each orb slot is created.
   - Line 74: `rightBubbles` calls `drawSlots(chosen, ps, { readerBounds: { maxW: 1786, maxH: 623 } })`.

2. `$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/motion.js`
   - Line 9: In `swapSlot`, replaced the negative timestamp hack with `S.forceId = r.id; renderNow(S.s, { keepAge: true });`.

3. `$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/stage.js`
   - Line 5: Added `onLeave: null` to scene descriptor registration defaults in `registerScene`.
   - Line 12: `renderNow` invokes `sceneDescriptor(prev).onLeave?.(oldRoot)` before clearing the previous root.
   - Line 48: `requestScene` invokes `sceneDescriptor(prev).onLeave?.(old)` during still-mode instant scene replacement.
   - Line 75: `tickTransition` invokes `sceneDescriptor(transition.prev).onLeave?.(transition.old)` upon transition completion.

4. `$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/renderer.html`
   - Line 9: Linked `<link rel="stylesheet" href="/color-polish/core/speech.css">`.
   - Line 69: Added `<script src="/color-polish/core/speech.js" defer></script>`.

5. `$HOME/.claude/worktrees/mothers-love-tv-base/tests/color-polish-scenes/helpers.spec.ts`
   - Lines 36-40: Added test for `loadRenderer` asserting mode is normal.
   - Lines 42-75: Added test for `cardShape` asserting pass on valid card shapes and failure on invalid card shapes.
   - Lines 77-125: Added Task 1 no-overlap test asserting no two orb-slot rectangles intersect in scene 1 or scene 9 under a mostly-long fixture.

### Seed expression in chooseRandom

The exact seed expression used in `chooseRandom` (core/state.js, lines 138-141) is:
```javascript
const stable=pool.map(r=>r.id).join(',');
const salt=Math.floor(S.t);
const seed=((hashText(stable)^salt)>>>0)||1;
```

### Grow-cap rule from Task 1

A slot may grow up to the largest diameter where its square, anchored at its own top-left coordinates, stays within readerBounds and does not intersect any other slot bounding square at that other slot original diameter, falling back to its original diameter if no growth is possible.

### Grow-budget mechanism (data-grow-max)

In `drawSlots` (core/orbs.js), each slot computes a non-overlapping cap and passes it as `opts.growMax` to `addOrb`, setting the DOM attribute `data-grow-max="${opts.growMax}"` on `.orb-slot`. During text layout in `fitCircle`, this attribute is read as `maxD` to expand the slot diameter up to the budget before checking text containment, enforcing the 18 px font floor, and paginating only if the message still overflows.

### Round 3 no-overlap test scope fix

The no-overlap test in `tests/color-polish-scenes/helpers.spec.ts` was scoped to query `#stage .scene[data-scene="N"] .orb-slot` for the specific scene root under test rather than querying `.orb-slot` across the entire document. After `loadRenderer` returns, the test advances the clock by 1500 ms to wait out the 1.15 s crossfade and asserts that `#stage` holds exactly one `.scene` element before measuring bounding boxes. The previous document-wide query caught slot elements from the preceding scene (such as welcome's 586 px reader bubble) while both scene roots coexisted in `#stage` mid-transition. In addition, measured `data-grow-max` values confirm that the `rightBubbles` grid grants no growth because every slot is hemmed in by its neighbours, so one-page fit in that grid depends on the 18 px font floor rather than on slot growth.

### Acceptance items not executed in this environment

1. Acceptance item 1 (probe at 1920 and 3840 with arrivals):
   The probe script starts a local server and uses browser automation which cannot be run in this headless worktree session per Rule 2; the coordinator executes the probe.
2. Acceptance items 2, 3, 4, 5, 7 (Playwright specs):
   Playwright end-to-end tests require a running server and browser binaries; execution is reserved for the coordinator per Rule 2. Unit and typecheck tests (npm test, npm run typecheck) run synchronously in Task 3.
3. Acceptance item 6 (negative globals check on fixture with duplicates):
   The globals check script scripts/color-polish-globals-check.mjs runs and verifies that tv15/base has zero collisions. Creating an intentional collision fixture in the protected renderer files is restricted by Rule 1.

## Review
