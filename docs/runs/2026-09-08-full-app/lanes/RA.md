# Lane RA: Admin and TV readiness audit

Status: READY for the bounded software audit. No material software blocker was found in the requested admin or display paths. Physical TV and phone commissioning remain unclaimed owner actions.

## Scope and constraints

Read-only audit of the current release worktree at `/Users/anthony/Projects/mothers-love-worktrees/ready-admin` after reading the absolute plan, run index, contract, project instructions and relevant source handoff. Reviewed email/password login, invitation and recovery setup, both sign-out buttons, Owner and Moderator boundaries, collection settings, pairing, display startup and resync behavior. No implementation edits, Git, installs, dependencies, providers, credentials or real data were used. Root owns live checks.

## Findings

- Email/password access is ready. `/admin/login` supports invited account sign-in and an explicit fresh setup link. Callback markers are forwarded to `/admin/set-password`; the setup page waits for a real provider session, verifies the provider user, enforces a 10-character password, updates the provider password, then verifies campaign membership before entering `/admin`. Invalid, expired, missing and provider-rejected setup sessions show recovery guidance without a password form. Relevant source: `src/app/admin/login/page.tsx`, `src/app/admin/set-password/page.tsx`, `src/lib/auth-client.ts`.
- No authenticator is required for either role. The admin session DTO reports `needsMfa: false`; the legacy `/admin/mfa` route redirects to `/admin`; server verification requires a verified bearer token, confirmed email and active campaign membership, while the additive password-only migration removes the old AAL2 gate. Relevant source: `src/lib/server/auth.ts`, `src/app/api/admin/session/route.ts`, `database/003_password_only_admin.sql`.
- Both sign-out buttons are wired to the same local-scope sign-out path. The sidebar and topbar buttons clear the local provider session, return to `/admin/login`, and re-check local session state if the provider logout request fails. Existing browser tests cover each button and the failure path.
- Owner and Moderator boundaries are present in both UI and server paths. Owner-only actions include moderator invitation and revocation, pairing code creation and device revocation, collection availability, and permanent recognition deletion. Moderators can inspect devices and operate ordinary display settings, but cannot invite, revoke, pair, delete or change collection availability. Server routes and the campaign SQL repeat these role checks. Relevant source: `src/components/admin/settings-access.tsx`, `src/components/admin/display-controls.tsx`, `src/app/api/admin/members/route.ts`, `src/app/api/admin/devices/route.ts`, `src/app/api/admin/settings/route.ts`, `database/001_mothers_love.sql` plus migration 003.
- Collection settings are fail-closed. The Owner setting is guarded by the server role check and the database rejects opening when cleanup health is stale. The overview exposes cleanup attention when no cleanup has run or when the latest run is more than two minutes old. Display settings report saved, pending delivery and browser-applied acknowledgement separately from physical TV state.
- Display startup is ready in software. `/display` shows a pairing gate before a verified snapshot, probes an existing HttpOnly device cookie without asking for a new code, accepts an eight-character one-time code, polls authoritative snapshots, resets the cursor on disconnect, clears personal content immediately on unauthorized responses, and enters the neutral catalog after the 60-second offline grace period. The pairing and snapshot routes set no-store or secure HttpOnly cookie behavior and the coordinator tests cover restart, delayed startup, pairing races, 401 revocation, expiry and neutral recovery.

## Verification evidence read

- `tests/admin/admin.spec.ts` covers mobile password login without an authenticator, invitation setup and reload after callback hash clearing, provider-session waits, invalid and rejected setup sessions, password update, recovery link routing, Owner and Moderator limits, both sign-out buttons and failed logout handling.
- `tests/backend/auth.test.ts` covers verified AAL1 Owner and Moderator sessions, confirmed-email enforcement, invalid-token denial and inactive or nonmember denial.
- `tests/backend/006_password_only_admin_assertions.sql` covers AAL1 Owner operations without MFA, Moderator denial of Owner-only actions, Owner delete, and outsider or revoked membership denial.
- `tests/display/display.e2e.spec.ts` and `tests/display/coordinator.test.ts` cover the pairing gate, existing-cookie startup, delayed snapshot, 401 resync, cursor reset, offline neutral fallback and current display timing behavior.
- Release evidence supplied by the run records reports final prior release verification of 64 unit checks, 48 browser checks and independent review PASS. This lane did not rerun commands under the read-only and root-live-check constraints.

## Remaining operational steps

1. The authorized Owner must complete one real sign-in at `https://mothers-love.vercel.app/admin/login` using the saved email and password. Root live checks currently show the Owner is provisioned but have no successful real sign-in evidence.
2. In Owner settings, create a one-time pairing code. Open `https://mothers-love.vercel.app/display` in the intended TV browser and enter the code before it expires. Confirm the admin page reports browser acknowledgement.
3. Separately scan the display QR with a real phone and confirm the intended TV is powered, visible at the intended viewing distance and readable. These are physical commissioning checks and cannot be proven from source or browser fixtures.
4. Keep collection closed until the Owner sign-in and immediate privacy or purge preflight are complete, then open collection through the Owner display controls.

## Conclusion

READY. No requested software path is blocked. The only remaining gaps are the real Owner sign-in, one-time TV pairing and physical TV or phone commissioning, plus the deliberate current closed-collection state.
