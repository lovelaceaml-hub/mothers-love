# Lane A: Administrative workspace

Status: implementation complete for the scoped admin UI. Foundation commit `28b2ec3` is present in this worktree. Integration, Git history and provider actions remain owned by root.

## Ownership

This lane owns `src/app/admin/`, `src/components/admin/`, `tests/admin/`, this lane record and its CSS modules. It does not modify shared contracts, global styles, package files, backend routes, credentials or production resources.

## Implemented

- `/admin/login` provides invite-only Supabase password sign-in, an explicit invited-account setup link request with a dedicated setup heading, callback handoff for invitation and recovery links including error callbacks, missing configuration messaging and no open signup.
- `/admin/set-password` provides a dedicated session-backed password setup flow for invitation, recovery, magic-link and signup callbacks, including provider-session loading, account email verification through the provider user endpoint, invalid or expired link guidance, persisted-session recovery after hash clearing and campaign-session verification before entering `/admin`. `/admin/mfa` is a legacy redirect to `/admin`; no authenticator enrollment or challenge UI remains.
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
- `npm test` passes with 15 tests across foundation contracts, catalog, client API and admin utility coverage. The admin utility suite covers editor expiry, 500 grapheme boundaries, version conflicts, Owner versus Moderator capabilities, display acknowledgement, changed settings and aggregate-only CSV.
- `npm run build` passes on Next.js 16.3.4 and emits all admin routes, including the dynamic recognition detail route.
- Browser smoke: local `http://127.0.0.1:3040/admin/login` returned 200 and rendered the invite-only sign-in form with visible labels and public-form return link. The local server was stopped after the check.
- `npx playwright test tests/admin/admin.spec.ts --config=.tmp-playwright.config.ts` passes with 19 synthetic browser tests using intercepted Supabase and API responses. Coverage includes mobile login accessibility with axe, normal Owner entry without MFA, legacy MFA redirect, invitation magic-link password setup after the SDK clears the callback hash, persisted-session reload, provider-session loading, invalid setup-link guidance, error callback isolation from a different stored session, provider user rejection, password update followed by campaign verification, explicit invited-account recovery, Moderator permission limits, cleanup health becoming stale while the overview remains open, background refresh keeping a newly advanced cleanup Healthy, never-run cleanup messaging, editor 409 reconciliation, expiry clearing, display acknowledgement and authenticated aggregate CSV export. The temporary config and generated test output were removed after the run.
- Root integration should run `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e` after backend, submission and display lanes land. Real authorization and deployed smoke evidence remain integration-owned.

## Known integration notes

- API calls use the foundation `api<T>` bearer-token path and the exact contract routes. Server route enforcement, verified identity and role checks remain backend-owned.
- Recovery and owner-issued moderator magic links use the root-authorized `https://mothers-love.vercel.app/admin/set-password` callback. The legacy login callback preserves the query or hash, including provider error markers, and hands off to setup. Setup captures only the non-secret callback type before Supabase can clear the hash, waits for a real provider session, confirms the provider user email before enabling save, updates the provider password and verifies campaign membership through `/api/admin/session`; callback markers alone never grant access. A callback error never falls back to a different stored session.
- The detail editor sends only `EditableRecognitionFields`, never `requestKey`.
- The display UI consumes `Device.appliedSnapshotRevision`; a settings version alone is not presented as full display acknowledgement.
- The aggregate export reads authenticated `text/csv` directly and surfaces server errors without a client fallback that could mask them.
- Retention health shows Healthy only when cleanup has run within the two-minute contract window and no purges are overdue. Missing or stale cleanup is explicitly marked Attention, and a local 30-second timer updates this status while the overview is open.
- The overview performs a quiet authenticated server refresh every 30 seconds, replacing the cleanup snapshot when available. Local time still advances when that request fails, so old data becomes Attention instead of falsely remaining Healthy.
- Hide, restore, invalidate and substantive edit actions require the approved reason categories. Invalid records can be restored only while unexpired, and current manager/review rows remove expired records and cancel pending review actions.
- Expiry handling now removes the entire open recognition record from the editor DOM, including recipient, message, submitted name, expressions and conflict state. The browser test asserts recipient and private-name absence after expiry.
- Every detail response ingress checks expiry before adoption, so an already-expired GET, conflict refresh or PATCH success renders the generic cleared shell without briefly storing private fields. Recognition manager and review inbox also filter expired API rows before storing them.
- Display acknowledgement now compares only `Device.appliedVersion` with `DisplaySettings.version`; `appliedSnapshotRevision` remains separately displayed telemetry. The synthetic browser test covers an applied settings version with a differing snapshot revision.
- Physical TV power and visibility are never claimed from browser heartbeat data.
