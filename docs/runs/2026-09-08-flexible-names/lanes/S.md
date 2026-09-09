# Server parity lane

## Scope

Removed the required first-name and last-initial shape check from submitted and recipient validation, admin editable validation, the public feed projection, and the public TV display projection. Kept trimmed nonblank checks, 80-grapheme limits, safe public field projection, moderation, and all other validation rules. Added backend regression coverage for single, full, nickname, and Unicode names, plus required, blank, and overlong rejection coverage.

## Commits

- Lane commit: `56df6bea8d2f9d792b6a9f317b837b2b092789dc`, `Accept flexible recognition names on server`
- Integrated root commit observed: `ed185a0`, `Accept flexible recognition names on server`

## Verification

- `npm_config_cache=/tmp/npm-cache npm test -- --run tests/backend`: 11 test files passed, 73 tests passed.
- Targeted ESLint passed for all eight changed source and backend test files.
- `git diff --check` passed.
- Temporary `node_modules` symlink was removed before delivery.
- Lane worktree was clean after commit.

## Handoff

Root integration owns the browser lane merge, full repository typecheck, full tests, review, deployment, and final records. The isolated server lane did not run full typecheck because the parallel browser lane was removing its old helper imports at integration time.
