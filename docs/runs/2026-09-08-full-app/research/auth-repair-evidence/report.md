# Mother's Love admin authentication repair

Scope: synthetic local browser checks only. No provider account, credential, campaign member, or real email data was used.

Changed admin files:

- `src/app/admin/login/page.tsx`
- `src/app/admin/set-password/page.tsx`
- `src/app/admin/mfa/page.tsx`
- `src/components/admin/admin-shell.tsx`
- `tests/admin/admin.spec.ts`
- `docs/runs/2026-09-08-full-app/lanes/A.md`

Verified behavior:

- Invite and recovery callbacks hand off from login to the dedicated password setup page before the auth SDK can clear the callback hash.
- Setup waits for a provider session, verifies the provider user email, then enables password save.
- Provider error callbacks do not fall back to a different stored session.
- A rejected provider user call keeps password save unavailable and gives fresh-link guidance.
- Normal Owner sign-in enters the admin workspace without an authenticator step.
- The legacy MFA route redirects to admin and exposes no enrollment controls.

Checks:

- `npm run lint`
- `npm run typecheck`
- `npm test`, 15 tests passed
- `npm run build`
- `npx playwright test tests/admin/admin.spec.ts --config=.tmp-playwright.config.ts`, 19 tests passed

Screenshots:

- `login-setup-phone.png`, phone setup-link request view
- `set-password-phone.png`, phone password setup view with synthetic verified email

The browser suite used intercepted synthetic Supabase and admin API responses. No email was sent and no token or credential was written to this report.
