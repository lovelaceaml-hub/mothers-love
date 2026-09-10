## September 10: Color Polish live

Color Polish TV and sample preview are live at https://mothers-love.vercel.app/display and https://mothers-love.vercel.app/admin/display, running the new renderer with 10 scenes, replay and pause. Database settings are at version 6, revision 2, presentation enabled true.

Fix commit 06172bb deployed as dpl_BaxrmngrNd8yEjFttZUQBQBKTMRr, READY. Migration 012 and activation were applied through Anthony's prepared SQL paste in the Supabase SQL editor at about 4:15 PM Pacific time. The campaign ledger mothers_love.schema_migrations now has 10 rows, with a matching hash and one settings event recorded.

Verified: typecheck clean, 222 of 222 unit tests, production build, 2 of 2 color-polish-usable browser journeys, the isolated PostgreSQL fixture for migration 012, and all 10 renderer probe scenes matching the approved design, including the fixed Milestone scene. Live checks confirm the API, the database ledger and the TV display all agree.

Rollback: docs/runs/2026-09-10-color-polish/research/rollback.sql runs a version-checked disable. The TV returns to the preserved V6 renderer on its next 5 second poll. Prior deployments dpl_2ba7dzvVR8kH8YKh4HzwfBsuqbNc and dpl_CmSSPmnFHXQcTq9jew1jsT1GFHsH remain available in Vercel.

Open follow-ups: pixel parity, advanced preview drafts and preset editing (deferred by Anthony), an admin route for activate and rollback (SQL only today), full lint cleanup, and the physical TV, audio chime and phone camera QR checks. Ledger rows for migrations 010 and 011 are tracked only in Supabase migration history.

# Handoff

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
