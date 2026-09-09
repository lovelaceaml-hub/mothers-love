# Lane U: browser input and submission tests

## Scope

Owner: Luna xhigh
Worktree: `/Users/anthony/Projects/mothers-love-worktrees/flexible-names-ui`
Baseline: `a6c5c337c44b1d4bdbd62bb2f99f8a772879bfd2`

Updated the public submission form and privacy copy so submitted and recipient names accept any trimmed nonblank value up to 80 graphemes. Removed the first-name and last-initial helper import, export, validation, copy and placeholders. Preserved message and expression validation, moderation receipts, payload trimming, no truncation, and the existing visual structure. Updated the admin search placeholder to `Search by name`.

## Checks

- `npm_config_cache=/tmp/npm-cache npm test -- --run tests/submission/submission-validation.test.ts`: passed, 6 tests.
- `npm_config_cache=/tmp/npm-cache npm run typecheck`: passed.
- `npm_config_cache=/tmp/npm-cache npm run lint`: passed.
- `npm_config_cache=/tmp/npm-cache npm run test:e2e -- tests/submission/submission.spec.ts`: passed, 13 tests. This includes intercepted API submissions using a full name, a single name, a nickname and Unicode names, plus the existing receipt, retry, privacy, keyboard and accessibility coverage.

The temporary dependency copy and generated `next-env.d.ts` change were removed or restored before commit. Root integration still owns the cumulative build, review, deployment and final plan record.

## Commit

Pending local commit.
