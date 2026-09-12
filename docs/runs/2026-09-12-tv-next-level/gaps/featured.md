# Gap report: Section 3, Featured Recognition (renderer id 4)

Coordinator (Opus 5 high), 2026-09-11, from tv/pick 463ce8d.

## Anthony's note (quoted)

"Even the section the display is in needs to be a lot more prominent and 3D-like, showing a lot. When the expression changes, the bubbles that are showing there should also be changed out with bubbles that have the same expression. It can be more theatrical."

## What tv/pick 463ce8d does

- scenes/featured.js, 314 lines. `FEATURED_BAG`, `FEATURED_LAST`, `FEATURED_PASS_ID` and `FEATURED_FLIP_CANCEL` are module-level `let` declarations with the scene's prefix (lines 11 to 14), so the globals check is satisfied already.
- `featuredNextId()` (line 16) is the nine-expression shuffle bag with a no-immediate-repeat swap. `featuredMarkupPanel(id)` (line 37) builds the expression panel.
- The flip is a class machine: `flip-out` then `flip-in` on the panel, guarded by `V.flipping`, with `V.flipStartAge`, `V.flipSwapped` and `V.flipInFinisher` (lines 139 to 210). It fires at 15 s of scene age.
- The panel already uses CSS 3D, which is why Anthony has seen 3D on this display and why the plan's assumption about the TV's 3D support holds.
- Plan 13 left two follow-ups on this scene: follow-up 1 (cancel the flip timers in `onLeave` and resolve the eyebrow from `panel.closest('.scene')` instead of a document query) and follow-up 2 (pass an explicit pass token instead of `S.sceneAge` for the remount guard).

## Gaps and decisions

### G1. "A lot more prominent and 3D-like" had no geometry.
**Decision.** The panel becomes the scene's dominant object: `perspective: 1400px` on the scene root, the panel at `transform-style: preserve-3d`, and its inner parts on three explicit `translateZ` tiers, 0 px for the plate, 34 px for the medallion and the phrase, 68 px for the icon. The phrase is the panel's largest text, above the expression name. Add a soft glow behind the plate and one particle layer inside the panel's bounds. The panel's rendered bounding box must be at least 1.5 times the diameter of any bubble in the scene, which is the same dominance test Section 8 uses for the orbit centre, so the two scenes read as one system.

### G2. The bubble swap at the flip was not specified beyond "same expression".
**Decision.** At the 15 s flip, the three bubbles burst (the existing burst vocabulary, logged as `featured_bubble_burst` with the outgoing ids), and three new bubbles enter drawn by `chooseRandom(exclude, newExpressionId)`. When fewer than three records carry the new expression, fall back to `chooseRandom(exclude)` with no expression filter for the remainder, so the scene never shows an empty slot; log `featured_sparse_expression` with the count when that happens. Every entering bubble's chips must include the new expression when it was drawn with the filter.

### G3. No reader collapse here either.
**Decision.** This scene's bubbles go through `drawSlots` with the scene's existing positions and its own `readerBounds`; the reader collapse is removed, per decision 8 and decision 9's spirit. Records come from `chooseRandom`.

### G4. The flip and a scene change racing.
**Decision.** Implement follow-up 1 and follow-up 2 in this lane: `onLeave` (new in Section A) cancels `FEATURED_FLIP_CANCEL` and every flip timer, and the remount guard compares an explicit pass token rather than `S.sceneAge`. A forced scene change at 15.2 s, mid-flip, must leave the next scene's eyebrow untouched and log no error. This is the one correctness bug in the scene today and it is this lane's responsibility.

## Testable acceptance

1. The common scene spec.
2. At 14 s the eyebrow and every bubble's chips match the first expression; at 21 s they match the second; a `featured_bubble_burst` entry sits between them in the log.
3. The panel's computed `transform-style` is `preserve-3d`, its bounding box is at least 1.5 times the largest bubble's diameter, and no `.orb` or ancestor of one carries a 3D rotation.
4. A forced scene change at 15.2 s leaves the next scene's eyebrow untouched, logs no error, and leaves no timer running.
5. With a fixture where only one record carries the incoming expression, three bubbles still appear and `featured_sparse_expression` is logged.

## Risk

- `perspective` on the scene root affects every child, including the bubbles. The bubbles must stay perfectly circular under it, which they will as long as they carry no rotation, but the circularity check has to run at the flip midpoint as well as in the steady state.
