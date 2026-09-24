# Plan 17 Lane 13 writer result: Live Recognitions full screen (slug live-feed, renderer id 12)

Writer: Claude Fable 5.1. Worktree /Users/anthony/.claude/worktrees/mothers-love-tv17-live-feed, branch tv17/live-feed, cut from tv17/pick 3d4b459. No database was contacted, no Supabase, Vercel or deploy tool was used, nothing was deployed. The SQL below is written to files only and has never been run anywhere, including locally.

## What now exists

An eleventh screen. The cream live recognition panel grows from the bottom rail to the whole screen under the header's rule, with the QR block inside it, three columns of larger cards scrolling continuously, the same records and newest first order as the rail (records() in core/state.js, the verified public feed only), and the same card markup (chatMarkup in core/chrome.js: avatar, name, time, message, expression chips, likes). The rail underneath fades out while this screen is up and fades back when it leaves. Default 60 seconds, enabled, last in the rotation.

## Changed files (all inside the allowlist)

New:
- public/color-polish/scenes/live-feed.js
- public/color-polish/scenes/live-feed.css
- tests/color-polish-scenes/live-feed.spec.ts
- database/013_color_polish_live_feed.sql

Registration only:
- public/color-polish/renderer.html (one stylesheet link, one script tag)
- public/color-polish/core/state.js (NAMES gains "Live Recognitions"; ORDER and MOTION_ORDER gain 12; DWELL 12:60; SCENE_NUMBERS 12:12; sceneNumber accepts 12 and the slug live-feed)

App code:
- src/lib/color-polish/contracts.ts (COLOR_POLISH_REQUIRED_SCENES, COLOR_POLISH_OPTIONAL_SCENES, COLOR_POLISH_SCENES now eleven, duration 60, normalizeColorPolishPlaylist)
- src/lib/color-polish/validation.ts (ten or eleven entries, ten originals required, live-feed appended when absent; change requests kept exactly as sent)
- src/lib/server/color-polish.ts (same rules on the server projection)
- src/components/display/color-polish/sample.ts (legacy ten screen settings list stays ten; the sample playlist has eleven)
- src/components/admin/color-polish/ColorPolishStudio.tsx (select option "Live Recognitions")

Tests:
- tests/color-polish-data/color-polish.test.ts (one expectation updated, seven new tests)
- tests/color-polish-data/sql-contract.test.ts (four new tests for database/013)
- tests/color-polish-usable/usable.spec.ts (option count 11, click order gains 12)

Not touched: boot.js, core/chrome.js, core/stage.js, renderer.css, src/lib/server/validation.ts (its playlist is the legacy ten screen display settings, unrelated), every other scene.

Files outside the repository worktree, as the order names them:
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/activation-live-feed.sql
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/rollback-live-feed.sql
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L13/ (captures and the capture script l13-capture.mjs)

## Layout numbers (drawn at 1920 x 1080; every value doubles at 3840 x 2160)

- Header rule at y 102. Panel x 34 to 1886, y 118 to 1055 (1852 x 937). Left, right and bottom edges are the rail's own; 16 px gap under the header rule. Measured identically at both widths (result.json).
- QR column 286 px: QR image 236 x 236 (rail: 130), "Recognize Someone" 32 px bold, "Who encouraged you today?" 22 px, address 17 px (text copied from the rail at render time so it always matches).
- Title row 38 px: live dot plus "LIVE RECOGNITIONS" 20 px bold, 3 px letter spacing; the rail's "LIVE CAMPAIGN" note 13 px; the countdown ring moves into this row (right 58, top 131) because its usual place is now the middle of the panel.
- Three columns, about 490 px each, 18 px apart, column height about 856 px, 16 px soft fade at the top and bottom of each column.
- Card: name 27 px bold, message 26 px (line height 1.32, pre-wrap, overflow-wrap anywhere, no clamp, no ellipsis), time 15 px, chips 16 px with 22 px icons, likes 16 px, avatar 44 px, 14 px between cards. Rail for comparison: name 18, message 18.
- Message text drawn: 26 px at 1920, 52 px at 3840 (floor in the order: 24 and 48).
- Scroll speed 22, 25 and 23.5 px per second for the three columns, so they drift apart naturally. A 500 grapheme English message makes a card about 650 px tall, shorter than a column, so it is whole on screen while it passes.
- Small pools: a column whose cards all fit does not scroll and repeats nothing (3 records: one card per column, still).
- Reduced motion: whole cards only, laid out as pages; pages change with a 600 ms opacity fade; each page stays one fifth of this screen's dwell from state (12 s at the 60 s default, never under 6, never over 15). A card taller than a column is shown in overlapping 90 px steps. Pause and the owner's still setting hold the frame and never turn pages.
- Dwell is never hardcoded: rotation uses S.dwell from the saved playlist (test: 33 s entry leaves at 33 s).
- Columns are stable: a record keeps its column while it is shown, a new record joins the shortest column and is queued to appear next, and a re-render or a later visit continues from the same place.

## Two facts that differ from the work order's wording

1. "Title in the header's top right like the other screens": in this renderer (tv17/pick) no screen puts its title in the header; each scene carries its own heading inside the stage. To fill the screen up to the header, this screen's title is the panel's own "LIVE RECOGNITIONS" row. The header is untouched. If Anthony wants a header title, that is a core/chrome.js change for the integration step.
2. "Garden already has no rail": in this renderer the rail is a permanent footer on every screen, Garden included. This screen hides it with CSS scoped to scene 12 only.

## For the integration step (Lane 5 owns renderer.css and core/stage.js)

Nothing was needed in either file. live-feed.css adds three rules that reach outside the scene, all scoped by #tv:has(... .scene[data-scene='12'] .lf-panel): the stage's overflow becomes visible while scene 12 is in the stage; the footer gets an opacity transition (1.15 s, read from TRANSITION_DURATION) and is hidden while scene 12 is current; the countdown ring moves. One global, harmless line: "#tv .footer { transition: opacity ... }" so the rail can fade back in. If Lane 5 changes .stage or .scene overflow, these rules still win for scene 12 by specificity. Under reduced motion renderer.css switches all transitions off; live-feed.css re-enables only the page fade on .lf-lanes.

The arrival overlay sits above the stage (z 20 over z 3), so it covers this panel like any other scene; its exit still flies toward the hidden rail's place at the bottom.

## The three compatibility proofs

How the old production build b7d92a0 treats an unknown slug or an eleventh entry (read from git show b7d92a0): src/lib/server/color-polish.ts projectPresentation returns null when playlist.length is not exactly 10 or when an id is not one of the ten; the route then answers 503 UNAVAILABLE. Its browser validation has the same two checks. Its renderer maps an unknown slug to Welcome. The 011 database validator also demands exactly ten, and with it an eleven entry row makes ml_color_polish_snapshot answer 503 and makes the Color Polish activate or rollback function answer STALE. So the old build must never meet eleven entries.

(a) New code, saved ten entry playlist, SQL not yet run: works. Judged safe, so the default applies (not "absent means not shown"). The server projection and the browser validation both accept ten entries and append live-feed as enabled, 60 s, last; the ten saved entries keep their order, flags and durations. A change request is stored exactly as sent (ten stays ten), so nothing the app writes can be refused by the old validator. Consequence to know: the new screen appears as soon as the new build is live, before any SQL; until the SQL runs the only way to switch it off is the app build. Tests: color-polish.test.ts "proof (a)", "stores a change request exactly as sent", "normalizes without changing the saved entries"; live-feed.spec.ts Studio test and usable.spec.ts click order (mocked ten entry snapshot, eleven screens).

(b) New code after the SQL, ten or eleven entries: works. Eleven entries are used exactly as saved (live-feed's own place, enabled flag, duration), ten entries behave as in (a). Nine entries, nine plus live-feed, twelve, duplicates, unknown ids, durations 11 or 181, extra keys, and all disabled are refused by server and browser alike, matching database/013. Tests: "proof (b)", "still requires all ten original screens..."; renderer tests "dwell comes from the saved playlist" (33 s, last, back to Welcome) and "a disabled live-feed entry keeps the screen out of the rotation"; sql-contract tests.

(c) Rollback order: rollback-live-feed.sql runs in one transaction: step 1 removes the live-feed entry from the saved playlist (the ten others keep order, flags, durations; if live-feed was the only enabled entry, Welcome is enabled so the row stays valid), step 2 restores the 011 validator word for word (checked: the function text in the rollback file is byte identical to database/011 lines 66 to 127), step 3 refuses to commit unless the saved row has ten entries and passes the restored validator. Only after that file has run may the app return to b7d92a0. The new build keeps working on the restored ten entry state (that is proof (a)). Test: "the old production build's rule ... refuses eleven entries".

Forward order: 1. deploy the new build, 2. run database/013, 3. optional activation-live-feed.sql. Running 013 before the deploy is harmless (the row stays at ten). Running the activation file before the new build is live would break the old build, and the file says so at the top.

## SQL files for Anthony's approval (none has been run)

1. /Users/anthony/.claude/worktrees/mothers-love-tv17-live-feed/database/013_color_polish_live_feed.sql : replaces only mothers_love.ml_color_polish_valid_playlist (CREATE OR REPLACE, same signature, IMMUTABLE, empty search_path). Accepts 10 or 11 entries, the ten originals required, live-feed optional, each id once, durations 12 to 180, at least one enabled. No table, row, grant or other function changes; nothing outside mothers_love; idempotent. It differs from the 011 function on four lines.
2. /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/activation-live-feed.sql : optional. Guards that 013 is in place, then appends live-feed (enabled, 60 s) to the saved row with a revision check, exactly what the app's own save does (playlist, revision plus one, updated_at). Does nothing if already saved.
3. /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/rollback-live-feed.sql : described in (c).

Note: database/ already holds 013_public_feed_100.sql from the production merge. The order names 013_color_polish_live_feed.sql, so that name was kept; the coordinator may renumber it to 014 (update the two research files' comments and sql-contract.test.ts if so).

## Command results (run by the writer, real counts)

- npm run typecheck: clean.
- npm test: 39 files, 233 tests passed, 0 failed (was 222 on tv17/pick; 11 new).
- npm run build (synthetic public config, no DATABASE_URL): succeeded.
- npx playwright test tests/color-polish-scenes/live-feed.spec.ts against next build plus next start on port 3213 (synthetic config): 16 passed, 0 failed. Rerun of the 15 direct renderer tests after the last edit: 15 passed.
- Same run also included usable.spec.ts, tests/color-polish/color-polish.spec.ts, transitions.spec.ts and helpers.spec.ts: 32 passed, 29 failed. All 29 failures carry the same test names and the same assertion lines as the recorded tv17/pick baseline (logs/e2e/pick-cfffa65-full.txt): 26 in tests/color-polish/color-polish.spec.ts (older color reference suite) and 3 in usable.spec.ts (:212 fails at its line 219 before the Studio part, :301 countdown 180 versus 30, :412 sixty second fallback). No new failure. Because usable :212 fails before reaching the option count, that edit is covered by the new Studio test in live-feed.spec.ts instead.
- Assertions can fail: with the message CSS changed to 22 px and max-height 60 px, "fills the screen ... at 1920" failed (expected at least 24, received 22) and "500 grapheme messages" failed (fits false). The reduced motion test caught a real bug during the work (renderer.css removes all transitions under reduced motion, so the page change was a cut, not a fade); fixed in live-feed.css.
- scripts/color-polish-globals-check.mjs: passed, 22 files, 224 declarations, no duplicates.
- Port 3213 stopped; next-env.d.ts restored; no .env file created or copied.

## Captures (fictional data only; looked at by the writer)

/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L13/after/<pool>/w<1920|3840>-ms<0|6000|14000|21000>/live-feed.png, pools: empty, three, hundred, long (twelve records, five of them 500 graphemes). 32 images, 0 page errors, result.json beside them holds the measured panel box, font sizes, rail visibility and scroll offsets for each. The capture script is logs/captures/L13/l13-capture.mjs (copy it into a worktree to run it: node l13-capture.mjs <output folder>).

## Limitations

- The SQL has not been executed anywhere. The writer's instructions forbade connecting to any database, so it was checked by reading, by the static contract tests and by a byte comparison of the restored validator. A run on a throwaway local Postgres before approval is recommended.
- Not seen on the church TV. The column masks and the :has rules are the same kind the renderer already uses, but the TV is the real check.
- In reduced motion the core never advances a still scene, so the rotation does not move (true for every screen today); this screen pages in place instead.
- With the owner's still setting or a pause, a card taller than a column cannot be shown whole in one frame (only reachable with unusually wide 500 grapheme text; ordinary 500 grapheme messages fit).
- A column whose cards are only a little taller than the column can show the same card leaving the top while it re-enters at the bottom, as the rail does today.
- At time 0 the like counts count up from 0, exactly as on the rail.
- The machine was under very heavy load from other lanes (load average above 250), so Playwright wall times were long; the spec carries generous time limits for that reason.
