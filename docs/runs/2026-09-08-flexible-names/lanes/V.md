# Lane V: visible name content correction

## Scope

Added the shared `hasVisibleNameContent` predicate in `src/lib/name-validation.ts`. It removes whitespace, control characters, and Unicode `Default_Ignorable_Code_Point` characters only while checking whether a name is visibly nonblank. Stored and projected names remain unchanged, with the existing 80-grapheme limit and no shape requirement.

Applied the predicate to the browser submission validator, public submission and admin edit validation, public feed projection, and public display projection. Added focused regressions for zero-width space, zero-width joiner, variation-selector-only, and control-only names, plus visible combining-mark, joined-family-emoji, emoji, single, and full names.

## Verification

- `npm_config_cache=/tmp/npm-cache npm test -- --run tests/submission/submission-validation.test.ts tests/backend/validation.test.ts tests/backend/public-feed.test.ts tests/backend/public-display.test.ts`: 4 files, 41 tests passed.
- `npm_config_cache=/tmp/npm-cache npm run typecheck`: passed.
- `git diff --check`: passed.

## Result

The review finding is corrected in the assigned lane. Root integration owns the full build, deployment smoke checks, and review retry.
