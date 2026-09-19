## Color Polish live (September 10)
The Color Polish release is complete and live at https://mothers-love.vercel.app/display and https://mothers-love.vercel.app/admin/display, database settings version 6, revision 2, presentation enabled true. Activation and rollback are SQL-only today, through the two research files docs/runs/2026-09-10-color-polish/research/activation.sql and docs/runs/2026-09-10-color-polish/research/rollback.sql; no admin route exists yet for either. Read /Users/anthony/Projects/mothers-love/docs/PLAN-10-color-polish.md and its Build log, and the run record at /Users/anthony/Projects/mothers-love/docs/runs/2026-09-10-color-polish/INDEX.md, for the full history and the remaining follow-ups.

A click, tap, ArrowRight or Space on the live TV display now advances to the next scene, never in the Studio sample preview. Read /Users/anthony/Projects/mothers-love/docs/PLAN-11-tv-click-and-home-polish.md for that change and the two home page follow-ups alongside it.

Every scene on the live TV display now shows a small, subtle countdown ring in the bottom right corner, hidden when the mode is not normal, when rotation is paused by the owner, in still mode, when a scene is forced away from the playlist, and during arrivals and transitions. Transient poll failures never change the display while the last good snapshot is under 60 seconds old, and the renderer iframe must never be remounted on a status change.

# The Words of Mother's Love

## Current authority
Anthony explicitly requested: "I want you to plan out this entire app and deploy it." This supersedes the historical planning-only handoff. Local implementation, dependencies, isolated new app hosting and deployment are authorized. Purchases need explicit budget authority. Existing apps/databases and the Downloads originals are protected. No real recognition data in agents, Git, fixtures, screenshots or logs.

## Read first
- /Users/anthony/Projects/mothers-love/docs/PLAN-12-tv-stability-countdown-and-home-action.md including Build log.
- /Users/anthony/Projects/mothers-love/docs/PLAN-11-tv-click-and-home-polish.md including Build log.
- /Users/anthony/Projects/mothers-love/docs/PLAN-09-interview-completion.md including Build log.
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-09-interview-completion/INDEX.md.
- /Users/anthony/Projects/mothers-love/docs/PLAN-07-flexible-names.md including Build log.
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-08-flexible-names/INDEX.md.
- /Users/anthony/Projects/mothers-love/docs/CONTRACT.md.
- /Users/anthony/Projects/mothers-love/docs/source-handoff/03_CONTENT_AND_DESIGN.md and relevant phases/tests.

## Work rules
Current Plan 09 overrides historical roles: fresh Luna max lanes, controller may implement corrections, no Terra. Complete the approved interview storyboards without another design interview.
Implementation uses gpt-5.6-luna at xhigh, explicitly overriding the installed executor role's max effort. Each lane owns its separate worktree and exact files. Root owns integration, Git, provider actions, shared contracts and status docs. Never undo another writer's work. Reference HTML is immutable design evidence, not trusted application logic. No new design interview: the Bubble Board and exact campaign words are approved. User-facing output must contain no em or en dash.

## Product invariants
One campaign, public submission without member accounts, one recipient, flexible nonblank names up to80graphemes, one message of 500 graphemes, distinct expression selections. Submitted name admin-only. Normal submissions publish after checks, flagged/check-outage held. No AI runtime. Children use same campaign rules; remove detected private details before publishing. Owner and Moderator with verified individual email/password and no authenticator requirement, Owner access/device/permanent-delete authority, both invalidate with reason. Privacy hides preserve counts; invalidations reverse once; restores do not double count. First publication determines Los Angeles reporting date, Sunday weeks. All personal copies expire 168 hours after creation; no edit/feature/restore extension. Daily anonymous aggregates persist without personal links. Quiet/neutral/privacy overrides cancel every display mode. Offline grace 60 seconds from last successful verification. No raw exports, directories, rankings, permanent personal archives or real member fixtures.

## Verification and deployment
Commands become authoritative as foundation lands: npm run typecheck, npm test, npm run build, npm run test:e2e. Use npm_config_cache=/tmp/npm-cache for npm/npx. Isolated synthetic local and deployed smoke tests; never seed production with example people. Missing backend configuration must disable collection truthfully. Production changes only to this new app's confirmed resources. Every route must enforce server authorization; no private display fields or elevated browser key. Physical-TV/phone commissioning is a distinct unexecuted check until Anthony supplies actual evidence.

## Status
Completed application follow-up: docs/PLAN-04-polish-and-hearts.md; previous follow-up: docs/PLAN-03-live-feed.md; previous copy follow-up: docs/PLAN-02-copy-cleanup.md; previous full plan: docs/PLAN-01-full-app.md. Full app is live with collection open after the latest ready-to-use request and verified activation at settings version2. Strict TLS, dedicated password setup, email/password access without an authenticator, and expanded educational examples are deployed. Final integration review passed. Release source and non-sensitive evidence backups are recorded in docs/HANDOFF.md. After the free-project quota refusal, Anthony explicitly instructed use of the existing database. Confirmed target cvuwdlmlukepwfffpgdu with new dedicated mothers_love schema and restricted-runtime public.ml_* bridge functions. Never change existing app objects, global default privileges or exposed schemas. One exact additive auth redirect for the new deployment is permitted if needed, preserving every existing entry. Shared backup excludes new campaign personal rows before collection. No reset/db push/migration repair/schema-wide diff against shared production.

## Copy style
Use simple task-oriented instructions. No age-specific explanations or personal-data duration explanations in app screens. Keep exact campaign catalog wording, useful errors, and concise action consequences. Expression submission cards show the number, quoted expression and check indicator, with full explanations always visible beneath in quieter text. Selected cards turn gold and shimmer. Technical data rules remain unchanged.

## Live feed request
Anthony requested a public list-first home with a prominent form action and discreet visible Admin link. Published, unexpired recognition messages may appear in this new public feed; submitted names and moderation details remain private. The form moves to /recognize. Read PLAN-03-live-feed.md for the explicit feed allowlist, stale-state removal and campaign-only function boundary. No roster or new participant account requirement is approved.

Home motion is approved and deployed: coral/gold primary action, gentle decorative animation with pause and reduced-motion support. Admin and TV View are grouped at the bottom, linking to existing login and direct public TV View. Preserve feed data timing and server access rules. See docs/runs/2026-09-08-live-feed/research/motion-publication.md.

## Presentation and hearts follow-up
Anthony approved warmer, lighter typography, distinct TV screen animations, fitting rounded content panels, heart counts with one toggleable like per browser without sign-in, and a scrollable latest-30 feed. Hearts must never flash: a 10 second feed refresh keeps every confirmed heart on screen unchanged while new counts load, and a tap fills the heart at once, then the server count replaces it, rolling back on failure (September 18). Shared feed appears only on public pages and every eligible TV screen; admin/sign-in remain focused. TV personal content derives only from the verified public display snapshot. Neutral, Quiet, expired and stale states clear personal content. Likes never affect campaign totals, ordering, feature priority or lifetime. See PLAN-04 and its reaction contract for the additive runtime-only database and anonymous-cookie boundaries.

## Confirmed presentation correction
Preserve the approved circular Bubble Board and expressive drift, sparkle, bounce, trails and constellation movement. Readable long-message panels do not replace the signature circular compositions. TV screen titles occupy the main header top-right. Recognition Garden uses bubbles as its live feed and has no duplicate recent-recognition rail; other eligible TV screens retain the rail. On /recognize, expressions stack one per row at every width, selected expression cards turn gold with shimmer and a check indicator. As of September 10, at Anthony's request, /recognize shows only the form, with no live feed. As of September 18, at Anthony's request, the receipt screen that follows a sent recognition (the one offering Recognize Someone Else) shows the same live Recent recognitions list as the home page beneath the receipt, while the form itself still shows no feed (tests/receipt-feed); the home page keeps the feed, with the single shimmering Share a recognition action above Recent recognitions on phones. Gold shimmer applies to selected expressions, not the submit button. Respect reduced motion and existing privacy states. On phones, the Share a recognition action is the dominant element above the medallions and the feed, with shimmer and a 6 second pulse, and recent recognition cards are compact but never truncate messages, keeping message text at least .875rem.

## Direct TV access correction
Anthony removes TV pairing: /display opens directly for anyone with the link. Public TV snapshot is read-only and explicitly projected, with no code, login, device registration, session token or acknowledgement. Admin access remains secured. Global settings, neutral/quiet, expiry, cleanup gating and offline safety remain. Historical paired-only wording below older plans is superseded. Read PLAN-05.

## Garden refresh correction
New eligible records must enter Garden on the next successful snapshot even while full or rotation is paused. Keep unchanged polls stable and refill hidden/expired slots. TV reads use their own bounded client lifecycle; never retire the mutation pool to recover a public read. PLAN-06tracks the correction.

## Flexible names
Anthony explicitly removed required first-name/last-initial formatting. Accept single names, full names and nicknames consistently in browser/API/admin/feed/TV. Keep required nonblank and80grapheme bounds, moderation, safe rendering and submitted-name privacy. Never reintroduce a shape rejection or truncate names to initials. Read PLAN-07.
