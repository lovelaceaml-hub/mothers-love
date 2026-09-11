# Gap report: Peace in Practice (Section 9, renderer id 9, slug peace-in-practice)

Written by Fable 5.1 on September 10, 2026 (Plan 13, sitting three). Approval: Anthony's "continue until the end" ruling.

## Prompt asks
1. Bubbles move freely and independently (direction, speed, pace, drift, depth); some enter while others move, hover, or leave.
2. Exit is a pop, not a fade: the bubble bursts into hearts, peace symbols, soft particles or small glowing shapes that disperse before fading; positive and warm.
3. A new recognition enters independently; never replace all at once.
4. Circular at all times; about one minute.

## Prototype v6 2 does
- Fixed positions with the CSS breath, a full-scene reshape reset, and no burst.

## Live does (measured over 60 seconds)
- Four bubbles beside the copy block, seeded physics as in welcome (speeds 2 to 25 px/s across actors at any instant). Ask 1's independence is live; depth is invisible (scale .90 to 1.0, blur under .1 px).
- Replacement is `replaceMode:'hearts'`: the leaver swells for .72 s then bursts (`burstAt` kind `hearts`, 44 particles plus a gold ring) and the newcomer enters 3.8 s later from a side; logged at 17.0, 26.2, 35.4, 44.6 and 45.5 s, one at a time. So ask 2's pop exists and ask 3 is live.
- The burst vocabulary is hearts only (three pinks and one gold), radius 90, life 2.2 to 4.7 s, no peace symbol, no glow shapes, and the ring is the same gold ring every floater scene uses. The fourteen background hearts (`heart-field`) and the rotating sculpted heart are independent decoration and are fine.

## Gap
Ask 2's richness (peace symbols and glowing shapes alongside hearts) and the visible depth from ask 1. The plan's Section 9 wording ("exit pops into hearts, peace symbols and soft particles; replacement enters on its own timing") is half live.

## Decision (recommended)
Lane scope, scenes/peace-in-practice.js only, no core change:
1. Depth layers through `mount`, `place` and `integrate` exactly as the welcome recipe (far .85 scale and .8 px blur, mid .93 and .3 px, near sharp), `data-depth` on each orb slot.
2. A richer pop through the `onRetire(a)` hook, which core/motion.js calls at the moment of the burst (after `burstAt` has pushed the heart particles): push into `V.fx` twelve extra particles of a new kind `peace` (a small circle-with-three-lines peace sign drawn with strokes, radius 7 to 11, gold `#E8C777` and `#EABB89`) and eight of kind `glow` (soft radial dots, radius 9 to 16, `#FFF4BA` at 55 percent alpha), with seeded angles, speeds 30 to 110 px/s, upward bias minus 40, life 2.4 to 3.6 s. Because `drawSceneFX` in core only knows `ring`, `return`, `hearts` and the default spark, register `draw(dt)` on this scene: after the shared fx pass has run (tickSlots calls `d.draw?.(dt)` last), draw the scene's own `peace` and `glow` particles from `V.fx` on the same `.scene-fx` canvas and let them age and expire on the same timeline (copy the age, opacity and drift math of the hearts branch). Cap: never let `V.fx` exceed 250 (the core cap already trims). Nothing bounces; particles disperse and fade.
3. No CSS; colors reuse values already in renderer.css and burstAt.

## Testable acceptance
1. Common scene spec.
2. Over 60 seconds in the Studio (samples every 6 s), the actor count is always four and a burst is observed: visualState `fx` count rises above zero at least once and the runtime log contains `bubble_burst` for scene 9; at that sample `V.fx` holds at least one particle of kind `peace` and one of kind `glow` (expose the kinds through visualState's existing `fx` count plus a `frame.evaluate` that inspects `window.colorPolishRuntime.visualState()`; if the kinds are not visible there, the spec may read the canvas pixel alpha at the burst point as the fallback).
3. At 14 s, `data-depth` has at least two distinct values, one actor blurred above .3 px and one sharp.
4. Circularity has no failures at 300, 6000, 14000 and 20000 ms and during a burst sample.
5. Screenshots at 1920 and 3840 at 0, 6000 and 14000 ms into logs/peace-in-practice/.

## Risk
Medium. The extra particle kinds are drawn by the scene on the shared canvas after the core pass; if the scene forgets to clear or draws before the core pass, particles double-draw. The review checks the draw order (tickSlots: renderFloaters, drawSceneFX, then d.draw).
