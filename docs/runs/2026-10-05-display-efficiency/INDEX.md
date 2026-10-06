# Display efficiency run

This is the original Mac verification record. See [the cloud continuation](../2026-10-06-cloud-efficiency/INDEX.md) for integration onto newer main and current cloud results.

Local branch: `feat/tv-display-efficiency`, based on `7cf00014fe38807e4739478b2af3138d6f085d88`. Work is held as an uncommitted local diff for review. No live migration, deployment, push, PR, merge or account change. The exact final diff/tree identities and changed-file SHA-256 manifest are recorded outside Git in the task's `verification/patch-identity.json` and `verification/final.patch`.

## Verification

Completed checks:

- Typecheck passes.
- Full unit suite: 76 files, 924 passed, 1 skipped. A concurrent high-load browser run caused two existing world timing tests to time out; the full suite passed again with `--maxWorkers=2`.
- Final production build passes. Public auth settings in the final test build point only to a fictional domain/key; no database URL or real credentials are configured.
- Disposable PostgreSQL migration and fixture run: 21 checks pass, including actual SQL outputs through the API projector/browser cache, edits without version bumps, expressions, settings, presentation, aggregates, calendar boundaries, feature expiry, moderation, expiry, quiet mode, cache lease renewal, cursor cleanup, overflow and cleanup health. The script cleans up its own database.
- Full repository lint was run independently in both checkouts using the same pinned dependencies. Base: 30 errors, 9 warnings. Patch: 29 errors, 9 warnings. Normalized file/rule/severity/message counts show zero introduced findings and removal of one existing `react-hooks/set-state-in-effect` finding in V6. The new modules, route/query changes, tests and local SQL runner pass scoped lint.
- `git diff --check` passes.

The four new browser lifecycle tests pass, including more than 60 seconds of unchanged verification, stable iframe identity, hidden snapshot/likes pause, immediate return refresh, stale outage/reset, five-second arrival merge, quiet withdrawal and V6 snapshot reuse. A return after a hidden gap longer than the stale limit is also checked. The arrival test now asserts a real single overlay. The added group case asserts all five new records enter one group overlay, unchanged polls preserve that active overlay without replay, and moderation cancels it and removes the withdrawn record from the DOM.

The focused public TV run passed 25 checks across the new cache spec, likes total, Live Recognitions and direct Garden fixtures. Six Studio checks could not sign in without fictional public auth configuration. With that configuration, the earlier six-test subset passed; after strengthening arrival assertions and adding the group case, the final seven-test subset passes in 27.5 seconds: four lifecycle cases, Garden circularity, Garden reduced motion and Studio Live Recognitions preview.

The broad 304-test scene run was stopped after 25 passing tests, five arrival assertion failures and two interrupted tests; 272 did not run. Those five cases were then run sequentially with one worker in an independent detached, clean checkout of the exact base commit and in the patch checkout. Every failure has the same assertion and exact expected/received values in both:

| Case in `tests/color-polish-scenes/arrival.spec.ts` | Failed assertion | Base and patch |
| --- | --- | --- |
| Wave of five, test line 754 | Drawn group size, line 806 | Expected 240, received 399.9900207519531 |
| Full-screen composition at 1920, test line 1976 | Orb diameter, line 1870 | Expected 240, received 399.9900207519531 |
| 500-grapheme group pair at 1920, test line 2012 | Orb count, line 1863 | Expected 2, received 5 |
| Full-screen composition at 3840, test line 1976 | Orb diameter, line 1870 | Expected 240, received 399.9900207519531 |
| 500-grapheme group pair at 3840, test line 2012 | Orb count, line 1863 | Expected 2, received 5 |

Raw logs are `base-arrivals.log` and `patched-arrivals.log`; machine-readable comparison is `arrival-comparison.json`. Sandbox-only attempts failed to launch Chromium and are saved separately; those are not assertion evidence. The successful browser executions ran with Mac process permission and served only local fictional fixtures through the direct renderer harness, without a Next server or live API. Renderer source/assets and these scene tests are byte identical to the base commit. The disagreements are pre-existing, preserved here, and need separate visual/requirements review. No polling regression was found by these comparisons. Full scene-suite success or approval of the current group dimensions is not claimed.

The earlier six checks did not prove grouped arrivals, replay prevention, the full arrival frame/style matrix, or long-message readability. The stronger seven-check set closes the first two gaps and adds active moderation cancellation; it still does not validate every scene/frame at every viewport, 500-grapheme group pair geometry, all message pages, or physical TV readability. Garden checks cover their particular fixture only. The Studio check uses mocked authentication/API data. The old legacy display suite with stale selectors is not a release claim.

SQL validation is actual local integration, not only SQL-text assertions: PostgreSQL 16.15 applies every numbered migration to its own disposable Unix-socket cluster, executes the legacy and new bridges in repeatable-read transactions against 1,200 fictional records, and passes actual reset/unchanged/arrival JSON through the app's public projector and browser cache. The route/query unit tests mock their database client, and browser lifecycle tests mock API responses; the disposable SQL runner does not wire a live HTTP server to its database. Local ACL and boundary checks do not prove the current Supabase schema ledger, hosted TLS, deployment configuration, query billing or physical TV behavior.

Verification logs and SQL payload measurements are saved outside Git at `/Users/anthony/Documents/Codex/2026-10-05/task-3/verification/`. Migration 019 SHA-256: `d318a6b3ed22680524d4dc10e967bb59eb4b540d1536e5ba56ee16b6380bc5a9`.

No physical TV or phone commissioning was performed. No real recognitions were read, logged, seeded or captured.

## Reproduction commands

Patch cwd: `/Users/anthony/Documents/Codex/2026-10-05/task-3/mothers-love`. Independent baseline cwd: `/Users/anthony/Documents/Codex/2026-10-05/task-3/mothers-love-base-check`, detached at the full base SHA above. Baseline tracked files are clean; only an ignored symlink to the patch's pinned `node_modules` is shared. Source `/Users/anthony/Projects/mothers-love` remains clean on the same commit.

```sh
npm run typecheck
npm test -- --maxWorkers=2
NEXT_PUBLIC_SUPABASE_URL=https://synthetic.supabase.test NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=synthetic-public-test-key NEXT_PUBLIC_APP_URL=http://127.0.0.1:32753 npm_config_cache=/tmp/npm-cache npm run build
node scripts/test-display-delta.mjs
./node_modules/.bin/eslint . --format json
```

Run this exact comparison command separately in both checkouts (exit 1 with the five assertions above):

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:32753 npm_config_cache=/tmp/npm-cache npm run test:e2e -- tests/color-polish-scenes/arrival.spec.ts --grep 'a wave of five|entrance composition fills|a 500 grapheme message fits' --workers=1
```

The final patch-only browser subset uses a production preview started by `npm run start -- --hostname 127.0.0.1 --port 32753`:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:32753 npm_config_cache=/tmp/npm-cache npm run test:e2e -- tests/color-polish-usable/display-cache.spec.ts tests/color-polish-scenes/garden.spec.ts tests/color-polish-scenes/live-feed.spec.ts --grep 'unchanged polls|next five.second poll|disabled Color Polish reuses|cached delta starts|garden renders circular|reduced motion renders the garden still|Studio lists Live' --workers=1
```

Node 24.18.0, Next 16.3.4, Playwright 1.58.2, PostgreSQL 16.15. Chromium and disposable PostgreSQL need Mac process/shared-memory permission beyond the filesystem sandbox. No permission rejection remains. See `verification/commands.md` for scoped lint and identity reproduction.

## Review and rollout

1. Review the local diff, [Plan 31](../../PLAN-31-display-efficiency.md), [migration 019](../../../database/019_display_delta.sql), and [optional rollback](../../../database/ops/019_display_delta_rollback.sql). Keep the source checkout and other active branches unchanged.
2. Confirm the current remote head and live migration ledger before publishing the branch. This clone starts from the Mac's local `main`; no remote freshness or current live deployment was verified during this task.
3. With Anthony's separate rollout authorization, apply only migration 019 to the confirmed dedicated `mothers_love` objects in project `cvuwdlmlukepwfffpgdu`, using the existing strict-TLS administrative migration process. No reset, db push, exposed-schema change or shared-app objects. The migration creates a bounded-read index and two restricted functions. Use a short lock timeout and retry during a quiet window if the index is blocked. Record the exact SQL SHA-256 in the existing campaign migration ledger after successful application.
4. SQL first, app second. Existing app builds never call the new functions. Verify their ACLs: only `mothers_love_runtime` can execute the public bridge; it cannot call the private metadata helper. Public/anon/authenticated/service_role retain no execute access. Run the live database advisors as part of that authorized rollout; the local tests verify ACLs but do not substitute for live advisors.
5. Publish the reviewed branch/PR only when authorized. Use a preview first. Check one initial reset, unchanged verification, arrival within a healthy five-second poll, hide/quiet mode, stale outage, reconnect, hidden-tab return, likes total and disabled-preset fallback. Synthetic fixtures belong only to isolated test environments; do not seed production.
6. Anthony retains the merge and production release decision. Check the church TV separately for appearance and arrival timing.

The new app expects migration 019 for opt-in TV reads. Do not deploy it before SQL is available: the endpoint will fail closed and use the existing fallback. No plan upgrade or account setting change is needed by this code.

## Rollback

Restore the pre-change app build first. The old functions and routes have not been replaced, so the new database objects may safely stay. If removing the SQL too, run only the named-object rollback file and record the ledger decision. Removing SQL while the new app is still running makes its opt-in verification unavailable. Keep all pre-existing migrations, especially the keep-forever migration 016, unchanged.

## Deliverables and limits

Code: `src/lib/color-polish/delta.ts`, `display-cache.ts`, `src/lib/visible-poll.ts`, the Color Polish API/query, TV host and V6 fallback. SQL: `database/019_display_delta.sql` plus the optional rollback. Tests: cache/route/query unit tests, visible-poll tests, `tests/color-polish-usable/display-cache.spec.ts`, and `scripts/test-display-delta.mjs`.

Legacy clients and `/world` keep full snapshots. Metadata calculations still query PostgreSQL every five seconds while visible. Request token lists and initial/reset responses grow; unchanged and normal arrival responses shrink. The unavailable-preset recovery path still uses both APIs intentionally. Free-plan storage, quotas and production billing were not measured or changed.
