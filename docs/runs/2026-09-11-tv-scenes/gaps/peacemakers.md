# Gap report: We Are Peacemakers (Section 6, renderer id 8, slug peacemakers)

Written by Fable 5.1 on September 10, 2026 (Plan 13, sitting two). Approval: Anthony's "continue until the end" ruling.

## Prompt asks
1. Bubbles move freely and independently (speed, pace, direction, drift, depth); some entering while others float and others leave.
2. Continuous rotation, never clearing and repopulating at once.
3. Depth: closer, farther, slightly blurred at deeper layers, larger or smaller by depth.
4. Circular through the whole lifecycle; about one minute.

## Prototype v6 2 does
- Five fixed positions with the CSS breath and the same full-scene reshape reset as featured.

## Live does (measured over 60 seconds)
- Four bubbles beside the illustration. Staggered replacement is live: exits logged at 17.0, 26.2, 35.4, 44.6 and 49.7 s, one or two in flight at a time, the count always four, newcomers entering from random sides or from below. Asks 1 and 2 are live.
- Depth: scale 0.90 to 1.00 and blur under 0.1 px except during entrance (scale 0.82, blur 0.3 px for a moment). Ask 3 is not met in the steady state.
- The keep-out box protects the title and the illustration; bubbles stay in the right two thirds.

## Gap
Ask 3, depth layering. The plan's Section 6 wording ("staggered replacement as in Section 4") is already live.

## Decision (recommended)
Lane scope, scenes/peacemakers.js only: three depth layers through `mount`, `place` and `integrate` exactly as in welcome and featured, with the far layer at scale 0.84 and blur 0.9 px, the near layer sharp at 1.0, pace scaled by layer, `data-depth` on each orb slot, and the newest arrival inheriting its predecessor's layer so the mix stays balanced. No CSS beyond the header comment; colors unchanged.

## Testable acceptance
1. Common scene spec.
2. Over 30 seconds (samples at 2, 8, 14, 20, 26 s) the actor count is always four and never more than two actors are in `exiting` or `entering` at one sample.
3. At 14 s at least one actor has blur above 0.3 px and at least one has none; `data-depth` holds at least two distinct values.
4. Circularity holds at 300 ms, 6 s, 14 s and 20 s.
5. Screenshots at 1920 and 3840 at 0, 6000 and 14000 ms into logs/peacemakers/.

## Risk
Low to medium, same override risk as welcome. The sixty-second dwell means more replacements per scene than featured; the sample checks cover the first 30 seconds as the plan asks.
