# Lane A: Administrative workspace

Status: implementation complete for the scoped admin UI. Foundation commit `28b2ec3` is present in this worktree. Integration, Git history and provider actions remain owned by root.

## Ownership

This lane owns `src/app/admin/`, `src/components/admin/`, `tests/admin/`, this lane record and its CSS modules. It does not modify shared contracts, global styles, package files, backend routes, credentials or production resources.

## Implemented

- `/admin/login` provides invite-only Supabase password sign-in, reset recovery flow, invite/recovery URL password setup, missing configuration and expired session messaging, with no open signup.
- `/admin/mfa` uses Supabase MFA enrollment and challenge/verify, renders a real enrollment QR through the `qrcode` dependency, and gates owner access while allowing moderator AAL1 sessions.
- `/admin` overview shows held work, display browser heartbeat, server versus browser acknowledgement, retention cleanup health and aggregate totals without fabricated production counts.
- Recognition manager filters current unexpired records by recipient, status, expression and date, paginates at 50, keeps submitted name private, and links to the detail editor.
- Recognition detail editor separates private submitted name from public preview, enforces 500 grapheme messages and expression selections, clears personal fields after expiry while open, protects saves with `expectedVersion`, shows latest-versus-local conflict choices, and provides explicit publish, hide, restore, feature, invalidate and Owner-only permanent delete dialogs.
- Review inbox supports held-only review, publish, edit then publish, keep hidden and invalidation with reason category.
- Display controls support normal, quiet and neutral modes, calm/standard/lively/still motion, arrival and rotation pauses, read and bubble bounds, trails and constellations, Owner-only collection open, immutable all-nine/QR campaign content labels, and saved/pending/applied acknowledgement using both settings and snapshot revisions.
- Insights supports week, month, custom month and all-time aggregate views plus aggregate-only CSV download. No raw records or unique people are exposed.
- Settings and access supports Owner-authorized moderator invitations and revocation, one-time display pairing codes, device revocation, last-owner and provider boundary messaging, and Moderator read-only device inspection.
- Responsive campaign-themed CSS includes semantic controls, visible focus, 44px targets, reduced-motion fallback and phone/tablet/desktop layouts.

## Verification

- `npm run typecheck` passes in this worktree after the foundation sync.
- `npm run lint` passes with no warnings or errors.
- `npm test -- tests/admin/admin-utils.test.ts` passes with 6 tests. It covers editor expiry, 500 grapheme boundaries, version conflicts, Owner versus Moderator capabilities, display acknowledgement, changed settings and aggregate-only CSV.
- `npm run build` passes on Next.js 16.3.4 and emits all admin routes, including the dynamic recognition detail route.
- Browser smoke: local `http://127.0.0.1:3040/admin/login` returned 200 and rendered the invite-only sign-in form with visible labels and public-form return link. The local server was stopped after the check.
- `npm run test:e2e -- --config=.tmp-playwright.config.ts tests/admin/admin.spec.ts` passes with 6 synthetic browser tests using intercepted Supabase and API responses. Coverage includes login accessibility with axe, Owner MFA redirect, Moderator permission limits, editor 409 reconciliation, expiry clearing, display acknowledgement and authenticated aggregate CSV export. The temporary config and generated test output were removed after the run.
- Root integration should run `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e` after backend, submission and display lanes land. Real authorization and deployed smoke evidence remain integration-owned.

## Known integration notes

- API calls use the foundation `api<T>` bearer-token path and the exact contract routes. Server route enforcement and AAL2 checks remain backend-owned.
- Recovery uses the root-authorized `https://mothers-love.vercel.app/admin/login` callback and Supabase auth events or returned URL hash type for invitation and recovery password setup.
- The detail editor sends only `EditableRecognitionFields`, never `requestKey`.
- The display UI consumes `Device.appliedSnapshotRevision`; a settings version alone is not presented as full display acknowledgement.
- The aggregate export reads authenticated `text/csv` directly and surfaces server errors without a client fallback that could mask them.
- Hide, restore, invalidate and substantive edit actions require the approved reason categories. Invalid records can be restored only while unexpired, and current manager/review rows remove expired records and cancel pending review actions.
- Physical TV power and visibility are never claimed from browser heartbeat data.
