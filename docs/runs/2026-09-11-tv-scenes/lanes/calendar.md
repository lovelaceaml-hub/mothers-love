---
lane: calendar
title: Section 5, Calendar entry pulse
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-calendar
review: "sonnet-5 high on landing"
depends_on: base-b
updated: 2026-09-11T09:07Z
---
## Files
- public/color-polish/scenes/calendar.js: Set --day-index CSS property to String(day) during mount for each non-future day cell alongside --day-delay.
- public/color-polish/scenes/calendar.css: Added keyframe calendar-entry-pulse, scoped animation on #tv .scene[data-scene="5"] .day.past staggered by --day-index, and still-class and reduced-motion animation overrides.
- tests/color-polish-scenes/calendar.spec.ts: Playwright test suite verifying circularity, no overflow, click advance prevention, corner date and centered count alignment, entry pulse execution and settlement, reduced motion stillness, and 3840 viewport consistency.
- docs/runs/2026-09-11-tv-scenes/lanes/calendar.md: Lane execution and completion record.

## Gap report items closed
- Decision item 1 (one-shot entry pulse on past days when the scene mounts): Added @keyframes calendar-entry-pulse scaling from 1 to 1.035 and back with existing gold glow #D8B45200 to #D8B45266 and back, resting at 0% and 100%. Applied to #tv .scene[data-scene="5"] .day.past with 720ms ease-out 1 both.
- Decision item 2 (staggered by day index within 2.5 seconds for a 30-day month): In scenes/calendar.js mount(), assigned --day-index to String(day) on each non-future day cell. In scenes/calendar.css, configured animation-delay as calc(var(--day-index, 0) * 60ms).
- Decision item 3 (scoped CSS and unchanged colors): Scoped every rule to #tv .scene[data-scene="5"] to win the cascade over renderer.css. Reused existing #FFF5E9, #FCE9DB, #DEC29D, and #D8B452 color definitions with no new hue.
- Decision item 4 (off under reduced motion and still mode): Wrapped pulse animation in @media (prefers-reduced-motion: no-preference), added #tv.still .scene[data-scene="5"] .day.past { animation: none; } reflecting core/stage.js applyStill toggling the still class on #tv, and explicitly disabled animation under @media (prefers-reduced-motion: reduce).
- Decision item 5 (no layout disruption and shimmer preservation): Confined pulse to scale transform and box-shadow glow, leaving ::after pseudo-element (history-light shimmer) untouched with zero margin, padding, or dimension shifts.
- Decision item 6 (calendar click behavior): Preserved delegated click listener on data-day without stopPropagation (day selection is Studio-only; live TV click advances the scene).

## Result
Implemented the calendar entry pulse animation in scenes/calendar.css staggered by 60ms per day index set in scenes/calendar.js.
Scoped all styles under #tv .scene[data-scene="5"], fully respecting prefers-reduced-motion and the #tv.still mode override.
Authored the 5-scenario Playwright test suite in tests/color-polish-scenes/calendar.spec.ts.
The coordinator still runs typecheck, lint, test, build, Playwright test suite, and the pixel probe.
Round 1: the settle assertion now compares getComputedTiming().endTime with currentTime because the shared helper pauses animations at the checkpoint.

## Coordinator verification (Fable 5.1)
- typecheck, vitest, build pass; lint at the pre-existing 18; scene CSS has 3 scoped rules and nothing unscoped; probe clean across six configs plus arrivals (logs/calendar/probe); Playwright tests/color-polish-scenes plus usable: 12 of 13, the one failure in this lane's own settle assertion (the shared helper pauses animations, so finished pulses report paused); round 1 changed the assertion to compare getComputedTiming().endTime with currentTime and the spec passed 5 of 5 on an isolated port.
- Hygiene sweep (Haiku 4.5 low): no findings. Review: Sonnet 5 (high), no material findings; notes: the gap report said 3000 ms where the order and spec use 6000 ms (both clear the 1.2 s settle), the still and reduced-motion overrides duplicate renderer.css blanket rules (harmless), and the full 13-test run was not repeated after the assertion-only fix.

## Coordinator verification (Fable 5.1)
- Full-set rerun on the production runner: 12 of 13, the failure being the usable spec's legacy fallback journey (a runner artifact confirmed on untouched tv/base). This closes the Sonnet note that the full set had not been repeated after the assertion fix.
