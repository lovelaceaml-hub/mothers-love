Implement Plan 28: Clean up and refactor the Mother's Love repository, Section 5: The 3D world as its own surface, at $HOME/Projects/mothers-love/docs/PLAN-28-repository-refactor.md

Written 2026-09-24T16:05Z by the Claude chat that closed the Mac follow ups (tidy script, Gate F, Section 4 pull). Anthony said "1" (start Section 5 now) to that chat. This file is untracked in the main checkout; commit it on this section's branch, not on `main`.

Read first, in this order:
1. $HOME/Projects/mothers-love/docs/PLAN-28-repository-refactor.md, including its Build log (Sections 0 to 4 and 6 are recorded; Section 4 merged as pull request #18)
2. $HOME/Projects/mothers-love/docs/runs/2026-09-22-repo-refactor/INDEX.md
3. $HOME/Projects/mothers-love/docs/HANDOFF.md
4. $HOME/Projects/mothers-love/docs/runs/2026-09-22-repo-refactor/lanes/S4.md (Result, Limitations, Review) and $HOME/Projects/mothers-love/docs/runs/2026-09-22-repo-refactor/lanes/S6.md
5. $HOME/Projects/mothers-love-world/docs/PLAN-01-painted-world-and-hosts.md, Section 5 steps 0 and 11 (lines about 499 to 590) and its Build log

Setup line, verbatim: Model claude-opus-5-5, effort xhigh (Anthony's choice, recorded in S4.md). Fallback Gemini 3.8 Flash for mechanical rows only (listing, hashing, link sweeps). Lane Claude. Agents: no. Review: Sonnet 5 high read only landing review, preceded by a Haiku 4.5 low hygiene sweep. The completion review over the whole plan belongs to Section 8, not here. Set your effort to xhigh before you begin.

## Gate

Stop and report instead of working if any of these fails:

- The Build log shows Section 4 complete, and `git -C $HOME/Projects/mothers-love status -sb` shows `main` clean (apart from this file) and level with `origin/main` (`bd8781d` at writing).
- `curl -s -o /dev/null -w '%{http_code}' https://mothers-love.vercel.app/` and `/display` both answer 200.

## Facts that changed after the plan's Section 5 text was written

- **PR #12 and PR #10 are both merged** (2026-09-24, at Anthony's request). The plan's "retarget PR #10 to `main`" no longer applies: #10 merged `feat/world-cinematic` into `feat/world-base`. Live positions at writing: `origin/feat/world-cinematic` `07261d0` (includes #12 and the P0 CI fix #16) is 2 commits ahead of `origin/feat/world-base` `0214b05`. Neither is in `main`. The local `feat/world-base` is 101 behind its origin; Section 4 left fast forwarding it to you.
- **The 3D Studio kit (Plan 29) is integrated.** `world-kit/int` is contained in `origin/feat/world-cinematic`; the `world-kit/*` branches exist only locally (none on GitHub) and last moved 2026-09-23. Anthony ruled on 2026-09-24 that Plan 28 leads the world. Leave every `world-kit/*` branch alone; if you find a kit chat still writing on `feat/world-cinematic`, ask Anthony one question before touching that branch.
- **PLAN-01 Section 5 steps 0 and 11 must pass before the world reaches `main`.** Step 0 (baselines) was meant to run before #12 changed anything, and #12 already merged, so capture the `?art=classic` / `?art=cinematic` baselines at the pre-#12 world commit (the Build log names `9a75c38`; confirm it) as well as the current head, plus `/display` in sample mode, to Drive `3D World/previews/baselines/<commit>/` with `SHA256SUMS`. The project's Drive folder moved to `$HOME/Library/CloudStorage/GoogleDrive-lovelace.aml@gmail.com/My Drive/Projects/Mother's Love/The Words of Mother's Love/` (S4.md Limitation 3); confirm it before writing. Step 11 is the safety check list there.
- Gate F passed at 15:51Z: the lambs are in 3D Studio `main` `6aa8c98`. PLAN-01 Section 5 step 8 (hosts in the world) can use them, but that is PLAN-01's work, not this section's.

## Execution envelope

- Project / unit: Plan 28: Clean up and refactor the Mother's Love repository, Section 5: The 3D world as its own surface (Opus 5.5 xhigh, about 2 hours)
- Lane: Claude
- Read first: the five files above
- In scope:
  - A new branch `feat/world-surface` cut from `origin/feat/world-cinematic`, in a new worktree at `$HOME/Projects/mothers-love-worktrees/world-surface`. Merge `origin/main` into it (the 16 or more production commits the world lacks).
  - Everything in the plan's Section 5 bullets: `/world` as its own top level surface; `/display/world-preview` redirects to it; design look the default for live and sample, `art=classic` and `art=cinematic` kept as fallbacks, sample expression override removed from every live path; picture quality defaults to Auto with High and Low selectable; a quiet link from the admin display page; #12's `?view=tv` layout becomes the `/world` default unless Anthony says otherwise.
  - The document alignment in the plan's last Section 5 bullet: delete the branch's `docs/PLAN-25-world-promotion.md`, bring `docs/PLAN-26-world-kit.md` over as `docs/PLAN-29-world-kit.md`, keep `main`'s wording of `PLAN-24` and `D2-FABLE-PASS.md`.
  - PLAN-01 Section 5 steps 0 and 11 on this Mac (Chrome channel, Drive baselines).
  - One pull request `feat/world-surface` into `main`, staged for Anthony to merge. Record the Vercel preview URL.
- Protected / out of scope:
  - **Never push `main` and never merge into `main`.** A push to `main` is a production deployment; Anthony clicks Merge. Never run a bare `git push` in the main checkout.
  - `/display` and its eleven screens, `src/components/display/color-polish/`, and `public/color-polish/` are untouched. The world never enters the TV playlist.
  - Do not commit to or move `feat/world-cinematic`, `lane/painted-world/web`, or any `world-kit/*` branch; do not edit any worktree under `$HOME/Projects/mothers-love-world/`.
  - No database, API, auth, catalog or public contract change. The world reads only the existing public TV projection endpoint: no new fields, no submitted names. Every privacy state clears every pearl immediately.
  - No real recognition data in Git, fixtures, screenshots or logs. The live mode browser run asserts attributes only and stores no screenshots of real records.
  - Section 7's file splits and the `prototype/` to `art/` rename wait for Section 7.
  - No Vercel setting, deploy trigger or credential work. `.env.local` never goes into Git.
- Acceptance (plan Section 5): typecheck, unit tests (`npx vitest run`, the whole suite), build, the world harness in stills and tour modes, the pearl text parity check, the world safety tests, PLAN-01 step 11's checks (`?art=classic` byte identical to the baselines, `/display` sample captures pixel identical before and after), and a live mode browser run against the preview deployment. `/world` loads on the preview, `/display/world-preview` redirects to it, `/display` is unchanged.
- Verify: `npm run typecheck`, `npx vitest run`, `npm run build`, the world review harness (`DESIGN_REVIEW_CHANNEL=chrome`), `npx eslint src` (16 errors already exist on `main` in four display files; add none), `curl` the preview's `/world`, `/display/world-preview` and `/display`. Use `npm_config_cache=/tmp/npm-cache`. Take the build lock `$HOME/Projects/mothers-love-worktrees/.build-lock` for builds and harness runs.
- Completion output: Build log facts appended to the plan, changed files, verification evidence, the pull request link and preview URL, commit and push status of `feat/world-surface`, limitations, and the Section 6 or Section 7 handoff (Section 6 is recorded in the Build log; confirm its #16 CI state).
- Record file: docs/runs/2026-09-22-repo-refactor/lanes/S5.md
- Board: not required, Steps mode
- Critique: none, Steps mode section with a landing review

## Traps

- The auto mode classifier refuses deleting GitHub branches and pushing to a live branch even after Anthony's yes. If a step is refused, write the exact command into a script under this run tree and give Anthony a one click Run block; never work around the refusal.
- Timestamps come from `date -u` in the same command that writes them.
- No em or en dash in anything written.
- When you start a new chat for Anthony, turn on Remote Control.
