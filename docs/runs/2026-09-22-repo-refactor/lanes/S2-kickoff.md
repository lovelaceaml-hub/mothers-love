Implement Plan 26: Clean up and refactor the Mother's Love repository, Section 2: Fix the main working copy, at $HOME/Projects/mothers-love/docs/PLAN-26-repository-refactor.md

Read first, in this order:
1. $HOME/Projects/mothers-love/docs/PLAN-26-repository-refactor.md including its Build log, which now carries Sections 0 and 1
2. $HOME/Projects/mothers-love/docs/runs/2026-09-22-repo-refactor/lanes/S1.md, the Result and both reviews
3. $HOME/Projects/mothers-love/docs/runs/2026-09-22-repo-refactor/lanes/S2.md

Setup line, verbatim: Model claude-opus-5, effort xhigh. Fallback Gemini 3.8 Flash for the mechanical hashing and copy rows only. Lane Claude. Agents: no. Review: Sonnet 5 high read only, preceded by a Haiku 4.5 low hygiene sweep. Set your effort to xhigh before you begin.

## What Section 1 already did

Section 1 completed 2026-09-23 at commit 6459af2 on codex/color-polish-v6. Branches went from 128 local and 102 remote to 8 local and 5 remote. Production did not move: it is now origin/main at 1b4c31a, GitHub's default branch, still serving https://mothers-love.vercel.app.

- Remote, 5 refs: main, feat/world-cinematic, feat/world-base, feat/tv-pearl-design, feat/tv-pearl-sequence.
- Local, 8 refs: those 5 plus codex/color-polish-v6, change/heart-ribbons-3d and tv17/pick, which a worktree holds. Section 4 removes those three, not you.
- 132 removed branch names all resolve as archive/<name> tags on GitHub at the SHAs Section 0 recorded. Restore any with: git branch <name> archive/<name>
- The Section 1 record is preserved on GitHub by the annotated tag record/2026-09-22-repo-refactor-section-1. The upstream tracking on the three leftover local branches was unset, so an ordinary git push cannot recreate their remote refs. Do not re-add it.

## Four facts that change what this section does

1. **The plan's figure of 1,596 untracked evidence files is stale. Count it live before you plan the move.** The Section 1 review measured 2,242 in the main checkout with:

       git -C $HOME/Projects/mothers-love status --porcelain --untracked-files=all | grep -c '^??'

   The extra 646 are almost all under docs/runs/2026-09-11-tv-scenes/ and all predate Plan 26. Section 1 created, moved and deleted none of them. The plan text still says 1,596 in three places (the survey table, decision 3, and Section 2's own paragraph). **Correcting those three is part of this section**, because this section owns the evidence move.

2. **The main checkout is still on codex/color-polish-v6 at 6459af2, and that branch now exists only locally.** Its remote ref was deleted at Section 1 close out and its content is preserved by the tag record/2026-09-22-repo-refactor-section-1. Moving this checkout onto main is this section's job. Do not delete the codex/color-polish-v6 local ref, that is Section 4, and do not push it back to GitHub.

3. **These documents do not exist on main yet.** Plan 26 and the whole docs/runs/2026-09-22-repo-refactor/ tree live on codex/color-polish-v6 and are reachable from the two record tags. Section 3 moves them onto main. If you move this checkout onto main before Section 3 runs, the plan and the run tree will not be visible in the working copy, so read them from the tag or from a copy you take first.

4. **Anthony still owes one action from Section 1:** changing the Vercel production branch setting from codex/mothers-love to main. Section 2 does not depend on it and must not do it.

## In scope

Move $HOME/Projects/mothers-love onto the production branch. Copy the untracked evidence files to the project's Drive folder with SHA-256 receipts before removing them, reading the configured Drive path from $HOME/Projects/docs/STORAGE-PATHS.json rather than inventing one. Add the evidence paths to .gitignore. Leave the checkout clean. Correct the three stale 1,596 figures in the plan.

## Protected and out of scope

Production is origin/main at 1b4c31a and nothing here may move it. The Vercel production branch setting is Anthony's. No deploy, database or credential work. Do not delete any branch or worktree, that is Section 4. Do not move documents onto main, that is Section 3. Verify every SHA-256 before removing any original.

## Acceptance

git status in the main checkout reports a clean tree on the production branch, and the Drive copy is verified by hash.

## Closing

Verify, append the Build log facts to Plan 26, commit and push the record BEFORE the hygiene sweep and review start, then run the Haiku 4.5 sweep and the Sonnet 5 read only review, correct findings, push again, then print the closing block with the Section 3 handoff and stop.
