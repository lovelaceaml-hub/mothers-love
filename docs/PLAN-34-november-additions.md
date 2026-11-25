# Plan 34: November additions

Anthony's request, 2026-11-11, after reading the suggestions of [Plan 33](PLAN-33-polish-and-speed.md): "Retire the 3d world for now. Do everything else". He then chose: the 3D world is hidden and kept ("Hide it, keep it"), one complete browser test run in the cloud is approved ("Yes, one full run"), and the work goes ahead without check-ins ("Go ahead on your own").

Branch `feat/app-november-additions`, pull request [#54](https://github.com/lovelaceaml-hub/mothers-love/pull/54) into `main`. **Released 2026-11-11** (Pacific): Anthony approved the merge in his words, "I approve you to merge." Database migration 021 was applied 2026-11-12 01:09 UTC (2026-11-11, 5:09 PM Pacific) at Anthony's word ("Yes, apply 021").

## Sections

### Section A: the 3D world is retired for now

- `/world` and the old `/display/world-preview` address open the home page. The admin Display page no longer links to the world.
- One switch does it: `src/lib/world-retired.ts`. Set `WORLD_RETIRED` to `false` and the page, the link and the world's browser journeys all come back. Nothing else was removed: the world's code, art, kit files and unit tests stay exactly as they were.
- The world's browser journeys (`tests/world/world-preview.spec.ts`) wait while the switch is on; `tests/world/world-retired.spec.ts` checks the three addresses open the home page.
- The planning projects for the world's art and film (`$HOME/Projects/mothers-love-world`, and the world parts of `$HOME/Projects/3d-studio`) are marked paused in the projects index. Their files are untouched. The healing concert work in 3d-studio is a different project and is not paused.
- The earlier suggestion to make the world's refresh lighter is dropped with it.

### Section B: a half-written recognition is kept

- The form keeps what a person is writing (both names, the message, the chosen expressions) in that browser tab, so a phone call, a switch to another app or a reload no longer loses it. On return a note says "Your unfinished recognition is still here." with a "Start over" button.
- It never leaves the device. It lives in the tab's session storage: it survives a reload of the same tab and is gone when the tab closes, so the next person to open the form on a shared device never sees it. It is removed when the recognition is sent or the person starts over, and ignored once it is a day old.
- Why the tab and not the whole browser: the submitted name is admin only. A copy that outlived the tab could show one person's name and words to the next person on a shared phone or tablet.
- A send whose answer never arrived comes back as "not confirmed" with the same duplicate guard, so a retry after a reload cannot publish it twice. Editing it first makes a new guard, as before.
- Files: `src/lib/recognition-draft.ts`, `src/components/submission/SubmissionForm.tsx`. Tests: `tests/submission/recognition-draft.test.ts`, `tests/submission/draft.spec.ts`.

### Section C: recognitions show sooner

- The home page's HTML now starts the list's first read while the page's code is still downloading, and the form's HTML does the same for "is sharing open". The page then takes that answer for its first read instead of asking again.
- Nothing about the data changes: the answer goes through the same checks, its age counts from when the read really started, and a missing, late (over 20 seconds) or failed early answer falls back to the normal read.
- An early read that hangs gets only what is left of the usual 8 second deadline, counted from its real start, and then the page shows its normal "Unable to load" state with Try again.
- Left out on purpose: sending the hearts together with the list. Hearts are per browser (the server answers whether this browser liked each one), and their loading has its own safeguards (never flash, roll back on failure, recover from throttling). Folding them into the shared list would make the list different for every browser and switch off the "nothing changed" shortcut of Plan 33. The hearts still load right after the list.
- Files: `src/lib/early-read.ts`, `src/app/page.tsx`, `src/app/recognize/page.tsx`, `src/components/feed/PublicFeedProvider.tsx`. Tests: `tests/foundation/early-read.test.ts`; the existing feed journeys count reads and still expect exactly one.

### Section D: the heart button's spoken name

- A screen reader now hears "Like recognition for (name), 12 likes". The visible number is part of the button's name, which the newer accessibility checker asks for, so the count is no longer a separate description. The paused and "enable cookies" states carry the count the same way.
- `@axe-core/playwright` stays at 4.11.0. Version 4.14 was tried in this plan: with the heart button fixed it still flags the nine expression buttons on the form, whose spoken name ("Select expression 02: ...") does not contain everything the card shows. Changing that name changes approved wording Anthony has not ruled on, so the checker stays where it was (see Open decisions).
- What people see does not change.

### Section E: an administrator sees every detail (Plan 18 Section C)

- The admin detail page shows the like count, when the recognition last changed, its version, and a History card: the admin actions on record for it, newest first, with the reason and who did it by role ("the Owner", "a Moderator"). The admin list has a Likes column.
- `database/021_admin_all_details.sql` replaces only `mothers_love.ml_admin_recognition`, the projection behind the admin list, detail and action replies. It adds `updatedAt`, `heartCount` and `audit`. No table, grant, signature, public projection, expiry rule or health check changes, and no administrator identifier is ever projected. Its rollback is the original definition, quoted in its header.
- The screens work before the migration is applied: likes read "Not available yet" and the History card says the migration is needed.
- Already true before this plan, so nothing to build: the list shows every status (published, held, hidden, invalid), with search over names and messages and a date filter. The archive table is empty and nothing has been archived since recognitions became permanent, so there are no "formerly archived" rows to show.
- Limits to know: the audit table keeps 30 days, so older actions are not listed. Keeping them longer is a separate decision.
- Proven on a throwaway PostgreSQL 16 on the Mac (never the live database): migrations 001 to 021 apply in order; `tests/backend/021_admin_all_details_fixture.sql` passes; a second apply is refused; the rollback restores the old definition and 021 applies again.
- Tests: `tests/backend/migration-021.test.ts`, `tests/admin/admin-details.test.ts`, `tests/admin/recognition-details.spec.ts`.

### Section F: a practice database for previews

- `scripts/practice-database.sh` builds a practice database from the project's own migrations and fills it with made-up records from `database/practice/seed.sql`: 60 recognitions (54 published, 3 held, 2 hidden, 1 invalid) with generated names, 597 hearts, expression choices and daily totals. Every name and message is fictional.
- Safety: it refuses the production project, refuses any database that holds the campaign without the practice marker, never reads `DATABASE_URL`, and takes its address from the environment only.
- `next.config.ts`: a preview that has its own database no longer borrows production's TV reads or sends hearts to production.
- Proven on a throwaway PostgreSQL 16: the build, the rebuild (`--reset`) and each refusal; the feed, the older page, the likes total, the open check and the TV read all answer from the practice data.
- **Not hosted, by Anthony's decision of 2026-11-11: "No practice database."** The builder and the made-up records stay in the repository as a tool (they also prove that every migration applies in order to an empty database), but no practice database exists and none is to be created unless Anthony asks.
- One thing to know: the TV read only answers when the QR address is the campaign's real form, so a practice TV shows a QR code that opens the real form.

### Section G: tests that depend on the time of day

- Since Plan 32 the pages refresh every 10 seconds only on Saturday 9:00 to 22:00 and Tuesday 18:00 to 22:00 Pacific. Journeys that wait for a refresh on the real clock fail at other hours.
- Anthony approved one complete browser suite run in GitHub Actions to find them all (run [43120610415](https://github.com/lovelaceaml-hub/mothers-love/actions/runs/43120610415), on a Wednesday afternoon, outside the fast hours). Its results and the fixes are in the Build log.
- `.github/workflows/checks.yml` gains `full_suite_scope` (unit, browser or both), so an approval that names one suite runs only that suite.
- What the run showed (commit `7f1c88f`, which is `main` plus that workflow input; 508 journeys ran: 310 passed, 198 failed, 7 passed on a retry):

  | Cause | Journeys | What was done |
  | --- | --- | --- |
  | The cloud tests had no stand-in sign-in settings, so every admin and Studio journey stopped at the sign-in page | 87 | Fixed: `checks.yml` now gives the browser steps `NEXT_PUBLIC_SUPABASE_URL` and its key as stand-in values the journeys mock. After the fix all of `tests/admin/admin.spec.ts` passes in the cloud |
  | The old Bubble Board journeys (`tests/display/display.e2e.spec.ts`), known debt in the handoff | 26 | Left alone |
  | `tests/color-polish/color-polish.spec.ts` expects two extra local servers on ports 3102 and 3103 | 26 | Left alone; it was written for a local review, not for the cloud |
  | The 3D world (`tests/world/world-preview.spec.ts`) | 13 | Moot while the world is retired; the journeys wait behind the switch |
  | TV scene journeys that time out or miss a state in the cloud (`interview/integration-browser`, `peace-in-practice`, `usable`, `arrival`, `plan08`, `background-song-tap` and others) | about 36 | Not investigated one by one. Some of these may also depend on the hour, because the TV follows the same Pacific schedule |
  | Real time-of-day journeys on the home page | 4 | Fixed with a fixed Saturday morning clock: `feed/home-design` (polling), `feed/older-recognitions` (two), `receipt-feed` (heart during a refresh) |
  | A record whose fixed expiry date (2026-09-15) has passed | 2 | Fixed: the admin fixture's date |
  | Journeys that needed a server address setting to open a second page | 1 (2 places) | Fixed with the default address |
  | A styling journey still expecting the plain expression card of the earlier design | 1 | Fixed to the approved look's colors |

- So the answer to "why does the complete suite fail" is mostly setup, not the hour: nearly half the failures were the missing sign-in settings. With those fixed, the true list of remaining failures is not known. Finding it needs one more complete run, which needs Anthony's approval again (Open decisions).

### Section H: housekeeping

- GitHub: 22 branches already merged into `main` became `archive/<branch>` tags and were retired (the project rule). Each tag was confirmed on GitHub at the branch's last commit before its branch was removed. 11 merged local branches were removed with `git branch -d`.
- Left alone: `feat/world-cinematic` (merged, but checked out by the world project's working copy), and the unmerged branches `codex/explicit-full-suite-approval-2026-10-17` (pull request #41), `feat/world-surface`, `fix/infra-cpu-polling`, `fix/infra-etag-compatibility-diagnostics`, `fix/world-arrival-batch` and `lovelaceaml-hub-performance-improvements`. Local `world-kit/*` branches were not touched.
- `docs/HARDWARE-CHECKS.md`: the five checks only Anthony can do, with what passes and what evidence to keep.

## Open decisions for Anthony

1. Merge pull request #54: done 2026-11-11.
2. Migration 021: applied 2026-11-12 UTC (Build log).
3. The practice database: decided 2026-11-11, none ("No practice database.").
4. **The five hardware checks** in `docs/HARDWARE-CHECKS.md`.
5. **The expression cards' spoken names.** The newer accessibility checker wants each card's name to contain all its visible text. Say the word and the nine cards get the same treatment as the heart button.
6. **One more complete browser run**, now that the sign-in settings are fixed, to get the true list of what still fails. About 45 minutes in GitHub Actions, no cost.
7. **Two stale lines in `AGENTS.md`** about pull request #30 ("PR #30 is not live"). They were flagged in the 2026-11-03 review and wait for Anthony because agent files stay in review.

## Release

1. Merged 2026-11-11 with Anthony's approval. Vercel deploys `main`; every open TV reloads once by itself.
2. Check, in this order: the home page lists recognitions; `/recognize` shows the form; `/display` shows recognitions; `/world` opens the home page; `/admin/login` loads.
3. Rollback: Vercel, Deployments, the previous production deployment, Promote. This plan applies no database change, so none is needed either way. If migration 021 is applied later and must be undone, run the rollback in its header.

## Build log

- 2026-11-11. Sections A to F and H built on `feat/app-november-additions` in `$HOME/Projects/mothers-love-worktrees/app-november-additions`. Database work was tried only on throwaway PostgreSQL 16 clusters on the Mac, removed afterwards. The complete browser suite run for Section G was started in GitHub Actions by a Haiku helper with Anthony's quoted approval.
- 2026-11-11, cloud checks. The pull request's own run (types, production build, the named unit files and 12 named browser files) went through five rounds. Fixed on the way: a type error in two new journeys; the missing stand-in sign-in settings (above); the early read's deadline, which now counts from its real start so a hung read is not given a second full wait; and four older journeys named in Section G. Tried and withdrawn: the accessibility checker at 4.14, because it also flags the nine expression cards.
- 2026-11-11, result on commit `bdb84a1`: types and the production build pass; the 9 named unit files pass (99 tests); the 12 named browser files pass (92 journeys, 2 skipped: the heart journey parked in Plan 33 and one that skips itself). Over the rounds, these files were verified in the cloud: `submission/draft`, `submission/submission`, `world/world-retired`, `admin/recognition-details`, `admin/admin`, `feed/feed`, `feed/reactions`, `feed/not-modified`, `feed/home-design`, `feed/older-recognitions`, `receipt-feed/receipt-feed`, `mobile-recognition/mobile-recognition` and `interview/submission-experience`.
- 2026-11-11, hosted preview of the branch, read through the Vercel CLI: `/world` and `/world?source=sample` answer 307 to the home page and `/display/world-preview` to `/world`; the home page carries the early list read, `/recognize` the early open check, `/display` neither. The preview has no database, so nothing was sent or liked on a hosted copy.
- Not run: the complete unit suite; a second complete browser suite. Not done: release (Anthony merges #54), migration 021 (Anthony's decision), hosting the practice database (Anthony's decision), the hardware checks.
- 2026-11-11, release. Pull request #54 merged with Anthony's approval at 00:59 UTC on 2026-11-12 (4:59 PM Pacific on the 11th, a Wednesday, outside the TV's service hours). Merge `eb7b5cf853beb0875a40df5de6d5fe16a1defbac`; the live build address reported it within a few minutes. Pages `/`, `/recognize`, `/expressions`, `/privacy`, `/display` and `/admin/login` answered 200; `/world` and `/world?source=sample` answer 307 to the home page. In Chrome on the live site, by counts and attributes only: 100 recognitions, 100 enabled hearts whose names all hold their visible count, exactly one list read, started 0.3 s into the page and taken by the page; on the form one open check, a made-up draft came back after a reload with its note, "Start over" cleared it, and no recognition request was made; `/display` reached the `active` phase.
- 2026-11-12 01:09:55 UTC, migration 021 applied to `cvuwdlmlukepwfffpgdu` at Anthony's word ("Yes, apply 021"), as one transaction with its ledger row `021_admin_all_details` (SHA-256 `5d85ec7ead86e0879ff9f963d8ef9e324bcd8402abcd507e0af98e7ae3b7520e`, the file on `main`). A read-only check just before confirmed the live function was the 001 definition. Read-only check afterwards, shapes and counts only: all 465 recognitions project a numeric `heartCount`; those counts add up to 3,253, the number of heart rows; the public projection's fields are unchanged; collection is healthy; the live pages and the likes total (3,249 on published recognitions) still answer; an admin request without a sign in gets 401. The audit table holds no action on a current recognition, so every History card reads "No admin actions are on record" until the next admin action.
- Found on the way: migration 015 (admin list oldest first) is not applied (no ledger row, and the live `ml_api` lacks its sort), which is why the admin list says so. Applying it is Anthony's decision. The ledger does hold 018 and 020.
- Not checked: the admin screens with a real sign in (hardware check 4).

