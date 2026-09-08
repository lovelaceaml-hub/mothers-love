# Admin auth boundary review event

Scope: accepted independent review corrections for the administrative workspace.

- Replaced stale authenticator requirement labels with plain owner and moderator email and password wording.
- Fixed both sidebar and topbar Sign out controls to invoke local Supabase session sign out.
- Sign out failures stay on the workspace and surface the provider error so the action can be retried.
- Added synthetic browser coverage for both role copy and both sign out controls, including local session removal and login redirect.

Verification:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npx playwright test tests/admin/admin.spec.ts --config=.tmp-playwright.config.ts --grep 'permission limits|owner settings|sidebar sign out|topbar sign out|sign out failure'` passed, 5 tests.
