# Gap report: Calendar (Section 5, renderer id 5, slug calendar)

Written by Fable 5.1 on September 10, 2026 (Plan 13, sitting one). Approval: pending Anthony.

## Prompt asks
1. Day number small in a corner of each cell; recognition count large and centered as the primary information.
2. Past dates get a subtle completed treatment (soft glow, filled state, shimmer, or a small pulse when the scene enters), never a disabled look.
3. Placement stays on the original submission date.
4. Refinement only, keep the concept and the 30 second duration.

## Prototype v6 2 does
- Day number 19px top-left inside the cell padding; count 29px pinned bottom-right (`.day b {position:absolute;right:13px;bottom:9px}`). So the prototype never implemented ask 1.
- No `.past` class, no glow, shimmer or pulse; only `.today` (gradient) and `.future` (muted).
- Hardcoded September 2026 with `day>9` as future.

## Live does (renderer.js line 177 to 178, 263; renderer.css lines 37 to 46, 146, 220 to 227)
- Day number 15px at top-left (measured at 13 px, 10 px from the cell corner); count 34px centered by CSS grid (measured 0 px, 0 px off center). Ask 1 is already live.
- Past days: `.day.past` warm gradient, inset gold underline shadow, and a `::after` light sweep (`history-light`, 17 s, per-day `--day-delay` of minus day times 1.93 s) so the sweep ripples across the month. Reduced motion turns the sweep off. Asks 2 (glow, filled, shimmer) are live; the entry pulse is not: `--day-delay` only offsets the endless sweep, nothing plays once on scene entry.
- Placement: `S.days` keyed by the frozen Los Angeles first-publish day (calendar aggregates from the database). Ask 3 holds under the plan's assumption.
- No overflow in any cell at 1920 (overflow 0 by 0 on all measured cells); 3840 is the same 1920 canvas scaled by transform, so no separate layout exists.
- The day buttons' inline `onclick` never fires under the CSP; Section 0 replaces it with a delegated listener that never stops propagation, so on the live TV a click on a day still advances the scene (Plan 11) and day selection works only in the Studio sample preview.

## Gap
Only the entry pulse. Everything else the prompt asks for is already on the live TV.

## Decision (recommended)
Run Section 5 as a small lane: a one-shot entry pulse on past days when the scene mounts, staggered by the existing `--day-delay` (scaled to about 60 ms per day so the whole month settles inside 2.5 seconds), implemented as a CSS animation scoped `#tv .scene[data-scene="5"] .day.past` in scenes/calendar.css, off under reduced motion. No JS change beyond what Section 0 already moved. Colors unchanged. Alternative: skip Section 5 entirely; Anthony's call.

## Testable acceptance
1. Common scene spec.
2. In calendar.spec.ts: every `.day.past` has a top-left `span` within 20 px of the cell corner and a `b` whose center is within 2 px of the cell center; no cell has scrollWidth or scrollHeight above its client size; the same holds at 3840.
3. At 300 ms after mount the computed animation list of a past day includes the pulse and at 3000 ms it no longer runs; with reduced motion the pulse never appears.
4. Screenshots at 1920 and 3840 at 0, 6000 and 14000 ms into logs/calendar/.

## Risk
Low. CSS only, scoped, one keyframe. The only way to break something is a selector without the `#tv` prefix, which the review checks.
