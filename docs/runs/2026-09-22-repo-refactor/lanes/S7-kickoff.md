Implement Plan 28: Clean up and refactor the Mother's Love repository, Section 7: Split the oversized files, at /Users/anthony/Projects/mothers-love-worktrees/world-surface/docs/PLAN-28-repository-refactor.md

Written 2026-09-24T17:50Z by the Claude chat that closed Section 5. It lives on `feat/world-surface`, the branch Section 7 works on, because the world files exist only there until pull request #19 merges.

Read first, in this order:
1. /Users/anthony/Projects/mothers-love-worktrees/world-surface/docs/PLAN-28-repository-refactor.md, Section 7 and the Build log (Section 5's four entries are the newest)
2. /Users/anthony/Projects/mothers-love-worktrees/world-surface/docs/runs/2026-09-22-repo-refactor/lanes/S5.md (Result, Limitations, Review)
3. /Users/anthony/Projects/mothers-love-worktrees/world-surface/AGENTS.md, section "The 3D world at /world"
4. /Users/anthony/Projects/mothers-love-worktrees/world-surface/docs/HANDOFF.md

Setup line: Model claude-opus-5-5, effort xhigh (Anthony's ruling for this plan). Fallback Gemini 3.8 Flash for mechanical rows only. Lane Claude. Agents: no. Review: Sonnet 5 high read only landing review, preceded by a Haiku 4.5 low hygiene sweep. Set your effort to xhigh before you begin.

## Gate

Stop and report instead of working if any of these fails:

- The Build log shows Section 5 complete, and pull request #19 is still an open draft. If #19 has merged, cut `refactor/world-split` from `origin/main` in a new worktree instead and say so in the record.
- `git -C /Users/anthony/Projects/mothers-love-worktrees/world-surface status -sb` is clean and level with `origin/feat/world-surface` (`cc606ce` or a later documents commit at writing).
- Anthony has answered the scope question below.

## Scope question for Anthony (ask once, record the answer in the Build log)

The plan's table names five files with their 2026-09-22 sizes. Since pull request #12 and the kit merged, they are larger, and the acceptance line, "no source file over roughly 400 lines in the world or coordinator", now covers 16 files. Line counts at `cc606ce`:

| File | Lines | In the plan's table |
| --- | --- | --- |
| `src/components/display/world/prototype/pearl-skin.ts` | 1,198 | no |
| `src/components/display/world/world-recognitions.ts` | 1,104 | no |
| `src/components/display/world/world-engine.ts` | 1,086 | yes (744) |
| `src/components/display/world/prototype/arrival-stages.ts` | 1,065 | no |
| `src/components/display/world/kit/kit-neighbors.ts` | 1,045 | no |
| `src/components/display/world/prototype/design-world.ts` | 992 | yes (773) |
| `src/components/display/world/prototype/kit-districts.ts` | 951 | no |
| `src/lib/display/coordinator.ts` | 935 | yes (935) |
| `src/components/display/world/WorldExperience.tsx` | 897 | yes (789) |
| `src/components/display/world/prototype/kit-layout-core.ts` | 869 | no |
| `src/components/display/world/world-districts.ts` | 633 | yes (633) |
| `src/components/display/world/prototype/kit-corridors.ts` | 619 | no |
| `src/components/display/world/prototype/kit-far-zones.ts` | 565 | no |
| `src/components/display/world/world-scene-legacy.ts` | 519 | no |
| `src/components/display/world/prototype/kit-layout-far.ts` | 476 | no |
| `src/components/display/world/prototype/study-radiance.ts` | 451 | no |

Options: (1) the plan's five named files, recommended, because the plan says its scope is fixed and every extra split is more review surface before Anthony's TV check; the other eleven go to a later plan. (2) All sixteen, about double the time.

## Execution envelope

- Project / unit: Plan 28 Section 7: Split the oversized files (Opus 5.5 xhigh, about 2 hours for the five files)
- Lane: Claude, in `/Users/anthony/Projects/mothers-love-worktrees/world-surface` on `feat/world-surface` (one writer; no other chat writes there)
- In scope: the files Anthony's answer names, split as the plan's table says; the rename of `src/components/display/world/prototype/` (30 files) to `art/`, with every import, the harness, the tests, `AGENTS.md`'s world section and the record's paths following it.
- Rules (plan): moves plus imports only. No rendering, timing, privacy or public contract change. Each split is reviewed as a move.
- Protected: never push or merge `main`; `/display`'s behaviour (`coordinator.ts` is TV code: a pure move, proven by the `/display` checks below); `feat/world-cinematic`, `lane/painted-world/web`, `world-kit/*` and every worktree under `/Users/anthony/Projects/mothers-love-world/`; the other chat's worktree `/Users/anthony/Projects/mothers-love-worktrees/fix-app-open-hands-icon`; no database, API, credential or Vercel setting work; no real recognition data.
- Acceptance: typecheck, `npx vitest run` (71 files, 887 tests at `cc606ce`), build, `npx eslint src` no worse than 16 errors and 3 warnings, the harness in stills, parity and tour modes, and captures byte identical to the ones taken at the start head before the split.
- Verify, in order:
  1. Before any edit, take `/Users/anthony/Projects/mothers-love-worktrees/.build-lock`, `npm run build`, `npx next start -p 32743 -H 127.0.0.1`, and capture `DESIGN_REVIEW_CHANNEL=chrome DESIGN_REVIEW_OUTPUT=<scratch>/before node scripts/review-world-design.mjs` (stills, then `DESIGN_REVIEW_MODE=parity`). Compare with Drive `3D World/previews/plan28-s5-checks/3149d39/` using `node scripts/review/png-compare.mjs`; they should already match.
  2. After the split, the same captures to `<scratch>/after`, and `png-compare.mjs before after` must report every file byte identical.
  3. `/display`: `git diff --stat` of `src/lib/display/coordinator.ts` and its new modules is a move; the TV's own tests pass; `node scripts/review/display-sample-probe.mjs . <scratch>/display` compared with Drive `3D World/previews/baselines/bd8781d/display-sample/` stays inside the noise recorded in S5.md.
  4. Push `feat/world-surface`; the draft pull request #19 picks the commits up and the cinematic CI check reruns.
- Evidence: Drive `3D World/previews/plan28-s7-checks/<commit>/` with `SHA256SUMS`, not Git.
- Record file: docs/runs/2026-09-22-repo-refactor/lanes/S7.md. Build log entries in the plan.

## Traps

- This session's worktree isolation refuses compound shell commands that mention git or run a computed program name; run plain, single commands.
- After a route change, `npx tsc --noEmit` can fail on stale `.next/types`; delete that folder and rerun.
- `/display` sample captures are not pixel stable run to run (S5.md); prove the TV unchanged by source first.
- The auto mode classifier refuses deleting GitHub branches and pushing to a live branch even after Anthony's yes; write the command into a script under this run tree and give Anthony a one click Run block.
- Timestamps come from `date -u` in the same command that writes them. No em or en dash in anything written.
- When you start a new chat for Anthony, turn on Remote Control.
