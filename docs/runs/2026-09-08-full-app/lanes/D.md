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
- Added arrival identity deduplication by event ID, edit-safe version handling, ten-item burst coverage, grouped acknowledgements after ten items or two minutes, cancellation on disappearance or expiry, and fair least-recently-presented rotation.
- Added content-aware featured and arrival reading time, full verbatim message treatment, clearly marked garden excerpts, exact associated expressions, no duplicate cluster fillers, shared-expression constellation atmosphere, responsive density capped at four by default and six maximum, and readable 1080p and 4K CSS sizing.
- Added manual feature selection support in the reducer, automatic recency selection, Calm, Standard, Lively and Still motion classes, reduced-motion handling that stops all CSS movement, stationary bottom-left QR with the verified submission URL, low-activity mode, and static safety cues.
- Added synchronized monthly impact totals, all nine canonical principles and phrases, one-time monthly milestones, and aggregate revision display.
- Added synthetic coordinator and browser tests for the required arrival, duplicate, edit, restart, expiry, offline, motion, milestone, pairing, startup cookie, delayed response, revocation, 0, 1, 2, 20, and long-message cases.

## Verification

- `npm_config_cache=/tmp/npm-cache npm run typecheck`: passed.
- `npm_config_cache=/tmp/npm-cache npm run lint`: passed with no warnings.
- `npm_config_cache=/tmp/npm-cache npm test -- --run tests/display/coordinator.test.ts`: 11 tests passed.
- `npm_config_cache=/tmp/npm-cache npm run build`: passed. `/display` compiled as a static App Router route.
- Synthetic browser suite: 8 tests passed against an isolated local Next.js preview on `127.0.0.1:3137`, covering pairing, existing-cookie startup, delayed response, 401 revocation, and fixture sizes 0, 1, 2, 20, and long message. Screenshot capture passed for each fixture. The final browser route mock matches both initial and cursor query snapshot requests.
- Rendered screenshot inspection: `/private/tmp/mothers-love-display-fixture.png` showed the approved warm cream, organic bubble, expressive color, readable text, atmosphere and stationary QR treatment. The file is outside the repository and contains only synthetic content.

## Known limits

- No physical television commissioning, intended-viewing-distance readability check, or phone QR scan was run. The browser screenshot does not establish those claims.
- The lane uses the foundation `qrcode` package to generate a local data URL. The backend must provide the final verified submission URL in `DisplaySnapshot.submissionUrl`.
- Root integration must include `tests/display/display.e2e.spec.ts` in the repository Playwright discovery pattern and run the full application suite after merging API and server changes.
