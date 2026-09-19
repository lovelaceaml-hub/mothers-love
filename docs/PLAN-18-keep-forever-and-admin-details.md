# Plan 18: keep every recognition, and let admins see all details

Status: APPROVED by Anthony on 2026-09-19, Parallel runner. Nothing in this plan is built yet.

## Goal line

Every recognition is stored indefinitely, stays on the home page and TV, and an admin can see every detail of every submission, without breaking the live TV or people's phones.

## What is true today (2026-09-19)

- Recognitions live in the Supabase project `cvuwdlmlukepwfffpgdu`, schema `mothers_love`, table `recognitions`. The submitter's name is admin only.
- Each row gets `expires_at = created_at + 168 hours`. A cleanup job runs every minute. Since migration 014 it copies an expired row into `mothers_love.recognitions_archive` (with its expressions and heart count) before removing it, so nothing is lost any more.
- Everything public reads "not expired" rows only: the feed, the TV snapshot, hearts, and the admin list. Collection closes itself if an expired row is still in the table two minutes later (`ml_purge_healthy`).
- This reverses the old product rule in AGENTS.md ("All personal copies expire 168 hours after creation", "no permanent personal archives"). Anthony decided this on 2026-09-18 and 2026-09-19. AGENTS.md must be updated in Section A.

## Why this needs a plan and not a quick patch

1. Browser timers misfire past about 24.8 days. The home page sets a timer for each item's expiry (`PublicFeedProvider.tsx`). A far-future expiry date would make that timer fire at once, in a loop, on every open phone. Any fix must keep the expiry that browsers and the TV see within a safe window, or clamp the timer, and must be safe for tabs and TVs still running old code.
2. The TV code (`public-display.ts`, the Color Polish routes, Garden selection) is being rewritten by the Plan 17 lanes right now. This plan must land after, or be coordinated with, the Plan 17 integration lane. One writer per file.
3. "Forever on the TV" is a design question, not only a data one: the TV picks from a pool, and an ever-growing pool changes what people see. Anthony rules on this in Section A.

## Lanes

Runner: coordinator
Mode chosen by Anthony on 2026-09-19: Parallel. Plan approved 2026-09-19. The old Section A (rulings) is complete, see the Build log.
Base for every lane worktree: `origin/codex/mothers-love` (the live branch). Never branch from `codex/color-polish-v6`.
Privacy boundary for every lane: no real recognition data in prompts, fixtures, screenshots or logs; synthetic data only; never seed production. No lane runs SQL against the live database. Live database changes are prepared as files and applied by Anthony through the Supabase SQL editor, or by the coordinator only after Anthony's explicit yes for that exact statement. If the auto mode classifier refuses a call, stop and tell Anthony; never retry it in another form.
Plan 17 coordination (Anthony chose "start now and coordinate"): before Lane 1 edits any TV file, the coordinator reads `/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/INDEX.md`. If a running Plan 17 lane owns that file, Lane 1 leaves it alone, records that, and the integration lane applies the TV part after Plan 17 lands.

### Lane 0: Critic, argue against this plan
Setup: frontier · high · Lane: Codex · Review: none
  Codex: gpt-5.6-sol · high · read-only
Worktree: none, read-only
Depends on: none
Agents: none
Reviewers: none, this lane is the reviewer
Launches alongside Lane 1 and Lane 3 and never blocks them. Accepted findings become revisions to the lanes below before the completion review.

### Lane 1: Never expire, safely
Setup: frontier · xhigh (fallback: balanced · high) · Lane: Codex · Review: controller + independent
  Claude: Opus 5 · xhigh (fallback: Sonnet 5 · high)
  Codex: gpt-5.6-luna · xhigh via codex-dispatch (fallback: gpt-5.6-terra · high)
  Antigravity: Gemini 3.8 Flash (High)
Worktree: /Users/anthony/Projects/mothers-love-worktrees/p18-never-expire on branch `change/p18-never-expire`
Depends on: none
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=Claude Opus 5 · high (real people's data, production database)
Hygiene: Haiku 4.5 · low sweep before review
- Server clamp: the `expiresAt` sent to browsers and the TV is never more than 7 days past server time, recomputed on every response. Old tabs and TVs keep working, and no browser timer can exceed the 24.8 day limit.
- `database/015_never_expire.sql`: new rows get a far-future `expires_at` (change only the interval in the submit function, asserting the old text is present exactly once, the way migration 013 does), existing rows move to the same date, and archived rows are restored into `recognitions` with their expressions. Per-visitor hearts on restored rows cannot be restored; keep `heart_count` readable for admins and record this limit.
- TV pool: with every recognition ever eligible, selection stays fair and fast. Add a test on a synthetic pool of 5,000 rows.
- Ship order for the integration lane: clamp first, verify, then the migration.
- Acceptance: unit tests for the clamp at 7 days, 21 days and 100 years; an isolated PostgreSQL fixture test for migration 015 (as was done for 012); a browser test proving a 100 year expiry does not spin the home page; typecheck, all unit tests, build.
- Verify: `npm run typecheck`, `npm test`, `npm run build`, `npx playwright test tests/feed tests/receipt-feed --workers=1 --timeout=150000`, all with `npm_config_cache=/tmp/npm-cache`.

```allowlist
/Users/anthony/Projects/mothers-love-worktrees/p18-never-expire/src/lib/server/public-feed.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-never-expire/src/lib/server/public-feed.test.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-never-expire/src/lib/server/public-display.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-never-expire/src/lib/server/public-display-daily.test.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-never-expire/src/lib/server/expiry-clamp.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-never-expire/src/lib/server/expiry-clamp.test.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-never-expire/src/lib/display/coordinator.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-never-expire/database/015_never_expire.sql
/Users/anthony/Projects/mothers-love-worktrees/p18-never-expire/tests/backend/never-expire.spec.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-never-expire/tests/feed/far-future-expiry.spec.ts
```

### Lane 2: Home page load more
Setup: frontier · high (fallback: balanced · high) · Lane: Codex · Review: controller
  Claude: Opus 5 · high (fallback: Sonnet 5 · high)
  Codex: gpt-5.6-luna · high via codex-dispatch
  Antigravity: Gemini 3.8 Flash (High)
Worktree: /Users/anthony/Projects/mothers-love-worktrees/p18-load-more on branch `change/p18-load-more`, created from Lane 1's landed branch
Depends on: Lane 1 (both change `public-feed.ts`; one owner at a time)
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
- The home page keeps showing the latest 100 live, and a "Load more" control under the list fetches older recognitions 100 at a time through a new paged feed function in the database and a `before` cursor on `/api/feed`. The 10 second refresh only replaces the first page; loaded older pages stay put and their hearts work.
- The look must match the live home page: same cards, same phone layout. Show Anthony a live versus new side-by-side at phone width before the lane lands.
- Acceptance: browser tests for paging, for a refresh not dropping older pages, and for a steady heart on an older card; the public field allowlist stays exactly the six public fields.

```allowlist
/Users/anthony/Projects/mothers-love-worktrees/p18-load-more/src/lib/server/public-feed.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-load-more/src/lib/server/public-feed.test.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-load-more/src/app/api/feed/route.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-load-more/src/components/feed/PublicFeedProvider.tsx
/Users/anthony/Projects/mothers-love-worktrees/p18-load-more/src/components/feed/FeedHome.tsx
/Users/anthony/Projects/mothers-love-worktrees/p18-load-more/src/components/feed/HomeExperience.module.css
/Users/anthony/Projects/mothers-love-worktrees/p18-load-more/src/components/feed/feed-types.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-load-more/database/017_public_feed_paging.sql
/Users/anthony/Projects/mothers-love-worktrees/p18-load-more/tests/feed/load-more.spec.ts
```

### Lane 3: Admin sees all details
Setup: frontier · high (fallback: balanced · high) · Lane: Codex · Review: controller + independent
  Claude: Opus 5 · high (fallback: Sonnet 5 · high)
  Codex: gpt-5.6-luna · xhigh via codex-dispatch
  Antigravity: Gemini 3.8 Flash (High)
Worktree: /Users/anthony/Projects/mothers-love-worktrees/p18-admin-details on branch `change/p18-admin-details`
Depends on: none
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=Claude Opus 5 · high (private submitter names)
Hygiene: Haiku 4.5 · low sweep before review
- Admin list and detail pages show every recognition, including hidden, invalid and archived ones: submitter name, recipient, message, expressions, status, reason, created and published times, heart count, and the audit trail. Search and a date filter. No raw export.
- The archive stays unreadable by the public runtime role except through a new admin-only function in `database/016_admin_all_details.sql`. Every route keeps server authorization; unauthenticated requests still get 401 with no-store.
- The look matches the live admin pages. Show Anthony a live versus new side-by-side after the first screen.
- Acceptance: admin browser journeys with synthetic data, an authorization test per new route, typecheck, unit tests, build.

```allowlist
/Users/anthony/Projects/mothers-love-worktrees/p18-admin-details/src/components/admin/recognition-manager.tsx
/Users/anthony/Projects/mothers-love-worktrees/p18-admin-details/src/components/admin/recognition-detail-page.tsx
/Users/anthony/Projects/mothers-love-worktrees/p18-admin-details/src/components/admin/admin-api.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-admin-details/src/components/admin/admin-utils.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-admin-details/src/components/admin/admin.module.css
/Users/anthony/Projects/mothers-love-worktrees/p18-admin-details/src/app/api/admin/recognitions/route.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-admin-details/src/app/api/admin/recognitions/[id]/route.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-admin-details/src/lib/server/operations.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-admin-details/src/lib/server/types.ts
/Users/anthony/Projects/mothers-love-worktrees/p18-admin-details/database/016_admin_all_details.sql
/Users/anthony/Projects/mothers-love-worktrees/p18-admin-details/tests/admin/all-details.spec.ts
```

### Lane 4: Integration, release and records
Setup: frontier · high · Lane: Claude (coordinator) · Review: controller + independent
  Claude: Fable 5.1 coordinates, mechanical glue only
Worktree: /Users/anthony/Projects/mothers-love-worktrees/p18-integration on branch `change/p18-integration`
Depends on: Lanes 0, 1, 2, 3
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=Claude Opus 5 · high (completion boundary, production data)
Hygiene: Haiku 4.5 · low sweep before review
- Merge the lanes, correct accepted findings from Lane 0 and the landing reviews, rerun every acceptance command.
- Update AGENTS.md product invariants and `docs/CONTRACT.md` to the new retention rule, and check the Sharing guide page (`/privacy`) says nothing the new rule makes untrue.
- Release through `live-app-release`. Stop and ask Anthony before the production deploy and before each live database statement. Order: server clamp live and verified, then migration 015, then 016 and 017.
- Update HANDOFF, README quick links and `/Users/anthony/Projects/README.md`. Remove the interim 21 day note.

## Interim state until Lane 1 ships

- Migration 014 is live: nothing is deleted without being archived first.
- `database/ops/2026-09-19-extend-to-21-days.sql` extends current recognitions to 21 days so they stay on the home page and TV meanwhile. New recognitions still get 7 days, so Lane 1 should ship within a week of the latest extension, or the extension is run again.

## Build log

- 2026-09-19: Anthony's rulings for Section A, given in chat. (1) The TV draws from every recognition ever, not a recent window. (2) The home page goes past the latest 100 with a "load more". Consequence for Section B: the TV pool and Garden selection must stay fair and fast as the pool grows without limit, so Section B adds a selection and performance check on a large synthetic pool, and the feed gets paging in the database function, not only in the browser.
- 2026-09-19: Interim extension applied. All 132 recognitions then in the table were moved to 21 days by the statement in `database/ops/2026-09-19-extend-to-21-days.sql`. Anthony's own check afterwards showed cleanup healthy, collection open, and one row on 7 days, which is a recognition sent after the extension (new rows still get 7 days until Section B ships). The auto mode classifier refused the first attempt and later flagged the coordinator's approved retry as a bypass; future live database writes for this plan go through Anthony's SQL editor paste or an explicit permission rule, not a retry.
- 2026-09-19: Anthony approved the plan, chose the Parallel runner, and chose to start now and coordinate with Plan 17 instead of waiting. Plan rewritten into lanes 0 to 4 with setup lines and allowlists. Run record tree: `docs/runs/2026-09-19-keep-forever/`. Provisional completion-review baseline for the repository: `428ba8394eca421f6d4ff3b0dcbe3472003e85b4` on `origin/codex/mothers-love`, clean (every lane worktree is created fresh from it). Lane 1's first act is to confirm or re-record this baseline.
- 2026-09-19: Plan drafted by Claude (Fable 5.1) at Anthony's request, in the same session that shipped the receipt feed, the heart fix and migration 014. Not yet approved.
