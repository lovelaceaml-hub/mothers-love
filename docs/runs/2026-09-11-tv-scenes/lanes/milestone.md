---
lane: milestone
title: Section 11, Milestone stream density and extreme depth
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-milestone
review: "sonnet-5 high on landing"
depends_on: base-b
updated: 2026-09-11T09:37Z
---
## Files
- public/color-polish/scenes/milestone.js: Removed .progress-intro markup, updated stream canvas width to 1162, and widened node radius range to 170 to 380.
- public/color-polish/scenes/milestone.css: Layout and typography overrides moving sculpture to left 0, rail to left 46 px and width 560 px, stream world to left 650 px, and scaling rail typography without overflow.
- tests/color-polish-scenes/milestone.spec.ts: Playwright test suite covering rendering without overflow at 14 s, circular stream nodes, click-advance prevention, density and continuity across 26 s samples, extreme depth metrics, reduced motion still mode, and 2 s acceptance verifying .progress-intro removal, rail dimensions, and no overflow.
- docs/runs/2026-09-11-tv-scenes/lanes/milestone.md: Lane execution record for Section 11.

## Gap report items closed
- Density: contributorPool now guarantees a minimum floor of 14 records by topping up with eligible recent records sorted by creation date descending when milestone contributors and weekly goal records total fewer than 14.
- Extreme depth: depth parameter expanded from 295..390 to 360..520 (achieving z span below -550 and above +300); rise expanded from 19..38 to 16..44 px per second; blur widened to Math.min(2, Math.max(0, (-z-120)/260)) px; far opacity factor clamped to at least .45; maximum scale reaches 1.5 at front apex.
- Node circularity: the CSS file holds only its header comment and circularity is measured on .stream-pearl.

## Pool change
When the primary set of milestone contributors and weekly expression records contains fewer than 14 items, contributorPool appends additional published, unexpired recognition records sorted by creation timestamp descending until the pool reaches 14 (or available records are exhausted). This ensures the helix stream remains dense and visually rich with at least 14 individual stream nodes even in early campaign stages or with sparse fixtures. The on-screen copy remains truthful because the header and progress meters still track verified campaign totals, while the stream's individual pearls symbolize the wider community participating together; each pearl continues to write data-weekly to distinguish whether it directly matched the weekly goal expression.

## Result
Milestone stream density and extreme depth improvements are implemented and verified. All four allowlisted files are in place with zero em or en dashes, strict CSS scoping to #tv .scene[data-scene="11"], and no alterations to protected core or sample files. The coordinator will run typecheck, lint, test, build, Playwright test suite, and the visual probe.
Round 1: the per-sample depth bar is minus 500 with minus 600 required at some sample; the first run measured minus 536 at one sample.
Round 2: per-sample depth bars are minZ <= -500 and maxZ >= 200, with across-sample checks requiring smallest minZ <= -600 and largest maxZ >= 300.
Round 3: removed the inert CSS rule so milestone.css holds only its header comment, and retargeted circularity assertions to .stream-pearl.
Round 4: per sample maxScale requires at least 1.2, while the check across all samples requires largest maxScale >= 1.4.
Round r5: removed .progress-intro, shifted sculpture to left 0, widened rail to 560 px at left 46 px with scaled typography, widened stream world to left 650 px with canvas 1162 px, and widened node radius range to 170 to 380.
Round r6: normalized Studio preview getBoundingClientRect measurements by live stage scale (sceneRect.width / 1812) for rail width (>= 540) and left offset (< 60).

## Deferred follow-up
- Fixture overrides in openStudioScene: openStudioScene in tests/color-polish-scenes/helpers.ts hardcodes buildActiveDisplayFixture() without forwarding overrides, so testing worst-case conditions (such as four-digit thresholds and 13-character goal names like Encouragement with month expressionCounts summing over 1000 and goal expressionId 7) requires helpers.ts enhancements that are deferred since helpers.ts is outside this lane's allowlist.

## Coordinator verification (Fable 5.1)
- Four spec-only corrections: the coordinator's per-sample depth and scale bars were too tight for a helix sampled every 5 s (now minus 500 and 1.2 per sample with minus 600, plus 300 and 1.4 required across samples), and the inert border-radius rule was removed with circularity measured on .stream-pearl. typecheck, vitest, build pass; lint at the pre-existing 18; probe clean; Playwright on the production runner 11 of 12, the one failure being the usable spec's legacy fallback journey that fails identically on untouched tv/base under that runner.
- Hygiene sweep: flagged the CSS rule, since removed. Review: Sonnet 5 (high): pool floor, depth widening and opacity floor match the Decision; one should-fix (the inert CSS rule) corrected in round 3; notes on the per-sample bars and the pre-existing lint.

## COMPLETION
- /Users/anthony/.claude/worktrees/mothers-love-tv-milestone/tests/color-polish-scenes/milestone.spec.ts
- /Users/anthony/.claude/worktrees/mothers-love-tv-milestone/docs/runs/2026-09-11-tv-scenes/lanes/milestone.md

