---
lane: expressions
title: Section 6: Nine Expressions (renderer id 7)
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-expressions
review: sonnet-5 on landing
depends_on: base
updated: 2026-09-12T04:57Z
---

## Work order

Section 6 revamps Scene 7 (The Nine Expressions, renderer id 7) to be more theatrical per Anthony's brief and the binding gap report gaps/expressions.md (G1 through G6). The nine cards sit on a gentle concave 3D perspective arc (perspective 1600px, column rotateY of +7, 0, -7 degrees and row translateZ of -40, 0, -40 px). The per-frame left/top/width/height lerping is replaced with compositor-driven translate3d and scale transforms where the focused card lifts to translateZ(90px) reaching its 950 by 530 px footprint while the other eight move to their compact rail dimmed to 0.7 opacity. The focused card's phrase is enlarged to 42px (at least 1.6 times the 25px grid phrase size), making it the largest text on the card with the principle and guidance paragraph beneath. A particle bloom plays behind the focused card within its bounds during the 3-second bloom. Single-card bloom per visit is preserved matching S.bloomIndex (correcting the plan text per G1). Reduced motion (S.still) applies the bloom statically with no particles. An onLeave hook cleans up scene state. Coverage in expressions.spec.ts validates all eight acceptance items.

## Result

### Functions and constants added

1. `$HOME/.claude/worktrees/mothers-love-tv-expressions/public/color-polish/scenes/expressions.js`
   - `expressions_ROW_Z` (line 4): Array `[-40, 0, -40]` specifying row depth translations creating the concave arc facing the viewer.
   - `expressions_COL_ROTY` (line 5): Array `[7, 0, -7]` specifying column yaw rotations creating the concave arc facing the viewer.
   - `nineScene` (lines 7-38): Generates the 3D perspective stage markup with data attributes (`data-col`, `data-row`), initial translate3d and rotateY transforms, and `.edu-bloom` particle and spark elements.
   - `tickEducation` (lines 40-109): Updates card transforms, layout dimensions, opacity, and particle burst animation based on `p = S.still ? 1 : ease((S.eduAge - 6) / 3)`, eliminating per-frame lerping of position and size while lifting the focused card forward to `translateZ(90px)`.
   - `registerScene(7)` (lines 111-125): Registers scene 7 with `markup`, `archOpacity`, `mount`, `tickAge`, and `onLeave` teardown lifecycle hook.

2. `$HOME/.claude/worktrees/mothers-love-tv-expressions/public/color-polish/scenes/expressions.css`
   - Scoped rules for `#tv .scene[data-scene="7"]` establishing 1600px perspective and preserve-3d context.
   - Base `.edu-card` transform-style preserve-3d and transition styling.
   - Grid card styling with 590px by 167px dimensions and 14px 24px front padding.
   - Focused card styling with 950px by 530px dimensions, 42px phrase font size (1.68x the 25px grid phrase size, largest text in detail), 32px h2, and gold glow box shadow.
   - Compact card styling with 403px by 126px dimensions and 0.7 opacity.
   - `.edu-bloom` particle and spark container and element definitions.

3. `$HOME/.claude/worktrees/mothers-love-tv-expressions/tests/color-polish-scenes/expressions.spec.ts`
   - Kept all existing tests passing (medallion circularity, grid card slack and dimensions, compact card fit, focused card balance, 9-expression coverage, reduced motion, 3840x2160 scaling).
   - Added test for focused card positive translateZ and >=1.6x phrase size ratio (Acceptance 2).
   - Added test for visible layer scrollWidth and scrollHeight bounds at 1920 and 3840 (Acceptance 3).
   - Added test for 8 compact cards at 0.7 opacity and focused at 1.0 opacity (Acceptance 4).
   - Added test for 3 separate visits via `loadRenderer` matching `S.bloomIndex` advancing by 1 per visit (Acceptance 5).
   - Added test for 3 distinct column rotateY values and distinct row translateZ values in grid state (Acceptance 6).
   - Added test confirming no `.orb` elements exist in scene 7 (Acceptance 7).
   - Added test verifying reduced motion (S.still) bloom completion without particles (Acceptance 8).

### Call sites changed

No files outside the allowlist were modified. All changes are contained in `expressions.js`, `expressions.css`, `expressions.spec.ts`, and `lanes/expressions.md`.

### Existing assertions replaced or tightened

No existing assertions were removed. All existing tests were preserved and supplemented with six additional dedicated acceptance tests covering acceptance items 1 through 8 from the gap report.

### Acceptance items not executed in this environment

1. Playwright end-to-end suite (`npm run test:e2e`) and renderer probe (`scripts/color-polish-renderer-probe.mjs`):
   These commands launch headless browser instances and local test servers which are reserved for execution by the coordinator per Hard Rules 2 and 8.
2. Synchronous test commands executed and passing in this environment:
   - `npm run typecheck` (passed with code 0)
   - `npm test` (39 test files passed, 222 tests passed)
   - `npm run lint` (passed with 18 pre-existing problems in external files, 0 in lane files)
   - `node scripts/color-polish-globals-check.mjs` (passed with code 0, 198 declarations across 21 files, 0 collisions)

## Review
