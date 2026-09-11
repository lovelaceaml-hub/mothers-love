# Gap report: Milestone and Weekly Goal (Section 11, renderer id 11, slug milestone)

Written by Fable 5.1 on September 10, 2026 (Plan 13, sitting five). Approval: Anthony's "continue until the end" ruling.

## Prompt asks
1. Compact milestone and goal text on the left; a dimensional recognition stream dominating the right; nothing overlaps header or feed.
2. Smaller bubbles, many visible at once.
3. A vertical upward spiral or swarm through 3D space with extreme depth (scale, blur, opacity, lighting, shadows, occlusion), each bubble with its own speed, radius, pace, depth, direction variation and rotation timing; some linger, some rush.
4. Expression icons float independently within the stream.
5. Continuous, never empty, never all cleared, no visible loop.
6. A premium centerpiece; 30 seconds.

## Prototype v6 2 does
- The discarded bubble layout the prompt rejects.

## Live does (measured over 30 seconds)
- Plan 10 already replaced the discarded design: `.progress-intro` text on the left, `.progress-sculpture` with a `tribute-stream` on the right, small 158 px `stream-node` pearls (name plus expression icons), fourteen `stream-icon` images rising independently, a canvas with four broken light currents and 55 sparks, a radial glow. Asks 1, 2, 4 and 6 are live.
- Each node has its own rise (19 to 38 px per second), radius (145 to 313), turn rate (.13 to .28), depth (295 to 390), wobble and phase; z ranged from minus 495 to plus 249, scale .67 to 1.33, blur up to 1 px at the back, opacity fading at the top and bottom, z-index by z, a drop shadow scaled by k. Ask 3 is live; "extreme" is arguable: blur tops out at 1 px and scale at 1.33.
- Nodes recycle at the top with a fresh record from the pool, so the stream is continuous and not an obvious loop. Ask 5 is live with a caveat below.
- Node count: `contributorPool()` keeps only milestone contributors and this week's goal-expression records. With the 48-record sample that is 7 nodes (cap 26), which reads sparse against the prompt's "many recognitions". Real campaign data may be sparser still early in a week.

## Gap
Density (the pool floor) and the "extreme" end of the depth range. The plan's Section 11 "ground-up build" is not needed: the helix stream already exists and matches the prompt's structure.

## Decision (recommended)
Lane scope, scenes/milestone.js only:
1. Pool floor: in `contributorPool()`, keep the contributors first, then if fewer than 14, top up with other eligible `records()` sorted newest first until 14 (or the pool is exhausted); mark topped-up nodes with `data-weekly="false"` as today. The stream then holds 14 to 26 nodes with the sample and never fewer than the available records. The milestone copy and counts are untouched, so the meaning ("these contributed") stays truthful because the stream already mixes contributors and weekly records.
2. Extreme depth: widen `depth` from 295 to 390 to 360 to 520 (z minus 630 to plus 340), blur `(minus z minus 120) over 260` capped at 2 px, far opacity floor .45, near scale allowed to 1.5 (k = 1000 over 1000 minus z already gives 1.5 at z 340), drop shadow scaled as today. Keep per-node rise, radius, turn and wobble ranges; widen rise to 16 to 44 so some linger and some rush.
3. No CSS beyond the header; colors unchanged.

## Testable acceptance
1. Common scene spec.
2. Over 30 seconds (samples every 5 s) visualState `stream` length is at least 14 at every sample with the sample fixture and never drops; no node's `y` jumps by more than 40 px between consecutive frames except at a top-to-bottom respawn; every node's `rise`, `radius` and `turn` triple is unique.
3. At every sample z spans at least minus 500 to plus 300 across nodes, and at some sample the deepest node is below minus 600 (the coordinator relaxed the per-sample bar from minus 550 after the first run measured minus 536 at one sample; the helix reaches minus 630 only at particular phases), at least one node has blur at least 1.5 px and one has none, and the near node's scale is at least 1.4.
4. Every `.stream-node` keeps width equal to height within 1 px and border-radius 50 percent at 300, 6000 and 14000 ms.
5. Screenshots at 1920 and 3840 at 0, 6000 and 14000 ms into logs/milestone/.

## Risk
Low to medium. The pool floor changes which records appear on this scene (adds recent non-contributor records to the stream); Anthony can veto that in the Build log if he wants contributors only, in which case the floor drops and the sample shows 7 nodes.
