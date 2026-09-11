# Gap report: Nine Expressions (Section 8, renderer id 7, slug expressions)

Written by Fable 5.1 on September 10, 2026 (Plan 13, sitting one). Approval: pending Anthony.

## Prompt asks
1. All expression text fits: no cramped text, awkward breaks, text touching borders, inconsistent card sizes or alignment, no overflow.
2. Adjust padding, responsive font size, line height, card dimensions, spacing, icon and text hierarchy.
3. Readable from a large TV; balanced grid; every expression equally important; do not redesign.

## Prototype v6 2 does
- Grid cards 590 by 159, focused 950 by 527, compact 403 by 120; phrase 26px Georgia, compact phrase 19px. Same layout family as live.

## Live does (renderer.js lines 180, 343 to 353; renderer.css lines 52 to 67, 214 to 218)
- Geometry is animated in JS: grid 590 by 167 to focused 950 by 530 or compact 403 by 126. Measured at 1920:
  - Grid: every card 586 by 163 inner; the visible front layer is exactly 163 tall (fits, zero slack); the longest phrase ends at 139 px, 24 px above the bottom edge. No text touches a border.
  - Compact (after focus): 399 by 122 inner; two-line phrases end at 98 px, 24 px of slack. Fits.
  - Focused: 946 by 526 inner; the detail content ends at 302 px, leaving 224 px (43 percent) of the card empty below the explanation. The source line sits at the bottom, so the card reads top-heavy.
- scrollHeight of every card exceeds its client height in every state (429 in grid, 449 to 454 compact) because the hidden `.edu-detail` layer (opacity 0, inset 0) is taller than the card and `overflow:hidden` clips it. That is invisible, but it means the plan's acceptance "scrollHeight never exceeds client size on the card" fails today for a reason unrelated to fit; the test must measure the visible layer instead.
- 3840 is the same 1920 canvas scaled 2x by transform; there is no separate responsive layout, so "responsive font size" reduces to the 1920 fit.

## Gap
Ask 1 is closed at the current catalog text (no overflow, no border contact). Ask 2 is mostly closed; the one real defect is ask 3's balance: the focused card is 43 percent empty. Secondary: the grid front has zero slack, so any longer phrase in a future catalog would clip.

## Decision (recommended)
Small lane. (a) Rebalance the focused detail: larger phrase (34px) and explanation (26px, line height 1.45), distribute the header, phrase, principle and explanation over the card height with the source line anchored at the bottom, so the content ends no higher than 80 percent of the card. (b) Give the grid front a few pixels of slack by trimming top padding to 14px and phrase margin to 10px, keeping the 590 by 167 geometry so the JS numbers stay put. (c) No change to compact. All CSS in scenes/expressions.css scoped `#tv .scene[data-scene="7"]`; the JS geometry numbers in scenes/expressions.js stay as they are unless (a) needs the focused height, in which case the lane changes both together as the plan allows. Colors unchanged. Alternative: skip the section; the fit is already acceptable.

## Testable acceptance
1. Common scene spec.
2. In expressions.spec.ts, for all nine cards in the grid state and compact state: the `.edu-front` layer's scrollHeight and scrollWidth do not exceed the card's client size, and the phrase's bottom edge sits at least 12 px above the card bottom. In the focused state: the `.edu-detail` layer fits the card and the explanation's bottom edge sits between 70 and 92 percent of the card height.
3. Same assertions at 3840.
4. Screenshots at 1920 and 3840 at 0, 6000 and 14000 ms into logs/expressions/.

## Risk
Low. CSS with one possible paired JS number. Review checks the `#tv` prefix and that the card sizes still match the JS animation targets.
