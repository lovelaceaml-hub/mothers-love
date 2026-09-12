# Gap report: Section 4, We Are Peacemakers puzzle world (renderer id 8)

Written by the coordinator (Opus 5 high) on 2026-09-11 from tv/pick 463ce8d, before the lane launches. Section 4 of /Users/anthony/Projects/mothers-love/docs/PLAN-15-tv-next-level.md.

## Anthony's note (quoted)

"I want to change this one completely. Instead of bubbles, I want them to come in as puzzle pieces. So the world is made up of puzzles. From there I want the recognitions to come out as puzzle pieces and start connecting together in a large 3D format (for example a world that is rotating, or some other format you can suggest that will be interesting to look at while fitting the theme). So from the first world image a recognition will come out and display for 3 seconds, then start to form the larger 3D 'recognition'; the next one does the same thing and connects to the other puzzle pieces, and that will keep repeating for the entirety of that scene. Also, I want speaking bubbles to come out from the people saying the expression examples such as 'how are you', 'please after you', 'it's okay, I understand', etc. It should rotate randomly through all of them."

Anthony's fork rulings that bind this lane: decision 3 (recognition globe format), decision 4 (hold time 3 s plus 1 s per 40 characters, the piece carries the full message, name and expression icon), decision 7 (`.puzzle-card` is exempt from the circularity rule).

## What tv/pick 463ce8d does

- public/color-polish/scenes/peacemakers.js line 6: the markup is a title block at `left:12px;top:33px;width:829px`, then `art('globe','left:271px;top:134px;width:604px;height:482px')`, then `<div class="globe-light">`, then `peacemakersBubbles()`.
- `PEACEMAKERS_POSITIONS` (line 15) is a six-entry grid occupying x 880 to 1804, y 12 to 616. `peacemakersBubbles()` (line 26) picks six records through `choose()` and collapses the whole pass to one `readerSlot(long,861,37,925,586)` when any record fails `smallFits`.
- `PEACEMAKERS_LAYERS` (line 9) gives three depth tiers with blur 0.9, 0.35 and 0, and `PEACEMAKERS_BEADS` plus `mountPEACEMAKERS` drive the existing bead and petal motion.
- **The art already is a puzzle globe.** public/color-polish/assets/globe.png is 744 by 691 and shows a sphere drawn as interlocking puzzle pieces, with one piece already detached at the upper right and four figures standing around it on grass. The plan's contingency asset globe-puzzle.png is therefore **not needed** and must not be created: the existing image carries the piece seams, and one piece visibly lifting out is already the picture Anthony described.
- The image is drawn into a 604 by 482 box from a 744 by 691 source, so it is squashed: the horizontal scale is 604/744 = 0.8118 and the vertical scale is 482/691 = 0.6975. Any coordinate measured on the source must be mapped with both factors separately, never with one.

## Gaps and decisions

### G1. No new asset.
**Decision.** Use the existing globe.png. Do not add public/color-polish/assets/globe-puzzle.png and do not invoke the make-images skill for this lane. The source world is globe.png at its current box, unchanged: `left:271px;top:134px;width:604px;height:482px`. Pieces detach from it as CSS-masked copies of the same image, so a detaching piece carries the real art of that part of the world.

### G2. The layout of the three regions was never fixed.
**Decision.** Three fixed boxes on the 1812 by 636 stage:
- **Title**, unchanged: left 12, top 33, width 829.
- **Source world**, unchanged: left 271, top 134, 604 by 482.
- **Hold position** (the face-on piece carrying the full recognition): a 300 by 300 box centred at x 900, y 318, so it spans x 750 to 1050 and y 168 to 468.
- **Recognition globe**: centred at x 1400, y 318, radius 290, so it spans x 1110 to 1690 and y 28 to 608.
The 60 px gap between the hold box and the globe's left edge is deliberate; nothing may be positioned in it. `keepOut` for this scene returns the title block plus the source world box so no floater crosses either.

### G3. "Connecting together in a large 3D format" needed a concrete geometry.
**Decision.** A spherical grid of 24 slots: 4 latitude bands of 6 longitudes each, each slot a 96 by 96 `.puzzle-card` placed with `translate3d` plus a `rotateY(longitude)` and `rotateX(latitude)` on the slot, inside a container carrying `transform-style:preserve-3d` and a slow `rotateY` animation of one turn per 48 seconds. Every card carries `backface-visibility:hidden`. The container rotates; individual cards never counter-rotate, so a card on the far side genuinely faces away. When all 24 slots are full, the oldest card dissolves as a new one joins, so the globe never empties and never exceeds 24.

### G4. Sequential or overlapping pieces.
**Decision.** Strictly sequential, exactly as Anthony described: one piece detaches, flies to the hold box, holds for its reading time, snaps into the globe, and only then does the next piece detach. At most one piece is in flight or holding at any instant. Detach to hold takes 1.1 s, snap takes 0.9 s, and neither counts toward the hold time.

### G5. The message is readable only face-on, and the hold time depends on its length.
**Decision.** Hold time is `3 + message.length/40` seconds, per decision 4, measured from the moment the piece reaches the hold box. At the hold box the card shows the recipient name, the expression icon and the full message on one page at or above the 18 px floor (Section A's `fitCircle` floor applies; the card is a rectangle, so the pagination path is available but a 500 character message at 300 by 300 will paginate, which is allowed because messages are never truncated). Once snapped into the globe, the card shows the name and icon only: toggle a `.face-on` class off at the snap, and gate the message element on that class. A card rotated past 70 degrees from the viewer must not show message text; because the container rotates and cards carry `backface-visibility:hidden`, that holds geometrically, and the spec asserts it by reading the container's rotation and the card's `offsetParent`-relative transform.

### G6. Speech anchors, measured over the art.
Measured on the 744 by 691 source, then mapped with the two scale factors from G1. Four figures stand around the world; the anchor is each figure's head or mouth.

| Figure | Source x, y | Stage x, y | Bubble box (left, top, w, h) |
|---|---|---|---|
| Left girl, green top, raised hand | 152, 345 | 394, 375 | 382, 262, 200, 92 |
| Boy, red stripes, back turned | 287, 395 | 504, 410 | 516, 296, 200, 92 |
| Girl, dark green dress | 437, 398 | 626, 412 | 638, 298, 200, 92 |
| Right man, light shirt | 594, 300 | 753, 343 | 690, 224, 200, 92 |

**Decision.** Four anchors, passed through Section A's `speakers` descriptor field as `[{x:394,y:375},{x:504,y:410},{x:626,y:412},{x:753,y:343}]`. Each bubble is capped at 200 by 92 and sits at the box above, with the tail pointing down toward its anchor. The four are staggered so they do not all appear at once: anchor phases offset by 0, 2.2, 4.4 and 6.6 seconds. The subheading text ends near x 342 at y 250 to 300, so every bubble box above clears it; the lane must assert no overlap rather than assume it.

### G7. Records and the removed reader collapse.
**Decision.** Records come from Section A's `chooseRandom` (decision 1), never `choose()`. `peacemakersBubbles()` and `PEACEMAKERS_POSITIONS` are deleted outright: this scene no longer draws `.orb` bubbles at all, so the reader collapse cannot occur here. Delete the dead wrappers from Plan 13 follow-up 6 in the same pass.

### G8. Reduced motion.
**Decision.** Under `S.still`: the source world is static, the recognition globe shows eight cards filled and does not rotate, one piece sits in the hold box showing its full message, no piece flies, and each speech anchor shows one phrase that never rotates.

## Testable acceptance (replaces the plan's Section 4 acceptance line where they differ)

1. The common scene spec, with `cardShape(frame, '.puzzle-card', 'puzzle')` in place of circularity for those cards, and `circularity` still passing for everything else in the scene.
2. Over 40 s through `loadRenderer` **with a short-message fixture** (every message under 40 characters, so each hold is about 3 to 4 s), the joined card count increases monotonically and reaches at least six. The plan's "at least six" is only achievable with short messages; a long-message fixture yields three or four by design, and the spec must use the short fixture for this assertion and a separate long-message fixture for assertion 3.
3. Each held card's hold time equals `3 + message.length/40` seconds within 0.3 s, logged per piece, checked against both a short and a 500 character record.
4. The message text is present and visible on the card in the hold box, and absent or hidden on every card joined to the globe.
5. `noOverflow` holds on the scene root; no speech bubble box overlaps the title block's rendered text.
6. The globe container's computed `transform-style` is `preserve-3d` and its computed transform contains a `rotate`; no `.orb` exists in this scene.
7. Four `.speech-bubble` elements are present by 9 s, each with computed `border-radius` 16 px, phrases drawn from the nine catalog phrases with no immediate repeat over 12 draws.
8. The joined card count never exceeds 24, and after the 25th join the oldest card is gone.
9. Frame time sampled at 3840 stays under 40 ms per frame.
10. Reduced motion matches G8 exactly.

## Risk

- 24 cards on a `preserve-3d` sphere plus a rotating container is the heaviest 3D in the plan. If 3840 exceeds 40 ms, the documented first lever is reducing the grid to 3 bands of 6 (18 slots), a one-value change on this branch, named in the plan's Rollback section.
- The source image is squashed, so a CSS-masked piece copied from it inherits that squash. Pieces must be masked from the rendered 604 by 482 box, not from the 744 by 691 source, or the seams will not line up with the visible art.
- The hold box at 300 by 300 is smaller than the 540 px arrival bubble, so a 500 character message will paginate there. That is permitted (never truncated) but Anthony may find it slow to read; flag it to him after his first TV look rather than pre-emptively growing the box into the 60 px gap.
