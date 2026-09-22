## September 20: sculpted 3D heart with sheer ribbons, on a branch, not released

Anthony asked to replace the rose heart and its thick gold hoops on the Peace in Practice TV screen with the approved three dimensional study from his handoff folder (`Mothers_Love_Heavenly_Ribbons_3D.html`): a sculpted rose heart, sheer pearl and champagne ribbons passing behind it and in front of it, fine gold hems, sparks in the space around it, and a wave that unfolds through the silk. Status: built and checked on branch `change/heart-ribbons-3d`, cut from production commit `5d113e8` (`codex/mothers-love`). Production is unchanged; merging and releasing wait for Anthony's word.

Verified render path: `/display` renders `ColorPolishHost`, which frames `/color-polish/renderer.html`; the heart belongs to scene 9, `public/color-polish/scenes/peace-in-practice.js`, inside `#heart-host`.

Changes on the branch:
- `public/color-polish/scenes/peace-in-practice-heart3d.js` (new) is the study's own dependency free WebGL 2 renderer, without its page, sliders, buttons, material panel or pointer orbit. It draws on a clear canvas so the scene's paper and raised hands show through, keeps the study's calm opening camera, unrolls the ribbons by itself when the scene opens, and sends the wave of light again about every 23 seconds. It owns no loop: the renderer core calls `draw()` from its one frame loop, so still mode, reduced motion, a paused display, a hidden tab, arrivals and scene changes all hold it. It paints 40 times a second at most and steps its own resolution down (75 percent, then 50 percent) on a display that cannot keep up.
- `public/color-polish/scenes/peace-in-practice-heart-mesh.js` (new) is the study's heart mesh, copied unchanged (603 KB, about 349 KB compressed). It is a script because the renderer page allows no network reads.
- `public/color-polish/scenes/peace-in-practice.js` mounts the WebGL 2 heart first and keeps the Canvas 2D heart, unchanged, as the fallback when WebGL 2 is missing, fails to start, or loses its graphics context. Leaving the scene gives back every GPU object and the context itself (`onLeave`); a redraw in place keeps the same heart.
- `public/color-polish/core/host.js` gives the context back when the display is cleared. `renderer.html` loads the two new scripts; the page's content policy is unchanged. `peace-in-practice.css` styles the new canvas, which never takes a pointer, so a click still advances the scene.
- Tests: `tests/color-polish-scenes/peace-in-practice-heart3d.spec.ts` (new, 7 journeys, asks the test browser for software WebGL because the default test browser has none), and the five Canvas 2D heart journeys in `peace-in-practice.spec.ts` now take WebGL 2 away first through `withoutWebGL2` in `helpers.ts`.

Anthony's first look (same day): "the ribbons are too bunched together", with a picture of the study at movement 1.80, golden glow 100, sculptural depth 115, drifting light 100 and the gentle camera sway on. The first version had held the ribbons to 56 percent of their rise and fall to keep them under the subheading. They now keep the study's full sweep at those settings: the canvas reaches from behind the heading to behind the feed panel, the heading's words are drawn on top of the ribbon tips (about 4 percent of the silk is ever up there), and the camera sways gently as in the study, never orbiting.

Remaining differences from the study: the heart is drawn 250 pixels wide (279 before); the silk is a touch less sheer with warm pearl and slightly deeper gold hems, because the study's pearl all but vanished against this scene's pale paper; the study's sky and light shafts are left out and only a soft warm glow behind the heart remains.

Checked on this Mac only (Chromium, Apple M1 Pro, plus the software renderer): the real `/display` route with synthetic records at 1920, 3840 and phone sizes, 120 frames a second with the heart painting 40 times a second, five scene exits and returns with the context given back every time and exactly one heart after each return, a clean browser console, reduced motion, a lost context, and no WebGL 2. Not checked: the physical church TV and its browser, and any real phone.

Rollback: before release, delete the branch. After a release, `npx vercel rollback` to the deployment that was live before it (today that is `dpl_7wKs8wqW6wh3Qf8HcvxqdRTj1jni`, commit `5d113e8`), or revert the branch's commit; no database change is involved.

## September 20: admin list shows every submission, in the order it came in

Anthony reported that not every submission showed in admin and asked to see them all, with their details, in the order they came in. Root cause: the Recognitions screen and the Review inbox asked the API for `page=1`, and the API handed that number straight to the database, which counts pages from 0. Every visit therefore skipped the newest 50 recognitions (with 164 live rows, the screen showed rows 51 to 100 as "page 1" and the review inbox only ever showed held items beyond the first 50). The live table holds all 164 recognitions since September 12 and the archive is empty; nothing was lost, it was hidden by the page offset.

Changes on branch `change/admin-all-submissions-in-order`:
- `src/app/api/admin/recognitions/route.ts` converts the screen's 1-based page to the database's 0-based page and accepts `sort=oldest|newest` (validated in `src/lib/server/validation.ts`). This alone fixes the missing rows and the review inbox.
- `src/components/admin/recognition-manager.tsx` defaults to oldest first, numbers every row by arrival order (the number is stable in either order), and shows the submitted name and full message in the list next to recipient, expressions, status, created time and feature. The order control and the numbering helper live in `admin-utils.ts`.
- `database/015_admin_list_order.sql` teaches `admin_list` in `public.ml_api` the `sort` payload key and makes it echo the order it used. Same guarded text-replacement shape as migration 013; it raises and changes nothing if the function text differs. Until it is applied the screen still works but says "The database is still showing newest first. Apply database migration 015" and numbers rows from the total downward.

Release order: apply migration 015 in the Supabase SQL editor (ledger row `015_admin_list_order`), then deploy the branch. Deploying first is safe (the notice explains the order), applying first is safe (the old code ignores the `sort` echo). Not applied and not deployed by this session; both wait for Anthony.

Verified: typecheck clean, 269 of 269 unit tests (4 new route tests, 3 new validation tests, 3 new migration text tests, 4 new numbering tests), migration 015 applied to an isolated local PostgreSQL 16 after 001, 002 and 003 (oldest and newest orders, paging, unauthenticated refusal, and a second run refused by its precondition), the live function text checked to contain each replaced anchor exactly once, and the two new admin browser journeys in `tests/admin/admin.spec.ts` (25 of 27 admin journeys pass; the two failures, `editor reconciles a 409` and `expired PATCH response`, fail the same way on the untouched base commit and are unrelated). Lint has one pre-existing error in `ColorPolishStudio.tsx`. Not verified: the screen against the live database.

Open: recognitions created after September 19 still get a 7 day expiry, so from about September 26 they will leave the admin list into the archive again until Plan 18 Section B and C land. Search still matches recipient, submitted name and message.

## September 19 (evening): bubbles come in one at a time after a scene change

Live at https://mothers-love.vercel.app/display as commit `770384b` on `tv17/pick`, Vercel production deployment `dpl_6TxaUYW8F7fMGJfqBRJnYMtf51K2` (mothers-love-2asdjotfz-lvzion.vercel.app), released at Anthony's word. Anthony saw the bubbles already in place when the TV changed screens. Now each message bubble of the incoming screen fades and grows in on its own, in a shuffled order at uneven moments: the first when the new screen is about half faded in, all settled within about 3.5 seconds however many bubbles there are. It covers Welcome, Garden, Featured Expressions, We Are Peacemakers, Peace in Practice and Expression Orbit. Still mode and reduced motion keep the old instant bubbles. Anthony approved the speed ("keep it"). Code: `public/color-polish/core/transitions.js` (entrance clock), `transitions.css` (applies it to each bubble's inner circle and rings), `stage.js` (starts it on every scene change and ticks it).

Rollback: `npx vercel rollback dpl_6vCm6EVxKW24EwDYrp1cZisL182L` (the Plan 17 build that was live before). No database change was involved.

Verified: new `tests/color-polish-scenes/bubble-entrance.spec.ts` 2 of 2, `transitions.spec.ts` 7 of 7, globals check, live smoke (/display 200, live transitions.js carries the entrance). The full scene folder and review were skipped at Anthony's request for speed. Before deploying, the live TV files were confirmed identical to `1102e87`, so nothing live was replaced.

## September 19 (later): Plan 17 update live, arrivals no longer cut off

Live at https://mothers-love.vercel.app/display as commit `1102e87` on `tv17/pick`, Vercel production deployment `dpl_CezkcqH5eVHbebaFHvoZ5XThZj84` (mothers-love-l065i0zj3-lvzion.vercel.app), released at Anthony's word ("get it live") after he watched the preview on the TV. On top of the earlier September 19 release it adds the Welcome bubbles that fly in and out as one object, the group entrance as a wave of five (400 px, 21 seconds, long messages share that time across pages), the Peace in Practice heart with flowing ribbons of gold, and one fix: a newly arrived recognition's heart count reaches the TV a moment after the recognition, and the renderer treated that as the message changing and cancelled the entrance about a second in; a heart count change no longer cancels an arrival (`public/color-polish/core/host.js`).

Rollback: `npx vercel rollback dpl_GQH2cvVPc7kPchUR9ko5AoHrZ7Br` (the earlier September 19 release). No database change was involved.

Verified: live smoke check only (/display returns 200 and the live host.js carries the fix). Integration checks at `b81c488` earlier the same day: typecheck clean, 255 of 255 unit tests, build, 284 of 284 scene tests, probe at 3840. No test ran on the final build, and the arrival fix was found by reading the code, not reproduced; both at Anthony's request for speed. Open: watch one real arrival on the church TV; the Welcome 40 second saved playlist value still waits for Anthony; worktree cleanup not done.

## September 19: Plan 17 TV screens and Live Recognitions are live

Live at https://mothers-love.vercel.app/display as commit `011a9ed` on `codex/mothers-love` and `tv17/pick` (Vercel production mothers-love-hoymiyv55-lvzion.vercel.app, deployed by Anthony). The release holds every Plan 17 screen change, the receipt feed and steady hearts release, and the new eleventh screen, Live Recognitions (https://mothers-love.vercel.app/display?scene=live-feed): the recognition strip grown to fill the screen, at the strip's own text sizes, two columns scrolling at 8 and 9 px per second, the second column starting half a card down. Anthony approved it on the church TV.

Verified: `tests/color-polish-scenes/live-feed.spec.ts` 18 of 18 on the final code, and a live smoke check (/, /recognize, /display return 200, the live script carries the new speeds). Before the receipt feed merge the build passed typecheck, 255 of 255 unit tests, the build, and 275 of 276 scene tests (`status.spec.ts:110` timed out loading the Studio page and was not rerun). No test ran on the merged build, at Anthony's request for speed.

Open: `database/014_color_polish_live_feed.sql` is NOT RUN and is not needed (the screen uses its default: enabled, 60 seconds, last). Its number collides with the applied `database/014_recognition_archive.sql`, so renumber it before it is ever run. The live saved playlist keeps its old durations; the change to 60 seconds waits for Anthony. Worktree cleanup is not done. Full history: [Plan 17](PLAN-17-tv-fit-and-release.md) Build log, kept in /Users/anthony/Projects/mothers-love/docs/.

## September 19: receipt feed, steady hearts, and nothing is deleted any more

Live at https://mothers-love.vercel.app as commit `326e649` on `codex/mothers-love` (Vercel deployment dpl_7ar3DU5LmpEpWwQJG1B1JDUFUnHr, READY). After a recognition is sent, the receipt screen (the one offering Recognize Someone Else) now shows the same Recent recognitions list as the home page; the form itself still shows no feed. Hearts no longer flash: the 10 second feed refresh used to reset every heart to a grey loading state, and a tap waited for the server before changing. Now confirmed hearts hold steady through a refresh, and a tap fills at once, then takes the server count, rolling back on failure.

Migration 014 (`database/014_recognition_archive.sql`) is applied to the live database with a ledger row. The 168 hour cleanup now copies each recognition, with its expressions and heart count, into the private table `mothers_love.recognitions_archive` before removing it. Verified one minute after applying: cleanup healthy, collection open. This reverses the old rule that personal copies expire; Anthony decided it on September 18 and 19.

Verified: typecheck, 222 of 222 unit tests, lint on the changed files, 9 of 9 heart journeys, 9 of 9 feed journeys, 2 new phone-size journeys in `tests/receipt-feed`, the Vercel preview build, and the live form bundle containing the receipt feed code. Not verified: nobody has yet watched the hearts or the receipt feed on a real phone against the live site. Two older journeys fail because of the earlier Color Polish colours (expressions guide contrast, expression card background assertion); a separate session is fixing them.

Open: keeping recognitions on the home page and TV forever, and the admin view of all details, are planned in [Plan 18](PLAN-18-keep-forever-and-admin-details.md), a draft waiting for Anthony. Interim: `database/ops/2026-09-19-extend-to-21-days.sql` extends current recognitions to 21 days; the coordinator's tool was refused permission to run it, so Anthony runs it in the Supabase SQL editor. Scripted requests to the live site from this Mac may get 403 from Vercel bot protection after a heavy check loop on September 19; use the Vercel tools instead.

## September 18: TV QR code opens the home page

The QR code on the TV display at https://mothers-love.vercel.app/display now opens the home page, https://mothers-love.vercel.app/, instead of the recognition form, and its printed caption reads mothers-love.vercel.app. Anthony's request. Changed files: src/components/display/color-polish/renderer.tsx (QR payload), src/components/display/V6DisplayExperience.tsx (fallback TV QR) and public/color-polish/renderer.html (caption). The snapshot submissionUrl contract and database setting are unchanged. Verified: typecheck, 222 of 222 unit tests, production build, and the live QR decoded from a headless screenshot as https://mothers-love.vercel.app/. Branch change/tv-qr-home, deployed as dpl_DEwMhtevRw9uf1WyuSFPUGotNm27 (full replace). Rollback runs npx vercel rollback to dpl_2DvTW5WVmD2Up52XYBZZ25FGQf1t, commit 45d7277.

## September 12: Plan 15 preview, production held

[TV test preview](https://mothers-love-d4ve0196a-lvzion.vercel.app/display) runs code commit `b865073` on `codex/tv15-full-preview`, in `/Users/anthony/Projects/mothers-love-worktrees/tv15-b2-preview`. All ten TV scenes are integrated with the original 1.15 second live crossfade. Anthony deferred the Turning Nave; its prior version remains at `64f5365`. Production remains `1532068` and has not been pushed or promoted. [Current verification and remaining TV approval](runs/2026-09-12-tv-next-level/lanes/astra-full-pass.md). Preview access needs a Vercel session or temporary share link.

## September 10: steady TV, scene countdown, dominant home action

Three more follow-ups from Plan 11 are live at https://mothers-love.vercel.app. The TV display at /display now stays steady through brief connection glitches, and every scene shows a small, subtle countdown ring in the bottom right corner. Two root causes of the flashes were fixed: every new poll had been aborting the in-flight request with a timeout too short for a healthy but slow read, and the renderer iframe was remounting on any momentary status change, dropping the bootstrap handshake. On phones, the Share a recognition action is now the dominant element, pulsing in front of the floating medallions, and recent recognition cards are shorter without truncating messages. Verified in the main checkout: typecheck clean, 222 of 222 unit tests, a production build, the renderer probe at zero issues across all 10 scenes, and 60 browser journeys passing, 1 skipped. Deployed as commit c28f8c6, Vercel deployment dpl_QftFLj8ww2f83bkhDPsRGH18yqCm, READY. Rollback runs npx vercel rollback to dpl_9DsFVYvDX1fSXRirH3vGHfxeFwQd, commit 076c4cd, the Plan 11 build; no database change was involved. Three pre-existing browser test failures are unchanged, plus 26 pre-existing failing journeys in tests/display/display.e2e.spec.ts that target a legacy test id nothing has rendered since commit a7dca27. Read /Users/anthony/Projects/mothers-love/docs/PLAN-12-tv-stability-countdown-and-home-action.md for the full history.

## September 10: TV click advance and home action

Two follow-up changes from Plan 10 are live at https://mothers-love.vercel.app. On the TV display at /display, a click, tap, ArrowRight or Space now advances to the next scene, live only, never in the Studio sample preview. On phones, the single Share a recognition action now sits above Recent recognitions with a coral, peach and gold shimmer, and /recognize shows only the form, with no live campaign feed; both name fields show titled examples like B. Daniel and S. Grace L. Verified in the main checkout: typecheck clean, 222 of 222 unit tests, a production build, and 55 browser journeys passing, 1 skipped, and 3 pre-existing failures unchanged from before this release. Deployed as commit 076c4cd, Vercel deployment dpl_9DsFVYvDX1fSXRirH3vGHfxeFwQd, READY. Rollback runs npx vercel rollback to dpl_BaxrmngrNd8yEjFttZUQBQBKTMRr, commit 06172bb, the Plan 10 build; no database change was involved. Read /Users/anthony/Projects/mothers-love/docs/PLAN-11-tv-click-and-home-polish.md for the full history.

## September 10: Color Polish live

Color Polish TV and sample preview are live at https://mothers-love.vercel.app/display and https://mothers-love.vercel.app/admin/display, running the new renderer with 10 scenes, replay and pause. Database settings are at version 6, revision 2, presentation enabled true.

Fix commit 06172bb deployed as dpl_BaxrmngrNd8yEjFttZUQBQBKTMRr, READY. Migration 012 and activation were applied through Anthony's prepared SQL paste in the Supabase SQL editor at about 4:15 PM Pacific time. The campaign ledger mothers_love.schema_migrations now has 10 rows, with a matching hash and one settings event recorded.

Verified: typecheck clean, 222 of 222 unit tests, production build, 2 of 2 color-polish-usable browser journeys, the isolated PostgreSQL fixture for migration 012, and all 10 renderer probe scenes matching the approved design, including the fixed Milestone scene. Live checks confirm the API, the database ledger and the TV display all agree.

Rollback: docs/runs/2026-09-10-color-polish/research/rollback.sql runs a version-checked disable. The TV returns to the preserved V6 renderer on its next 5 second poll. Prior deployments dpl_2ba7dzvVR8kH8YKh4HzwfBsuqbNc and dpl_CmSSPmnFHXQcTq9jew1jsT1GFHsH remain available in Vercel.

Open follow-ups: pixel parity, advanced preview drafts and preset editing (deferred by Anthony), an admin route for activate and rollback (SQL only today), full lint cleanup, and the physical TV, audio chime and phone camera QR checks. Ledger rows for migrations 010 and 011 are tracked only in Supabase migration history.

# Handoff

## September 12: latest 100 recognition feed

The public home feed at https://mothers-love.vercel.app now shows the latest 100 published, unexpired recognitions instead of stopping at 50. The browser accepts all 100 and loads heart counts in safe batches of no more than 30 IDs. The recognition form remains at https://mothers-love.vercel.app/recognize.

Production migration 013 and release commit `42115bd045db40d7e2a05b18c70671ba52dd1200` are live as Vercel deployment `dpl_tCHujonmSdnsNDqi5vTTj81MNEAo`, Ready. The database function reports a limit of 100 while execute permission remains limited to `mothers_love_runtime`. Anonymous and authenticated roles remain denied.

Verification passed: typecheck, 222 tests, production build, focused lint, 9 feed browser journeys, and an isolated PostgreSQL 16 migration and fixture run. The final canonical-site check returned and rendered all 57 currently eligible records, which exceeds the former 50-record cutoff, with no load error. See [Plan 16](PLAN-16-feed-100.md) and the [run record](runs/2026-09-12-feed-100/INDEX.md).

## Interview completion update

The missing interview sequences, whole-card selection, true screen previews, and fair teaching rotation are implemented. Current work: [Plan 09](PLAN-09-interview-completion.md). Live and verified at https://mothers-love.vercel.app. All 14 integrated browser checks and three production smoke checks passed. Latest instructions use Luna max lanes plus controller corrections, no Terra.

## Plan 08 TV Garden and submission release

## Dynamic TV presentation correction

The TV presentation now keeps owner-enabled effects active, restores exact circular Recognition Garden cards, shows every public recognition message inside its circle with safe bounded scrolling, and gives Garden, impact, expression, teaching, invitation, and status panels continuous glow, sparkle, and gentle title motion. Reduced-motion and privacy states remain authoritative. See the correction receipt at [dynamic TV presentation](runs/2026-09-09-tv-garden-refresh/logs/2026-09-09T0613Z-dynamic-tv-presentation.md).

Live at https://mothers-love.vercel.app/display. The TV View is now a Garden-led playlist with naturally drifting recognition cards, bounded visual rendering, fair rotation, nine waiting buds, ribbons for Monthly Impact and Shared Expression, a flower wheel for Nine Expressions, and friendly teaching and invitation screens. Display Studio at https://mothers-love.vercel.app/admin/display now offers the fixed screen library, add, remove, restore and reorder controls, Safe Sample or approved-content preview, tempo, timing, Garden amount without a user-facing cap, effects and gentle chime controls. The recognition form at https://mothers-love.vercel.app/recognize now gives all nine expression choices matching mini-scenes and the coral-orange-gold Share Recognition selection treatment.

Runtime source 98f06cc is live as Vercel deployment dpl_GHX7pC61f94emNrjfkM2wqihKq3g, READY with the production alias confirmed. The live repair restores visible Garden effects and makes the owner-selected Lively mode take priority over a browser reduced-motion preference, regardless of tempo. Database migration 008 remains private inside the `mothers_love` schema. Migration 009 adds a narrow public security-definer bridge for Display Studio saves, with an empty search path and execute granted only to `mothers_love_runtime`.

Verification passed: typecheck, build, 181 unit and contract tests, and 12 synthetic Plan 08 browser journeys against the production alias. The new browser check proves Lively motion with Standard tempo remains animated even when the browser requests reduced motion. Positive display checks intercepted every application API request, so no live recognition, participant identity, Owner session, or submission was read or submitted. A runtime database connection check reached the Studio-save bridge with an invalid actor and made no change. Final independent Terra confirmation review is recorded in the Plan 08 run record. Read [Plan 08](PLAN-08-tv-garden-and-submission.md) and the [Plan 08 run record](runs/2026-09-09-tv-garden-refresh/INDEX.md).

The remaining human commissioning check is physical: open https://mothers-love.vercel.app/display on the connected TV at 1080p and 4K, check viewing-distance readability and chimes, scan the two official QR destinations with a phone, and sign in as Owner at https://mothers-love.vercel.app/admin/login.

## Direct TV link release
Anthony removes the TV code requirement. Plan 05 has deployed /display as public and read-only, preserves global controls and privacy clearing, and removes pairing and device-status controls from the interface. Admin authentication stays protected. Read [Plan 05](PLAN-05-direct-tv.md) and its [run index](runs/2026-09-08-direct-tv/INDEX.md). Earlier paired-only release sections below are historical and superseded for TV access. Live fresh-browser, anonymous API,80browser journeys and5visual checks passed. See [publication](runs/2026-09-08-direct-tv/research/publication.md) and [database release](runs/2026-09-08-direct-tv/research/database-release.md). Final native review found a deletion revision regression. Production is temporarily rolled back while the immutable007 follow-up is verified. Final review and backup remain in progress.

## Current presentation and hearts release

Live at https://mothers-love.vercel.app. The form stacks one expression per row, highlights selected cards with gold shimmer and a check, and places a compact keyboard-scrollable latest-30 feed below its titles. Public hearts are smaller at the top right. The TV restores circular compositions, drift, bounce, trails, constellations and sparkle, with page titles in the top-right header. Recognition Garden has no duplicate rail. Other eligible TV screens retain their paired feed. Long-message reading panels preserve the complete message; privacy and reduced-motion controls remain authoritative.

Reviewed runtime e63ddc4ce8067b05f0505e9ac12357f7c32c510a and the completed status board are deployed from 64a8a13 as dpl_FxVEJGZq1m4miD8rDHCdicm7uFpf, READY with the production alias confirmed. The final TV change passed 24 deployed journeys, six deployed three-size motion/geometry/accessibility checks covering 15 rotating scenes, and a separate local milestone/arrival capture. The form passed 30 deployed journeys and six phone/desktop/reduced-motion views. Earlier cumulative verification passed 84 unit tests and all 80 browser cases including optional captures; the last focused TV run skipped three optional captures. Immediate live service and authorization smoke passed. No real recognition or Owner session was used for positive tests.

Read [Plan 04](PLAN-04-polish-and-hearts.md), the [run index](runs/2026-09-08-polish-hearts/INDEX.md), and [restoration publication](runs/2026-09-08-polish-hearts/research/restoration-publication.md). Three synthetic evidence archives are privately backed up. Plan 04 is complete; the [final production receipt](runs/2026-09-08-polish-hearts/research/final-publication.md) records the deployed commit, private push, parity and immediate checks. Final native Sol high controller review passed with all 152 sealed files verified. Private source commit 2e03a750e3d180aa81451dc62140d32984b8ecff is pushed and the remote HEAD is verified. Migration 005 and unchanged shared-database metadata remain verified; these visual corrections need no database changes. Physical TV pairing, viewing-distance readability, a phone camera QR scan and real Owner sign-in remain unverified.

## Earlier deployed release

Status: ready to use at https://mothers-love.vercel.app. The home page is a live chronological recognition list; the full form is https://mothers-love.vercel.app/recognize. Small Admin navigation opens email/password sign-in. Latest presentation sourcec128f83, application deploymentdpl_DfPNeBPD6UQSF2yUT5Wg2LF7uWdn. Feed and form production checks passed. The final static publication receipt is in runs/2026-09-08-live-feed/research/publication.md.

## Current feed verification
Luna xhigh implementation, native Sol high controller review and independent Terra high privacy review passed. Lint,77unit tests, productionbuild,18affected browserjourneys and five local/production synthetic axe and bounds states passed. After final text correction, all12affected formjourneys passed again on production. Real feed200/no-store/noindex exposes only sixpublicfields. Configuration remains open, protectedadmin/display401/no-store. Migration004 added only a campaignfeed function and ledger row; existing public/auth source/owner/ACL fingerprint unchanged. Synthetic evidence is privately backed up in Drive with verifiedSHA256. Typed names remain unverified, and moderation still uses a basic keyword filter. No participant accounts or recipient roster were introduced.

The following sections preserve historical full-release evidence. Current plan is PLAN-04-polish-and-hearts.md.

## Earlier full-release verification
Root: 71 focused tests, lint and production Turbopack build pass. All 48 synthetic browser journeys pass on the deployed assets, including 23 admin flows; one optional screenshot-only test is skipped. The live API rejected malformed names with 400 while collection was still closed. After activation, nine real anonymous page views passed with zero axe violations and no horizontal overflow. Evidence is in runs/2026-09-08-full-app/research/readiness-evidence. Positive browser paths use intercepted synthetic APIs, and no valid synthetic recognition was inserted into production.

Independent Terra high readiness review PASS verified 92 sealed file hashes and the scoped activation query. The previous full-release review and all database/security receipts remain historical evidence in the same research folder. No material finding remains from the three Luna readiness lanes.

## Activation and data boundary
Anthony's latest request authorizes everything deployed and ready to use. Root invoked the existing campaign settings operation on the verified Owner's behalf, with preflight version 1 and closed collection and healthy cleanup checks. Only collectionOpen changed, version advanced to 2 and the ordinary settings event was emitted. The operator query required a unique active Owner with confirmed email and a password, returned no identity, and preserved every unrelated setting. Exact query SHA-256:43f15f674f7b897dc87029e4011875c827c8ee4d9c189604a1a826f9c4f29794. This was an authorized operator action, not a real Owner browser sign-in test.

Existing Supabase target cvuwdlmlukepwfffpgdu, private mothers_love schema and restricted mothers_love_runtime login remain. All 001/002/003 migration ledger hashes match reviewed artifacts. Certificate-verified TLS is mandatory. No new schema, role, credential, service, shared Auth setting or unrelated application change was made. Cleanup remains healthy; effective collection fails closed if cleanup becomes stale or overdue. Unauthenticated admin and unpaired display data still return 401 with no-store.

Shared backup remains at 589c098, privately pushed, excluding campaign personal row tables before selection and retaining only settings and daily anonymous aggregates plus schema metadata. No live backup or personal row export was run. Runtime secrets stay in ignored local/provider configuration; temporary elevated provisioning config is removed. Downloads references remain unchanged.

## Source, records and storage
Private source: https://github.com/lovelaceaml-hub/mothers-love, branch codex/mothers-love. The final readiness source/status commit is pushed and remote HEAD verified by root. New manifests and readiness receipts record the source/operation evidence. Read PLAN-01-full-app.md, CONTRACT.md, USER-MANUAL.md and UI-QUALITY-REPORT.md. Original source-handoff and prior release receipts remain history.

Non-sensitive evidence storage: https://drive.google.com/drive/folders/1JBeoaxaZ9ZMTIFMSmlKT5jn9rcdysnmw
Exact mounted folder: /Users/anthony/Library/CloudStorage/GoogleDrive-lovelace.aml@gmail.com/My Drive/Anthony Mac Storage/Project Outputs/The Words of Mother's Love
The prior release archive and its verified SHA-256 remain in research/release-storage.md. The readiness supplement is privately uploaded and its mounted-copy SHA-256 verified; see research/readiness-storage.md for the exact artifact URL and hash.

## Physical commissioning
TV View now uses the direct link https://mothers-love.vercel.app/display, without a code or sign-in. Historical pairing commissioning is superseded by PLAN-05. Actual TV visibility, distance readability, phone QR scan and post-fix human Owner sign-in have not been reported. Those physical/identity actions are not fabricated by the automated software checks. The public website is already accepting recognitions.

## Current copy follow-up
Read docs/PLAN-02-copy-cleanup.md and docs/runs/2026-09-08-copy-cleanup/INDEX.md. Runtime 6bdab79 simplifies app instructions and removes age-specific and personal-retention explanations as requested. Existing policy and exact campaign wording remain unchanged. Verification and final publication receipts live in that run's research folder. The shorter USER-MANUAL.md describes only the tasks users perform.

The copy follow-up is complete: native corrective review passed, with 72 unit tests, 49 existing/current browser journeys, ten deployed axe/bounds views and the targeted production corrections verified. See the copy-cleanup research/review-final.md and publication.md receipts.

Final copy evidence is privately uploaded and mounted-copy verified at https://drive.google.com/file/d/1KUehv7WyPtKkw49BlapzGNLsMuk76Zy7/view. Source and subsequent publication receipts remain in the existing private Git branch.

## Expression card follow-up
Anthony requested cleaner submission cards with a number, quoted expression and explicit Select button. Full principles and everyday examples remain visible below in quieter text; disclosure controls are removed. This follow-up is deployed and verified. All 12 affected journeys and three phone/desktop accessibility checks passed on production; native controller review passed. See cards-publication.md and cards-review.md in the copy-cleanup research folder. Private evidence: https://drive.google.com/file/d/197OILCiEcRyN0klFgxnI14-39do7YJdN/view.

## Completed live feed follow-up
Read PLAN-03-live-feed.md and runs/2026-09-08-live-feed/INDEX.md. Anthony requested a public published-recognition home list, a prominent submission action and discreet Admin access. Form moves to /recognize. Two Luna xhigh lanes implement the page and narrowly scoped public feed function; root validates and releases. Name-verification advice awaits clarification; no roster or participant accounts are introduced.

## Home motion and footer navigation follow-up
User requested gentle animation and a brighter dominant Share a recognition button, then moved Admin and new TV View links to the bottom. Luna xhigh implemented the two presentation files; root verified, reviewed and deployed the change. Production phone/desktop/reduced-motion checks passed. No API, expiry, polling, TV pairing or catalog behavior changes. See runs/2026-09-08-live-feed/lanes/M.md.

Direct TV runtime77d23b7 is restored at the canonical link after explicit Vercel promotion.101unit tests,80fresh deployed browser journeys and6supplemental checks passed. Anonymous direct access and protected admin denial were verified without capturing real content. Final evidence is privately backed up at https://drive.google.com/file/d/12yjHaJlikBuAMx3G87qxj7V32Hd006Of/view, with mounted SHA256 verified. Exact release and review records are in runs/2026-09-08-direct-tv/research/. Physical TV readability and a real phone QR scan remain unverified.

PLAN-05integration review passed with native Sol high and independent Terra high. TV View requires only its link. Source and final publication closure receipts are in runs/2026-09-08-direct-tv/research/closure.md.

## Garden live refresh correction
PLAN-06and runs/2026-09-08-garden-refresh record the user-reported live update defect. G updates the Garden selection on accepted snapshots; R isolates and bounds TV reads so they cannot reserve the mutation pool indefinitely. Initial process recycle restored service. Final integration and publication verification follow in the run records. Approved visuals and database objects remain unchanged.

PLAN-06integration is complete: new recognitions join Garden automatically, including full/paused screens; TV reads use isolated eight-second recovery.109unit tests and81deployed browser checks passed, native Sol review passed. Private evidence: https://drive.google.com/file/d/1f-3pJyqR-BuWCT9iWkoNdxdw3wvPXV3Z/view. Final source/deployment receipts: runs/2026-09-08-garden-refresh/research/closure.md. An already-open TV browser needs one refresh to load the corrected code.

## Flexible name input
Anthony removes the required first-name/last-initial format for all name fields. PLAN-07tracks browser/API/admin and feed/TV parity. Nonblank/80grapheme bounds, moderation and submitted-name privacy remain. No schema or hosting change is needed. Final verification/publication records live in runs/2026-09-08-flexible-names/.

PLAN-07 is complete: flexible names are accepted across form, API, admin, feed and TV. 117 unit tests, typecheck, lint, build and 82 deployed browser journeys pass, with 3 optional capture skips. Native Sol high final review passed. Production and private backup receipts are in docs/runs/2026-09-08-flexible-names/research/. No physical TV or real phone commissioning claim is added.

## Campaign commercial video (September 11)
Plan 14 produced two commercial files, 16:9 (1920x1080) and 9:16 (1080x1920), 78 seconds each, narrated by en-US-AvaNeural (edge-tts) with burned-in captions, showing the real app pages with fictional recognitions only and ending on the QR code for https://mothers-love.vercel.app/recognize. The pipeline is reproducible from the repository: `scripts/video/capture.mjs` (Playwright, every API mocked, VIDEO_PORT to pick the dev server port), `scripts/video/narrate.sh` (edge-tts into docs/private/video/.venv), `scripts/video/assemble.mjs` with `scripts/video/cards.html` (cards, captions, ffmpeg xfade timeline, loudnorm, QR check). Words live in docs/video/SCRIPT.md and docs/video/narration.json. Finished files and the script are copied to Drive under Project Outputs/The Words of Mother's Love/Commercial with SHA-256 receipts in the Plan 14 Build log. Anthony's viewing is the completion gate; one correction round (re-run narrate.sh and assemble.mjs with edited lines) is allowed inside Section 5. The Plan 13 TV rebuild on tv/pick is not in the video: the clips were recorded from this branch, which matches the live app.
## September 21: Live TV pearl design checkpoint

Anthony approved a current-style versus Pearl Garden comparison and an animated arrival preview before implementation. [Plan 25](PLAN-25-live-tv-pearl-study.md) governs this clean production-based branch, codex/tv-pearl-design-study. It is separate from the continuous-world art branch and PR 8.

The new /display/tv-design-preview route uses fictional records and the existing TV iframe bridge, director, clock, circular message fit and privacy clearing. A separate sample-only renderer document adds pearl decoration and authored Blender scenery. Production source never selects it. No live feed or backend is accessed by the study.

Blender 5.2.2 produced the source scene and an actual 3840 by 2160 render. Source and recovery evidence are recorded in [the run record](runs/2026-09-21-tv-pearl-study/RECORD.md). Fable/Opus implementation and production promotion remain held for visual approval.
