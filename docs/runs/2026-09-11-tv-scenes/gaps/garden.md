# Gap report: Recognition Garden (Section 2, renderer id 2, slug garden)

Written by Fable 5.1 on September 10, 2026 (Plan 13, sitting three). Approval: Anthony's "continue until the end" ruling.

## Prompt asks
1. Five bubbles at most; about 7 seconds between replacement events; never replace all five together; each bubble readable long enough.
2. Independent movement (direction, speed, pace, depth, sway, vertical drift).
3. Entrance grows out of the garden: glow near the garden, a stem or sprout, the bubble grows upward and settles.
4. Exit is a dramatic transformation: swell, burst, petals carried by a breeze, energy travels back to the garden, a new flower grows; the garden fills over time.
5. The garden itself stays animated: sway, leaves, petals, growth, light passing through.
6. Circular through entrance, growth, transformation and exit.

## Prototype v6 2 does
- Five fixed positions, the CSS breath, a 7 second reshape timer that re-renders the scene (`renderNow`), a bloom exit class (`orb-pop`), a sprout entrance class (`orb-sprout`), and a static garden strip. It does not implement asks 3 to 5 as described.

## Live does (measured over 60 seconds)
- Five bubbles; `replaceEvery` 14 then every 7 s (`gardenReplace`): the probe logged `garden_replacement` at 14.0, 21.0, 28.0, 35.0, 42.0, 49.0 and 56.0 s, one bubble each, count always five. Ask 1 is live (a bubble stays at least 13 s and the reading time if longer).
- Movement: seeded physics; speeds 1 to 20 px/s across actors. Depth invisible (scale .90 to 1.0). Ask 2 is live except visible depth.
- Entrance (`sprout`): the newcomer rises from the garden line (`originX`, y 654) along a bend over 2.65 s, scaling from .04 to 1, with a gold glow at its origin (`gardenGlow`) and a fading green stem drawn from the garden to the bubble while it rises. Ask 3 is live.
- Exit (`swelling` .72 s, then `burstAt` kind `petals` with 44 particles and a ring, then `onRetire`: a `return` spark travels back to a garden x, and 2.15 s later a new plant is pushed into `V.garden.plants`, which grows over 2.9 s with a bloom). The petals are already petal-shaped (the `drawSceneFX` default branch draws a rotated bezier petal with a sway term) but they fall under gravity (`age*age*8`) rather than being carried on a breeze. Ask 4 is live except the breeze carry.
- Garden: 28 seeded plants plus every grown one (cap 72), each swaying (`plant()` sway terms), with leaves and a six-petal bloom, drawn every frame on `living-garden`; a light wash but no passing light. Ask 5 is mostly live; a passing light band is missing.
- Circularity: the `sprout` entrance scales the whole slot element uniformly, so it stays a circle.

## Gap
Petals carried on a breeze instead of falling (ask 4), a slow light band passing through the garden (ask 5), and visible depth (ask 2). Everything else the plan's Section 2 lists (stronger sprout, swell, burst, energy spark, new plant, sway) is already live.

## Decision (recommended)
Lane scope, scenes/garden.js only, no core change:
1. Petals: in `onRetire`, after the existing pending plant and return spark, splice every `V.fx` particle of kind `petals` (just pushed by `burstAt`) into a scene-owned `V.garden.petals` array so the core never draws them; `drawGarden` then draws them with the core's own petal shape but breeze physics instead of gravity (a gentle lift, a rightward drift and a flutter), fading over the last part of their life, capped at 120.
2. Light: in `drawGarden`, after the wash, draw one wide soft band (`createLinearGradient` across 420 px, `#FFF4BA` at 22 percent alpha in the middle, transparent at the edges) whose x position moves from minus 420 to 1812 plus 420 over 26 s and repeats, clipped to y 470 to 636. Colors reuse the wash and glow palette.
3. Depth layers through `mount`, `place` and `integrate` as in the welcome recipe (far .86 scale, .7 px blur; mid .94, .25 px; near sharp), with `data-depth`; the `sprout` and `swelling` phases keep their scale terms because place() multiplies `a.screenScale`.
4. Keep five bubbles, the 7 second cadence, the 13 second minimum stay, the stem, the glow, the return spark and the plant growth exactly as they are.

## Testable acceptance
1. Common scene spec.
2. Over 60 seconds in the Studio (samples every 6 s): visualState `flowers` strictly increases at least twice (a grown plant per replacement), the actor count never exceeds five, and `garden_replacement` log entries are spaced 6 to 8 s apart.
3. At 14 s, `data-depth` has at least two distinct values; one actor blurred above .3 px and one sharp.
4. Circularity has no failures at 300, 6000, 14000 and 20000 ms (20000 catches a sprout in flight).
5. Screenshots at 1920 and 3840 at 0, 6000 and 14000 ms into logs/garden/.

## Risk
Medium. The petal draw must not double-draw with the core spark pass; the light band must stay behind the bubbles (it is on the garden canvas, which sits below the orbs). The review checks both against core/motion.js drawSceneFX.
