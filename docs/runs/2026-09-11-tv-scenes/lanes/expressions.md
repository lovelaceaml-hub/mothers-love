---
lane: expressions
title: Section 8, Nine Expressions fit and focused-card balance
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-expressions
review: "sonnet-5 high on landing"
depends_on: base-b
updated: 2026-09-11T09:07Z
---

## Files
- public/color-polish/scenes/expressions.css: Scoped CSS rules for Scene 7 (#tv .scene[data-scene="7"]) providing grid front padding and phrase margin adjustments for 4 px of slack, and focused detail flex rebalancing (display flex, flex-direction column, justify-content space-between, padding 30px 42px 70px 42px, phrase font-size 34px with line-height 1.28, principle 27px with line-height 1.35, explanation 26px with line-height 1.45).
- public/color-polish/scenes/expressions.js: Inspected; no changes required because JS geometry (590 by 167 grid, 950 by 530 focused, 403 by 126 compact) comfortably accommodates the rebalanced focused typography without modification.
- tests/color-polish-scenes/expressions.spec.ts: Playwright test suite covering 7 behavioral specs: circular medallions and no scene overflow at 14 s, grid card slack and uniform sizing, compact card fit, focused card balance (scrollHeight within bounds, explanation bottom between 70% and 92%, source below explanation), all 9 expressions reachable as focused through replay, reduced motion still mode, and 3840 viewport parity.
- docs/runs/2026-09-11-tv-scenes/lanes/expressions.md: Lane execution record for Section 8.

## Gap report items closed
- Ask 1 (Text fit and overflow): Grid front now has at least 4 px of vertical slack with padding trimmed to 14px 24px and phrase margin-top to 10px. ScrollHeight remains within client bounds on visible front layers in grid and compact states.
- Ask 2 (Font size, line height, spacing hierarchy): Raised focused phrase to 34px (line-height 1.28), principle to 27px (line-height 1.35), and explanation to 26px (line-height 1.45). Widened horizontal padding by 3px to 42px (within the 4px ceiling).
- Ask 3 (Focused card balance and large TV readability): Rebalanced focused detail using flex column space-between distribution across the 426px content box with 70px bottom padding. Explanation bottom edge lands at 86.69% of card client height (within the 70% to 92% target range), leaving 19.8px clearance above the absolutely positioned source note at the bottom.

## Measurements
Hand calculation for focused card geometry at 1920x1080 (card client size 946px wide by 526px high):
- Container content box: clientHeight (526px) - top padding (30px) - bottom padding (70px) = 426px available.
- Longest entry analysis across catalog and GUIDANCE:
  - Header: 82px medallion height + 14px gap (fixed).
  - Longest phrase: Expression 2 ("Thank you. It's all thanks to you. You've worked hard.", 54 chars) and Expression 7 ("I'll pray (or root) for you. Everything will go well.", 53 chars). In Georgia 34px at 862px content width, wraps to 2 lines: 2 * (34px * 1.28) = 87.04px. Phrase vertical margins: 14px top + 10px bottom = 24px.
  - Longest principle: Expression 3 ("A phrase that melts the heart by understanding the other's feelings first", 73 chars). In Arial 27px at 862px width, wraps to 2 lines: 2 * (27px * 1.35) = 72.90px. Principle vertical margin: 0 top + 10px bottom = 10px. (1 line for Expression 2: 36.45px).
  - Longest explanation: Expression 3 (GUIDANCE[2], 123 chars; the Sonnet review corrected the writer's count, which named Expression 2 at 124). In Arial 26px at 862px width, wraps to 2 lines: 2 * (26px * 1.45) = 75.40px. Explanation vertical margin: 0.
- Worst-case total content height:
  - Expression 2: 82px (header) + 87.04px (phrase) + 24px (phrase margins) + 36.45px (principle) + 10px (principle margin) + 75.40px (explanation) = 314.89px.
  - Hypothetical worst-case combination (2-line phrase, 2-line principle, 2-line explanation): 82 + 87.04 + 24 + 72.90 + 10 + 75.40 = 351.34px.
  - Both fit comfortably within the 426px content box without overflow (351.34px <= 426px, leaving 74.66px free space).
- Vertical distribution and explanation landing:
  - Flex layout (display flex, flex-direction column, justify-content space-between) places the explanation at the bottom of the 426px content box.
  - Explanation bottom edge: top padding (30px) + content box height (426px) = 456px from card top.
  - Explanation bottom percentage: 456px / 526px = 86.69% of card height (lands squarely between 70% and 92%).
  - Clearance to source: Source block sits at bottom 19px. For 2 lines of 12px text (line-height 1.3 = 31.2px height), source top edge is at 526px - 19px - 31.2px = 475.8px. Clearance = 475.8px - 456px = 19.8px. Source top is strictly below explanation bottom.

Hand calculation for grid cards (client size 586px wide by 163px high):
- Before change: padding 16px 24px, phrase margin-top 12px. Front layer height was 163px (0 slack). Longest phrase ended at 139px.
- After change: padding 14px 24px (-2px), phrase margin-top 10px (-2px).
- Front layer content height: 163px - 4px = 159px.
- Slack: 163px - 159px = 4px (scrollHeight 159px <= clientHeight 163px).
- Phrase bottom edge: 139px - 4px = 135px. Margin to card bottom: 163px - 135px = 28px (>= 12px required).

## Result
Focused card layout is rebalanced: font sizes and line heights are increased, the empty bottom void is eliminated, and content is vertically distributed with the explanation ending at 86.69% of card height and 19.8px clearance above the source note. Grid front layer has 4 px of slack preventing clipping. Compact state is preserved. All changes are scoped to #tv .scene[data-scene="7"]. Test suite covers all seven acceptance criteria.

Round 1: the rotation test drives window.colorPolishRuntime.setScene(7), which advances the bloom index; the Studio Replay button does not.

## Coordinator verification (Fable 5.1)
- typecheck, vitest, build pass; lint at the pre-existing 18; probe clean; Playwright on the dev server 14 of 15 (the Replay-based rotation test), round 1 switched it to runtime setScene and the spec passed 7 of 7 alone; the production-server rerun of the full three-spec set gives 14 of 15 with the only failure the usable spec's legacy fallback journey that fails identically on untouched tv/base under that runner.
- Hygiene sweep clean. Review: Sonnet 5 (high): CSS and rotation test sound; should-fix on evidence (closed by the full-set rerun above); one record note corrected (longest explanation is Expression 3 at 123 characters).
