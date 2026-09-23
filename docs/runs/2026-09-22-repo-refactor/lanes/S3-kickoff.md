Implement Plan 26: Clean up and refactor the Mother's Love repository, Section 3: One documentation set, at /Users/anthony/Projects/mothers-love/docs/PLAN-26-repository-refactor.md

That path is where the plan lives once this section brings it onto `main`. Until then it is **not on disk**. The main checkout at /Users/anthony/Projects/mothers-love is on `main`, and the plan and its run tree exist only on the local branch `codex/color-polish-v6` and the pushed annotated tag `record/2026-09-22-repo-refactor-section-2`. Read them from the tag.

Read first, in this order:
1. `git -C /Users/anthony/Projects/mothers-love show record/2026-09-22-repo-refactor-section-2:docs/PLAN-26-repository-refactor.md`, including its Build log, which now carries Sections 0, 1 and 2
2. `git -C /Users/anthony/Projects/mothers-love show record/2026-09-22-repo-refactor-section-2:docs/runs/2026-09-22-repo-refactor/INDEX.md`
3. `git -C /Users/anthony/Projects/mothers-love show record/2026-09-22-repo-refactor-section-2:docs/runs/2026-09-22-repo-refactor/lanes/S2.md`, the Result, After the pause, and the Review

Setup line, verbatim: Model claude-opus-5-5, effort xhigh. Fallback Gemini 3.8 Flash for the mechanical rows only (listing which plan files exist on which branch, link sweeps). Lane Claude. Agents: no. Review: Sonnet 5 high read only, preceded by a Haiku 4.5 low hygiene sweep.

Gate: confirm the Build log shows Section 2 complete. If it does not, stop and report instead of working.

## Ask Anthony first, one question

Three plans are numbered 26 and two are numbered 25, so "every plan number present once" cannot be met without renumbering. If the Build log does not already carry Anthony's ruling, ask him this before moving any plan file, record his answer in the Build log, then proceed:

> Three plans are numbered 26 and two are numbered 25. How should the numbers be fixed?
> 1. (Recommended) The oldest plan keeps each number and newer ones move to the next free numbers: 25 Live TV pearl study, 26 Expression Cosmos prototype, 27 World promotion, 28 this repository refactor, 29 3D Studio kit. One rule, nothing to argue about later. This plan and the 3D Studio kit are renamed mid flight; their run trees and tags carry no plan number, so nothing breaks.
> 2. Keep every file name as it is and let the words after the number tell them apart. No renaming, but "Plan 26" keeps meaning three different plans in chats.

The dates, from each file's first commit: `PLAN-25-live-tv-pearl-study.md` 2026-09-22T05:15Z (`feat/tv-pearl-design`), `PLAN-25-world-promotion.md` 2026-09-22T11:18Z (`feat/world-cinematic`), `PLAN-26-pearl-sequence.md` 2026-09-22T07:32Z (`feat/tv-pearl-sequence`), `PLAN-26-repository-refactor.md` 2026-09-23T01:50Z (`codex/color-polish-v6`), `PLAN-26-world-kit.md` 2026-09-23T07:24Z (local `feat/world-cinematic` and `world-kit/k0`, not pushed). If the ruling renames the 3D Studio kit plan, its own coordinator renames that file; this section records the new number and edits nothing on the world branch.

## Execution envelope

- Project / unit: Plan 26: Clean up and refactor the Mother's Love repository, Section 3: One documentation set (Opus 5 xhigh, 40 minutes)
- Lane: Claude
- Read first: the three `git show` commands above
- In scope: one new branch off local `main`, named per the plan's scheme, for example `fix/infra-one-doc-set`, carrying the local commit `ccea482` (the `.gitignore` rules) plus: every plan file brought into `docs/` under Anthony's numbering ruling (`PLAN-14` from `codex/color-polish-v6`; `PLAN-19` to `PLAN-25` from the world and pearl branches, read with `git show` from `origin/*` refs; this plan and the whole `docs/runs/2026-09-22-repo-refactor/` tree from the record tag); one reconciled `PLAN-24-world-visual-quality.md` from its two diverged copies; `/Users/anthony/Projects/mothers-love/docs/HANDOFF.md` rewritten as one current page with its history moved to `/Users/anthony/Projects/mothers-love/docs/HISTORY.md`; `README.md` quick links (including a `Storage` link to the Drive folder `Project Outputs/The Words of Mother's Love`, path read from `/Users/anthony/Projects/docs/STORAGE-PATHS.json`), `USER-MANUAL.md` and `AGENTS.md` refreshed; the project's line in `/Users/anthony/Projects/README.md`; the `[Plan 25]` link in this plan made to resolve; the six non-document files listed in `HISTORY.md` with the tag that preserves them; one pull request into `main`.
- Protected / out of scope:
  - **Do not push `main` and do not merge the pull request.** Since 2026-09-23 Vercel builds production from `main`, so a push to `main` is a production deployment. Anthony clicks Merge. Never run a bare `git push` in the main checkout: it tracks `origin/main` and holds the unpushed `ccea482`.
  - **Do not check out, commit to or edit `feat/world-cinematic` or `world-kit/k0`, or any worktree.** The 3D Studio kit coordinator is actively writing there under Anthony's grant. Read its files with `git show` only. Do not edit its plan file or the Active state section it added to that branch's `AGENTS.md`.
  - No branch or worktree deletion, which is Section 4. Do not re-add upstream tracking to `codex/color-polish-v6`, `change/heart-ribbons-3d` or `tv17/pick`.
  - No application code, which is Sections 5 to 7. No Vercel setting, deploy trigger, database or credential work.
  - The six non-document files that exist only on `codex/color-polish-v6` (`public/color-polish/renderer.js` and five under `scripts/video/`) do not move onto `main` unless Anthony asks.
- Acceptance: on the pull request branch every plan number is present once under Anthony's ruling (or, if he chose to keep the names, every plan file is present once); `docs/HANDOFF.md` opens with the current state in its first paragraph; no relative link under `docs/` is dead, including the Plan 25 link in this plan; the diff against `main` touches only documents and `.gitignore`; the pull request is open against `main`. After Anthony merges it: `origin/main` points at the merge, the production deployment it triggered is READY, and the live site answers 200 on `/` and `/display` with the app unchanged.
- Verify:
  - `git -C /Users/anthony/Projects/mothers-love ls-tree -r --name-only <branch> -- docs | grep -E '^docs/PLAN-[0-9]+' | sed -E 's|^docs/PLAN-([0-9]+).*|\1|' | sort | uniq -d` prints nothing
  - `git -C /Users/anthony/Projects/mothers-love diff --stat main...<branch> -- . ':(exclude)docs' ':(exclude).gitignore'` prints nothing
  - a relative link check over every Markdown file under `docs/` on the branch
  - `gh pr view <number> --repo lovelaceaml-hub/mothers-love --json state,baseRefName,headRefName`
  - after the merge: `git ls-remote origin refs/heads/main`, the Vercel deployment for that commit READY, and `curl -s -o /dev/null -w '%{http_code}' https://mothers-love.vercel.app/` and `/display`
- Completion output: Build log facts appended to the plan on the new branch, changed files, verification evidence, the pull request link, commit and push status, limitations, and the Section 4 handoff. Commit and push the record on the pull request branch before the hygiene sweep and review start.
- Record file: docs/runs/2026-09-22-repo-refactor/lanes/S3.md
- Board: not required, Steps mode
- Critique: none, a documents only section covered by the declared review tier

## What Section 2 leaves you

- The main checkout is on `main` at `1b4c31a` plus the local commit `ccea482`, with 0 modified and 0 untracked files. `origin/main` is still `1b4c31a`.
- All run evidence is in Drive under `Project Outputs/The Words of Mother's Love` (`Verification/2026-09-11-tv-scenes/` and `2026-09-22-main-checkout-loose-files/`), SHA-256 verified twice, the second time after the originals were gone. The originals are no longer on the Mac.
- The Vercel production branch reads `main`, changed by the Section 1 chat at Anthony's request. Anthony no longer owes that click.
- Local branches are 9 and worktrees are 9. The ninth of each, `world-kit/k0` and `/Users/anthony/Projects/mothers-love-worktrees/world-kit-k0`, belong to the 3D Studio kit plan, not to this plan.
- `feat/tv-pearl-design`, `feat/world-base` and `feat/world-cinematic` still track deleted `origin/` names and `feat/tv-pearl-sequence` tracks nothing. That is Section 4's, not yours.
- `PLAN-14-commercial-video.md` exists only on `codex/color-polish-v6` and its tags, because it left the working copy with the branch switch.
