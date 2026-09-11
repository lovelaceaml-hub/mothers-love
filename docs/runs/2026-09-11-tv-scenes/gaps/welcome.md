# Gap report: Welcome (Section 1, renderer id 1, slug welcome)

Written by Fable 5.1 on September 10, 2026 (Plan 13, sitting two). Approval: Anthony's "continue until the end" ruling; Decision follows the plan's Section 1 and the prompt, nothing beyond.

## Prompt asks
1. Bubbles float freely and independently: own direction, speed, pace, drift pattern, slight depth; some drift left, some right; some rise, fall, arc, hover, or gently change direction; some faster, some slower; organic, not a repeated CSS animation.
2. Subtle depth: some closer, some farther.
3. Bug fix: bubbles always circular through entrance, movement, transition, resize and exit.
4. Alive, warm, dimensional, continuously moving, not chaotic; 30 seconds.

## Prototype v6 2 does
- Five fixed positions (`fieldBubbles`) with CSS `orbBreath` scale 1 to 1.01 and a CSS drift; no per-bubble physics, no depth, no heading changes.

## Live does (measured over 60 seconds with the probe on tv/base)
- Four bubbles (`rightBubbles`), each a seeded actor with its own vx (9 to 20 px/s, random sign), vy (plus or minus 7.5), pace 11 to 21, phase and rate; noise-driven acceleration; wall and keep-out steering. At any instant speeds differed across actors from 1 to 26 px/s, so ask 1's speed and direction variety is live.
- Depth: `depth = .948 + .048 sin(...)`, so scale stays between 0.90 and 1.00 and blur (only below scale .93) never exceeds 0.09 px. On a TV that reads as flat; ask 2 is not met in practice.
- Heading: the noise gives slow curves, but the seeded `nextTurn` value (2 to 7 s) is set in mountFloaters and never read, so there are no deliberate direction changes; "gently change direction" is only incidental.
- No replacement in this scene (replaceMode null); the four bubbles stay for the whole 30 seconds. The prompt does not ask for rotation here.
- Circularity: orbs are CSS circles with border-radius on `.orb` and a square `.orb-slot`; Plan 10's usable spec already guards width equal to height. The probe found no square rendering.

## Gap
Ask 2 (visible depth) and the deliberate heading changes in ask 1. Everything else is live.

## Decision (recommended)
Small lane in scenes/welcome.js only, through the Section 0 descriptor hooks (no core change):
1. `mount(root)`: after mountFloaters has built V.actors, assign each actor a depth layer by index (`far`, `mid`, `near`, cycling; the fourth actor near), with layer scale 0.84, 0.93, 1.0, layer blur 0.9 px, 0.35 px, 0, and pace multiplier 0.7, 0.9, 1.15 so farther bubbles move slower; write `data-depth` on the element.
2. `integrate(a, dt)`: when `V.clock >= a.nextTurn`, rotate the velocity by a seeded angle between 25 and 70 degrees (either sign) and set `a.nextTurn = V.clock + 4 + a.rng() * 6`; return false so the default physics still runs.
3. `place(a)`: multiply the computed scale by the layer scale, set the filter to the layer blur (keep the existing swell and exit logic by only wrapping the write), set z-index from the layer, then write the transform and opacity the same way renderFloaters does and return true.
4. Copy block keep-out unchanged; nothing else in the scene changes. Colors unchanged; no CSS needed beyond the header comment.

## Testable acceptance
1. Common scene spec.
2. At 14 s in the Studio, visualState actors: at least three actors differ in speed by 30 percent or more; depth values span at least two layers (at least one actor with blur above 0.3 px and one with none); `data-depth` on the four orb slots holds at least two distinct values.
3. Between 6 s and 14 s at least one actor's velocity direction changes by more than 20 degrees (proves the heading change fired).
4. Every orb stays circular at 300 ms, 6 s and 14 s and after a Studio Replay (circularity helper, no failures).
5. Screenshots at 1920 and 3840 at 0, 6000 and 14000 ms into logs/welcome/.

## Risk
Low to medium. The `place` override duplicates the transform write; if it drops the swell or exit phases, bubbles would jump. The review checks the override against renderFloaters line by line. Blur is capped at 0.9 px so far bubbles stay readable.
