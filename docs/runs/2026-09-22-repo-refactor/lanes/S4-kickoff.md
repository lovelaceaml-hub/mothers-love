Implement Plan 28: Clean up and refactor the Mother's Love repository, Section 4: Worktrees, at /Users/anthony/Projects/mothers-love/docs/PLAN-28-repository-refactor.md

This plan was Plan 26 until 2026-09-23, when Anthony ruled that plans renumber by date. The plan id `2026-09-22-repo-refactor`, the run tree and the `record/*` tags did not change.

Read first, in this order:
1. /Users/anthony/Projects/mothers-love/docs/PLAN-28-repository-refactor.md, including its Build log, which now carries Sections 0 to 3
2. /Users/anthony/Projects/mothers-love/docs/runs/2026-09-22-repo-refactor/INDEX.md
3. /Users/anthony/Projects/mothers-love/docs/runs/2026-09-22-repo-refactor/lanes/S3.md, the Result, "What Section 4 inherits" and the Review
4. /Users/anthony/Projects/mothers-love/docs/runs/2026-09-22-repo-refactor/lanes/S4.md

If those paths are not on disk, Section 3's pull request has not reached the main checkout yet. Read them with `git -C /Users/anthony/Projects/mothers-love show record/2026-09-22-repo-refactor-section-3:<path>` and apply the gate below.

Setup line, verbatim: Model claude-opus-5-5, effort xhigh. Fallback Gemini 3.8 Flash for the mechanical rows only (listing worktrees and branches, measuring disk use). Lane Claude. Agents: no. Review: Sonnet 5 high read only, preceded by a Haiku 4.5 low hygiene sweep. Set your effort to xhigh before you begin.

## Gate

Section 3's pull request (`fix/infra-one-doc-set` into `main`) must be merged by Anthony, because this section deletes `codex/color-polish-v6` and that branch's documents reach `main` only through that merge. Confirm all three, and if any fails, stop and report instead of working:

- `git -C /Users/anthony/Projects/mothers-love ls-remote origin refs/heads/main` names a commit that contains `record/2026-09-22-repo-refactor-section-3` (check with `git merge-base --is-ancestor`, or for a squash merge, that `docs/PLAN-28-repository-refactor.md` and `docs/HISTORY.md` exist on `origin/main`)
- the Vercel production deployment for that commit is READY
- `curl -s -o /dev/null -w '%{http_code}' https://mothers-love.vercel.app/` and `/display` both answer 200

Record those three results in the Build log first: they are Section 3's post merge acceptance, which Section 3 could not check itself.

## Ask Anthony first, one question, unless the Build log already carries his ruling

> The 3D Studio kit's coordinator is writing on `feat/world-cinematic` and has five more branches and worktrees (`world-kit/k0` to `k4`). Plan 28's Sections 4, 5 and 7 also touch the world's branches, worktrees and files. How should they share?
> 1. (Recommended) Section 4 runs now and touches nothing of the kit's: it removes only the worktrees and branches Plan 28 retired, and leaves `feat/world-cinematic`, every `world-kit/*` branch and worktree, and `world-quality-continuation` alone. Sections 5 and 7, which change world code, wait until the kit coordinator finishes or hands the world branch back.
> 2. Pause Plan 28 until the 3D Studio kit plan finishes, then run Sections 4 to 8 in order.

## Execution envelope

- Project / unit: Plan 28: Clean up and refactor the Mother's Love repository, Section 4: Worktrees (Opus 5.5 xhigh, 30 minutes)
- Lane: Claude
- Read first: the four files above
- In scope, under option 1:
  - Bring the main checkout up to the merge. After a merge commit: `git -C /Users/anthony/Projects/mothers-love pull --ff-only`. After a squash merge, local `main`'s `ccea482` cannot fast forward, and its content is inside the squash, so confirm `git status` is clean and run `git -C /Users/anthony/Projects/mothers-love reset --hard origin/main`.
  - Remove the worktrees `/Users/anthony/Projects/mothers-love-worktrees/heart-ribbons-3d` and `/Users/anthony/Projects/mothers-love-worktrees/tv17-base` after confirming each is clean, then delete the local branches `change/heart-ribbons-3d`, `tv17/pick` and `codex/color-polish-v6`. All three are `archive/*` tags; their documents are on `main` and in `docs/HISTORY.md`.
  - The two copies under `/Users/anthony/Documents/Codex/2026-09-20/branch-design-ribbon-examples-chatgpt-conversation/work/`: `mothers-love` holds `feat/world-base` (the base of draft pull request #10), so move it with `git worktree move` to `/Users/anthony/Projects/mothers-love-worktrees/world-base` after confirming it is clean and that no other chat is using it; `world-bubbles` is a detached HEAD at `bb03f79`, preserved by `archive/detached-world-bubbles`, so remove it once that tag is confirmed on GitHub.
  - `_saved-evidence`, `backup` and `remove-old-copies.sh` in `/Users/anthony/Projects/mothers-love-worktrees/`: confirm each file's content is already in Git or Drive (hash it), copy anything that is not to Drive under `Project Outputs/The Words of Mother's Love` with SHA-256 receipts, then remove them.
  - `git worktree prune`, and record the disk space recovered across the whole plan.
  - Delete `fix/infra-one-doc-set` locally and on GitHub if the merge did not already, after confirming `main` contains it.
  - Repoint the stale upstreams of `feat/tv-pearl-design` and `feat/world-base` (`git branch --set-upstream-to=origin/<name> <name>`), and give `feat/tv-pearl-sequence` its upstream. Leave `feat/world-cinematic`'s upstream to the kit coordinator.
- Protected / out of scope:
  - **Do not push `main` and do not merge anything.** A push to `main` is a production deployment. Never run a bare `git push` in the main checkout.
  - **Do not check out, commit to, edit, move or remove `feat/world-cinematic`, any `world-kit/*` branch, their worktrees, or `world-quality-continuation`**, and leave the tag `safety/world-kit-k0` alone. They belong to Plan 29.
  - No application code (Sections 5 to 7). No Vercel setting, deploy trigger, database or credential work.
  - Delete a worktree only after `git -C <worktree> status --porcelain --untracked-files=all` prints nothing, or after its untracked files are saved to Drive with receipts.
- Acceptance: one worktree per live branch outside the kit's set; no working copy outside `~/Projects`; `codex/color-polish-v6`, `change/heart-ribbons-3d` and `tv17/pick` gone locally and still restorable from their tags; the main checkout on `main`, clean, level with `origin/main`; the recovered disk space recorded.
- Verify: `git worktree list`, `git for-each-ref refs/heads`, `git -C /Users/anthony/Projects/mothers-love status -sb`, `ls /Users/anthony/Documents/Codex/2026-09-20/branch-design-ribbon-examples-chatgpt-conversation/work/`, `du -sh` before and after, and `git ls-remote origin 'refs/tags/archive/*'` for the three deleted branches.
- Completion output: Build log facts appended to the plan, changed files, verification evidence, commit and push status, limitations, and the Section 5 handoff. Documents reach `main` only through a pull request Anthony merges, so this section's record goes on a new `fix/infra-*` branch and pull request, or into the Section 5 pull request if Anthony prefers; commit and push the record before the hygiene sweep and review start.
- Record file: docs/runs/2026-09-22-repo-refactor/lanes/S4.md
- Board: not required, Steps mode

## What Section 3 leaves you

- Every plan 01 to 28, the run records, `docs/HANDOFF.md` (one page) and `docs/HISTORY.md` are on `main` once the pull request merges. Plan 29 reaches `main` with the world branch.
- 15 local branches and 14 worktrees when Section 3 closed: 14 of each before Section 3, plus the branch `fix/infra-one-doc-set`, whose temporary worktree Section 3 removed at close out. Seven branches and seven worktrees are the kit's: `feat/world-cinematic` in `world-quality-continuation`, and `world-kit/k0`, `k1`, `k2`, `k3a`, `k3b` and `k4`. Count them live before planning; the kit coordinator may have added more.
- The record tag `record/2026-09-22-repo-refactor-section-3` is on GitHub at Section 3's final record commit.
