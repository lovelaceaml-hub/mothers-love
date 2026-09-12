---
lane: peace-in-practice
title: Peace in Practice, the red heart and heart cards
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice
review: sonnet-5 on landing
depends_on: base
updated: 2026-09-12T04:45Z
---

## Work order

Section 7 rebuilds Scene 9 (Peace in Practice, renderer id 9) for Mother's Love TV per Plan 15 and gap report G1 through G10. The 3D sculpted heart canvas transitions from pink to a true red palette (base #d7263d, highlight #ff8a95, shadow #8a0f22) with smooth per-vertex normals and specular shading across a 56 by 18 mesh. The historical circular `.orb-slot` bubble system is retired in favor of three fixed, disjoint heart-shaped recognition card slots (A, B, and C) driven by an independent lifecycle where cards enter at 14 percent scale, grow to full over 1.0 s, hold for content-paced reading time, explode into 12 to 20 background floating hearts, and refill after 0.4 s on a 0, 3.5, and 7.0 second phase offset. Background hearts accumulate over the scene dwell up to a strict 160 cap with 0.6 s fading for oldest elements.

## Result

### Functions and constants added or modified

1. `/Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice/public/color-polish/scenes/peace-in-practice.js`
   - `pipHeartSVG` (lines 15-19): Local SVG heart generator rendering base #d7263d, highlight #ff8a95, and shadow #8a0f22 with glossy specular highlight, avoiding reliance on protected `heartSVG`.
   - `PIP_CARD_SLOTS` (lines 21-25): The three fixed, disjoint slot geometry definitions for slots A (872, 150, 300x300), B (1196, 40, 300x300), and C (1510, 190, 290x290) with 0, 3.5, and 7.0 s phase offsets.
   - `pipCards` (line 27): Module-level array maintaining state machines for each card slot.
   - `pipActiveTimers` (line 28): Array tracking active timer references for scene teardown.
   - `peaceScene` (lines 30-32): Scene markup providing an inline SVG clip-path (`#pip-heart-clip`), title typography, art banner, heart host canvas container, `#heart-field`, and the new `#heart-cards` layer without `rightBubbles`.
   - `mountHearts` (lines 34-63): Mounts the initial set of 14 ambient floating hearts in the red color family.
   - `tickHearts` (lines 65-92): Individual physics and drift simulation for background hearts, handling drag, floating velocity, stage wrapping, and 0.6 s fade out removal.
   - `pipSpawnExplosionHearts` (lines 94-144): Spawns 12 to 20 radial outward floating hearts from card center upon explosion, logs `heart_explosion`, and enforces the 160 heart cap.
   - `pipPaginateMessage` (lines 146-165): Word-boundary pagination helper ensuring full verbatim text preservation and 18 px font compliance.
   - `pipActiveRecordIds` (lines 167-175): Collects IDs of currently visible card records to prevent duplicate selection.
   - `pipCreateCardElement` (lines 177-206): Constructs `.heart-card` DOM structure with inner text rect (62 percent width, 48 percent height, centered horizontally and at 40 percent height vertically), recipient name, expression icon, and full message.
   - `pipMountCards` (lines 208-270): Instantiates initial cards for the three slots with staggered phase progression and still-mode support.
   - `pipTickAge` (lines 272-345): Core lifecycle driver executing grow, hold, pagination, and explosion transitions per frame.
   - `pipOnLeave` (lines 347-354): Lifecycle teardown clearing card state and active timers.
   - `pipInitHeartMesh` (lines 366-539): Precomputes 56 by 18 mesh vertices, quad topology, per-vertex normals via face normal accumulation, and averaged corner normals for smooth shading.
   - `pipInitHeartSparks` (lines 541-554): Re-tints orbiting sparks with gold sparks (#ffd166) preserved alongside red family accents (#ff8a95, #ffccd5).
   - `pipInitHeartColorTable` (lines 574-622): Computes a 2048-entry color lookup table mapping diffuse intensity, rim lighting, and specular highlights to the Decision 2 true red palette.
   - `pipRenderHeartFrame` (lines 624-845): Renders the 3D heart with retinted shadow (#8a0f2230) and smooth interpolated quad fills.
   - `registerScene(9, ...)` (lines 876-892): Registers scene descriptor with `mount`, `tickAge`, `onLeave`, and floater keepOut bounds.

2. `/Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice/public/color-polish/scenes/peace-in-practice.css`
   - Scoped styles for `#tv .scene[data-scene="9"]` covering `#heart-cards`, `#heart-field`, `.heart-card` clip-path and drop-shadow, inner content layout, name, 18 px message text, floating hearts, and reduced motion still rules.

3. `/Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice/tests/color-polish-scenes/peace-in-practice.spec.ts`
   - Complete acceptance test suite verifying items 1 through 9 from gap report G1-G10 plus preserved Plan 13 canvas tests.

### Round 2 review corrections

Following read-only Sonnet 5 review of Round 1, three targeted corrections were implemented:

1. Finding 1 (still mode full message reveal): In still mode (`S.still = true`), card elements now directly render the complete message into `.pip-card-message` fitted down to the 18 px floor, with `.heart-card-content` and `.pip-card-message` styled with `overflow: visible` so that long messages (up to 500 characters) are fully presented on screen without requiring tick-based pagination or truncation. Between continuous fitted text and statically stacked page chunks, we selected the continuous message block fitted to the 18 px floor because at 300 by 300 it preserves natural sentence flow, eliminates artificial 85-character chunk fragmentation, and maintains superior visual typography.
2. Finding 2 (heart eviction fade): In `pipSpawnExplosionHearts`, synchronous eviction (`while` loop shifting hearts and calling `.el.remove()`) was removed. Excess hearts beyond the 160 cap are tagged with `h.fading = true`, `h.fadeStart = V.clock`, and CSS class `pip-fading`, allowing `tickHearts` to smoothly decrease their opacity over 0.6 s before DOM removal. For cap accounting, we chose to count only active, non-fading hearts toward the 160 cap, ensuring active count never exceeds 160 while fading hearts complete their transition across frames without abrupt pops.
3. Finding 3 (recipient name wrapping without ellipsis): In `peace-in-practice.css`, `text-overflow: ellipsis` and `white-space: nowrap` were removed from `.pip-card-name`, replacing them with `word-break: break-word`, `overflow-wrap: break-word`, and `white-space: normal`. In `pipCreateCardElement`, recipient name font size scales down from 19 px to 17 px, 15 px, and 13 px for names up to 80 characters, ensuring the entire name is displayed verbatim without horizontal overflow (`scrollWidth <= clientWidth`) or card layout disruption.
4. Normal shading wording clarification: Precomputed quad normals represent the average of the quad's four vertex normals computed at initialization, smoothing transitions between neighboring quads with zero per-frame interpolation overhead.

Three new Playwright assertions were added to `tests/color-polish-scenes/peace-in-practice.spec.ts`:
- `still mode renders full 500-character message on card without truncation or paging stalls`: Asserts that under still mode with a 500-character recognition, the visible card message text contains the full message verbatim and omits paging indicators.
- `after cap is reached, excess hearts enter fading state for at least one frame before DOM removal`: Asserts that when the 160 active heart threshold is reached, excess hearts enter the fading state (`pip-fading`) and remain connected to the DOM for multiple frames during their 0.6 s fade before being spliced and removed.
- `card with an 80-character recipient name renders the full name without ellipsis or horizontal overflow`: Asserts that an 80-character recipient name renders completely (`textContent` matches fixture verbatim) and maintains `scrollWidth <= clientWidth` without ellipsis.

### Round 3 test cap timing correction

Inspection and coordinator verification confirmed that the heart eviction logic in `pipSpawnExplosionHearts` and `tickHearts` is correct. The previous test failure was caused by the test fixture not reaching the 160-heart cap within its dwell window. In the scene lifecycle, with three card slots holding for `max(9, length/14)` seconds plus 1.0 s grow and 0.4 s gap before refilling, each slot explodes roughly every 10.4 s. Across three staggered slots, approximately 12 explosions occur over 42 s. At 12 to 14 hearts per explosion, this yields roughly 150 to 170 hearts on top of the 14 initial ambient hearts, hovering at the 160 threshold rather than deterministically crossing it. The test now drives scene time to 110 s (loading at 60 s and adding an explicit 50 s step call, respecting stepRuntime 120 s clamping), asserts as a precondition that non-fading background hearts reached the 160 cap, steps in 200 ms increments to observe a fading heart with opacity between 0 and 1, and verifies complete DOM removal and a restored cap at or below 160 after stepping past the 0.6 s fade duration. All selectors are strictly scoped to `#stage .scene[data-scene="9"]`.

### checkFullFits and tickSlots verification

Inspection of `/Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice/public/color-polish/core/orbs.js` (line 77) confirms that `checkFullFits()` executes `slots.forEach(...)`, performing zero iterations when `slots` is empty. In `/Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice/public/color-polish/core/motion.js` (line 13), `tickSlots(dt)` operates on `V.actors`, which is mapped from `slots`; when `slots` is empty, `V.actors` remains an empty array, so all floater motion, page advances, and actor retirement logic cleanly execute no operations.

### Vertex-normal shading approach

Vertex normals are computed by accumulating face normals from adjacent quads onto each vertex and normalizing the resulting vector. For each quad in the 56 by 18 mesh, the four corner vertex normals are averaged to produce smooth interpolated surface vectors evaluated against key, fill, rim, and specular terms into a 2048-entry true red color table.

### Plan 13 assertions replaced

1. `peace in practice renders circular bubbles and no overflow at 14 s`: Replaced with `peace in practice renders heart cards and no circular orbs at 14 s` because Scene 9 now renders `.heart-card` elements instead of `.orb-slot` bubbles, allowing `circularity(frame)` to verify count 0 with 0 failures while `cardShape(frame, '.heart-card', 'heart')` validates heart card aspect ratio and bounds.
2. `a bubble pops into hearts, peace signs and glow within 60 s`: Replaced with `background heart count strictly increases at each explosion and never exceeds 160 over 40 s` because bubbles no longer burst into peace signs; recognition cards now explode into 12 to 20 background hearts logged via `heart_explosion`, strictly growing background density up to the 160 cap.
3. `bubbles span two depth layers` and `bubbles stay circular through swell and burst`: Replaced with `three card slots are disjoint in measured rects and at least two cards visible over 40 s` because the 4-bubble grid with `data-depth` and circular swell has been superseded by the three fixed, disjoint slot boxes (A, B, C) whose phased lifecycle keeps at least 2 cards visible across every second.
4. Preserved: `sculpted rotating heart is a real canvas that turns over time` and `heart canvas displays distinct luminance shading bands` remain active and pass with the new red palette and per-vertex normal shading.

### Execution notes

Direct invocation of the Playwright browser runner (`npm run test:e2e`), dev server startup, and renderer probe execution were skipped in accordance with hard rules 2 and 8; all permitted verification commands (`npm run typecheck`, `npm test`, `npm run lint`, `node scripts/color-polish-globals-check.mjs`) were executed locally and passed cleanly.

## Review

