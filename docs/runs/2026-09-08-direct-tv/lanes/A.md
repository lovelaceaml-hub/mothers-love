# Lane A, admin controls

## Scope

Direct TV View admin experience for Plan 05. The assigned files are:

- `$HOME/Projects/mothers-love-worktrees/direct-tv-admin/src/components/admin/settings-access.tsx`
- `$HOME/Projects/mothers-love-worktrees/direct-tv-admin/src/components/admin/display-controls.tsx`
- `$HOME/Projects/mothers-love-worktrees/direct-tv-admin/src/components/admin/admin-overview.tsx`
- `$HOME/Projects/mothers-love-worktrees/direct-tv-admin/src/app/admin/display/page.tsx`
- `$HOME/Projects/mothers-love-worktrees/direct-tv-admin/src/app/admin/settings/page.tsx`
- `$HOME/Projects/mothers-love-worktrees/direct-tv-admin/tests/admin/admin.spec.ts`
- `$HOME/Projects/mothers-love-worktrees/direct-tv-admin/tests/admin/admin-utils.test.ts`

## Implementation

- Removed admin device list, pairing code creation, device revocation, device state, and device API calls from Settings and access.
- Added a direct `Open TV View` link to `/display` for Owner and Moderator admin sessions.
- Kept member invitations, member revocation, and collection authorization unchanged.
- Changed Display controls to read and save global settings without device acknowledgement state.
- Changed the overview and display controls copy to describe open TV View refresh behavior and the useful offline caveat.
- Updated the admin page descriptions to remove legacy pairing wording.
- Removed synthetic device fixtures and obsolete acknowledgement assertions from affected admin tests.

## Verification

- `npm_config_cache=/tmp/npm-cache npm run typecheck` passed with a temporary symlink to `$HOME/Projects/mothers-love/node_modules`; the symlink was removed afterward.
- `npm_config_cache=/tmp/npm-cache npm run lint` passed with the same temporary symlink; the symlink was removed afterward.
- `git diff --check` passed.
- Browser execution remains with the root coordinator as required by the plan.

## Handoff

Commit: `553297a` (`Replace admin device pairing with direct TV View`).

Integration note: root should cherry-pick this lane commit and run the planned browser checks.
