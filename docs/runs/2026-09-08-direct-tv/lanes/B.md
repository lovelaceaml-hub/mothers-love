# Lane B, public display backend

## Scope

Bounded public TV snapshot backend for Plan 05. The assigned files are:

- `/Users/anthony/Projects/mothers-love-worktrees/direct-tv-backend/database/006_public_display.sql`
- `/Users/anthony/Projects/mothers-love-worktrees/direct-tv-backend/src/lib/server/public-display.ts`
- `/Users/anthony/Projects/mothers-love-worktrees/direct-tv-backend/src/app/api/display/snapshot/route.ts`
- `/Users/anthony/Projects/mothers-love-worktrees/direct-tv-backend/tests/backend/009_public_display_fixture.sql`
- `/Users/anthony/Projects/mothers-love-worktrees/direct-tv-backend/tests/backend/public-display.test.ts`

## Implementation

- Added the additive `public.ml_public_display_snapshot(text)` runtime bridge with `SECURITY DEFINER`, empty `search_path`, runtime-only execution, and no device or session writes.
- Returned only the explicit display projection, safe settings, anonymous aggregate, configured submission URL, bounded cursor, and eligible arrivals.
- Limited records and arrivals to 1000, sorted featured records first, and made quiet and neutral modes return empty records and arrivals.
- Added capped numeric cursor parsing that resets safely for invalid, old, or future cursors before any bigint cast.
- Replaced the paired snapshot route with the public bridge, independent server projection, no-store and noindex headers, and no cookie access or writes.
- Added synthetic rollback SQL coverage for eligibility, projection, ordering, cap, modes, cursor resets, cleanup health, ACL and search path, and device or session write invariants.

## Verification

- `npm test -- --run tests/backend` passed, 9 files and 52 tests.
- `npm run typecheck` passed.
- `git diff --check` passed.
- A temporary symlink to `/Users/anthony/Projects/mothers-love/node_modules` was used for local checks and removed before handoff.
- PostgreSQL migration and fixture execution remain with the root coordinator as required by the plan.

## Handoff

Commits: `e06105e` (`Open public TV snapshot read path`), `465810b` (`Fix public display fixture key counts`), and `9764f0b` (`Accept empty month aggregate revision`).

Integration note: root should cherry-pick this lane commit, run the exact migration and fixture on the disposable PostgreSQL instance, then perform the independent public-data review and direct fresh-browser checks.

Security correction: aggregate revision `0` is accepted for a new month with no aggregate rows, while settings and top-level revisions remain positive. The regression test covers an empty month snapshot.
