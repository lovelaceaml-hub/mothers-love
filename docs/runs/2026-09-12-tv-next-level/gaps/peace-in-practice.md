# Gap report: Section 7, Peace in Practice red heart and heart cards (renderer id 9)

Written by the coordinator (Opus 5 high) on 2026-09-11 from tv/pick 463ce8d, before the lane launches. Section 7 of /Users/anthony/Projects/mothers-love/docs/PLAN-15-tv-next-level.md.

## Anthony's note (quoted)

"The heart is getting in a better direction but I'd rather it be a smooth red 3D heart. Also, let's change the bubbles for this one. They should be heart shapes. Little hearts coming into the scene and growing to show the recognition, then exploding into many hearts as new ones come in. The hearts it exploded into should remain as floating hearts in the background filling up the screen until it changes."

Anthony's fork rulings that bind this lane: decision 2 (glossy true red, base #d7263d, highlight #ff8a95, shadow #8a0f22, soft specular gloss; the small hearts use the same family), decision 7 (`.heart-card` is exempt from the circularity rule).

## What tv/pick 463ce8d does

- public/color-polish/scenes/peace-in-practice.js line 18 `peaceScene()`: a title block at `left:12px;top:36px;width:861px`, the `hands_banner` art at `left:20px;top:393px;width:823px;height:238px`, `<div class="heart-host" id="heart-host" style="left:198px;top:232px;width:390px;height:363px">`, `<div id="heart-field">`, then `rightBubbles()`.
- Line 20 `mountHearts()` creates exactly 14 `.floating-heart` elements in `#heart-field`, sizes 27 to 66 px, using `heartSVG('#d6bbc9')` and `heartSVG('#e9b1b9')`. Line 21 `tickHearts(dt)` animates them by array index with a fixed formula; it is called from `coordinator` in core/stage.js.
- `heartSVG(color)` lives in core/state.js and hardcodes `#fff0e9` and `#be6e85` inside its gradient. core/state.js is Section A's file and protected here.
- Lines 23 to 26: `PIP_HEART_N = 56`, `PIP_HEART_M = 18`, giving `PIP_HEART_TOTAL_QUADS = 18*56 + 2*56 = 1120` quads drawn per frame. `pipRenderHeartFrame` fills each quad from a precomputed `colorTable` (line 485) with a flat per-quad color, and draws the shadow with `#c6748230` (line 431).
- `registerScene(9,...)` (line 536) declares `floaters:true`, `fxCanvas:true`, `keepOut:()=>[{x:0,y:10,w:870,h:276}]`, `replaceMode:'hearts'`, and `place`, `integrate`, `onRetire` hooks that drive `.orb-slot` actors through core/motion.js. `onRetire` pushes 12 `peace` fx particles.
- The scene's right region is `rightBubbles()`'s four-bubble grid, positions 885/1301/824/1454, inside x 824 to 1804 and y 23 to 625. Scene 9's dwell is 60 seconds (`DWELL` in core/state.js).

## Gaps and decisions

### G1. Heart cards cannot ride the `.orb-slot` actor system.
core/motion.js's `tickSlots` drives `.orb-slot` elements produced by `addOrb`, and `place`, `integrate` and `onRetire` are that system's hooks. A heart-shaped card that enters small, grows, holds and explodes is a different lifecycle.
**Decision.** This scene stops calling `rightBubbles()` and stops producing `.orb-slot` actors entirely. It renders its own cards into a new `<div id="heart-cards">` and runs their whole lifecycle in its own `tickAge(dt)` hook. `place`, `integrate` and `replaceMode` are removed from the descriptor; `keepOut` stays (it still bounds the floaters) and `onRetire` is removed with the actors it served. Consequences the lane must accept: `slots` stays empty in this scene, so `checkFullFits` does nothing here and no `.orb` or `.orb-slot` exists in scene 9 at all. `circularity` therefore passes trivially, and `cardShape(frame,'.heart-card','heart')` is the real shape check.

### G2. Card slots and sizes were never fixed.
**Decision.** Three fixed, non-overlapping slots on the 1812 by 636 stage, verified disjoint:
- A: left 872, top 150, 300 by 300 (x 872 to 1172, y 150 to 450)
- B: left 1196, top 40, 300 by 300 (x 1196 to 1496, y 40 to 340)
- C: left 1510, top 190, 290 by 290 (x 1510 to 1800, y 190 to 480)
Three cards on screen at a time, one per slot. A card enters its slot at 14 percent scale, grows to full over 1.0 s, holds, explodes, and the next card for that slot enters 0.4 s later. The three slots are phased by 0, 3.5 and 7.0 seconds so they never explode together.

### G3. The card's reading time had no formula.
**Decision.** Use the same pace the shipped renderer already uses for bubbles, `Math.max(9, message.length/14)` seconds, so reading speed matches every other scene. A 500 character message holds about 36 s, inside the 60 s dwell. Do not invent a second pace; decision 4's `3 + length/40` belongs to Peacemakers only.

### G4. Text inside a heart silhouette.
A heart clip-path leaves much less readable area than its bounding box.
**Decision.** The card box is square (so `cardShape`'s 0.8 to 1.25 aspect holds) and the heart is drawn inside it with `clip-path`. The text block is an inner rect at 62 percent of card width and 48 percent of card height, centred horizontally and at 40 percent of the card height vertically, carrying the recipient name, the expression icon and the full message. Section A's 18 px font floor applies; the message reaches one page where it fits and paginates only below the floor. **Never truncated**, no ellipsis, no `text-overflow`.

### G5. The exploded hearts and the 160 cap.
Today's `tickHearts` indexes a fixed 14-element array, so it cannot animate a growing set.
**Decision.** Rewrite `mountHearts` and `tickHearts` in this file: each background heart carries its own position, velocity, drift phase, size and birth clock, so the list can grow. An explosion pushes 12 to 20 hearts at the card's centre with outward velocities. Hearts accumulate for the whole dwell and are never cleared mid-scene. Cap 160: a push that would exceed it marks the oldest heart for a 0.6 s fade and removes it when the fade completes, so the count never exceeds 160 and the screen keeps filling as Anthony asked. The 14 ambient hearts `mountHearts` creates today become the starting set.

### G6. The red family, without editing core/state.js.
`heartSVG` is in Section A's protected file and hardcodes pink stops.
**Decision.** Define a local `pipHeartSVG(color)` in scenes/peace-in-practice.js using the decision 2 family (base #d7263d, highlight #ff8a95, shadow #8a0f22) for every heart this scene draws: the card silhouettes and the background hearts. Do not edit `heartSVG` and do not call it from this scene. Gold sparks stay gold.

### G7. Smooth shading and the mesh resolution.
The plan allows raising `PIP_HEART_M` if the frame time at 3840 stays under 40 ms.
**Decision.** **Keep 56 by 18. Do not raise it.** The same frame now also carries up to 160 background hearts, three heart cards and their explosions, so the budget is spent there rather than on mesh density. Smoothness comes from per-vertex normals and interpolated shading across each quad, not from more quads: compute a normal per vertex, average the four corner normals per quad, and derive the fill from that plus a specular term, replacing the flat per-quad `colorTable` lookup at line 485. Plan 13 follow-up 5 (halve `PIP_HEART_M` if the TV stutters) stays documented as the first lever.

### G8. The plan's hue acceptance needed a concrete sampling method.
**Decision.** Sample the heart canvas through `frame.evaluate` at the hold midpoint: read `document.querySelector('#heart-host canvas')`, call `getContext('2d').getImageData(x,y,1,1)` at three points inside the silhouette, at canvas-relative fractions (0.50, 0.35), (0.35, 0.55) and (0.65, 0.55), convert each to HSL, and assert hue within 345 to 10 degrees and saturation above 60 percent. Read once per sample, not per frame.

### G9. Records.
**Decision.** Records come from Section A's `chooseRandom` (decision 1), never `choose()`. Delete the Plan 13 follow-up 6 dead wrapper in the same pass.

### G10. Reduced motion.
**Decision.** Under `S.still`: the heart renders once and does not rotate, the three slots each show one full-size card with its full message, no card enters, grows or explodes, and the background holds the 14 ambient hearts without motion.

## Testable acceptance (replaces the plan's Section 7 acceptance line where they differ)

1. The common scene spec, with `cardShape(frame, '.heart-card', 'heart')`; `circularity` passes and finds no `.orb` or `.orb-slot` in scene 9.
2. Over 40 s through `loadRenderer`, the background heart count strictly increases at each explosion and never exceeds 160; each explosion is logged with its piece count, and every count is between 12 and 20.
3. The three card slots are disjoint in the DOM's measured rects, and at least two `.heart-card` elements are visible at every sampled second over 40 s.
4. G8's three-point hue sample passes at the hold midpoint.
5. Every card's message is present in full in the DOM (`textContent` equals the fixture message, or the joined pages equal it) and the computed font size is at or above 18 px wherever it is not paginated.
6. `noOverflow` holds on the scene root with 160 background hearts present.
7. Frame time sampled at 3840 stays under 40 ms per frame, measured with 160 background hearts on screen, not at scene start.
8. Reduced motion matches G10 exactly, and `getState().still` is true.
9. No timer this scene creates survives `onLeave`: a forced scene change mid-explosion logs no error and leaves no interval running.

## Risk

- 160 DOM hearts plus a 1120-quad canvas at 3840 is the plan's other heavy scene. The measurement in acceptance 7 must be taken late in the dwell, when the heart count is at its cap; a measurement at scene start would pass while the real TV stutters at 50 seconds. This is the single most likely place this lane looks green and fails on Anthony's TV.
- Removing the actor hooks means the scene no longer participates in `replaceMode:'hearts'`; if any shared code assumes every scene produces slots, it will surface here first. `checkFullFits` and `tickSlots` both guard on empty lists, so the expected outcome is simply no work, but the lane must confirm rather than assume.
- Reading `getImageData` inside a sandboxed iframe works because the canvas is drawn same-origin within that frame. If a future CSP change taints it, the hue check fails closed rather than silently passing, which is the correct direction.
