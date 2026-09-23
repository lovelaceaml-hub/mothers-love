# Run: 2026-09-22-repo-refactor

Plan ID: 2026-09-22-repo-refactor
Plan file: /Users/anthony/Projects/mothers-love/docs/PLAN-28-repository-refactor.md (Plan 26 until Anthony's numbering ruling of 2026-09-23; the plan id and this tree did not change)
Runner: Claude, Steps mode, one fresh chat per section
Started: 2026-09-23T01:22Z
Coordinator: Claude Opus 5 (xhigh), this chat for Section 0

## Baselines

| Repo | Path | Branch | Baseline HEAD |
|---|---|---|---|
| mothers-love (production) | https://github.com/lovelaceaml-hub/mothers-love | origin/main (renamed from origin/codex/mothers-love by S1) | 1b4c31ab9aaa7454f26a5dd20250c5da3ddd2d2a |
| mothers-love (main checkout) | /Users/anthony/Projects/mothers-love | main, moved off codex/color-polish-v6 by S2 | 1b4c31ab9aaa7454f26a5dd20250c5da3ddd2d2a plus the local ignore commit ccea482 |

Pre plan state, read live 2026-09-23 after `git fetch --prune`: 128 local branches, 102 remote branches, 137 distinct branch names, 8 worktrees, 0 modified tracked files anywhere. Safety net: 133 annotated `archive/*` tags on GitHub, listed in [research/branch-inventory.md](research/branch-inventory.md).

After Section 1: **8 local branches and 5 remote branches**, 8 worktrees, 0 modified tracked files anywhere, production unmoved at `1b4c31a` and now named `main`. The 8 local refs are the 5 keepers plus `codex/color-polish-v6`, `change/heart-ribbons-3d` and `tv17/pick`, which a worktree holds and Section 4 removes. `origin/codex/color-polish-v6` was held back from the remote deletions until this section's record was tagged, then deleted at close out, which is when the remote count reached 5.

After Section 2: the main checkout is on `main` with **0 modified tracked files and 0 untracked files**, and production is still `1b4c31a` on GitHub. The 1,596 and 2,242 figures were the same tree in two units, entries and files, not a change in the tree; Section 2 reproduced both and corrected the plan. All 2,242 untracked files left the working copy: 2,241 are in Drive under `Project Outputs/The Words of Mother's Love`, SHA-256 verified before the move and again after the Trash was emptied, and the last was already tracked on `main`. The Vercel production branch now reads `main`, so a push to `main` deploys production. Two facts for the sections ahead: three plans are numbered 26 and two are numbered 25, which Anthony rules on at the start of Section 3; and the 3D Studio kit plan is writing on the world branch, bringing local branches and worktrees to 9 each.

After Section 3: every plan, 01 to 28, is in `docs/` on the branch `fix/infra-one-doc-set`, which reaches `main` through pull request [#11](https://github.com/lovelaceaml-hub/mothers-love/pull/11), which Anthony merges; Plan 29 arrives with the world branch. Anthony ruled the numbering on 2026-09-23: renumber by date, so this plan is now Plan 28 and the world promotion plan Plan 27. The 1,054 earlier run files that lived only on `codex/color-polish-v6` came over byte for byte (one identical duplicate left out), `docs/HANDOFF.md` is one current page and `docs/HISTORY.md` holds the history, and no relative link under `docs/` is dead. Production is still `1b4c31a`. The 3D Studio kit coordinator now holds seven branches and seven worktrees, taking the totals to 15 local branches and 14 worktrees.

## Lanes

| Lane | Title | State | Model | Worktree | Review | Depends on |
|---|---|---|---|---|---|---|
| S0 | Safety net (Opus 5 xhigh, 20 minutes) | complete | claude-opus-5 xhigh | /Users/anthony/Projects/mothers-love (main checkout) | Haiku 4.5 sweep, Sonnet 5 high read only | none |
| S1 | Rename and reduce the branches (Opus 5 xhigh, 45 minutes) | complete | claude-opus-5 xhigh | /Users/anthony/Projects/mothers-love (main checkout) | Haiku 4.5 sweep, Sonnet 5 high read only | S0 |
| S2 | Fix the main working copy (Opus 5 xhigh, 30 minutes) | complete | claude-opus-5 xhigh | /Users/anthony/Projects/mothers-love (main checkout) | Haiku 4.5 sweep, Sonnet 5 high read only | S1 |
| S3 | One documentation set (Opus 5 xhigh, 40 minutes) | complete, waiting for Anthony's merge | claude-opus-5-5 xhigh | temporary worktree of fix/infra-one-doc-set, removed at close out | Haiku 4.5 sweep, Sonnet 5 high read only | S2 |
| S4 | Worktrees (Opus 5 xhigh, 20 minutes) | planned | pending | pending | pending | pending |
| S5 | The 3D world as its own surface (Opus 5 xhigh, about 2 hours) | planned | pending | pending | pending | pending |
| S6 | Retire the dead code (Opus 5 xhigh, 45 minutes) | planned | pending | pending | pending | pending |
| S7 | Split the oversized files (Opus 5 xhigh, about 2 hours) | planned | pending | pending | pending | pending |
| S8 | Verify, review, back up, report (Opus 5 xhigh, 1 hour) | planned | pending | pending | pending | pending |

## Folders

- lanes/: one file per lane (work order, result, review). Front matter fields: lane, title, state, model, runner, worktree, review, depends_on, updated.
- research/: attacker output and critique briefs.
- decisions/: decisions log and integration rulings.
- logs/: coordinator events, one file per event.
- board/: rule diagram page and generated lane board.

## Artifacts

- Rule diagram: not required, this run has no lane board (Steps mode, one section at a time)
- Lane board: not required
- Branch inventory: [research/branch-inventory.md](research/branch-inventory.md) and [research/branch-inventory.json](research/branch-inventory.json)

<!-- lane: S0 state: complete model: claude-opus-5-xhigh worktree: /Users/anthony/Projects/mothers-love review: sonnet-5-high updated: 2026-09-23T01:35Z -->
<!-- lane: S1 state: complete model: claude-opus-5-xhigh worktree: /Users/anthony/Projects/mothers-love review: sonnet-5-high updated: 2026-09-23T05:11Z -->
<!-- lane: S2 state: complete model: claude-opus-5-xhigh then claude-opus-5-5-xhigh worktree: /Users/anthony/Projects/mothers-love review: sonnet-5-high updated: 2026-09-23T08:01Z -->
<!-- lane: S3 state: complete-awaiting-merge model: claude-opus-5-5-xhigh worktree: scratchpad temporary worktree of fix/infra-one-doc-set review: sonnet-5-high updated: 2026-09-23T08:40Z -->
<!-- lane: S4 state: planned model: pending worktree: pending review: pending updated: 2026-09-23T01:22Z -->
<!-- lane: S5 state: planned model: pending worktree: pending review: pending updated: 2026-09-23T01:22Z -->
<!-- lane: S6 state: planned model: pending worktree: pending review: pending updated: 2026-09-23T01:22Z -->
<!-- lane: S7 state: planned model: pending worktree: pending review: pending updated: 2026-09-23T01:22Z -->
<!-- lane: S8 state: planned model: pending worktree: pending review: pending updated: 2026-09-23T01:22Z -->
