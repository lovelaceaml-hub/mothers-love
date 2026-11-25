---
lane: status
title: Section 7, Status motion vocabulary and ambient layer
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-status
review: "sonnet-5 high on landing"
depends_on: base-b
updated: 2026-09-11T06:32Z
---
## Files
- public/color-polish/scenes/status.js: Assigned three motion vocabularies (float, sway, breathe) by index, stored kind on actor, set data-motion on medallion elements, and branched tickStatus with distinct waveforms and rare lift dynamics.
- public/color-polish/scenes/status.css: Scoped CSS for renderer id 6 adding overflow hidden to the expression grid, relative positioning to cards, a diagonal ambient light sweep on .expression-stats::after, and card glow pulse animations, with reduced motion and still mode safeguards.
- tests/color-polish-scenes/status.spec.ts: Playwright specification verifying circularity, lack of overflow, motion vocabularies, pairwise distinct waveforms, ambient sweep activation under motion, still mode compliance under reduced motion, and motion envelope bounds over 30 seconds.
- docs/runs/2026-09-11-tv-scenes/lanes/status.md: Lane execution record for Section 7.

## Gap report items closed
- Ask 1 (Icons animated and expressive): Replaced the uniform wobble with three distinct motion vocabularies (float vertical drift with soft turn, sway pendulum rotation with lean, breathe scale pulse with rare 1.1 second lift of up to 6 px).
- Ask 2 (Each icon on slightly different timing): Kept distinct seeds for phase, rate, and amplitude, with individual nextLift schedules for the breathe kind.
- Ask 3 (Subtle environmental motion): Added a 22 second diagonal light sweep across the expression grid using existing white highlights, and a 9 second staggered glow pulse across cards reusing the approved gold palette (#D5BC79 family).
- Ask 4 (Information and numbers unchanged): Metric values, expression counts, and period numbers remain static with no transform, rotation, or blinking.
- Reduced motion: Wrapped all CSS animations in @media (prefers-reduced-motion: no-preference) and disabled them under #tv.still. Suppressed icon transforms on still mounting.

## Result
Participation Status (renderer id 6) now features three distinct motion vocabularies across the nine expression medallions and a subtle ambient sweep layer.
All changes are strictly confined to the allowed files with zero em dashes or en dashes.
The coordinator runs typecheck, lint, test, build, the status test suite, and the probe verification.
Round 1: the spec now measures medallion circularity directly and checks per-vocabulary motion signatures instead of rotation deltas.
Round 2: the vocabulary-signature test samples on a single page with five deterministic one-second steps to eliminate live playback timing variance.

## Coordinator verification (Fable 5.1)
- typecheck, vitest, build pass; lint at the pre-existing 18; nine scoped CSS rules; probe clean across six configs plus arrivals (logs/status/probe); first Playwright run 13 of 13 on the dev server; after round 1 (spec strengthened per the review), the corrected runner on a production server gives 12 of 13, the one failure being the usable spec's legacy fallback journey that fails identically on untouched tv/base under that runner.
- Hygiene sweep (Haiku 4.5 low): no findings. Review: Sonnet 5 (high): code clean, motion inside the envelope, numbers still; two should-fix findings on the spec (circularity never measured medallions; the waveform check would pass on the old code) corrected in round 1 (medallion circularity measured directly, per-vocabulary signatures); one color note (two alpha stops not literally in renderer.css, same hues).
- Round 2: the vocabulary signatures sample five points one virtual second apart on one page (the earlier three-page sampling drifted with real time in the Studio and failed once in the integrated run). Verified on the production runner after the change.
