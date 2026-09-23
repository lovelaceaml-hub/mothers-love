# Plan 26: Clean up and refactor the Mother's Love repository

Drafted 2026-09-22 by Claude after Anthony said: "All of this needs to be cleaned up. What is the latest version? even branches should be renamed. i want all of it refactored. As of now, the 3d world is not to replace but separate/alongside the tv view."

Status: draft, awaiting Anthony's approval. Nothing in this plan runs until he approves it.

## Goal

Leave one obvious latest version, a small set of clearly named branches, one place for documents, one working copy per live piece of work, and the 3D world installed as its own permanent surface that sits alongside the existing TV view instead of replacing it. No change to the database, the API, the public contract, or anyone's privacy.

## Authority

Anthony's instruction above is the current authority. It supersedes one thing in [Plan 25](PLAN-25-world-promotion.md): gate G5 there pointed the TV at the world as the new TV destination. From now on the world is a separate surface and `/display` stays the TV view, unchanged. The rest of Plan 25 (make the design look the default, the real TV check, close the CI failure, the completion review, Anthony merges) is folded into Section 5 of this plan.

## Where things stand, verified 2026-09-22

Latest version of the app: `origin/codex/mothers-love` at `1b4c31a`, which is what production serves at https://mothers-love.vercel.app. Nothing else contains newer application code. Everything below was read from the repository, not from memory.

| Fact | Number |
| --- | --- |
| Local branches | 125 |
| Remote branches on GitHub | 110 |
| Worktrees (checked-out copies) | 8 |
| Disk used by those copies | 12.6 GB (7.8 GB main, 4.8 GB worktrees) |
| Untracked files in the main working copy | 1,596, all of them run evidence under `docs/` |
| Modified tracked files anywhere | 0 |

Branch positions against production `1b4c31a`:

| Branch | Ahead | Behind | What it holds |
| --- | --- | --- | --- |
| `origin/codex/mothers-love` | production | production | The live app |
| `feature/world-cinematic-art-pass` | 25 | 16 | The 3D world, pass D1 and D2, draft PR #8 |
| `feature/tv-3d-world-prototype-01` | 5 | 16 | The world's base, 4 real commits, PR #8's current base |
| `codex/tv-pearl-sequence` | 19 | 16 | Pearl sequence and Expression Cosmos prototypes |
| `codex/tv-pearl-design-study` | 2 | 0 | The 2D TV pearl design study, sample only |
| `tv17/pick` | 2 | 16 | Documents only, no code production lacks |
| `codex/color-polish-v6` | 37 | 182 | The branch the main working copy is stuck on, stale |
| `change/heart-ribbons-3d` | 1 | 12 | Already merged as PR #6, the extra commit is documents |
| `release/feed-100`, `tv15/pick`, `tv/pick`, and about 100 others | 0 | 100 to 190 | Fully contained in production, safe to archive |

Two worktrees live outside `~/Projects`, under `/Users/anthony/Documents/Codex/2026-09-20/branch-design-ribbon-examples-chatgpt-conversation/work/`. One of them is on a detached HEAD.

Documents are split across branches. Production carries `PLAN-01` through `PLAN-18` but not `PLAN-14` or `PLAN-19` through `PLAN-25`; those exist only on the world and pearl branches.

Dead routes still shipping in production source: `src/app/display-legacy/page.tsx` and `src/app/display-v6/page.tsx`.

## Decisions Anthony made, 2026-09-22

1. Rename the production branch `codex/mothers-love` to `main`. Approved. The Vercel production branch setting changes with it, and Anthony clicks that one himself.
2. Archive then delete the roughly 100 finished branches. Approved. Every one is first pushed as a permanent tag `archive/<old-branch-name>`, so any can be restored in a minute.
3. Move the 1,596 run evidence files to the Drive folder that already holds this project's outputs, and add them to `.gitignore`. Approved.
4. The 3D world's permanent address is `/world`, a top level surface of its own, with `/display/world-preview` kept as a redirect so existing links keep working. Approved.
5. Split the oversized files while we are in here. Approved 2026-09-22 in answer to Anthony's question about splitting sections and scenes. Scope is fixed in Section 7, which lists exactly which files and why. The eleven TV scenes are already one file each and are not re-split.

## Proposed branch naming scheme

| Kind | Name | Example |
| --- | --- | --- |
| Production | `main` | `main` |
| Active work | `feat/<area>-<subject>` | `feat/world-live-data` |
| Fix | `fix/<area>-<subject>` | `fix/world-ci-readiness` |
| Retired work | tag only, no branch | `archive/codex/tv15-full-preview` |

Areas are `app` (campaign and form), `tv` (the 2D TV view), `world` (the 3D world), `admin`, and `infra`.

Target after this plan: `main` plus at most four live branches.

## Models, effort, agents, review

Anthony's routing ruling, 2026-09-22: "Use Opus xhigh for the entire plan. flash when applicable. Fable can be an advisor since its at 97%." That overrides the Codex lane this plan was first drafted with, and it is logged rather than re-argued.

| Role | Model and effort | Notes |
| --- | --- | --- |
| Writer, every section | Claude Opus 5, xhigh | One fresh chat per section, Steps mode. |
| Mechanical rows | Gemini 3.8 Flash, medium | Branch inventory tables, evidence hashing, link sweeps, bulk listing. Anything that is counting or copying, not judging. |
| Advisor | Fable 5.1 | Consulted for a routing or sequencing question only. It authors nothing, because its weekly pool is at 97 percent utilization. |
| Hygiene sweep | Haiku 4.5, low | Before each section's review: dead links, missing files, Build log and trailer format. |
| Landing review | Sonnet 5, high, read only | One round per section, findings corrected before the section closes. |
| Completion review | Fresh non author Claude Opus 5, xhigh, read only | The whole diff before the merge, carrying Plan 24's P7 privacy and behavior list. |
| Decisions and hands | Anthony | The Vercel production branch setting, the TV check, the merge click. |

Mode: Steps. One fresh chat per section, in order, each starting from the plan and its Build log.

Pool facts at drafting, read live from the usage dashboard at 2026-09-23T01:22Z: Claude 5 hour 4 percent, Claude weekly 88 percent resetting today at 10:59 PM, Fable weekly 97 percent, Gemini weekly 78 percent, Codex primary 96 percent. Opus xhigh across eight sections may run the Claude weekly pool out before the reset. If that happens, the section in flight finishes and the next one waits for 10:59 PM rather than silently downgrading.

Spill order if the Claude pool is exhausted mid plan: Gemini 3.8 Flash for mechanical sections, then wait for the reset for the code sections. Never Fable as a writer while it sits at 97 percent.

## Sections

### Section 0: Safety net (Opus 5 xhigh, 20 minutes)

Before anything is renamed or deleted. Fetch and prune. Push a tag `archive/<branch-name>` for every local and remote branch that is not one of the five keepers. Write the complete inventory (branch, tag, SHA, ahead and behind counts) to the run record. Confirm every tag exists on GitHub. Nothing is deleted in this section.

Acceptance: a tag on GitHub for every branch that will later be removed, and the inventory file listing all of them.

### Section 1: Rename and reduce the branches (Opus 5 xhigh, 45 minutes)

Rename the keepers to the scheme. Delete the archived branches locally and on GitHub. Update the open pull requests to the new names. If Anthony approved the `main` rename, do that one last, and stop before the Vercel production branch setting, which he changes himself.

Keepers, with proposed new names:

| Old | New |
| --- | --- |
| `codex/mothers-love` | `main` (if approved) |
| `feature/world-cinematic-art-pass` | `feat/world-cinematic` |
| `feature/tv-3d-world-prototype-01` | folded into `feat/world-cinematic`, then archived |
| `codex/tv-pearl-design-study` | `feat/tv-pearl-design` |
| `codex/tv-pearl-sequence` | `feat/tv-pearl-sequence` |

Acceptance: `git branch -a` shows at most six branches, every removed name resolves as a tag, and no open pull request points at a missing branch.

### Section 2: Fix the main working copy (Opus 5 xhigh, 30 minutes)

Move `/Users/anthony/Projects/mothers-love` onto the production branch. Copy the 1,596 untracked evidence files to the project's Drive folder with SHA-256 receipts before removing them. Add the evidence paths to `.gitignore`. Leave the checkout clean.

Acceptance: `git status` in the main checkout reports a clean tree on the production branch, and the Drive copy is verified by hash.

### Section 3: One documentation set (Opus 5 xhigh, 40 minutes)

Bring `PLAN-14` and `PLAN-19` through `PLAN-26` onto the production branch so every plan lives in one place. Rewrite `docs/HANDOFF.md` as one current page with the history moved to `docs/HISTORY.md`, because the handoff is now 40 screens of stacked releases. Refresh `README.md` quick links, `USER-MANUAL.md`, `AGENTS.md`, and the project's line in `/Users/anthony/Projects/README.md`.

Acceptance: every plan number from 01 to 26 present once on the production branch, and the handoff opens with the current state in the first paragraph.

### Section 4: Worktrees (Opus 5 xhigh, 20 minutes)

Remove the worktrees whose branches were archived. Move the two copies under `/Users/anthony/Documents/Codex/...` into `/Users/anthony/Projects/mothers-love-worktrees/` or remove them once their commits are tagged. Delete `_saved-evidence`, `backup`, and `remove-old-copies.sh` from the worktrees folder after confirming their contents are already in Git or Drive. Run `git worktree prune`.

Acceptance: one worktree per live branch, no copies outside `~/Projects`, and the recovered disk space recorded.

### Section 5: The 3D world as its own surface (Opus 5 xhigh, about 2 hours)

This replaces Plan 25's gates G1 and G5 and keeps its G2, G3 and G4.

- Move the world to `/world`, its own top level surface, with `/display/world-preview` redirecting there so existing links keep working.
- Make the design look the default for both live and sample sources, keep `art=classic` and `art=cinematic` as explicit fallbacks, and remove the sample expression override from every live path.
- Picture quality defaults to Auto, with High and Low still selectable in Settings.
- `/display` and its eleven 2D screens are untouched. The world is reached by its own URL, and it does not enter the TV playlist.
- Add a quiet link from the admin display page so the operator can find the world without typing a URL.
- Privacy: the world reads only the existing public TV projection endpoint, no new fields, no submitted names. Every privacy state clears every pearl immediately.
- Merge the 16 production commits the world branch is missing, then rebase the branch so PR #8 targets the production branch directly.

Acceptance: typecheck, unit tests, build, the world harness in stills and tour modes, the pearl text parity check, the world safety tests, and a live mode browser run against a preview deployment that asserts attributes only and stores no screenshots of real records.

### Section 6: Retire the dead code (Opus 5 xhigh, 45 minutes)

Remove `src/app/display-legacy` and `src/app/display-v6` and anything only they use, after confirming nothing links to them. Fix the Linux CI readiness failure that Plan 24 recorded as P0. Run the full suite.

Acceptance: CI green on the fixed head, no route removed that anything still references, and the live TV unchanged.

### Section 7: Split the oversized files (Opus 5 xhigh, about 2 hours)

The eleven TV scenes are already split, one file each under `public/color-polish/scenes/` with a shared `core/`, from the Plan 13 refactor. That structure is the target shape and it is not touched. Five files never got the same treatment:

| File | Lines | Split into |
| --- | --- | --- |
| `src/components/display/world/prototype/design-world.ts` | 773 | One module per world location, matching how the TV scenes are laid out |
| `src/components/display/world/WorldExperience.tsx` | 789 | The React shell, the settings panel and the reading overlay |
| `src/components/display/world/world-engine.ts` | 744 | Scene construction, the frame loop and disposal |
| `src/components/display/world/world-districts.ts` | 633 | One module per district, sharing a single district type |
| `src/lib/display/coordinator.ts` | 935 | Polling, snapshot bridging and rotation |

Also rename the world's `prototype/` folder, which holds 17 files and is no longer a prototype, to `art/`, so the folder name matches what it is.

Rules: this section moves code, it does not change behavior. No rendering, timing, privacy or public contract change. Every split is a move plus imports, reviewed as such.

Acceptance: no source file over roughly 400 lines in the world or coordinator, typecheck, unit tests, build and the world harness all pass unchanged, and the captures stay byte-identical to the ones taken before the split.

### Section 8: Verify, review, back up, report (Opus 5 xhigh, 1 hour)

Completion review by a fresh non author Opus 5 over the whole diff, carrying Plan 24's P7 privacy and behavior list. Correct findings. Stage the pull request for Anthony to merge. After the merge, verify the live campaign page, `/display`, the new world surface, and admin sign in. Push everything privately, record the production deployment ID and the rollback deployment, and update the Projects index.

## Interfaces and acceptance

No database, API, authentication, catalog, or public contract change. No new public fields. Submitted names stay private. The live campaign page and the eleven 2D TV screens behave exactly as they do today, and switching the TV back is never needed because the TV is never switched.

Completion requires: the branch inventory tagged, the branch list reduced, the main checkout clean, one documentation set, one worktree per live branch, the world reachable at its own address with live data, the dead routes gone, the oversized files split, CI green, the completion review passed with findings corrected, the pull request merged by Anthony, production verified, and the rollback deployment recorded.

## Rollback

Every removed branch is a tag, so any of them is restored with one command. The application change is one pull request, so production rolls back with one click on the previous Vercel deployment. The TV view is never touched, so it cannot regress.

## What Anthony must do

1. Approve this plan.
2. Change the Vercel production branch setting after Section 1 renames the branch to `main`.
3. The 10 minute check of the world on the real TV, and tell us the TV make and browser.
4. Click Merge on the pull request.

## Build log

- 2026-09-22: Drafted by Claude Opus 5 after a full read only survey of 125 local branches, 110 remote branches, 8 worktrees and 12.6 GB of working copies. Not yet approved. No branch, tag, worktree, file or deployment was changed.
- 2026-09-22: Anthony answered all four decisions (rename to `main`, archive then delete, evidence to Drive, `/world`) and asked whether to split sections and scenes. Section 7 added after checking the source: the TV scenes are already one file each, five other files are oversized. Still no branch, tag, worktree, file or deployment changed.
- 2026-09-22: Anthony approved the plan, chose Steps mode, kept `coordinator.ts` in the Section 7 split, and ruled the routing: Opus 5 xhigh for every section, Gemini 3.8 Flash for mechanical rows, Fable as advisor only at 97 percent utilization. Plan id `2026-09-22-repo-refactor`. Section 0 handed to a fresh chat.
- 2026-09-23: **Section 0 complete** (Claude Opus 5, xhigh). Fetched and pruned, then pushed 133 annotated `archive/<branch-name>` tags to GitHub, one for every distinct non keeper branch name plus `archive/detached-world-bubbles` for the detached commit `bb03f79`. All 133 verified present on GitHub, annotated, and pointing at the recorded commits; every archived branch tip, local and remote, is reachable from its tag. Inventory written to [docs/runs/2026-09-22-repo-refactor/research/branch-inventory.md](runs/2026-09-22-repo-refactor/research/branch-inventory.md) and `.json`. Nothing deleted, renamed, merged or deployed; production unmoved at `1b4c31a`; 0 modified tracked files in the main checkout and all 8 worktrees.
- 2026-09-23: Section 0 corrected three numbers in this plan's survey table by reading the repository live. The true counts are **128 local branches** (not 125) and **102 remote branches** (not 110; there are 103 refs under `refs/remotes/origin`, one of which is the `origin/HEAD` symref). Worktrees, 8, and modified tracked files, 0, were confirmed correct. The keeper ahead and behind figures in the plan's branch table all matched.
- 2026-09-23: Three facts Section 1 must act on, found while building the inventory. (1) The **local `codex/mothers-love` is stale at `554234a`, 24 commits behind production**, though it is a strict ancestor so nothing is lost; fast forward it to origin before renaming it to `main`, or the rename carries production backwards. (2) **Open PRs #4 and #1 are headed by branches slated for deletion** (`codex/mothers-love-promo-commercial`, `codex/mothers-love-color-polish`); deleting either head closes its pull request automatically, so close them deliberately. PR #8's two branches are both keepers. (3) `tv17/fit` had diverged, local `0ec1bbf` 2 ahead of remote `71bf3f8`; the tag points at the local tip and both stay recoverable.
- 2026-09-23: The Section 0 record was committed to `codex/color-polish-v6`, the branch the main checkout sits on, so `archive/codex/color-polish-v6` points at `e5ffa3a`, the tip before that commit, and does not contain these documents. A second tag, `record/2026-09-22-repo-refactor-section-0`, was pushed at the record commit. Section 1 must run `git rev-parse record/2026-09-22-repo-refactor-section-0` and confirm it resolves before deleting anything, rather than assuming it, and must then re-cut `archive/codex/color-polish-v6` at the current tip or let Section 3 move these documents to production first.
- 2026-09-23: Section 0 landing review by Sonnet 5 (high, read only), after a Haiku 4.5 low hygiene sweep that passed all six checks. Verdict: pass with findings, two findings, both accepted and corrected in the same commit. (1) The record tag was described as an accomplished fact while the record was still uncommitted; the wording now tells Section 1 to verify the tag rather than assume it, and the tag is pushed as part of closing this section. (2) The inventory totals stated 137 distinct branch names beside 138 rows without saying why; the totals now carry the row count and a note that the extra row is the detached commit, which is not a branch. The reviewer independently reproduced the 133 tags, the 220 non keeper refs all reachable from their tags, the 128 and 102 branch counts, production at `1b4c31a`, and all four findings.
