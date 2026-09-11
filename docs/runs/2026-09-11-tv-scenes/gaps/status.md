# Gap report: Status (Section 7, renderer id 6, slug status)

Written by Fable 5.1 on September 10, 2026 (Plan 13, sitting one). Approval: pending Anthony.

## Prompt asks
1. Icons animated and expressive: dancing, floating, turning, swaying, soft rhythm, occasional small jumps, controlled rotation, light shimmer, glow pulses. No stiff bouncing, no lockstep.
2. Each icon on slightly different timing.
3. Subtle environmental motion: moving light, background sway, particles, shimmer, floating decoration, glow movement, gentle depth.
4. Elegant, premium, not cartoonish; information and the 30 second duration unchanged.

## Prototype v6 2 does
- One CSS keyframe `statusDance` (lift 3 px, rotate 2 deg, scale 1.02) applied three times, nested: on the card (7.2 s), the medallion (5.4 s) and the icon image (4.8 s), with `nth-child(2n)` and `nth-child(3n)` delays. Three delay groups, so a third of the cards move in lockstep.
- No environmental layer beyond the shared atmosphere canvas.

## Live does (renderer.js lines 794 to 799; renderer.css lines 47 to 50)
- The CSS dance is switched off (`.scene[data-scene='6'] .stat-expression .medallion img {animation:none}`) and replaced by JS: `mountStatus` seeds each icon with phase i times 2.399, rate .4 plus i times .037, amplitude 2.2 plus i mod 3; `tickStatus` writes translate (about 2 px by up to 4 px), rotate (up to 4.5 deg), scale (1.8 percent) and a breathing box shadow on the medallion. Measured at 6 and 8 seconds: all nine transforms differ, so the plan's stated acceptance ("nine transforms differ at 6 s") is already true today and must be strengthened.
- Every icon uses the same waveform; they differ only in phase and rate. No jumps, no shimmer on the icons, no glow pulse beyond the shadow.
- Environmental motion: only the puzzle art in the top panel (`status-art`, 16 s) and the shared atmosphere. Cards, numbers and background are static.
- Numbers are still and legible, as required.

## Gap
Ask 2 is closed. Ask 1 is half open: motion exists but has one vocabulary and reads as a uniform wobble from across the room. Ask 3 is open except for the puzzle art.

## Decision (recommended)
Keep `mountStatus` and `tickStatus` as the structure. Give each icon one of three seeded vocabularies chosen by index: float (slow vertical drift with a soft turn), sway (pendulum rotation with a lean), breathe (scale pulse with a rare 6 px lift every 9 to 14 s). Write the chosen kind to `data-motion` on the medallion. Add one ambient layer in scenes/status.css scoped `#tv .scene[data-scene="6"]`: a slow diagonal light sweep across the expression grid (a pseudo-element on `.expression-stats`, 22 s) and a gentle glow pulse on each card's border tint offset by `nth-child`. Nothing bounces; numbers untouched; all of it off under reduced motion. Colors unchanged.

## Testable acceptance
1. Common scene spec.
2. `data-motion` on the nine medallions holds at least three distinct values.
3. At 6000 ms the nine icon transforms differ pairwise, and between 6000 and 8000 ms at least one icon's rotation sign differs from another's change (proves different waveforms, not just phase).
4. `.expression-stats` has a running animation on its pseudo-element when motion is allowed and none under reduced motion; `getState().still` true renders the scene with every icon transform at identity.
5. Screenshots at 1920 and 3840 at 0, 6000 and 14000 ms into logs/status/.

## Risk
Low to medium. The JS stays inside scenes/status.js; the risk is a selector missing the `#tv` prefix (silently ignored) or a card glow that reads as a color change, which the review checks against the frozen palette.
