# Plan 13 run record: TV scene review and refactor

Plan: /Users/anthony/Projects/mothers-love/docs/PLAN-13-tv-scene-refactor.md
Runner: coordinator. Base branch tv/base; scene branches tv/scene-<slug>; pick branch tv/pick.

## Layout
- orders/: work orders per lane (base, then one per scene slug).
- lanes/: lane record files, one per lane, with state planned, running, landed, reviewed, merged.
- gaps/: gap reports per scene, written by Fable, approved by Anthony before the lane launches.
- decisions/: Anthony's rulings and lane spills.
- logs/: probe screenshots and verification output per lane.

## Lane states
- Lane 0 critique: planned
- base (Section 0): planned
- welcome, garden, arrival, featured, calendar, peacemakers, status, expressions, peace-in-practice, orbit, milestone: planned, waiting on Section 0 and their gap reports
- pick (Section 12): planned
