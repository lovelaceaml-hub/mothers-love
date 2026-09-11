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
- Lane 0 critique: landed (Gemini 3.8 Flash (High) read-only fallback, Codex primary at 100 percent; 8 objections, 7 accepted, disposition in lanes/lane0.md and the plan Build log)
- base (Section 0): reviewed and committed (313edb9 on tv/base) (Gemini 3.8 Flash (High) via agy, worktree /Users/anthony/.claude/worktrees/mothers-love-tv-base, branch tv/base), lanes/base.md in the worktree
- base-b (Section 0b, shared test helpers and visualState depth, added after the Lane 0 critique): reviewed and committed on tv/base
- calendar (6fa5e93, 07f2c38), status (3d3e0b2), expressions (fe21f6f): reviewed and committed on their tv/scene branches, pushed.
- sitting one note: gap reports approved by Anthony, worktrees /Users/anthony/.claude/worktrees/mothers-love-tv-<slug>, branches tv/scene-<slug>
- welcome (5772f03), featured (bf3dbb0): reviewed and committed. peacemakers: reviewed, re-verifying after spec corrections, worktrees /Users/anthony/.claude/worktrees/mothers-love-tv-<slug>
- garden, peace-in-practice (sitting three): landed, spec corrections re-verifying, reviews running
- arrival, orbit, milestone (sittings four and five): landed, spec corrections re-verifying, reviews running
- pick (Section 12): planned

<!-- lane: lane0 state: landed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-critic review: none updated: 2026-09-11T01:57Z -->
<!-- lane: base state: reviewed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-base review: sonnet-5 updated: 2026-09-11T02:10Z -->
<!-- lane: base-b state: reviewed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-base review: sonnet-5 updated: 2026-09-11T04:14Z -->
<!-- lane: calendar state: reviewed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-calendar review: sonnet-5 updated: 2026-09-11T04:33Z -->
<!-- lane: status state: reviewed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-status review: sonnet-5 updated: 2026-09-11T09:09Z -->
<!-- lane: expressions state: reviewed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-expressions review: sonnet-5 updated: 2026-09-11T09:09Z -->
<!-- lane: welcome state: reviewed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-welcome review: sonnet-5 updated: 2026-09-11T09:09Z -->
<!-- lane: featured state: reviewed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-featured review: sonnet-5 updated: 2026-09-11T09:14Z -->
<!-- lane: peacemakers state: running model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers review: sonnet-5 updated: 2026-09-11T04:33Z -->
<!-- lane: garden state: landed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-garden review: sonnet-5 updated: 2026-09-11T09:09Z -->
<!-- lane: peace-in-practice state: landed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice review: sonnet-5 updated: 2026-09-11T09:09Z -->
<!-- lane: orbit state: landed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-orbit review: sonnet-5 updated: 2026-09-11T09:09Z -->
<!-- lane: arrival state: landed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-arrival review: sonnet-5 updated: 2026-09-11T09:09Z -->
<!-- lane: milestone state: landed model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-milestone review: sonnet-5 updated: 2026-09-11T09:09Z -->
