---
lane: SB
title: never expire, safely (database plus server)
state: reviewed
model: Claude Opus 5.5 coordinator; writer gpt-6-sol (attempt 3)
runner: coordinator
worktree: /Users/anthony/Projects/mothers-love-worktrees/never-expire (branch change/never-expire, base ffce531)
review: Claude two rounds (round 1 coordinator, round 2 fresh Opus reviewer)
depends_on: SA
updated: 2026-09-24
---

# Section B: never expire, safely

## Before any code: live outage (2026-09-23)

At kickoff the live site was down: /api/feed and /api/display/snapshot returned 503 and collection was closed from about 00:34 UTC on 2026-09-24 (5:34 PM Pacific on 2026-09-23). Cause: pausing the ml_purge pg_cron job left `settings.last_cleanup_at` older than 2 minutes, and `mothers_love.ml_purge_healthy` requires a cleanup run in the last 2 minutes as well as no overdue rows. The database was reachable and all 189 recognitions were intact. With Anthony's approval he ran `select cron.alter_job(3, active := true)` (job ml_purge only; the two LV Zion jobs stay paused). The feed returned 200 with 100 items about 20 seconds later, the TV snapshot 200, collection open. Migration 016 removes the freshness requirement so the job can be paused again safely.

## Dispatch attempts

| Attempt | Writer | Result |
|---|---|---|
| 1 | gpt-5.6-luna xhigh | Failed review. The compiled work order carried only the allowlist and contract (compile-order.mjs dropped the task prose), so the design was guessed: an unquantised clamp (TV restarts every poll) and MAX_RECOGNITIONS lowered to 100 (blank TV above 100 rows). |
| 2 | gpt-5.6-terra xhigh | Stopped before finishing when Anthony asked to move Codex work to GPT-6. |
| 3 | gpt-6-sol xhigh | Canary ok, allowlist ok, HEAD unchanged. Design matches the work order. |

Ledger rows: section `2026-09-23-keep-forever/SB`, attempts 1 to 3 in /Users/anthony/Projects/docs/orchestrator-ledger.csv.

## What changed

- `src/lib/server/expiry-clamp.ts` (new): public expiry ceiling = start of the 08:00 UTC day + 7 days; `clampPublicExpiry` returns the input unchanged when under it. Never more than 7 days ahead, changes at most once a day (overnight in Los Angeles), so TV records stay stable between polls.
- Clamp applied in `src/lib/server/public-feed.ts`, `src/lib/server/public-display.ts` (and so the Color Polish route) and `src/app/api/recognitions/route.ts` (receipt).
- `public-display.ts`: TV pool trimmed to the 100 latest by first publication (Anthony, 2026-09-23), input bound stays 1000, arrivals for trimmed items skipped.
- `src/lib/safe-timer.ts` (new): `setSafeTimeout` chains native timers of at most 7 days. Used by the home feed expiry timers and three admin screens; the admin detail page no longer clears an open recognition when its expiry is far away.
- `database/016_never_expire.sql` (new, NOT APPLIED): new recognitions get 100 years; idempotency keys and publish display events keep 168 hours; admin mutation display events use LEAST(expiry, 168 hours); `ml_purge_healthy` keeps only the overdue check; existing rows move to 100 years; archive rows (0 today) restored with expressions. One transaction, second run refused.
- Tests: `tests/backend/expiry-clamp.test.ts`, `never-expire-projection.test.ts`, `migration-016.test.ts`, `016_never_expire_fixture.sql`, `tests/feed/never-expire.spec.ts`.
- Coordinator corrections: `setSafeTimeout` final hop now fires the callback directly (the extra 0 ms hop failed `tests/feed/feed.spec.ts:148` under a paused test clock); legacy fixtures in `tests/backend/public-feed.test.ts` and `public-display.test.ts` moved from 10:00 to 07:00 so they sit under the ceiling.

## Verification (coordinator)

- Typecheck clean; `npm test` 281 of 281; `npm run build` passes; eslint clean on every changed file.
- Migration 016 on a local PostgreSQL 16 built from the live chain (001 to 013, 014_recognition_archive; its public.ml_api text matches live byte for byte): fixture part 1, migration, part 2 all pass; a second apply raises `recognition insert expiry anchor must occur exactly once` and changes nothing; a synthetic local submit returned a 2126 expiry with idempotency and display event rows under 8 days; ml_purge_healthy true with no cleanup run.
- Both migration anchors occur exactly once in the live function text (read only query, 2026-09-24).
- Playwright: tests/feed (including the new never-expire spec), tests/receipt-feed, tests/admin: 56 passed, 2 failed (`admin.spec.ts:421` 409 reconcile and `:518` expired PATCH, recorded in HANDOFF as failing on the base). `tests/color-polish-usable`: 4 passed, 2 failed identically on the untouched base (fixture dates in the past).

## Review

- Round 1 (coordinator, Claude Opus 5.5): attempt 1 rejected (see above); attempt 3 accepted with the two coordinator corrections.
- Round 2 (fresh Claude Opus reviewer, read only): no blocking defects. One medium finding fixed: restored archive rows lacked their `contribution_state` record (archiving cascades it away while daily aggregates keep counting), so a later restore could double count and an invalidate reverse nothing. 016 now rebuilds it the way public.ml_api stores it (published or hidden after publication: expression vector in the Los Angeles publication day; held and invalid: zero), and the fixture asserts it. Fixture, second-run refusal and 281 of 281 unit tests pass again.
- Accepted as known: once a day at 08:00 UTC (about 1 AM Pacific) the clamped expiry moves, so a TV arrival animating at that moment restarts (visual only, unchanged host.js). An owner-featured recognition older than the latest 100 leaves the TV (Anthony's latest 100 ruling). Held and invalid rows are kept forever too (forever ruling; admin only).

## Release and rollback rules

- Deploy the code first and verify the live feed and TV, then apply 016 and insert the ledger row `016_never_expire` with the file's SHA-256.
- After 016 is applied, never roll the code back alone: the old code would hand phones a 100 year expiry and spin the home page timer. Roll the database back first (set expires_at back under about 24 days and restore the old ml_purge_healthy), or roll forward.

## Open
- Release order: deploy the server clamp first, verify live, then apply 016 and insert the ledger row. Each step confirms with Anthony.
- After 016: ml_purge can be paused again or moved to hourly (it still clears idempotency keys, display events and rate limits); the admin overview will then show cleanup as stale (cosmetic, Section C).
- Admin screens will show 2126 expiry dates after 016 (Section C owns admin display).
