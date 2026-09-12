---
lane: peacemakers
title: We Are Peacemakers, the puzzle world
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers
review: sonnet-5 on landing
depends_on: base
updated: 2026-09-12T03:45Z
---

## Work order

Rebuild Scene 8 (We Are Peacemakers, renderer id 8) ground up into a puzzle world. The scene features three distinct layout regions across the 1812 by 636 stage: the unchanged title block at left 12, top 33, width 829; the unchanged source world art at left 271, top 134, width 604, height 482; a face-on hold box at x 750 to 1050, y 168 to 468 (300 by 300 centered at x 900, y 318); and a 3D rotating recognition globe centered at x 1400, y 318 with radius 290 spanning x 1110 to 1690 and y 28 to 608, preserving the 60 px gap between hold box and globe. Recognitions detach sequentially from the source world as CSS-masked puzzle pieces, fly to the hold box in 1.1 s, hold face-on for exactly 3 plus message length divided by 40 seconds showing full message, name and expression icon at or above the 18 px font floor, and snap into the 24-slot rotating CSS 3D sphere in 0.9 s where message text is hidden. Four speech bubbles rise from measured figure anchors on the art with phased timing, catalog phrases, and downward pointing tails. Under reduced motion, eight globe cards and one held card render statically with no rotation or flight.

## Result

### Files modified

- `/Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers/public/color-polish/scenes/peacemakers.js`
- `/Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers/public/color-polish/scenes/peacemakers.css`
- `/Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers/tests/color-polish-scenes/peacemakers.spec.ts`
- `/Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers/docs/runs/2026-09-12-tv-next-level/lanes/peacemakers.md`

### Declarations in peacemakers.js

- `PEACEMAKERS_TOTAL_SLOTS`: line 4, constant specifying the 24-card maximum sphere capacity.
- `PEACEMAKERS_LATITUDES`: line 5, constant specifying the four latitude bands: [-42, -14, 14, 42] degrees.
- `PEACEMAKERS_LONGITUDES`: line 6, constant specifying the six longitudes: [0, 60, 120, 180, 240, 300] degrees.
- `PEACEMAKERS_GLOBE_RADIUS`: line 7, sphere radius of 242 px, matching outer card boundary of 290 px.
- `peacemakers()`: line 21, markup generator rendering the title block, source world art, globe light, hold zone, and globe stage container.
- `peacemakersSlotTransform(slotIndex)`: line 36, converts slot index into 3D spherical coordinates using rotateY, rotateX, and translateZ.
- `peacemakersCreateSlotElement(slotIndex)`: line 44, creates the 96 by 96 px preserve-3d slot DOM container on the rotating sphere.
- `peacemakersBuildCard(r, isFaceOn)`: line 58, builds either the 300 by 300 px face-on held card with recipient, badge, full message, chips, and likes, or the 96 by 96 px joined globe card with recipient and badge only.
- `peacemakersJoinCard(r, slotIndex)`: line 102, places a card on the 3D globe, dissolves and removes the oldest card if 24 slots are full, and logs the join.
- `peacemakersStartNextPiece()`: line 147, selects a record via chooseRandom, logs shown count, and spawns the detaching piece at the source world lifting piece coordinates.
- `peacemakersInitStill(root)`: line 181, initializes reduced motion mode with eight filled globe slots, one held card showing full message, and static orientation.
- `peacemakersInitActive(root)`: line 218, initializes active sequential piece pipeline.
- `peacemakersMount(root)`: line 225, scene mount handler clearing previous timers and routing to active or still initialization.
- `peacemakersPrime(checkpoint)`: line 237, staggers initial speaker phases by offsets 0, 2.2, 4.4, and 6.6 s.
- `peacemakersTickAge(dt)`: line 260, sequential simulation driver handling 1.1 s detach, 3 plus message length divided by 40 s hold, 0.9 s snap, and immediate start of the next piece.
- `peacemakersOnLeave()`: line 335, scene cleanup hook cancelling all active timers, resetting piece state, and clearing joined slots.
- `peacemakersKeepOut()`: line 344, returns bounding boxes for title block and source world to prevent floater intersection.
- `registerScene(8, ...)`: line 351, scene 8 registration with speakers, floaters false, fxCanvas true, mount, prime, tickAge, and onLeave.

### Sphere slot geometry table

The 24 slots form 4 latitude bands of 6 longitudes each, centered at stage (1400, 318):

| Slot Range | Latitude Band | Latitude Angle | Longitude Angles (6) | Card Size | Radius to Surface | Outer Boundary |
|---|---|---|---|---|---|---|
| Slots 0 to 5 | Band 0 (Lower) | -42 deg | 0, 60, 120, 180, 240, 300 deg | 96 by 96 px | 242 px | 290 px |
| Slots 6 to 11 | Band 1 (Mid-lower) | -14 deg | 0, 60, 120, 180, 240, 300 deg | 96 by 96 px | 242 px | 290 px |
| Slots 12 to 17 | Band 2 (Mid-upper) | +14 deg | 0, 60, 120, 180, 240, 300 deg | 96 by 96 px | 242 px | 290 px |
| Slots 18 to 23 | Band 3 (Upper) | +42 deg | 0, 60, 120, 180, 240, 300 deg | 96 by 96 px | 242 px | 290 px |

Container carries `transform-style: preserve-3d` and rotates slowly (one complete turn per 48 seconds). Cards carry `backface-visibility: hidden` and never counter-rotate.

### Piece masking from rendered box

The source asset `assets/globe.png` has native dimensions 744 by 691 px and is displayed in a squashed 604 by 482 px box at left 271, top 134. Detaching pieces derive coordinates directly from the rendered 604 by 482 box rather than source pixels, using `background-size: 604px 482px` and `background-position: -459px -126px`, aligning with the lifting piece visible on the world art at stage coordinates (730, 250).

### Plan 13 assertions replaced

1. `test('peacemakers renders circular bubbles and no overflow at 14 s')`: replaced with Acceptance 1. Plan 13 verified orb bubble circularity. Plan 15 replaced all orb bubbles with puzzle cards, so the test now uses `cardShape(frame, '.puzzle-card', 'puzzle')` while verifying circularity passes for remaining elements and noOverflow passes.
2. `test('at 2000 ms visualState actors count is at least 5 unless one actor is large')`: replaced with Acceptance 6. Plan 13 checked actor counts in `V.actors`. Plan 15 draws no orb bubbles, verifying the 3D globe container (`preserve-3d`, rotation) and confirming zero orb elements exist.
3. `test('bubble count never zero and at most one actor exiting at fresh opens')`: replaced with Acceptance 2. Plan 13 verified bubble exit cooldowns. Plan 15 verifies that over 40 s through loadRenderer with short messages, joined card count increases monotonically to at least six.
4. `test('bubbles span two depth layers with blur only on deeper layers')`: replaced with Acceptance 3 and 4. Plan 13 checked 2D depth layers with blur. Plan 15 uses genuine CSS 3D with backface culling, testing hold time precision and message text gating.
5. `test('the globe-light element and fx canvas exist at 6000 ms')`: preserved and verified under Acceptance 10.
6. `test('bubbles stay circular during replacement')`: replaced with Acceptance 8. Plan 13 checked replacement bubble geometry. Plan 15 verifies that joined card count never exceeds 24 and the oldest card is dissolved after the 25th join.
7. `test('reduced motion renders the peacemakers scene still')`: replaced with Acceptance 10. Plan 13 checked still mode flag. Plan 15 verifies all G8 criteria: static source world, eight cards filled on the globe, one held card showing full message, zero flying pieces, and static speech anchors.

### Round 2 test corrections

Two test failures in `tests/color-polish-scenes/peacemakers.spec.ts` were analyzed and resolved:

1. Catch-all route collision on shared page: In the initial common scene spec test, `loadRenderer` and `openStudioScene` were invoked on the same Playwright `page`. `loadRenderer` installs a catch-all route interceptor via `page.route('**/*', ...)` fulfilling direct-renderer assets and aborting all other network requests. When `openStudioScene` subsequently attempted to sign in via `signInAs(page)`, navigating to `/admin/login`, the catch-all route handler aborted the navigation with `net::ERR_FAILED`. The test was split into two independent tests: one using `loadRenderer` for direct-renderer assertions (`cardShape`, `circularity`, `noOverflow`), and a dedicated test using `openStudioScene` for `studioClickDoesNotAdvance` on a fresh page instance without route interception.
2. Step runtime clamping: In the joined-card cap test, a single call to `colorPolishRuntime.step(160000)` was clamped to 120 seconds by `Math.min(120000, ms)` inside `stepRuntime` (`public/color-polish/core/stage.js:114`). Because the sequential peacemakers lifecycle requires roughly 5.6 to 5.7 seconds per piece (1.1 s detach, 3 s + length / 40 hold, 0.9 s snap), 120 seconds yielded only 20 joins instead of the expected 25. The test was updated to call `step(60000)` three times in sequence (180 seconds total simulated time, reaching approximately 31 joins), the test timeout was raised to 120,000 ms, and the fixture was expanded to 40 items so the first-joined card (`rec-batch-1`) is evicted at join 25 without recycling.

### Execution notes

Direct Playwright browser tests and probe runs were not executed locally because Hard Rule 8 forbids starting dev servers or running Playwright in this worker lane. Verification was conducted using the four permitted commands: `npm run typecheck`, `npm test`, `npm run lint`, and `node scripts/color-polish-globals-check.mjs`.

## Review

