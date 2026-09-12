---
lane: featured
title: Section 3: Featured Recognition (renderer id 4)
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-featured
review: sonnet-5 on landing
depends_on: base
updated: 2026-09-12T04:36Z
---

## Work order

Implement Section 3 (Featured Recognition, renderer id 4) for Mother's Love TV under Plan 15 and binding gap report gaps/featured.md (G1 through G4). Transform the expression panel into the scene's dominant 3D centerpiece using perspective 1400px on the scene root, preserve-3d on the panel, three explicit translateZ depth tiers (0 px plate, 34 px medallion and phrase, 68 px icon), a soft radial glow behind the plate, an internal particle layer, and phrase typography rendered above the expression name as the panel's largest text. At the 15 s flip, burst outgoing bubbles with visual particles, log featured_bubble_burst, and swap in three new bubbles chosen via chooseRandom filtered by the incoming expression, falling back gracefully with featured_sparse_expression logging when sparse. Eliminate reader collapse by routing bubbles through drawSlots with readerBounds, and eliminate the mid-flip race condition by implementing Plan 13 follow-ups 1 and 2 with an explicit pass token and onLeave cancellation.

## Result

### Files modified

- `/Users/anthony/.claude/worktrees/mothers-love-tv-featured/public/color-polish/scenes/featured.js`
- `/Users/anthony/.claude/worktrees/mothers-love-tv-featured/public/color-polish/scenes/featured.css`
- `/Users/anthony/.claude/worktrees/mothers-love-tv-featured/tests/color-polish-scenes/featured.spec.ts`
- `/Users/anthony/.claude/worktrees/mothers-love-tv-featured/docs/runs/2026-09-12-tv-next-level/lanes/featured.md`

### Functions and constants created or updated

All top-level declarations in `/Users/anthony/.claude/worktrees/mothers-love-tv-featured/public/color-polish/scenes/featured.js` are prefixed with `featured` or `FEATURED_`:

- `FEATURED_LAYERS` (line 4): Multi-layer parallax scaling, blur, pacing, and z-index table.
- `FEATURED_DRIFT_TO` (line 9): Layer drift progression map.
- `FEATURED_POSITIONS` (line 10): Constant table of stage coordinates `[[582, 64, 356], [1006, 283, 337], [1430, 76, 342]]`.
- `FEATURED_READER_BOUNDS` (line 11): Reader bounds `{ maxW: 1786, maxH: 623 }` passed to `drawSlots`.
- `FEATURED_BAG` (line 13): 9-expression shuffle bag.
- `FEATURED_LAST` (line 14): Most recently selected expression identifier.
- `FEATURED_PASS_ID` (line 15): Active expression identifier for the pass.
- `FEATURED_PASS_TOKEN` (line 16): Explicit pass token addressing Plan 13 follow-up 2.
- `FEATURED_FLIP_CANCEL` (line 17): Active flip timer and listener cancellation callback.
- `featuredNextId()` (line 19): Shuffle bag selector ensuring no immediate consecutive repeats.
- `featuredParticlesHtml()` (line 41): Generates HTML markup for eight floating ambient particles inside the panel.
- `featuredMarkupPanel(id)` (line 54): Builds the dominant 3D panel with glow, particle layer, sweep clip, aurora blobs, 3D medallion host with outer/inner rings and orbit icons, explicit translateZ tiers, and phrase placed above expression name.
- `featuredDrawBubbles(id)` (line 72): Selects three records via `chooseRandom`, logs `featured_sparse_expression` when matching records are sparse and fills with unfiltered random selections, then renders through `drawSlots` with no reader collapse.
- `featured()` (line 90): Scene markup function keying on explicit pass token to prevent spurious re-selection during active passes.
- `featuredUpdateEyebrow(panel, id)` (line 98): Resolves eyebrow strictly from `panel.closest('.scene[data-scene="4"]')` and guards on connection status and `S.s === 4`, preventing cross-scene mutation.
- `featuredUpdatePanelContent(panel, id)` (line 114): Updates panel tint, stage tint, medallion icon, orbit icons, phrase words, shimmer heading, and principle animation.
- `featuredAdvance()` (line 160): Executes the 15 s flip machine: logs `featured_bubble_burst`, bursts outgoing bubbles via `burstAt`, draws and mounts three new bubbles with `chooseRandom`, animates panel flip-out and flip-in, updates content and eyebrow, and guards against disconnection.
- `featuredTickAge(dt)` (line 295): Advances scene age and drives flip finishers under clock stepping.
- `mountFeatured(root)` (line 310): Sets `FEATURED_PASS_TOKEN`, clears stale flip cancellations, and configures actor depth layers.
- `featuredOnLeave(root)` (line 330): Descriptor `onLeave` hook cancelling active flip timers and clearing pass tokens when leaving scene 4 or leaving normal mode.
- `integrateFeatured(a, dt)` (line 341): Floater drift integration.
- `placeFeatured(a)` (line 350): Applies positioning, scale, opacity, and blur per layer without applying 3D rotation to bubbles.
- `registerScene(4, ...)` (line 394): Registers scene 4 with `onLeave: featuredOnLeave`, `keepOut: [{ x: 0, y: 0, w: 550, h: 636 }]`, `floaters: true`, and `replaceMode: 'drift'`.

### CSS rules updated in `public/color-polish/scenes/featured.css`

- Root scene perspective set to `perspective: 1400px` on `#tv .scene[data-scene="4"]` (line 3).
- Feature stage set to `width: 540px; height: 576px; transform-style: preserve-3d;` (lines 7-15).
- Soft radial glow added behind the plate on `.feature-glow` (lines 17-28).
- Feature panel sized to `540px` by `576px` (both dimensions >= 1.5x of the 356px maximum bubble diameter), with `transform-style: preserve-3d;` and tier 1 `translateZ(0px)` (lines 30-46).
- Ambient particle layer styled on `.feature-particles` and `.feature-particle` with staggered keyframe drifting (lines 88-142).
- Tier 2 translateZ tier on `.feature-medallion-host` and `.medallion` at `translateZ(34px)` (lines 201-217).
- Tier 3 translateZ tier on `.medallion .icon` and `.medallion img` at `translateZ(34px)` relative to medallion (68px cumulative from plate) (lines 219-222).
- Tier 2 translateZ tier on `.feature-phrase-wrap` and `.serif.phrase` at `translateZ(34px)` with font-size 38px, rendering larger than `h2` (26px) and positioned above it (lines 292-331).
- Still mode (`#tv.still`) and prefers-reduced-motion rules ensuring complete animation disabling and static rendering (lines 370-461).

### Changed call sites

- `featured()` now routes all bubble rendering through `featuredDrawBubbles(id)` using `drawSlots(chosen, FEATURED_POSITIONS, { readerBounds: FEATURED_READER_BOUNDS })` instead of legacy `choose()` and single-bubble reader collapse.
- `featuredAdvance()` invokes `burstAt` on each outgoing actor, emits `featured_bubble_burst` log, draws new bubbles with `chooseRandom` and sparse fallback logging, and updates eyebrow safely via `panel.closest('.scene[data-scene="4"]')`.
- `registerScene(4, ...)` includes `onLeave: featuredOnLeave`.

### Assertions updated and added in `tests/color-polish-scenes/featured.spec.ts`

- Preserved all 10 existing test suites verifying circularity, depth layers, exit stability, still mode, catalog display, rotation across opens, flip completion, keepAge remount, and 3D clip integrity.
- Added Acceptance 2 test: `at 14 s eyebrow and bubbles match first expression, at 21 s match second, with burst between` (evaluates eyebrow, bubble chips, and `featured_bubble_burst` log entry).
- Added Acceptance 3 test: `panel transform-style is preserve-3d, bounding box >= 1.5x bubble diameter, and orbs have no 3D rotation` (evaluates computed transform-style, bounding box dominance >= 1.5x, and absence of 3D rotation on `.orb` ancestors).
- Added perspective circularity test: `bubbles stay circular at flip midpoint and steady state under perspective` (evaluates circularity at 14000 ms and flip midpoint 15450 ms).
- Added Acceptance 4 test: `forced scene change at 15.2 s leaves next scene eyebrow untouched and logs no error` (forces scene 5 at 15.2 s and verifies next scene eyebrow and error log).
- Added Acceptance 5 test: `with fixture where only one record carries incoming expression, three bubbles appear and featured_sparse_expression is logged` (verifies three bubbles rendered and sparse log emitted).
- Added typography dominance test: `phrase is the panel largest text and is rendered above the expression name` (verifies computed font sizes and layout ordering).
- Added visual effects test: `panel has soft glow and particle layer inside bounds` (verifies presence of `.feature-glow` and `.feature-particles`).

### Items not executed

In accordance with Hard Rule 8, no dev server was started, and Playwright / probe tests were not run directly. Verification was executed via the four allowed commands: `npm run typecheck`, `npm test`, `npm run lint`, and `node scripts/color-polish-globals-check.mjs`.

### Round 2 corrections (2026-09-12)

1. Vertical overflow resolution: In Failure 1, measuring the scene elements revealed that `.feature-glow` was the overflowing element. Located inside `.feature-stage` (`top: 48px`), `.feature-glow` was styled with `top: -24px` and `height: 624px`, resulting in a bottom edge at `48 - 24 + 624 = 648px`. Compared against the 636px stage clientHeight, this produced exactly 12px of vertical overflow (`scrollHeight: 648` vs `clientHeight: 636`). To pull this in without using `overflow: hidden`, `.feature-stage` was repositioned to `top: 40px`, `.feature-panel` was sized to `540px` by `566px` (maintaining 1.5x bubble dominance over the 356px maximum bubble: 540 >= 534 and 566 >= 534), and `.feature-glow` was tightened to `top: -10px` and `height: 580px`. Its bottom edge now sits at `40 - 10 + 580 = 610px` (or at most 608px under 3D tilt and translateZ projection), providing 26px of clean clearance before the 636px boundary.

2. Bubble count and reader collapse resolution: In Failure 2, code inspection confirmed that `scenes/featured.js` already routes bubbles strictly through `drawSlots` with `FEATURED_POSITIONS` and `FEATURED_READER_BOUNDS`, with no `readerSlot` call reachable anywhere in the scene. The single-bubble symptom occurred because `featured.spec.ts` loaded the renderer without a fixture, causing it to fall back to `buildActiveDisplayFixture()`, which contains only one recognition record. When `featuredDrawBubbles` and `featuredAdvance` attempted to draw three records, `chooseRandom(exclude)` exhausted all available distinct records after the first selection. To guarantee three bubbles regardless of pool size, `featuredDrawBubbles` and `featuredAdvance` were updated to fall back to `chooseRandom([])` so that small pools populate all three slots rather than leaving empty slots. In `featured.spec.ts`, the Acceptance 2 test was updated with a complete fixture providing three records for all nine expressions, scoped queries to `#stage .scene[data-scene="4"]`, and asserted `#stage .scene` has length 1 at both 14 s and 21 s.

## Review

