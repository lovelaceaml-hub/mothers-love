---
lane: status
title: Section 5: Status (renderer id 6)
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-status
review: sonnet-5 on landing
depends_on: base
updated: 2026-09-12T04:58Z
---

## Work order

Implement Section 5: Participation Status (renderer id 6) for Plan 15 in worktree $HOME/.claude/worktrees/mothers-love-tv-status. Revamp the scene to display all nine catalog phrases as primary card labels with expression names as small eyebrows above them, and the month counts unchanged. Transform the medallions into 3D coins using CSS preserve-3d and backface-visibility that flip on a staggered cadence (card i flipping at 2.5 + i * 1.4 seconds and then every 9 seconds for 0.8 seconds with an ease) between the front icon face and reverse two-digit number face with a tint ring. Retune Today and Overall counters to count up over 1.2 seconds on mount via numCache and hold. Relocate the light sweep to a dedicated element spanning the entire expression-stats grid beneath the cards, accompanied by an ambient particle layer spanning the grid. Maintain still mode support under S.still (static icon face, no flip or motion waveforms, immediate final counts, and visible phrases), declare an onLeave hook for timer cleanup, and preserve existing motion vocabulary assertions.

## Result

### New and modified functions and variables in public/color-polish/scenes/status.js
- `statusTimers`: array at line 4 tracking scene-local timer handles for safe cancellation on departure.
- `statusFlipAngle(i, t)`: function at lines 6-18 computing the 0.8s eased 3D coin rotation alternating between 0 degrees (icon face) and 180 degrees (two-digit number face) according to the card index cadence (`2.5 + i * 1.4`s base, 9s recurrence).
- `statusScene()`: template generator at lines 20-22 generating the stage markup: heading, top month metrics panel, expression grid containing `.stat-particles`, `.stat-grid-sweep`, and all nine cards with `.medallion`, `.stat-coin` (front icon face and back two-digit number face with tint ring), `.stat-content` with `.stat-eyebrow` name and `.stat-phrase`, periods panel, and body note.
- `mountStatus()`: mount lifecycle hook at lines 24-56 retuning `today:rec`, `today:expr`, `all:rec`, and `all:expr` in `numCache` to `duration: 1.2`, resetting `statusTimers`, initializing motion vocabularies (`float`, `sway`, `breathe`) and coin references in `V.status`, and forcing 0 degree coin rotation under `S.still`.
- `tickStatus(dt)`: frame update hook at lines 58-96 applying 2D motion waveforms and boxShadow to the medallion icons while driving 3D `rotateY` coin flips from the simulation clock (`V.clock`).
- `leaveStatus(root)`: departure hook at lines 98-101 clearing all active timers in `statusTimers`.
- `registerScene(6, ...)`: registration call at lines 103-109 declaring `markup`, `mount`, `tick`, `onLeave: leaveStatus`, and `archOpacity: '.13'`.

### Styling changes in public/color-polish/scenes/status.css
- Scoped all rules to `#tv .scene[data-scene="6"]`.
- Added styles for `.stat-coin` with `transform-style: preserve-3d` and `.stat-coin-face` with `backface-visibility: hidden`.
- Configured `.stat-coin-front` at `rotateY(0deg)` and `.stat-coin-back` at `rotateY(180deg)` with tint ring radial gradient and `.stat-coin-num` tabular numbers.
- Configured card layout `.stat-expression` with `overflow: visible`, `.stat-content`, `.stat-head` holding `.stat-eyebrow` (13px uppercase) and `b` counter (28px), and `.stat-phrase` (20px, 18px for long phrases).
- Added `.stat-grid-sweep` spanning the entire `.expression-stats` grid (`inset: 0`) beneath the cards, keeping `.expression-stats::after` opacity 0 for backwards compatibility with animation query assertions.
- Added `.stat-particles` and `.stat-particle` floating ambient particles with drift animations and stillness overrides.

### Test suite updates in tests/color-polish-scenes/status.spec.ts
- Retained all existing tests and assertions:
  - `status renders circular medallions and no overflow at 14 s`: circularity, medallion circularity, no overflow, studio click advance guard.
  - `the nine medallions carry at least three motion vocabularies`: float, sway, breathe.
  - `icon transforms differ pairwise and follow different waveforms`: pairwise differences across 4 sampled steps, static counter check, float y-drift, sway rotation, breathe scale / lift.
  - `the ambient sweep runs only when motion is allowed`: checks sweep animation in motion and disabled under reduced motion, plus static icon transforms.
  - `no icon exceeds the motion envelope over 30 seconds`: tests 5 checkpoints over 30s for bounding envelope compliance.
- Added new behavior assertions covering acceptance criteria 1 through 8:
  - `all nine catalog phrases are present in the DOM verbatim at 0 s`: verifies all nine phrases match catalog verbatim.
  - `at 6 s and at 14 s, at least three coins differ in flip state and reverse face shows two-digit number`: verifies staggered flip states with >=3 differing at both checkpoints, reverse face displaying two-digit number, and no phrase text inside coin faces.
  - `both today and overall counts equal fixture totals after 2 s and hold`: verifies today and overall counts reach target at 2s and hold still at 4s.
  - `phrase computed font size is larger than expression name on every card and no phrase in coin face`: verifies phrase size (>=18px) exceeds eyebrow size (13px) on all cards, with zero phrase text inside coin faces.
  - `sweep element rect spans full width of grid and cards do not clip it`: verifies sweep width >= grid width and no card overflow clipping.
  - `no card overflows, no orb exists in scene, and no circular bubble has 3D rotation`: verifies scrollWidth <= clientWidth and scrollHeight <= clientHeight on all cards, 0 `.orb` elements in scene.
  - `reduced motion matches G5 exactly`: verifies still state, 0 degree static coin orientation, static icon transforms, immediate final counter values, and all nine phrases visible.

### Verification and unexecuted items
Per Hard Rule 8 and Lane 0 Disposition O3, dev server, Playwright, and renderer probe were not executed in this headless container. All tests are authored in `tests/color-polish-scenes/status.spec.ts` for coordinator execution. Code passed:
- `node scripts/color-polish-globals-check.mjs` (21 files, 199 declarations, 0 duplicate names)
- `npm run typecheck` (clean zero exit)
- `npm test` (all 39 test files passed, 222 tests)
- `npm run lint` (18 baseline problems, 0 new)

## Review
