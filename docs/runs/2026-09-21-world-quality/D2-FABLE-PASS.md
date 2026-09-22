# Plan 24 pass D2: closing the gap to the approved direction

Goal: Upgrade all 13 connected locations and their travel corridors toward the supplied artwork, reproducing the selected preview's pearl and entrance appearance while preserving the app's reading, camera, arrival, and privacy behavior.

Approved plan for this pass: `/Users/anthony/.claude/plans/i-ve-had-codex-working-serialized-pie.md` (Anthony approved 2026-09-21 evening). Anthony's rulings: "Mostly Opus but Fable can be used" for the writer; keep going and show a side-by-side after each section.

## Models, effort, agents, review

- Coordinator: Claude Fable 5.1 (`claude-fable-5-1`), this chat. Authors work orders, reviews diffs against the plan and the four reference images, commits, pushes, reports. May make small direct edits (recorded below).
- Writer: Claude Opus 5 (`claude-opus-5`) subagent, one per section, sequential, this worktree only. Effort: the subagent's default (high requested).
- Landing review: Sonnet 5, read-only, after each section lands; findings corrected before the section closes.
- Completion review: fresh nonauthor Opus 5, high, only after Anthony's visual approval (Plan 24 P7).
- Agents: no fan-out. Planning used two read-only Plan agents and one Explore agent before approval.

## Baseline

- Branch `feature/world-cinematic-art-pass` at `041b4743da46eb99fb8d2052b243f40eec59a04c`, clean worktree, remote in sync.
- D1 reference captures (source 80586a2): Drive `Project Outputs/The Words of Mother's Love/2026-09-21-world-refinement-80586a2/`.
- Paused Garden baseline: 429 draw calls, 3,444,348 triangles (D1 quality report).

## Section ledger

| Section | Writer | Status | Commit | Preview | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 Light and air | Opus 5 | started 2026-09-21 | | | |
| 2 The pearl | Opus 5 | pending | | | |
| 3 Clouds and cotton-candy trees | Opus 5 | pending | | | |
| 4 Three arrivals and caption | Opus 5 | pending | | | |
| 5 Islands, water, landmarks, heart silk, tiers | Opus 5 | pending | | | |

## Fable direct edits

- 2026-09-21: created `.claude/launch.json` (study server on port 32743) and this record.

## Build log

- 2026-09-21: Plan approved. Section 1 dispatched to an Opus 5 writer.
