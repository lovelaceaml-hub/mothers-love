# Plan 31: Display efficiency

Status: transferred in `5a1415dc514e43ef1dc543607a88cfe0ea480c4c` and locally integrated with current main `900d796e839df1430063e4bf4def0dbcf9520e1d` on the feature branch, 2026-10-10. PR #30 remains draft. No cloud push, live SQL or deployment.

Anthony authorized these improvements while keeping arrivals live at approximately five seconds and staying on Supabase Free. Existing submissions normally stay unchanged. Settings, moderation, expiry, quiet mode, presentation and cleanup safety still require verification.

## Implementation

The TV opts into `/api/display/color-polish?sync=2`. Its memory cache sends a bounded list of opaque record tokens. `public.ml_color_polish_delta(text,jsonb)` checks current metadata and an ordered manifest before fetching recipient/message text. An unchanged response carries only the current verification time and cache cursor. A changed response carries current metadata, the complete ordered pool and only records whose tokens the TV lacks. No shared server cache or persistent browser cache was added.

The pool is the newest 100 eligible recognitions, selected at PostgreSQL timestamp precision, then displayed in the existing featured-first order. Each record token includes its identity, row transaction version, application version, expiry, effective feature state and expression relationship versions. This detects edits even if an administrative SQL update misses an application version bump. Removing a record from the manifest removes it from the display cache. The token is a cache identity, never an authorization credential.

The state hash also covers settings, presentation, full anonymous insights and the event cursor. Every poll checks cleanup health and recalculates eligibility, feature expiry and Los Angeles calendar boundaries. The metadata helper preserves migration 012's frozen weekly focus and aggregate checks. The existing numeric revision is retained for compatibility but is not used to decide whether data is unchanged.

The cache lease resets hourly, refetching at most 100 full records to renew the seven-day browser expiry cap. A still-valid event cursor remains eligible for arrival delivery during that full refresh, so an announcement published at the renewal boundary is not dropped. Invalid cursors, lost cache entries, unsafe modes and arrival overflow reset safely. A valid unchanged response updates the host's last successful verification time and carries no arrivals. The existing 60-second stale-content cutoff remains in force.

Visible TV snapshots remain on a five-second cadence. Snapshot and likes-total timers stop while hidden and refresh immediately on return. A return after the stale limit clears cached personal content before requesting a reset. V6 reuses the host's verified snapshot when Color Polish is disabled, removing its redundant four-second snapshot loop. The unavailable Color Polish fallback retains its independent legacy read on a five-second cadence so it can still work when the preset endpoint is down; the host continues probing for recovery. Daily aggregates and heart reads pause while hidden; slow daily/reaction reads cannot overlap on visibility changes. Likes-total uses the isolated bounded public read client, with a five-second SQL statement timeout and eight-second wall deadline, leaving the mutation pool available.

Both runtime Postgres clients skip automatic native-array/custom-type discovery. Current bridges return JSONB and accept scalar or explicit JSONB parameters; nested expression arrays are JSONB, rather than native result columns. The disposable fixture exercises real restricted-runtime feed/older pages, heart reads and a mutation, config, TV, UUID/timestamp inputs and nested Unicode JSONB with type discovery disabled. New runtime code that returns native arrays/custom types must revisit that option. Cleanup heartbeat timestamps are excluded from the content hash; an actual disposable `purge_expired()` call verifies unchanged responses stay small while health is still checked.

The renderer assets, scene layout, transitions, sounds, reaction semantics and five-second freshness target are unchanged. Legacy GET clients, including `/world`, retain the original snapshot contract. Their full-snapshot payload behavior is outside this TV-only opt-in change.

## Local fixture measurements

`node scripts/test-display-delta.mjs` starts and removes its own temporary PostgreSQL cluster. TCP is disabled. It uses 1,200 fictional recognitions and never reads a database URL or production credentials. All repository migrations, including 019, are applied only to that disposable database. Actual reset, unchanged and arrival outputs pass the app's public projector and browser cache.

Representative serialized JSON sizes from that run:

| Response | Full recognition records | JSON bytes |
| --- | ---: | ---: |
| Legacy database snapshot | 1,000 | 560,802 |
| Legacy browser snapshot after latest-100 projection | 100 | 58,602 |
| New initial/hourly reset, including manifest | 100 | 67,779 |
| New unchanged verification | 0 | 155 |
| New single arrival, including metadata and manifest | 1 | 12,444 |

These are measured local serialized fixture payloads, not provider billing or production network measurements. Unchanged JSON is about 99.97% smaller on the database response and 99.74% smaller on the browser response. The request's token list grows to at most 3,299 characters; changed responses include a manifest and can compress less efficiently than repeated fictional message text. Initial/reset browser responses are larger because they include tokens.

Request frequency for a continuously visible active TV stays at 720 snapshot requests/hour and 360 likes-total requests/hour, plus reaction reads when the eligible pool changes. Hidden TV polling starts no snapshot/likes requests after any existing request finishes. Disabled Color Polish removes the duplicate V6 snapshot stream of up to 900 requests/hour. These hourly counts are schedule calculations, not measured billing. Database metadata/aggregate reads still occur on every visible verification.

## Build log

- Inspected AGENTS.md, HANDOFF, CONTRACT, Plan 28 and its run record, local memory summary and applicable Supabase/Postgres/web guidance. Source checkout was clean on `main` at `7cf0001`.
- Created a separate clone at `/Users/anthony/Documents/Codex/2026-10-05/task-3/mothers-love`, branch `feat/tv-display-efficiency`, under the task's writable root. This local sandbox exception keeps all existing checkouts and branches untouched.
- Used the installed Supabase CLI to create a migration, then placed it at `database/019_display_delta.sql` using this repository's numbered migration convention.
- Installed pinned dependencies only in the isolated clone. No source lockfile changes.
- Implemented the additive SQL protocol, strict public projection, memory cache, visible polling and V6 snapshot reuse. Added unit, browser and disposable SQL checks.
- Verification and deployment steps are recorded in [the run record](runs/2026-10-05-display-efficiency/INDEX.md).
- **2026-10-10, PR blocker remediation (local only).** Merged current `origin/main`
  (`900d796e839df1430063e4bf4def0dbcf9520e1d`) into the PR branch. Resolved
  overlapping polling changes by retaining the ETag heartbeat for legacy
  callers and the opt-in delta bridge for the TV cache. Hourly lease renewal now
  refreshes all record tokens while preserving a valid event cursor, so newly
  published arrivals remain deliverable during renewal. On Node 22,
  typecheck passes, 45 focused tests pass, and the disposable PostgreSQL
  integration passes 25 checks, including arrival delivery during hourly
  renewal and across an app-only rollback to the legacy SQL bridge.
  The broader unit suite passes 934 tests with one skip after excluding the
  known baseline failure. The three failing world-arrival tests also fail on
  current main with the same result. An earlier production build passed.
  A new Chromium regression test verifies that the Studio test helper accepts
  the arrival scene while its selector remains on Welcome; it passes, as does
  Node 22 typecheck. The full helper spec run had two failures before that
  helper is called: the synthetic admin sign-in remained at `/admin/login`
  instead of redirecting to `/admin`.
  The browser cache now keeps a legacy cursor separately after a full-snapshot
  fallback, so arrival polling continues during an app-only rollback. Vitest
  reports nine display-cache cases passed: seven individual tests and two
  quiet/neutral parameter cases, including the delta-to-legacy rollback path.
  Migration 019 remains unapplied; its current SHA-256 is
  `6c370231ae423c8d9bae44372f6b9849ac2a5a27b6540e45fc7888a7cba20f37`. Safe
  Vercel preview access is unavailable and automatic deployment of this branch
  is disabled, so the branch was not pushed or deployed. The final independent
  review found no actionable issues. See the
  [remediation run](runs/2026-10-10-pr-remediation/INDEX.md).

Cloud continuation: [current verification](runs/2026-10-06-cloud-efficiency/INDEX.md) and [repeatable setup/usage guards](CLOUD-VALIDATION.md). `npm run check:display-efficiency` enforces fixture payload limits and runs disposable SQL integration without connecting to a configured database.

## Section 1: Integrate the current production baseline

Retain the delta-cache protocol and legacy ETag heartbeat when integrating
current `main`. Verify the combined source on the CI Node version and preserve
any failures that are already present on `main`.

## Section 2: Complete the release prerequisites

Before app rollout, obtain approval and apply migration 019, configure a safe
preview database, enable the Vercel preview for `feat/tv-display-efficiency`
(currently explicitly disabled in `vercel.json`), complete the hosted preview
and physical-TV checks, then use the release mode Anthony chooses. The Vercel
exception targets only this branch and does not disable production from `main`.
Do not change account settings, push, change live data or deploy before those
prerequisites are met.
