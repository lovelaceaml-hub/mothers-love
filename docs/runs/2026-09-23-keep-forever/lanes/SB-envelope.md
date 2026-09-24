# Section B envelope: never expire, safely

Goal line (quoted from the plan): "Every recognition is stored indefinitely, stays on the home page and TV, and an admin can see every detail of every submission, without breaking the live TV or people's phones."

## Setup line
Model: Claude Opus 5.5 coordinator (high) dispatching Codex gpt-5.6-luna (xhigh) through codex-dispatch · Fallback: gpt-5.6-terra, then Sonnet 5 · Lane: Codex, worktree branch change/never-expire · Agents: none beyond the dispatch · Review: Claude, two rounds (production database holding other people's messages is the named reason for Opus) · Hygiene: Haiku 4.5 low sweep before review.

## Execution envelope
- Project / unit: Plan 18 (keep every recognition), Section B: never expire, safely
- Lane: Codex
- Read first: /Users/anthony/Projects/mothers-love/docs/PLAN-18-keep-forever-and-admin-details.md (with Build log), /Users/anthony/Projects/mothers-love/docs/runs/2026-09-23-keep-forever/INDEX.md, /Users/anthony/Projects/mothers-love/docs/HANDOFF.md
- In scope: server clamp so every expiresAt sent to browsers and the TV is at most server now plus 7 days (feed, display snapshot, color-polish route, recognition receipt); TV pool limited to the latest 100 recognitions (Anthony ruling 2026-09-23); migration /Users/anthony/Projects/mothers-love/database/016_never_expire.sql giving new and existing recognitions a far-future expires_at in public.ml_api and mothers_love.recognitions, leaving idempotency keys, display events and rate limits on their current short lifetimes; restore any rows from mothers_love.recognitions_archive (currently 0); unit tests for the clamp, a fixture test for 016, a browser test that a 100 year expiry does not spin the home page.
- Protected / out of scope: Section C admin work; every non mothers_love object in the shared Supabase project cvuwdlmlukepwfffpgdu (LV Zion worship, rooms, preaching tables); pg_cron jobs stay paused unless this section proves ml_purge is safe to re-enable with never-expiring rows; no reset, db push or schema-wide diff against shared production; no real recognition text in Git, fixtures, screenshots or logs.
- Order: ship and verify the server clamp in production first, then apply 016. Production deploy and the database migration each confirm with Anthony first.
- Acceptance: after release, a live post with a 100 year expiry shows on https://mothers-love.vercel.app and https://mothers-love.vercel.app/display, the home page issues no repeated timer loop, feed and snapshot responses never carry expiresAt beyond now plus 7 days, collection stays open, TV pool is at most 100.
- Verify: npm_config_cache=/tmp/npm-cache npm run typecheck; npm test; npm run build; npm run test:e2e (feed and display specs); SQL check on live: count of recognitions with expires_at under 1 year from now equals 0 after 016.
- Deadline: the 21 day bridge holds existing posts to 2026-10-15, but new posts still get 168 hours and ml_purge is paused, so the first new post expiring about 7 days after it is sent closes collection (ml_purge_healthy). Ship 016 before 2026-09-30, or rerun the bridge from the Build log.
- Completion output: Build log facts, changed files, verification evidence, commit and push status, limitations, Section C handoff.
- Record file: docs/runs/2026-09-23-keep-forever/lanes/SB.md
- Board: pending
- Critique: none, two Claude review rounds instead

```allowlist
/Users/anthony/Projects/mothers-love/src/lib/server/public-feed.ts
/Users/anthony/Projects/mothers-love/src/lib/server/public-display.ts
/Users/anthony/Projects/mothers-love/src/lib/server/types.ts
/Users/anthony/Projects/mothers-love/src/lib/feed-contract.ts
/Users/anthony/Projects/mothers-love/src/lib/contracts.ts
/Users/anthony/Projects/mothers-love/src/app/api/feed/route.ts
/Users/anthony/Projects/mothers-love/src/app/api/display/snapshot/route.ts
/Users/anthony/Projects/mothers-love/src/app/api/display/color-polish/route.ts
/Users/anthony/Projects/mothers-love/src/app/api/recognitions/route.ts
/Users/anthony/Projects/mothers-love/src/components/feed/PublicFeedProvider.tsx
/Users/anthony/Projects/mothers-love/database/016_never_expire.sql
/Users/anthony/Projects/mothers-love/tests/feed/never-expire.spec.ts
/Users/anthony/Projects/mothers-love/src/lib/server/expiry-clamp.ts
/Users/anthony/Projects/mothers-love/src/lib/server/expiry-clamp.test.ts
/Users/anthony/Projects/mothers-love/tests/backend/migration-016.test.ts
/Users/anthony/Projects/mothers-love/docs/runs/2026-09-23-keep-forever/lanes/SB.md
```
