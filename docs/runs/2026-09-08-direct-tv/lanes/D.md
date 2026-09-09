# Lane D, direct TV startup

## Scope

Direct public TV View startup for Plan 05. The assigned files are:

- `/Users/anthony/Projects/mothers-love-worktrees/direct-tv-display/src/components/display/DisplayExperience.tsx`
- `/Users/anthony/Projects/mothers-love-worktrees/direct-tv-display/src/components/display/DisplayExperience.module.css`
- `/Users/anthony/Projects/mothers-love-worktrees/direct-tv-display/tests/display/display.e2e.spec.ts`

## Implementation

- Removed the TV pairing panel, code input, pair request, and acknowledgement request.
- Starts with the public snapshot request and disables client authentication token lookup for this public read.
- Keeps snapshot polling and presentation ticks running before the first successful snapshot and after a temporary failure.
- Added concise connecting and unavailable startup states that retry automatically without requesting a code.
- Preserved the coordinator's public content clearing, quiet reconnect, 60 second offline grace, neutral safety screen, expiry handling, reduced motion, rotation, arrival queue, circles, animations, title, and live rail behavior.
- Reworked synthetic display helpers and replaced obsolete pairing tests with direct load, retry, no form, no pair or acknowledgement, and unauthorized resync assertions. Existing safety, layout, motion, rotation, and long-message tests remain.
- Added a 10 second AbortController timeout for each public snapshot request, unmount cleanup, and generation guards so a hung request cannot block later retries or replace newer state.
- Added a synthetic hung-startup recovery test using the fake clock. It proves the timed out request is retried and a later snapshot opens the display without pair or acknowledgement requests.
- After root browser verification showed the recovery could complete before the transient unavailable card was observed, changed the test to assert the failed snapshot request and eventual successful retry directly.

## Verification

- `npm run typecheck` passed with a temporary symlink to `/Users/anthony/Projects/mothers-love/node_modules`; the symlink was removed afterward.
- `npx eslint src/components/display/DisplayExperience.tsx tests/display/display.e2e.spec.ts` passed with the same temporary symlink; the symlink was removed afterward.
- `npx vitest run tests/display/coordinator.test.ts` passed, 16 tests.
- `git diff --check` passed.
- Browser execution, integration server, and full suite remain with the root coordinator as required by the plan.

## Handoff

Commits: `e7b9183` (`Open TV display directly from public link`), `501f2c4` (`Retry hung public display snapshots`), then `8bc9460` (`Stabilize hung display retry assertion`).

Integration note: root should cherry-pick this lane commit and run the planned direct fresh-browser, retry, safety, and visual checks.
