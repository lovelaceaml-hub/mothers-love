# Lane G: Recognition Garden refresh

## Scope

Baseline `e0d32df`. Owned `src/lib/display/coordinator.ts`, the focused display unit test, and the focused display browser test. No schema, API, production, credential, or real recognition data changes.

## Reproduction

With a synthetic snapshot containing a full Garden, the existing coordinator kept the prior `gardenIds` on every poll. A newly eligible record stayed only in the authoritative snapshot and arrival queue. The same defect also left vacancies unfilled after a hidden or expired record disappeared. Rotation pause made the defect persistent because `advanceProgram` could not repopulate the Garden.

## Change

`rebuildVisibleState` now derives newly eligible IDs from the previous eligible snapshot, prioritizes those records, preserves still-valid Garden order, fills remaining capacity with the fairness sort, and caps the result at `maxBubbles`. Unchanged snapshots keep the current Garden stable. Existing queue deduplication, arrival timing, pause modes, quiet and neutral handling, expiry filtering, and privacy clearing remain unchanged.

## Synthetic verification

- Before the change, three new coordinator regressions failed: open-slot fill, reset replacement after hidden or expired records, and full-capacity polling.
- After the change, `npm_config_cache=/tmp/npm-cache npm test -- --run tests/display/coordinator.test.ts` passed: 19 tests.
- After the change, `npm_config_cache=/tmp/npm-cache npm test -- --run tests/display/coordinator.test.ts tests/backend/public-display.test.ts tests/backend/route-contract.test.ts` passed: 40 tests.
- `npm_config_cache=/tmp/npm-cache npm run typecheck` passed.
- `npm_config_cache=/tmp/npm-cache npm run build -- --webpack` passed. The default Turbopack build rejects the permitted cross-worktree dependency symlink, so Webpack was used for this isolated check.
- `npm_config_cache=/tmp/npm-cache npm run test:e2e -- tests/display/display.e2e.spec.ts --grep "newly polled recognition" --workers=1` passed: 1 synthetic browser test. It verifies full-capacity replacement while `pauseRotation` is enabled.
- A prior serial display suite run passed 26 of 29 completed tests and had 2 existing timing-sensitive failures in startup-unavailable and long-arrival cases, with 3 capture tests skipped. The focused new browser regression passes independently.

## Handoff

Commit `8b7d7e6` (`Refresh Garden with newly published recognitions`) is ready for root integration. The isolated worktree is clean and the temporary `node_modules` symlink is removed. Root owns integration, final review, production checks, and deployment decisions.
