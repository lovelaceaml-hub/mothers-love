# Lane D: Bubble Board Living Wall and display coordinator

## Setup

- Runtime: Codex, gpt-5.6-luna, xhigh
- Branch: `codex/mothers-love-display`
- Base: `81aea58`, foundation synced at `28b2ec3`
- Target: `ML-BUBBLE-APPROVED-V3`
- Ownership: `/Users/anthony/Projects/mothers-love-worktrees/display/src/app/display/`, `/Users/anthony/Projects/mothers-love-worktrees/display/src/components/display/`, `/Users/anthony/Projects/mothers-love-worktrees/display/src/lib/display/`, `/Users/anthony/Projects/mothers-love-worktrees/display/tests/display/`, and this lane record
- Protected: shared package configuration, catalog, contracts, API routes, server code, schema, submission, admin, plan, index, and other lanes' files

## Implemented

- Added `/display` with an eight-character Crockford pairing gate. The browser posts the owner-generated code to `/api/display/pair` and shows no recognition content before pairing. A startup snapshot probe reuses an existing HttpOnly device cookie without asking for a new code.
- Added cursor-aware no-store snapshot polling every five seconds. Requests use credentials, include `?after=cursor`, accept authoritative `sync` and `arrivals`, and never infer introductions from the current recognition pool. In-flight requests are serialized, older revisions are ignored, and network failure resets the cursor and holds Quiet until a verified snapshot returns.
- Added immediate 401 clearing, server-time offset plus monotonic freshness, local expiry removal, sixty-second offline neutral fallback, and verified resync release.
- Added one reducer-driven presentation coordinator for garden, featured, cluster, impact, all nine expressions, arrival, milestone, fallback, Quiet, and neutral states. The tick loop is the sole presentation clock. Protected reading holds cannot be interrupted by ordinary rotation.
- Added pause-safe arrival timing. Journey, reading pages, and completion freeze during `pauseRotation`, safety expiry and authoritative removal still apply, and resume shifts deadlines by the paused duration.
- Added arrival identity deduplication by event ID, including repeated IDs inside one delta, edit-safe version handling, ten-item burst coverage, anonymous grouped acknowledgements after ten items or two minutes that consume the entire aged batch, cancellation on disappearance or expiry, and fair least-recently-presented rotation.
- Added content-aware featured and arrival reading time, full verbatim message treatment with coordinator-owned continuation pages, completion tracking before presentation history is updated, immediately cancellable expiry and safety transitions, clearly marked garden excerpts, exact associated expressions, no duplicate cluster fillers, shared-expression constellation atmosphere, responsive density capped at four by default and six maximum, and readable 1080p and 4K CSS sizing.
- Added manual feature selection support in the reducer, automatic recency selection, Calm, Standard, Lively and Still motion classes, reduced-motion handling that stops all CSS movement, stationary bottom-left QR with the verified submission URL, low-activity mode, and static safety cues.
- Added synchronized monthly impact totals, all nine canonical principles and phrases, one-time monthly milestones, and aggregate revision display.
- Added synthetic coordinator and browser tests for the required arrival, duplicate, edit, restart, expiry, offline, motion, milestone, pairing, startup cookie, delayed response, revocation, 0, 1, 2, 20, long-message, full-message pagination, dense line-break pagination, settings flag, shared-expression connection, TV bounds, and cluster readability cases.

## Verification

- `npm_config_cache=/tmp/npm-cache npm run typecheck`: passed.
- `npm_config_cache=/tmp/npm-cache npm run lint`: passed with no warnings.
- `npm_config_cache=/tmp/npm-cache npx vitest run tests/display/coordinator.test.ts`: 16 tests passed.
- `npm_config_cache=/tmp/npm-cache npm run build`: passed. `/display` compiled as a static App Router route.
- Across the full scoped run and final focused fit run, 13 active browser tests passed against the local Next.js preview on `127.0.0.1:3137`, covering pairing, existing-cookie startup, delayed response, 401 revocation, fixture sizes 0, 1, 2, 20, long message, default clock-driven featured and arrival pagination, dense line-break bounds, settings flags, shared-expression connection truth, 1920 and 3840 bounds, and cluster card readability. The separate multi-screen screenshot capture remains opt-in and was skipped.
- Current synthetic screen captures are `/private/tmp/mothers-love-display-current/garden-multi-record.png`, `/private/tmp/mothers-love-display-current/featured-multi-record.png`, `/private/tmp/mothers-love-display-current/all-nine-multi-record.png`, and `/private/tmp/mothers-love-display-current/cluster-multi-record.png`. Visual inspection confirmed the warm cream board, organic bubbles, colored shared-expression links, compact readable garden and cluster cards, full featured reading, all nine expressions, local QR, and no clipped text in the captured 1280 by 720 viewport. The files are outside the repository and contain only synthetic content.
- Long-content browser evidence passed by default with Playwright clock advancement for featured and arrival screens at 1920 by 1080 and 3840 by 2160. Exact 500-grapheme messages with preserved line breaks reconstructed across four pages, dense legal line breaks are bounded to seven lines per page, 80-grapheme recipients remained visible, all nine expressions appeared on the continuation page, and page containers had no scroll overflow. Captures are `/private/tmp/mothers-love-display-long-current/featured-long-1920.png`, `/private/tmp/mothers-love-display-long-current/featured-long-3840.png`, `/private/tmp/mothers-love-display-long-current/arrival-long-1920.png`, and `/private/tmp/mothers-love-display-long-current/arrival-long-3840.png`.

## Known limits

- No physical television commissioning, intended-viewing-distance readability check, or phone QR scan was run. The browser screenshot does not establish those claims.
- The lane uses the foundation `qrcode` package to generate a local data URL. The backend must provide the final verified submission URL in `DisplaySnapshot.submissionUrl`.
- Root integration must include `tests/display/display.e2e.spec.ts` in the repository Playwright discovery pattern and run the full application suite after merging API and server changes.
