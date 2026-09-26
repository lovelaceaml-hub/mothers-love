# Plan 30: Show older recognitions

## Outcome

The home page keeps the latest 100 recognitions and adds a **Show older recognitions** button beneath them. Each tap adds the next 100 older published recognitions, newest first, until the first recognition is reached, where the page says "You have reached the first recognition." The TV and every other screen still draw from the latest 100.

Anthony asked for this on 2026-09-26 ("The mother's words of love app is showing all the submission on the main page. Show the older ones"), chose to keep 100 on the home page with older ones reachable past 100, and asked for it to be put live ("Do what needs to be done").

## Design

- **Database:** migration `database/017_public_feed_older.sql` adds `public.ml_public_feed_older(before_at timestamptz, before_id uuid)`. It returns the next 100 published, unexpired recognitions strictly older than the `(firstPublishedAt, id)` cursor, with the same public fields, neutral mode and purge health checks, ordering and runtime-only grant as `public.ml_public_feed()`. `ml_public_feed()` is unchanged. The migration only adds; it refuses to run twice.
- **API:** `GET /api/feed/older?before=<firstPublishedAt>&id=<uuid>` checks the cursor (400 if malformed), projects the result through the same allowlist as `/api/feed`, and fails closed (503) if any item is not older than the cursor. `no-store` and `noindex` as before.
- **Browser:** `PublicFeedProvider` holds the older pages beside the live 100. Every 10 second refresh reads the older pages again from the new end of the live list, so a recognition hidden or invalidated after loading leaves them too and nothing falls into a gap when new recognitions arrive. A failed re-read clears them rather than keep stale records. Hearts load and work on older cards. One open page holds at most 10 older pages (1,000 recognitions), then shows "Showing the most this page can hold."
- **Unchanged:** the TV, `/api/display/*`, the world, admin, the form, the receipt feed limit, privacy states and the reaction boundary.

## Rollback

- Code: roll production back to `dpl_EJ3n1Mau36mrAzQwNXYLG5uDht19` (pull request #22). The old code never calls the new function, so the database can stay as it is.
- Database, only after the code no longer uses it: `DROP FUNCTION public.ml_public_feed_older(timestamptz, uuid);` and delete the ledger row `017_public_feed_older`.

## Build log

- **2026-09-26, build.** Branch `claude/mothers-words-pagination-787sr1`, pull request [#23](https://github.com/lovelaceaml-hub/mothers-love/pull/23). New tests: `tests/backend/public-feed-older.test.ts` (7) and `tests/feed/older-recognitions.spec.ts` (4 browser journeys: paging to the end, no button under 100, error and retry, a hidden record leaving on refresh). `npm test` 900 passed, typecheck, focused lint and `npm run build` clean, existing `tests/feed` and `tests/mobile-recognition` journeys passed except the motion walkthrough, which fails the same way on `main` without `PLAYWRIGHT_BASE_URL`.
- **2026-09-26, isolated database check.** Migration 017 on a throwaway PostgreSQL 16 with 252 fictional rows: paging returned all 250 eligible rows exactly once in feed order, hidden and expired rows excluded, a group of equal timestamps across a page boundary paged correctly, neutral mode returned none, `anon` and `PUBLIC` could not execute it, and a second run was refused.
- **2026-09-26, about 18:36 UTC, migration 017 applied live** to `cvuwdlmlukepwfffpgdu` after a read-only precheck confirmed the live `ml_public_feed()` matched what 017 copies. Ledger row `017_public_feed_older` recorded in `mothers_love.schema_migrations` with SHA-256 `90bd538e6efeaff9b06503e11961c89c706845da628c549c84e5bb52cadec467`. Check by IDs and counts only (no message text read): 192 eligible recognitions, the newest 100 plus 92 older, no duplicates, same order as the full table; only `mothers_love_runtime` can execute.
- **2026-09-26, 18:39 UTC, live.** Pull request #23 merged (`ec4a7c1`), production deployment `dpl_7LbPtpZunGfqjMsVPHxcEwxrzF6m`, READY. Anthony checked the live home page and confirmed the button works.
