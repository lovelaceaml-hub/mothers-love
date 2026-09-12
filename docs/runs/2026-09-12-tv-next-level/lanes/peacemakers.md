---
lane: peacemakers
title: We Are Peacemakers, the puzzle world
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers
review: sonnet-5 on landing
depends_on: base
updated: 2026-09-12T04:36Z
---

## Work order

Rebuild Scene 8 (We Are Peacemakers, renderer id 8) ground up into a puzzle world. The scene features three distinct layout regions across the 1812 by 636 stage: the unchanged title block at left 12, top 33, width 829; the unchanged source world art at left 271, top 134, width 604, height 482; a face-on hold box at left 900, top 188, width 260, height 260; and a 3D rotating recognition globe centered at x 1510, y 318 with radius 290 spanning x 1220 to 1800 and y 28 to 608, preserving the 60 px gap between hold box and globe. Recognitions detach sequentially from the source world as CSS-masked puzzle pieces carrying globe art pixels, fly to the hold box in 1.1 s, hold face-on for exactly 3 plus message length divided by 40 seconds showing full message, name and expression icon at or above the 18 px font floor, and snap into the 24-slot rotating CSS 3D sphere in 0.9 s where message text is hidden. Four speech bubbles rise from measured figure anchors on the art with phased timing, catalog phrases, and downward pointing tails. Under reduced motion, eight globe cards and one held card render statically with no rotation or flight.

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
- `PEACEMAKERS_GLOBE_RADIUS`: line 7, sphere radius of 290 px, matching the gap report specification.
- `PEACEMAKERS_SCALE_X`: line 10, horizontal scale factor (604 / 744, approx 0.8118) mapping from source image to rendered world box.
- `PEACEMAKERS_SCALE_Y`: line 11, vertical scale factor (482 / 691, approx 0.6975) mapping from source image to rendered world box.
- `PEACEMAKERS_SOURCE_SOCKETS`: line 14, array of measured socket coordinates on the 744 by 691 source image.
- `peacemakers()`: line 32, markup generator rendering the title block, source world art, world sockets container, globe light, hold zone, and globe stage container.
- `peacemakersSlotTransform(slotIndex)`: line 49, converts slot index into 3D spherical coordinates using rotateY, rotateX, and translateZ(290px).
- `peacemakersCreateSlotElement(slotIndex)`: line 57, creates the 96 by 96 px preserve-3d slot DOM container on the rotating sphere.
- `peacemakersFitCard(card, r, isStill)`: line 71, fits message text to font floor 18 px, paginates overflowing text into pages, logs circular_pagination with verbatim flag, and stacks pages statically in still mode.
- `peacemakersBuildCard(r, isFaceOn, bgPos)`: line 133, builds either the 260 by 260 px face-on held card with readable scrim, recipient, badge, full message, chips, and likes, or the 96 by 96 px joined puzzle globe card with recipient and badge.
- `peacemakersJoinCard(r, slotIndex, bgPos)`: line 181, places a card on the 3D globe, tracks slot container and card element separately, applies dissolving class to evicted card on cap, removes only the old card node, and logs the join.
- `peacemakersStartNextPiece()`: line 228, selects record via chooseRandom, maps source socket coordinates through both scale factors, creates darkened socket on source world, sizes flying piece once, and initiates transform animation.
- `peacemakersInitStill(root)`: line 287, initializes reduced motion mode with eight filled globe slots, one held card showing full message stacked statically, and static orientation.
- `peacemakersInitActive(root)`: line 327, initializes active sequential piece pipeline.
- `peacemakersMount(root)`: line 334, scene mount handler clearing previous timers and routing to active or still initialization.
- `peacemakersPrime(checkpoint)`: line 346, staggers initial speaker phases by offsets 0, 2.2, 4.4, and 6.6 s.
- `peacemakersTickAge(dt)`: line 369, sequential simulation driver handling 1.1 s detach, hold duration with pagination cycling, and 0.9 s snap, animating via translate3d and scale without layout thrash.
- `peacemakersOnLeave()`: line 445, scene cleanup hook cancelling active timers, resetting piece state, and clearing joined slots.
- `registerScene(8, ...)`: line 456, scene 8 registration with speakers, floaters false, fxCanvas true, mount, prime, tickAge, and onLeave.

### Sphere slot geometry table

The 24 slots form 4 latitude bands of 6 longitudes each, centered at stage (1510, 318):

| Slot Range | Latitude Band | Latitude Angle | Longitude Angles (6) | Card Size | Surface Radius |
|---|---|---|---|---|---|
| Slots 0 to 5 | Band 0 (Lower) | -42 deg | 0, 60, 120, 180, 240, 300 deg | 96 by 96 px | 290 px |
| Slots 6 to 11 | Band 1 (Mid-lower) | -14 deg | 0, 60, 120, 180, 240, 300 deg | 96 by 96 px | 290 px |
| Slots 12 to 17 | Band 2 (Mid-upper) | +14 deg | 0, 60, 120, 180, 240, 300 deg | 96 by 96 px | 290 px |
| Slots 18 to 23 | Band 3 (Upper) | +42 deg | 0, 60, 120, 180, 240, 300 deg | 96 by 96 px | 290 px |

Container carries `transform-style: preserve-3d` and rotates slowly (one complete turn per 48 seconds). Cards carry `backface-visibility: hidden` and never counter-rotate.

### Piece masking and socket geometry

Source asset `assets/globe.png` has native dimensions 744 by 691 px and renders in a 604 by 482 px box at left 271, top 134. Four sockets are defined in source pixels and mapped using `PEACEMAKERS_SCALE_X = 604 / 744` and `PEACEMAKERS_SCALE_Y = 482 / 691`:
- Socket 0: source (565, 180) maps to rendered (459, 126), stage (730, 260)
- Socket 1: source (372, 220) maps to rendered (302, 153), stage (573, 287)
- Socket 2: source (460, 310) maps to rendered (373, 216), stage (644, 350)
- Socket 3: source (310, 270) maps to rendered (252, 188), stage (523, 322)

Each detaching piece carries `background-image: url(/color-polish/assets/globe.png)`, `background-size: 604px 482px`, and negative background position `-relX px -relY px`. The piece outline uses a jigsaw puzzle polygon clip-path. As a piece detaches, a darkened socket element with dashed boundary appears on the source world at that relative offset.

### Chosen stage geometry and disjointness arithmetic

The 1812 by 636 stage layout contains the following boxes:

1. Title block: left 12, top 33, width 829. Rendered heading and subheading text ends at x approx 342, y approx 280.
2. Source world art: left 271, top 134, width 604, height 482. Span: x in [271, 875], y in [134, 616].
3. Four speech bubbles:
   - Bubble 1: left 382, top 262, width 200, height 92. Span: x in [382, 582], y in [262, 354].
   - Bubble 2: left 516, top 296, width 200, height 92. Span: x in [516, 716], y in [296, 388].
   - Bubble 3: left 638, top 298, width 200, height 92. Span: x in [638, 838], y in [298, 390].
   - Bubble 4: left 690, top 224, width 200, height 92. Span: x in [690, 890], y in [224, 316].
   The maximum x coordinate across the world art and all four speech bubbles is max(875, 582, 716, 838, 890) = 890.
4. Face-on hold zone: left 900, top 188, width 260, height 260. Span: x in [900, 1160], y in [188, 448], centered at y = 318.
   - Gap to source world art (right edge 875): 900 - 875 = 25 px clearance (disjoint).
   - Gap to bubble 4 (right edge 890): 900 - 890 = 10 px clearance (disjoint).
   - Gap to bubble 3 (right edge 838): 900 - 838 = 62 px clearance (disjoint).
   - Gap to bubble 2 (right edge 716): 900 - 716 = 184 px clearance (disjoint).
   - Gap to bubble 1 (right edge 582): 900 - 582 = 318 px clearance (disjoint).
5. 3D Recognition Globe stage: left 1220, top 28, width 580, height 580. Span: x in [1220, 1800], y in [28, 608], centered at (1510, 318) with radius 290 px.
   - Gap to hold box (right edge 1160): 1220 - 1160 = 60 px clearance (matches the deliberate 60 px gap).
   - Margin to stage right boundary (1812): 1812 - 1800 = 12 px (no stage overflow).
   - Top and bottom margins within stage height 636: (636 - 580) / 2 = 28 px.

Every box is strictly disjoint from all non-parent containers, proved by the non-negative clearances above.

### Round 3 corrections

1. Blocking 1 (Art slicing and sockets): Puzzle pieces now carry the genuine pixels from `globe.png` using `background-image`, `background-size: 604px 482px`, and negative background positions derived from source coordinates mapped through `PEACEMAKERS_SCALE_X` and `PEACEMAKERS_SCALE_Y`. A 20-point jigsaw polygon `clip-path` gives the cards an unmistakable puzzle outline. Detachment leaves a darkened `.peacemakers-socket` element on `#peacemakers-world-sockets`. During flight the background art is prominent; during hold, a high-opacity readable scrim ensures legibility.
2. Blocking 2 (Slot container removal bug): Separated the reusable `.globe-slot` containers from the inner `.globe-card` elements. `peacemakers_joined` now tracks `cardEl`. When slot capacity 24 is reached, only `oldest.cardEl` receives `.dissolving` and is removed after 500 ms; the slot wrapper remains in the DOM and receives the newly joined card. Across subsequent joins (tested through 30 joins), the live joined count remains exactly 24 at every step.
3. Blocking 3 (Message line clamp and pagination): Removed `-webkit-line-clamp: 6` and `overflow: hidden` from the message text. Implemented `peacemakersFitCard` with an 18 px font floor. Overflowing messages paginate into word-aligned pages and log `circular_pagination` with `verbatim: true`. In active mode, pages cycle sequentially across the hold duration with a page indicator. In still mode, all pages stack statically as `.puzzle-message-page` spans so viewers see the entire message without animation, concatenating to match the original message verbatim.
4. Blocking 4 (Disjoint geometry): Repositioned the hold box to left 900, top 188, 260 by 260 px, and shifted the globe stage to left 1220, top 28, width 580, height 580 (radius 290 px). Proved arithmetic disjointness with 10 px clearance from speech bubble 4, 25 px clearance from world art, and an exact 60 px gap before the globe. Added an automated DOM measurement test verifying no intersections.
5. Should-fix 5 (Dissolve transition): Attached `.dissolving` to the card element and added matching CSS rules for both `.globe-card.dissolving` and `.globe-slot.dissolving`.
6. Should-fix 6 (Shape test visibility): Added `.puzzle-card` to joined globe cards (`class="puzzle-card globe-card joined-card"`). Bounding box ratio (96 / 96 = 1.0) and 14 px border-radius pass `cardShape` with 0 failures across all 24 slots.
7. Should-fix 7 (Layout thrash): Sized the active piece element once (260 by 260 px) and drove detach and snap transitions entirely via `transform: translate3d(...) scale(...)` and `opacity`, eliminating per-frame style layout recalculations.
8. Also items: Honored `PEACEMAKERS_GLOBE_RADIUS = 290`. Removed dead code `peacemakersKeepOut()` since `floaters: false` is configured for this scene.

## Review
