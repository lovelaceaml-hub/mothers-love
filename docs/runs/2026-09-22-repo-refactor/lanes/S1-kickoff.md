Implement Plan 26: Clean up and refactor the Mother's Love repository, Section 1: Rename and reduce the branches, at $HOME/Projects/mothers-love/docs/PLAN-26-repository-refactor.md

Read first, in this order:
1. $HOME/Projects/mothers-love/docs/PLAN-26-repository-refactor.md including its Build log
2. $HOME/Projects/mothers-love/docs/runs/2026-09-22-repo-refactor/research/branch-inventory.md, especially the section "Findings that Section 1 must act on"
3. $HOME/Projects/mothers-love/docs/runs/2026-09-22-repo-refactor/lanes/S1.md

The complete execution envelope, setup line, safety facts and gate for this section are in that third file. Follow it exactly.

Setup line, verbatim: Model claude-opus-5, effort xhigh. Fallback Gemini 3.8 Flash for the mechanical deletion rows only. Lane Claude. Agents: no. Review: Sonnet 5 high read only, preceded by a Haiku 4.5 low hygiene sweep.

Set your own effort to xhigh before you begin. This chat was started from a terminal by the Section 0 chat at Anthony's instruction, so the model flag is set but the effort is not.

## What Section 0 already did

Section 0 completed 2026-09-23 at commit d4cb9ac on codex/color-polish-v6. It pushed 133 annotated tags named archive/<branch-name> to GitHub, one for every distinct non keeper branch name, plus archive/detached-world-bubbles for the detached commit bb03f79 in the world-bubbles worktree. All 220 non keeper branch tips, local and remote, are reachable from their tags. 72 of the 133 archived branches hold commits production does not have, so the tags matter. The machine readable inventory at $HOME/Projects/mothers-love/docs/runs/2026-09-22-repo-refactor/research/branch-inventory.json has 138 rows; drive the deletions from it rather than re-deriving the list. Restore any branch with: git branch <name> archive/<name>

BEFORE DELETING ANYTHING, run this and confirm it resolves:

    git -C $HOME/Projects/mothers-love rev-parse record/2026-09-22-repo-refactor-section-0

Do not assume it. If it does not resolve, stop and commit the Section 0 record first.

## Anthony's three rulings, 2026-09-23

Already written into the plan and the S1 work order. Do not re-ask.

1. Close pull requests #4 and #1 deliberately with `gh pr close`, each with a closing comment naming the archive tag that preserves its head branch, rather than letting branch deletion close them silently. Their heads are codex/mothers-love-promo-commercial and codex/mothers-love-color-polish. PR #8's two branches are both keepers and it is unaffected except for its base rename.
2. Leave the three checked out branches alone locally: codex/color-polish-v6 (the main checkout itself), change/heart-ribbons-3d, and tv17/pick. Git refuses to delete a branch a worktree holds. Delete only their remote counterparts on GitHub. Section 4 removes the worktrees and then the local refs, and its lane record already states what it inherits. Record in the Build log that you left exactly these three and why. The acceptance line "at most six branches" therefore reads as at most six remote branches plus these three local leftovers; record the real numbers rather than forcing the target.
3. Start now rather than waiting for the Claude pool reset.

## Two more facts that change what this section does

4. The local codex/mothers-love is stale at 554234a, 24 commits behind origin/codex/mothers-love at 1b4c31a, and is a strict ancestor. Fast forward the local ref to origin BEFORE renaming it to main, or the rename carries production backwards by 24 commits.
5. The Section 0 record lives on codex/color-polish-v6. archive/codex/color-polish-v6 points at e5ffa3a, the tip before the record was written, so it does NOT contain Plan 26 or the run tree. The tag record/2026-09-22-repo-refactor-section-0 does. Since you are not deleting that branch, this is a note for Sections 3 and 4 rather than a blocker, but do not re-cut or move either tag without saying so.

## A process finding from Section 0's review that applies here

Commit and push the section record BEFORE the hygiene sweep and review start, not after. Section 0 left its record as loose untracked files during its own review and the reviewer flagged it.

## Baseline, read live after git fetch --prune on 2026-09-23

128 local branches, 102 remote branches (103 refs under refs/remotes/origin, one being the origin/HEAD symref), 137 distinct branch names, 8 worktrees, 0 modified tracked files anywhere, 1,596 untracked evidence entries in the main checkout.

## Protected

Production is origin/codex/mothers-love at 1b4c31a, serving https://mothers-love.vercel.app. Nothing in this section may move it. Stop before the Vercel production branch setting, which Anthony changes himself. No deploy, database or credential work is in scope. Do not touch the 1,596 untracked evidence files, that is Section 2. Do not start Section 2.

## Acceptance

git branch -a shows at most six branches, allowing for the three local leftovers ruled above; every removed name resolves as a tag; and no open pull request points at a missing branch.

## Closing

Follow the lane-handoff closing block: verify, append the Build log facts to Plan 26, commit and push the record, then run the Haiku 4.5 hygiene sweep and the Sonnet 5 review, correct findings, push again, then print the closing block with the Section 2 handoff and stop.
