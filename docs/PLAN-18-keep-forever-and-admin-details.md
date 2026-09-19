# Plan 18: keep every recognition, and let admins see all details

Status: DRAFT with Section A rulings recorded, waiting for Anthony's approval of the plan and runner. Nothing in this plan is built yet.

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

## Sections

### Section A: rulings and contract (Anthony plus coordinator, no code)
- Anthony rules: does the TV draw from all recognitions ever, or from a recent window (for example the latest 100) while the home page scrolls through everything?
- Anthony rules: should the home page show more than the latest 100, with a "load more"?
- Update AGENTS.md product invariants and `docs/CONTRACT.md` to the new retention rule. Check the Sharing guide page (`/privacy`) says nothing that the new rule makes untrue.
- Done when: rulings recorded in this plan's Build log, AGENTS.md and CONTRACT updated.

### Section B: never expire, safely (database plus server)
- Approach: rows stop expiring in the database (new rows and existing rows get a far-future `expires_at`), and the server clamps the `expiresAt` it sends to browsers and the TV to "now plus 7 days", refreshed on every 10 second poll. Old tabs and TVs keep working unchanged, no timer ever exceeds the safe window, and every existing "not expired" filter and the cleanup health check keep working untouched.
- Order matters: ship the server clamp first (it changes nothing while rows still have 7 day dates), verify, then apply the database migration.
- Restore archived rows into the live table so nothing already archived is missing from the home page and TV.
- Files: `src/lib/server/public-feed.ts`, `src/lib/server/public-display.ts` and the display routes (coordinate with Plan 17), new `database/015_never_expire.sql`.
- Done when: unit tests for the clamp, a fixture test for migration 015, a browser test that a 100 year expiry does not spin the home page, and the live cleanup stays healthy after applying.

### Section C: admin sees all details
- Admin list and detail pages show every recognition, including hidden, invalid and formerly archived ones: submitter name, recipient, message, expressions, status, reason, created and published times, heart count, and the audit trail. Search and date filter. No raw export (existing rule) unless Anthony rules otherwise.
- Server authorization stays on every route. The archive table stays unreadable by the public runtime role except through a new admin-only function.
- Files: `src/components/admin/recognition-manager.tsx`, `recognition-detail-page.tsx`, `src/app/api/admin/recognitions/*`, new `database/016_admin_all_details.sql`.
- Done when: admin browser journeys pass with synthetic data, unauthenticated requests still get 401 with no-store.

### Section D: release and records
- Release through `live-app-release` from a clean copy of the live branch `codex/mothers-love`. Database first where the plan says so, preview build, then production.
- Update HANDOFF, README quick links and `/Users/anthony/Projects/README.md`. Remove the interim 21 day extension note once Section B is live.

## Model, effort, lane, review and agent choices

| Section | Writer | Effort | Lane | Reviewer | Notes |
| --- | --- | --- | --- | --- | --- |
| A | Coordinator with Anthony | n/a | none | none | rulings only |
| B | Codex `gpt-5.6-luna` | xhigh | `change/never-expire`, own worktree | Claude, two rounds | holds other people's data, production database |
| C | Codex `gpt-5.6-luna` | xhigh | `change/admin-all-details`, own worktree | Claude, two rounds | admin surface, private names |
| D | Coordinator | n/a | integration | Claude completion review | production deploy confirms first |

Spill order per the shared policy. B and C are independent after A, so Parallel is the recommended runner. Mechanical rows (fixture data, link updates) go to Haiku 4.5.

## Interim state until Section B ships

- Migration 014 is live: nothing is deleted without being archived first.
- `database/ops/2026-09-19-extend-to-21-days.sql` extends current recognitions to 21 days so they stay on the home page and TV meanwhile. New recognitions still get 7 days, so Section B should ship within a week of the latest extension, or the extension is run again.

## Build log

- 2026-09-19: Anthony's rulings for Section A, given in chat. (1) The TV draws from every recognition ever, not a recent window. (2) The home page goes past the latest 100 with a "load more". Consequence for Section B: the TV pool and Garden selection must stay fair and fast as the pool grows without limit, so Section B adds a selection and performance check on a large synthetic pool, and the feed gets paging in the database function, not only in the browser.
- 2026-09-19: Interim extension applied. All 132 recognitions then in the table were moved to 21 days by the statement in `database/ops/2026-09-19-extend-to-21-days.sql`. Anthony's own check afterwards showed cleanup healthy, collection open, and one row on 7 days, which is a recognition sent after the extension (new rows still get 7 days until Section B ships). The auto mode classifier refused the first attempt and later flagged the coordinator's approved retry as a bypass; future live database writes for this plan go through Anthony's SQL editor paste or an explicit permission rule, not a retry.
- 2026-09-19: Plan drafted by Claude (Fable 5.1) at Anthony's request, in the same session that shipped the receipt feed, the heart fix and migration 014. Not yet approved.
