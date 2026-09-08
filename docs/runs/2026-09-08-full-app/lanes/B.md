# Lane B backend record

## Setup

- Owner: backend lane
- Runtime: gpt-5.6-luna, xhigh
- Worktree: `/Users/anthony/Projects/mothers-love-worktrees/backend`
- Branch: `codex/mothers-love-backend`
- Protected files: foundation shared files, submission, admin, display, plan, contract, and root integration state
- Backend ownership: `src/app/api/`, `src/lib/server/`, `database/`, `scripts/database/`, `tests/backend/`

## Delivered

- Added the `mothers_love` database namespace with private tables for settings, recognitions, expression links, contribution vectors, anonymous daily aggregates, display events and devices, display sessions, memberships, bounded invitations, audit metadata, idempotency keys, and short rate-limit hashes.
- Added `public.ml_api(text,jsonb)` and `public.ml_purge()` as security-definer bridge functions with an empty search path, explicit runtime grants, and revokes from public, anon, and authenticated.
- Added transactional submit, idempotency, publication, edit vector correction, hide, invalidation, restore, feature, delete, aggregate reports, settings, device pairing, snapshot cursor and delta arrivals, display acknowledgements, membership checks, invitation consumption, last-owner protection, and one-minute purge operations.
- Added server route handlers for every backend HTTP endpoint in the contract. Runtime database access uses the restricted `DATABASE_URL` login with `postgres` max 1 and prepare false. Auth bearer verification uses the Supabase publishable client and fresh membership checks.
- Added Unicode grapheme and payload validation, basic private contact, health, and profanity holding rules, safe response headers, origin checks for writes, Crockford pairing codes, hashed display session cookies, and bounded shared-IP and temporary request-context limits.
- Added synthetic Vitest validation, filter, vector, time, and SQL boundary tests plus a pgTAP transaction fixture at `tests/backend/001_rls_contract.sql`.

## Verification

- `npm run typecheck` passed.
- `npm test` passed: 22 tests across 6 files, including mocked route DTO checks.
- `npm run build` passed with all backend routes compiled as dynamic App Router handlers.
- Live Supabase migration, pgTAP execution, restricted runtime login query, and deployed endpoint smoke tests were not run in this lane. Root owns provider access, migration application, credentials, and deployment.

## Root integration notes

- Required runtime environment: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `PUBLISHABLE_KEY`. The server also accepts the foundation browser alias `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as a fallback.
- `SUPABASE_SERVICE_ROLE_KEY` is not read by the deployed backend runtime.
- The SQL artifact is `database/001_mothers_love.sql`. Root should review and apply it through the provider migration path, then run the isolated pgTAP fixture and direct deny checks using the restricted login.
- Provider metadata confirmed pgcrypto is in `extensions`, and the artifact calls `extensions.digest` without changing extension placement.
- Root should verify the optional `ml_purge` pg_cron schedule exists exactly once after migration. The migration conditionally schedules it only when the cron relation is available.

## Post-review security fixture

- Added `tests/backend/004_security_assertions.sql`, a rollback-only synthetic PostgreSQL fixture covering forced RLS and direct privilege denial for anon/authenticated, bridge-only restricted runtime grants, Owner AAL2 enforcement, moderator and membership boundaries, one-use pairing and revoked display sessions, and idempotent receipt preservation with hash conflict detection.
- Root applied migration SHA-256 `790f72f06ececc14a408355c2912673de55a04a2bed4e103792e9015709f18c1` to a fresh disposable database and passed the hardened lifecycle fixture at `tests/backend/003_transaction_assertions.sql`. Subsequent review corrections are pending fresh database verification at migration SHA `f213b423a4e36ec45d1958b7a1c93a282debd1d84cd6d761d3dcaa95fd753a10`.
- The latest candidate also gates effective collection availability on a cleanup timestamp within two minutes and zero rows overdue beyond the two-minute lag. Unhealthy collection enable returns `PURGE_UNHEALTHY`; config and submission remain closed until `ml_purge` recovers health.

## Unicode edit parity artifact

- Added `database/002_unicode_edit_parity.sql`, a fail-closed replacement of only the three frozen admin edit codepoint caps. The caps are now 16,384 codepoints so the HTTP layer remains authoritative for the 80 and 500 grapheme limits and the 16 KiB request body.
- Added `tests/backend/005_unicode_edit_assertions.sql`, a rollback-only disposable PostgreSQL fixture that submits and edits a synthetic 500-family-emoji message under 16 KiB, verifies the stored edit and unchanged contribution counts, and preserves the existing HTTP 501-grapheme rejection coverage.
- Frozen `database/001_mothers_love.sql` remains unchanged at SHA-256 `f213b423a4e36ec45d1958b7a1c93a282debd1d84cd6d761d3dcaa95fd753a10`. Root must apply 002 after 001 and run fixture 005 in a disposable database.
