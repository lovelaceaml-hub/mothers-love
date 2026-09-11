# Gap report: Featured Recognition (Section 4, renderer id 4, slug featured)

Written by Fable 5.1 on September 10, 2026 (Plan 13, sitting two). Approval: Anthony's "continue until the end" ruling.

## Prompt asks
1. Continuous rotation: bubbles drift away one at a time while new ones float in; never a full-screen reset; always populated.
2. Independent movement: own speed, direction, drift, depth, entrance position, exit direction.
3. The featured expression stays visually dominant, surrounded by living examples.
4. Circular at all times; about 30 seconds.

## Prototype v6 2 does
- Five fixed positions with the CSS breath; a full-scene re-render on the reshape timer (`renderNow` after `replenishAt`), which is exactly the full reset the prompt forbids.

## Live does (measured over 60 seconds)
- Three bubbles beside the expression panel. Replacement is already staggered per actor: retireAt is 17 + 9.2 i seconds at mount, then 26 to 34 seconds after each install; the probe logged exits at 17.0, 26.2, 35.4 and 48.0 s with one bubble exiting at a time, the count never dropping below three, the leaver drifting off toward the nearer screen edge with a 12 percent shrink and fade over 3.8 s, and the newcomer entering from a random side or from below over 3.8 s. Ask 1 is live for normal messages.
- Exception: when the chosen recognition does not fit a small orb (`smallFits` false), the scene renders one large reader orb and the shared swapSlot path re-renders the whole scene after the reading time (`renderNow` with `replenishAt`). That is a full reset, but it lives in core/motion.js swapSlot, which no scene lane may touch.
- Movement: same seeded physics as welcome; speeds differed 3 to 22 px/s across actors at any instant. Depth: scale 0.90 to 1.00, blur under 0.1 px, so ask 2's depth is not visible.
- The expression panel is a fixed 520 px keep-out column; bubbles never cross it. Ask 3 holds.

## Gap
Visible depth (ask 2) and, for long messages only, the full-scene reader reset (ask 1). The plan's Section 4 wording ("staggered single replacement instead of whole-scene repopulation") describes work that is already live for the common case.

## Decision (recommended)
1. Lane scope, scenes/featured.js only: the same three-layer depth treatment as welcome (layer scale 0.86, 0.94, 1.0; blur 0.8, 0.3, 0 px; pace 0.75, 0.9, 1.1), assigned so the newest arrival takes the layer its predecessor had, through `mount`, `place` and, for a gentle post-arrival depth change, `integrate` (a bubble that has been steady for 12 s may drift one layer nearer over 2 s, once). Write `data-depth` on each orb slot.
2. Deferred, recorded here and in the Build log, not in this lane: replace the reader-orb whole-scene reset with a single-orb swap in core/motion.js swapSlot. That is a tv/shared change on tv/base for a later shared lane, because it touches every floater scene.

## Testable acceptance
1. Common scene spec.
2. Over 30 seconds in the Studio (samples at 2, 8, 14, 20, 26 s) the actor count never drops below three and no two actors are in `exiting` at the same sample.
3. At 14 s, `data-depth` on the orb slots holds at least two distinct values and at least one actor has blur above 0.3 px while another has none.
4. Circularity holds at 300 ms, 6 s, 14 s and 20 s (a sample during an exit).
5. Screenshots at 1920 and 3840 at 0, 6000 and 14000 ms into logs/featured/.

## Risk
Low to medium, same override risk as welcome. The deferred reader reset is unchanged behavior, not a regression.
