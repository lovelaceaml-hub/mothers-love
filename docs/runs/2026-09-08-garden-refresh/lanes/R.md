# Lane R: bounded public display read recovery

## Result

Implemented a cached TV-only PostgreSQL client and an approximately 8 second whole-operation deadline for the public display snapshot read. The deadline includes pool queueing, transaction begin, SQL, and commit. A timed out request retires only the exact client generation and calls `end({ timeout: 0 })` without touching the shared mutation client. A later request creates a fresh generation. Request abort checks and the transaction-local 5000ms statement timeout remain in place.

## Changed files

- `$HOME/Projects/mothers-love-worktrees/garden-read-recovery/src/lib/server/public-display-client.ts`
- `$HOME/Projects/mothers-love-worktrees/garden-read-recovery/src/lib/server/public-display.ts`
- `$HOME/Projects/mothers-love-worktrees/garden-read-recovery/tests/backend/public-display.test.ts`
- `$HOME/Projects/mothers-love-worktrees/garden-read-recovery/tests/backend/public-display-recovery.test.ts`

## Verification

- `npm test -- tests/backend/public-display.test.ts tests/backend/public-display-recovery.test.ts`: 18 passed.
- `npm test -- tests/backend`: 70 passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `git diff --check`: passed.
- Temporary `node_modules` symlink was removed before commit.

## Commit

- `e7cb33c Bound public display reads and recover stalled pools`

Root owns build, browser, controller review, integration, deployment and final records.
