---
lane: base-b
title: Section 0b, Shared scene test helpers and visualState depth
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-base
review: "sonnet-5 high on landing"
depends_on: base
updated: 2026-09-11T04:14Z
---
## Files
- tests/color-polish-scenes/helpers.ts: Shared scene test helpers exporting auth mocks, display fixtures, Studio navigation, circularity evaluation, and overflow checks.
- tests/color-polish-scenes/helpers.spec.ts: Smoke spec verifying Studio welcome scene rendering, orb circularity, absence of overflow, click-advance prevention, and reduced motion still mode.
- public/color-polish/core/stage.js: Added z, depth, screenScale, and blur fields to visualState actors mapping; updated registerScene default replaceMode to null.
- public/color-polish/scenes/peacemakers.js: not changed; it already registered replaceMode drift explicitly at the Section 0 baseline, so the work order premise was wrong and no edit was needed (Sonnet review note).
- docs/runs/2026-09-11-tv-scenes/lanes/base-b.md: Lane execution record for Section 0b.

## visualState change
Added four actor mapping fields to function visualState() in public/color-polish/core/stage.js:
- z: a.z (actor z-depth coordinate for 3D trajectory and layering calculations)
- depth: a.depth (relative actor depth scale factor)
- screenScale: a.screenScale (projected screen scale applied during floater rendering)
- blur: a.el ? a.el.style.filter : '' (computed CSS filter blur string applied to the orb element)

## Coordinator verification (Fable 5.1)
- typecheck pass, vitest pass, build pass; lint 18 problems (14 errors) identical to the baseline count, pre-existing in src/.
- Probe (logs/base-b/probe) against the Section 0 baseline: every result.json value identical except the visualState actors, which carry exactly the four added keys z, depth, screenScale and blur; zero mismatches in pre-existing keys across all seven runs.
- Playwright tests/color-polish-scenes plus tests/color-polish-usable with the main checkout's env: 8 of 8 passed (the two new helper tests and the six usable journeys).
- Hygiene sweep (Haiku 4.5 low): no findings.
- Review: Sonnet 5 (high) landing review after the 9:00 PM refill: no material findings; one note, the record listed peacemakers.js as changed although it was not (corrected above). The reviewer independently re-ran typecheck and eslint and re-diffed every probe state.

## Result
Shared test helpers and the smoke spec are created and visualState depth fields are wired.
Default scene replacement mode is set to null with peacemakers preserving drift explicitly.
The coordinator still runs typecheck, lint, test, build, test:e2e, and the before/after probe comparison.
