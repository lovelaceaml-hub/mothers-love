# Gap report: Section 1, Welcome (renderer id 1)

Coordinator (Opus 5 high), 2026-09-11, from tv/pick 463ce8d.

## Anthony's note (quoted)

"The first time that it opens up, it only shows one big bubble, but the second time that I go around, it shows more and it's animated more. I prefer the second setup. Also, I want speaking bubbles to come out from the people saying the expression examples such as 'how are you', 'please after you', 'it's okay, I understand', etc. It should rotate randomly through all of them."

Binding rulings: decision 9 (Welcome always uses the six-bubble layout, the single reader bubble never appears there), decision 8 (long messages fit on one page by growing the slot then shrinking text to the 18 px floor), decision 1 (`chooseRandom`).

## What tv/pick 463ce8d does

- scenes/welcome.js is the **only scene file wrapped in an IIFE** (`(() => {` at line 4, `})();` at line 250), so its top-level names are already private and the globals check will never flag them. Do not unwrap it.
- `WELCOME_POSITIONS` (line 19) is the six-bubble grid: `[870,22,300]`, `[1228,14,286]`, `[1530,60,270]`, `[930,345,268]`, `[1290,336,272]`, `[1575,350,224]`.
- `welcomeBubbles()` (line 27) picks six records through `choose()` and collapses the whole pass to `readerSlot(long,861,37,925,586)` when any one fails `smallFits`. **That collapse is exactly the "one big bubble" Anthony saw and rejected.**
- `welcome()` (line 38): a title block at `left:15px;top:43px;width:831px` (eyebrow, a 74 px two-line h1, then a 29 px serif couplet), then `art('community','left:-20px;top:325px;width:910px;height:298px')`, then the bubbles.
- `registerScene(1,...)` (line 239) declares `keepOut:()=>[{x:0,y:10,w:855,h:347}]` and `replaceMode:'drift'`, with `mount`, `integrate`, `place` and `draw` hooks.
- community.png is 1600 by 536 and shows eight adults and one child on shoulders, arms around each other, backs to the viewer with heads turned. Rendered into 910 by 298, so the scales are 910/1600 = 0.56875 and 298/536 = 0.55597.

## Gaps and decisions

### G1. The reader collapse must go, and `drawSlots` replaces it.
**Decision.** Delete the `const long = chosen.find(...)` and `readerSlot(...)` lines from `welcomeBubbles()`. Call Section A's `drawSlots(chosen, WELCOME_POSITIONS, {readerBounds:{maxW:1804,maxH:625}})`. Six `.orb` elements every pass, never one. Records come from `chooseRandom`, not `choose()`.

### G2. Speech anchors, measured over community.png.
Mapped with both scale factors from the source positions of the figures' heads.

| Figure | Source x, y | Stage x, y | Bubble box (left, top, w, h) |
|---|---|---|---|
| Child on shoulders | 930, 65 | 509, 361 | 504, 236, 180, 86 |
| Grey-hair woman, purple vest | 1140, 175 | 628, 422 | 520, 326, 180, 86 |
| Man with the yellow backpack | 1270, 150 | 702, 408 | 704, 306, 160, 86 |

**Decision.** **Three anchors, the right-hand third of the art only**, passed as `speakers: [{x:509,y:361},{x:628,y:422},{x:702,y:408}]`. The plan allows three to five; three is the number that fits. The five figures further left are rejected on geometry, not taste: the 29 px serif couplet occupies roughly y 263 to 344 across x 15 to 495, and a bubble rising from any of those heads lands inside it. The three boxes above are mutually disjoint, clear of the serif (all start at x 504 or beyond), and clear of the bubble grid (all end by x 864, and the grid starts at x 870). Anchor phases offset by 0, 2.5 and 5.0 seconds so the three do not appear together.

### G3. Plan 13 follow-ups carried here.
**Decision.** Apply follow-up 7 (the stage clamp uses `a.d / 2 * scale`), follow-up 9 (negative `animation-delay` on the rings), and migrate to the 0.9 px blur cap for symmetry with the other scenes. Keep the Plan 13 depth layers, the Z roll and the ring spin exactly as they are; Anthony said he preferred that animation, so nothing about it changes.

### G4. Reduced motion.
**Decision.** Six static bubbles, each anchor showing one phrase that never rotates, no drift, no ring spin.

## Testable acceptance

1. The common scene spec.
2. Six `.orb` elements at 0 s, 6 s and 14 s with the mostly-long fixture (four of six messages over 160 characters), never one, and no `readerSlot` call reachable in this scene.
3. At least two `.speech-bubble` elements visible by 6 s and three by 9 s, each with computed `border-radius` 16 px, phrases drawn from the nine catalog phrases with no immediate repeat over 12 draws.
4. `circularity` and `noOverflow` pass with the speech bubbles present.
5. No speech bubble rect intersects another, the serif couplet's rect, or any `.orb-slot` rect.
6. Every message reaches one page at or above 18 px where it fits; nothing is truncated.

## Risk

- The three anchors sit over the right third of the art, which is also the busiest part of the picture (the child, two adults and the backpack). If Anthony reads that as "the bubbles are all bunched together", the fix is to move the whole title block up and free the left half for two more anchors, which is a layout change worth a separate round rather than a guess now.
