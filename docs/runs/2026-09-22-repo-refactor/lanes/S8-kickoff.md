Implement Plan 28: Clean up and refactor the Mother's Love repository, Section 8: Verify, review, back up, report, at /Users/anthony/Projects/mothers-love-worktrees/world-surface/docs/PLAN-28-repository-refactor.md

Written 2026-09-24 by the Claude chat that closed Section 7. It lives on `feat/world-surface`, the branch of draft pull request #19, because Section 7's record and the world files exist only there until #19 merges.

Read first, in this order:
1. /Users/anthony/Projects/mothers-love-worktrees/world-surface/docs/PLAN-28-repository-refactor.md, Section 8, the Models table and the Build log (Section 7's three entries are the newest)
2. /Users/anthony/Projects/mothers-love-worktrees/world-surface/docs/runs/2026-09-22-repo-refactor/INDEX.md, then lanes/S5.md and lanes/S7.md (Result, Limitations, Review)
3. /Users/anthony/Projects/mothers-love-worktrees/world-surface/docs/HANDOFF.md and the "3D world at /world" section of /Users/anthony/Projects/mothers-love-worktrees/world-surface/AGENTS.md

Setup line: Model claude-opus-5-5, effort xhigh (Anthony's ruling for this plan). Fallback Gemini 3.8 Flash for mechanical rows only. Lane Claude. Agents: the plan's completion reviewer only. Review: completion review by a fresh non-author Claude Opus 5.5, xhigh, read only, over the whole diff, carrying Plan 24's P7 privacy and behavior list, preceded by a Haiku 4.5 low hygiene sweep. Set your effort to xhigh before you begin.

## Gate

Stop and report instead of working if any of these fails:

- The Build log shows Section 7 complete ("Section 7 review" entry), and pull request #19 is still an open draft. If #19 has merged, skip to the post merge steps and say so in the record.
- `git -C /Users/anthony/Projects/mothers-love-worktrees/world-surface status -sb` is clean and level with `origin/feat/world-surface`.
- No other chat is writing in that worktree. The build lock `/Users/anthony/Projects/mothers-love-worktrees/.build-lock` is free (Section 7 released it); take it for builds and harness runs.

## What Section 8 does, from the plan

1. **Completion review.** A fresh non-author Opus 5.5 at xhigh, read only, reviews the whole diff of #19 against `origin/main` (`git diff origin/main...origin/feat/world-surface`), carrying Plan 24's P7 privacy and behavior list (read it in /Users/anthony/Projects/mothers-love-worktrees/world-surface/docs/PLAN-24-world-visual-quality.md). The writer of this section does not grade its own work. Correct accepted findings, rerun the affected checks, and retry the reviewer as the policy's correction loop says.
2. **Section 6's review.** The run index still shows Section 6's own landing review as unrecorded. Its diff (pull requests #16 and #17) is inside #19 or already on `main`; the completion review covers it, and the record says so.
3. **Stage the pull request for Anthony.** #19 stays a draft until the completion review passes; then mark it ready. Anthony does his 10 minute TV check of `/world` on the real TV (he tells you the TV make and browser) and clicks Merge himself. A merge into `main` is a production deployment. The auto mode classifier refuses production merges even after Anthony's yes, so never try: stage it and wait.
4. **After the merge.** Verify the live campaign page https://mothers-love.vercel.app, `/display`, `/world` and the admin sign in page answer and behave; record the production deployment id and the rollback deployment (`dpl_4p5m81obUvSGbiwJK9zHTfu6A4zj`, production before #19); push everything privately; update the project's line in /Users/anthony/Projects/README.md.

## Execution envelope

- Project / unit: Plan 28: Clean up and refactor the Mother's Love repository, Section 8: Verify, review, back up, report (Opus 5.5 xhigh, about 1 hour of work plus Anthony's TV check)
- Lane: Claude, in /Users/anthony/Projects/mothers-love-worktrees/world-surface on `feat/world-surface` (one writer)
- Read first: the three files above
- In scope: the completion review and its corrections on `feat/world-surface`; marking #19 ready; the post merge checks; the record, Build log, handoff, run index and Projects index updates; evidence in Drive.
- Protected / out of scope: never push to or merge `main` (Anthony merges); `/display` and its eleven screens (proven unchanged by source in Sections 5 and 7); `feat/world-cinematic`, `lane/painted-world/web`, `world-kit/*` and every worktree under /Users/anthony/Projects/mothers-love-world/; no database, API, credential or Vercel setting work; no real recognition data in any file, screenshot or log (live checks assert attributes only).
- Acceptance (the plan's completion list): the completion review passed with findings corrected, CI green on the final head, the pull request merged by Anthony, production verified, the rollback deployment recorded, everything pushed, and the Projects index updated.
- Verify: `npm run typecheck`, `npx vitest run` (71 files, 887 tests at `d1a4fda`), `npm run build`, `npx eslint src` (16 errors and 3 warnings in the four known TV files, no more), the harness `DESIGN_REVIEW_CHANNEL=chrome node scripts/review-world-design.mjs` in stills, parity and tour modes against a production build on port 32743 (compare stills and parity with Drive `3D World/previews/plan28-s7-checks/5ab3e8a/after/` and `plan28-s5-checks/3149d39/` using `node scripts/review/png-compare.mjs`), and after the merge `curl` the live pages plus a live attributes only run (`scripts/review/world-live-check.mjs`). Use `npm_config_cache=/tmp/npm-cache`.
- Completion output: Build log entries, the record, changed files, verification evidence, commit and push status, limitations, the production and rollback deployment ids.
- Record file: docs/runs/2026-09-22-repo-refactor/lanes/S8.md (a template exists; replace it)
- Board: not required (Steps mode)
- Critique: none; the completion reviewer is the plan's declared attacker for this section

## Facts from Section 7 the reviewer needs

- Section 7 split sixteen files as pure moves. `scripts/review/move-check.mjs` proves each: 13,623 of 13,677 code lines verbatim, the rest reshaped signatures and braces. Long class methods of `WorldEngine`, `WorldRecognitionBubbles` and `StudyPearlSkin` became functions typed `this: TheClass` with forwarders, and the members they read lost `private` (type level only, 175 modifiers). The world page's state is `useWorldExperience`; its panels are render functions called in place.
- The capture harness has run to run noise: pixel row 995 at channel value 1 in one to three stills, and a few channel value 1 pixels in `design-welcome`. Section 7's first after run matched Section 5's captures byte for byte in every still.
- `/display` sample captures are not pixel stable run to run (S5.md); prove the TV unchanged by source first.
- The app's preview tool can stop the `next start` server between turns. The launch entry `mothers-love-world-surface` in /Users/anthony/Projects/.claude/launch.json starts it on port 32743; check it answers before each harness run.

## Traps

- This session's worktree isolation refuses compound shell commands that mention git; run plain, single git commands with `git -C <absolute path>`.
- After a route change, `npx tsc --noEmit` can fail on stale `.next/types`; delete that folder and rerun.
- The auto mode classifier refuses deleting GitHub branches and pushing or merging to a live branch even after Anthony's yes; write any such command into a script under this run tree and give Anthony a one click Run block.
- Timestamps come from `date -u` in the same command that writes them. No em or en dash in anything written.
- When you start a new chat for Anthony, turn on Remote Control.
