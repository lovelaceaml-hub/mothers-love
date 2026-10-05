# Plan 31: Display efficiency

Status: implemented locally for review, 2026-10-05. No live SQL, deployment, push or pull request.

Anthony authorized these improvements while keeping arrivals live at approximately five seconds and staying on Supabase Free. Existing submissions normally stay unchanged. Settings, moderation, expiry, quiet mode, presentation and cleanup safety still require verification.

## Implementation

The TV opts into `/api/display/color-polish?sync=2`. Its memory cache sends a bounded list of opaque record tokens. `public.ml_color_polish_delta(text,jsonb)` checks current metadata and an ordered manifest before fetching recipient/message text. An unchanged response carries only the current verification time and cache cursor. A changed response carries current metadata, the complete ordered pool and only records whose tokens the TV lacks. No shared server cache or persistent browser cache was added.

The pool is the newest 100 eligible recognitions, selected at PostgreSQL timestamp precision, then displayed in the existing featured-first order. Each record token includes its identity, row transaction version, application version, expiry, effective feature state and expression relationship versions. This detects edits even if an administrative SQL update misses an application version bump. Removing a record from the manifest removes it from the display cache. The token is a cache identity, never an authorization credential.

The state hash also covers settings, presentation, full anonymous insights and the event cursor. Every poll checks cleanup health and recalculates eligibility, feature expiry and Los Angeles calendar boundaries. The metadata helper preserves migration 012's frozen weekly focus and aggregate checks. The existing numeric revision is retained for compatibility but is not used to decide whether data is unchanged.

The cache lease resets hourly, refetching at most 100 full records to renew the seven-day browser expiry cap. Invalid cursors, lost cache entries, unsafe modes and arrival overflow reset safely. A valid unchanged response updates the host's last successful verification time and carries no arrivals. The existing 60-second stale-content cutoff remains in force.

Visible TV snapshots remain on a five-second cadence. Snapshot and likes-total timers stop while hidden and refresh immediately on return. A return after the stale limit clears cached personal content before requesting a reset. V6 reuses the host's verified snapshot when Color Polish is disabled, removing its redundant four-second snapshot loop. The unavailable Color Polish fallback retains its independent legacy read so it can still work when the preset endpoint is down; the host continues probing for recovery.

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
