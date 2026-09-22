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
| 1 Light and air | Opus 5 | landed 2026-09-21 | 78eeb15 | [dpl_3dbxuPsW2AHocBT5fVh47irKJyYy](https://mothers-love-hb1rorbpx-lvzion.vercel.app/display/world-preview?source=sample&art=design) | /private/tmp/mothers-love-d2/s1 (stills 23/23, quality 6/6, tour 3/3; Garden 419 calls, 3,297,198 tris; classic and cinematic byte-identical to D1) |
| 2 The pearl | Opus 5 | landed 2026-09-21 | (this commit) | pending Vercel build | /private/tmp/mothers-love-d2/s2 and s2b (stills 23/23, quality 6/6; Garden 415 calls, 3,405,528 tris before the shell correction; classic and cinematic byte-identical to D1) |
| 3 Clouds and cotton-candy trees | Opus 5 | started 2026-09-21 | | | |
| 4 Three arrivals and caption | Opus 5 | pending | | | |
| 5 Islands, water, landmarks, heart silk, tiers | Opus 5 | pending | | | |

## Fable direct edits

- 2026-09-21: created `.claude/launch.json` (study server on port 32743) and this record.
- 2026-09-21: Section 1 review corrections applied directly: `studyRim` now snapshots the previous program cache key before replacing `onBeforeCompile` (Sonnet finding 2); palette comment records that the shadow light sits at about 26 degrees while the visual sun sits at about 12 degrees on purpose (finding 1, no change). Finding 3 (milestone district at the shadow frustum edge) is pre-existing and noted for Section 5.
- 2026-09-21: Section 2 corrections applied directly after the Sonnet review and my own capture check: glass shell sphere segments 96x48 to 48x24 on all 19 slots (finding 1); `frameFor` now reuses one frame object instead of allocating per frame (finding 2); resident face opacity .58 to .9 with tint #f3e6ea because overlapping residents showed each other's text through the face (my finding). Stills rerun on the corrected build: 23/23, parity identical.

## Build log

- 2026-09-21: Plan approved. Section 1 dispatched to an Opus 5 writer.
- 2026-09-21: Section 1 landed as 78eeb15. Writer tuned three values from the spec after seeing the render (sky glow .35/.9 to .20/.5 with a horizon lift, halo opacity .85/.7 to .5/.45, fill 1.0 to .75) to remove a sky-sea seam and a blown-out sun. Sonnet landing review: two findings corrected or ruled, one informational. Section 2 dispatched.
- 2026-09-21: Section 2 landed. Writer adaptations: three 0.180 has no `luminance()` chunk helper, so the glass alpha uses a Rec. 709 dot product; the rim tint also colors the specular so it does not tone map back to white; sparkle size .08 to .13 for TV visibility. Halo is inherently faint where the sky behind the pearl is already near white. Section 3 dispatched.
