# Plan 31: Display efficiency

Status, 2026-10-12: the PR #30 source (`3f923b3ae6ce70328234b965334dfffb800e139b`) is integrated locally on `fix/tv-display-efficiency-integration`, based on verified `origin/main` `29da0dd7aa1c5497765809696c2d40c8cb8abd09`. Commit `b315ab8` is local and unpublished. Vercel reports production READY at that base SHA (`dpl_DNb1ULXANYHiKbqNgVVZQazoPWuy`). Migration 019 already belongs to reaction batching, so the additive display migration is 020 and its index is built separately with `CREATE INDEX CONCURRENTLY`. Publishing and release are authorized; the database recovery and safe-preview gates below remain open.

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

- **2026-10-12, authorized release attempt, blocked.** Worked only in the
  isolated Copilot checkout. Read the committed plan and remediation records
  from `7a33be4`, with no edits to the original worktree. GitHub PR #30 was
  open/draft at `6bd2eab`. Production and origin/main both served `d0ed4e1`,
  deployment `dpl_BcAqXnqEmr4ZPwjNc47njN5MsBoi` (READY), preserving newer
  PRs #35 to #37. A provisional merge found five conflicting files and was
  aborted; the newer integrated payload was not validated or released.
  On Node 22.23.3, the exact remediation passed typecheck, 27 focused unit
  tests, the efficiency guard's 22 unit tests and 25 disposable PostgreSQL
  checks, a synthetic-only production build, and one Chromium Studio
  arrival-readiness regression. The migration SHA-256 matches the approved
  `6c370231ae423c8d9bae44372f6b9849ac2a5a27b6540e45fc7888a7cba20f37`.
  Current live application status could not be inspected: approved Vercel
  access returned no sensitive database URL or CA values. Administrative
  migration access and a current backup were not verified. Vercel has no
  preview environment variables, so required safe hosted preview evidence is
  absent. No live SQL, production deployment, merge or preview-enabling change
  was made. Main also contains a distinct reaction-read migration numbered
  019; resolve ledger naming and numbering before any application.
  Release mode and branch publication/merge authority no longer need a user
  decision. Details: [release attempt](runs/2026-10-10-pr-remediation/INDEX.md#authorized-release-attempt-2026-10-12).

- **2026-10-12, current-main integration and isolated verification.** Verified
  `origin/main` and production at `29da0dd7aa1c5497765809696c2d40c8cb8abd09`
  (PR #38, READY deployment `dpl_DNb1ULXANYHiKbqNgVVZQazoPWuy`). Integrated
  PR #30 source `3f923b3ae6ce70328234b965334dfffb800e139b` locally on
  `fix/tv-display-efficiency-integration`; local commit `b315ab8` is not
  published. Renumbered its migration to 020, retained 019 reaction batching,
  made both new routines additive `CREATE FUNCTION`s, and moved the index build
  to an autocommit `CREATE INDEX CONCURRENTLY` operation with metadata checks.
  The disposable SQL test caught an invalid schema-qualified index name; that
  is corrected. Typecheck, production build, 37 focused unit tests, eight
  Chromium display-cache/likes journeys, and the 22-unit/27-check disposable
  PostgreSQL efficiency guard pass. The full unit suite has 964 passes, seven
  skips and three failures in unchanged `tests/world/feed-arrivals.test.ts`;
  those same phase failures are recorded on base main. A broader browser run
  also found three unrelated Studio sign-in journeys stuck at `/admin/login`;
  the eight PR-specific display/likes journeys pass. The SQL fixture uses
  fictional rows in an isolated PostgreSQL 16 container with network disabled,
  a read-only checkout mount and no configured database URL. The Supabase Free
  dashboard has no scheduled backup, restore point or PITR. The Drive project
  folder has no database dump; a general encrypted church-data archive is not
  identified as this Supabase project. No live rows, database objects, project
  settings, preview environment variables, or production deployment were
  changed. The current backup/restore and functional preview gates remain open.

Cloud continuation: [earlier cloud verification](runs/2026-10-06-cloud-efficiency/INDEX.md) and [repeatable setup/usage guards](CLOUD-VALIDATION.md). `npm run check:display-efficiency` enforces fixture payload limits and runs disposable SQL integration without connecting to a configured database.

## Section 1: Integrate the current production baseline

Retain the delta-cache protocol and legacy ETag heartbeat when integrating
current `main`. The local integration uses the deployed `29da0dd` baseline and
preserves the current weak/strong ETag handling, reaction batching, and visible
arrival freshness. Focused TypeScript, unit, browser, build, and disposable
PostgreSQL results are recorded below as they complete.

## Section 2: Complete the release prerequisites

Publishing the integration branch and releasing it are authorized. The current
live ledger was read as 15 rows, latest `019_reaction_read_batch_100` with
SHA-256 `131762ba7c45f8557b77a6a7e185c068da8a5eb4f82ab80d34aac29793e1c639`;
it has no display-delta routine, index, or migration row. Recheck that ledger
and target immediately before any live DDL. Migration `020_display_delta.sql`
creates two new routines without replacing existing ones and requires the
separately prepared, valid latest-records index. App rollback returns to the
current main app while retaining the additive routines and index; do not run a
database teardown script.

Recovery is still a release gate. The Supabase Free dashboard showed no
scheduled database backup, restore point, or PITR. Repository manifests and
the Mother’s Love Drive project folder contain source/evidence snapshots, not
a current database dump. Drive also has a general church-data archive with
encrypted JSON/SQLite files, but no metadata ties it to this Supabase project;
its encrypted contents were not opened. Before DDL, Anthony should make a
fresh logical dump of `public` and `mothers_love` with the Supabase CLI, encrypt
it outside Git, keep the key separately, record SHA-256, and rehearse restoring
it into an isolated PostgreSQL/Supabase instance. The migration can add one
`color_polish_weekly_focus` row on the first read of a new week; no recognition
or reaction rows are edited by the migration itself.

Proposed backup run, from an authorized Mac and a temporary linked Supabase
CLI directory (the CLI may prompt for access; do not put tokens or database
URLs in shell history):

```sh
umask 077
mkdir -p "$BACKUP_DIR"
supabase db dump --linked --schema public,mothers_love --file "$BACKUP_DIR/schema.sql"
supabase db dump --linked --data-only --schema public,mothers_love --file "$BACKUP_DIR/data.sql"
shasum -a 256 "$BACKUP_DIR/schema.sql" "$BACKUP_DIR/data.sql" > "$BACKUP_DIR/SHA256SUMS"
```

Keep the plaintext only on an encrypted local volume. Encrypt the three files
into one archive with the approved local encryption tool, store its key in
macOS Keychain, verify the encrypted archive's checksum after upload to an
owner-only Drive folder, then remove the plaintext. Restore the archive into a
disposable PostgreSQL/Supabase instance and verify schema objects, ownership,
grants, and row counts without printing personal rows. Supabase's logical dump
does not include storage objects; this migration changes no storage objects.
See the [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups)
and [CLI dump reference](https://supabase.com/docs/reference/cli/supabase-db-dump).

The Vercel project has no safe preview database or preview environment
variables. The existing source-branch guard applies to
`feat/tv-display-efficiency`; do not attach production secrets to a preview.
Use the authorized integration branch preview only for synthetic/local API
mock checks until a safe preview database is available. Do not apply live SQL
or merge/deploy the app before the backup/restore and preview gates pass.
