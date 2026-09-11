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
- Lane 0 critique: landed (8 objections, 7 accepted; lanes/lane0.md)
- base (Section 0): reviewed, 313edb9 on tv/base. base-b (Section 0b): reviewed, bce043e on tv/base.
- Scene lanes, each reviewed by Sonnet 5 (high) and committed on tv/scene-<slug>, pushed: welcome 5772f03, garden 727ced1, arrival 9a20800, featured bf3dbb0, calendar 6fa5e93 and 07f2c38, peacemakers be74a9f, status 3d3e0b2, expressions fe21f6f, peace-in-practice 2f73b07, orbit 565f9bc, milestone 2a70683.
- pick (Section 12): tv/pick 22133ff holds every scene branch (garden d73020d and welcome 880ea9f after completion-review corrections, status 1bde0f8 after a flaky sample fix); scene, helpers and usable specs 63 of 64 on a production server (the one failure is the runner's legacy-fallback artifact), probe clean, pushed. Opus 5 completion review: first pass no blocking findings and two should-fix, both corrected; second pass on 22133ff running. Anthony's TV check runs from the local server at http://192.168.0.86:3100/display (Vercel SSO protection blocks the preview API); production promotion waits for that check.
<!-- lane: pick state: landed model: fable-5.1 worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-pick review: opus-5 updated: 2026-09-11T10:34Z -->
