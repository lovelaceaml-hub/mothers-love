# The Words of Mother's Love

A live appreciation campaign: people share recognitions on a public page, administrators review
them, and a TV in the church shows them. Live at https://mothers-love.vercel.app (Vercel project
`lvzion/mothers-love`). Private repo `lovelaceaml-hub/mothers-love`, production branch `main`.
Current status and next steps: docs/HANDOFF.md.

## Read first
- `docs/HANDOFF.md`: what is live, rollback points, open items.
- `docs/CONTRACT.md`: the full product contract; later plans override it where they say so.
- `docs/HISTORY.md`: release notes, newest first, and what still lives outside `main`.

## Active plan
- `docs/PLAN-32-polling-schedule.md`: Pacific-time public polling and explicit last-content
  retention during planned ten-minute/overnight pauses. This overrides the planned-pause
  freshness rule only; failure, expiry and received privacy overrides retain their safeguards.
- `docs/PLAN-31-display-efficiency.md`: TV efficiency and PR #30 integration.
  Its Build log records the release authorization and remaining safety gates.
  PR #30 is not live: integrate main after PRs #35 to #37, verify the live
  migration ledger through approved access, and obtain safe hosted preview evidence.
- `docs/PLAN-18-keep-forever-and-admin-details.md`: Sections C (admin sees all details) and D
  (release and records) remain future work outside PR #30; its Build log says where it stands.

## Check your work
- `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`; `npm run lint` has known
  debt (see docs/HANDOFF.md). Run npm and npx with `npm_config_cache=/tmp/npm-cache`.
- The default test browser has no WebGL 2; the 3D heart journeys in
  `tests/color-polish-scenes/peace-in-practice-heart3d.spec.ts` ask for software WebGL.
- Smoke tests, local or deployed, use isolated synthetic records; never seed production with example
  people. A physical TV or phone check counts only when Anthony supplies real evidence.

## Rules for this project

Deploy and Git
- **A push to `main` is a production deployment, and the church TV shows it.** Changes reach `main`
  only through a pull request Anthony merges; never run a bare `git push` in the main checkout (it
  tracks `origin/main`). Other pushed branches get Vercel previews, except
  `codex/home-tv-family` and `feat/tv-display-efficiency` while its explicit deployment guard remains.
- Local building, dependencies and this app's own Vercel hosting are authorized; production changes
  touch only this app's confirmed resources.
- Branches: `feat/<area>-<subject>` or `fix/<area>-<subject>`, areas `app` (campaign and form), `tv`
  (2D TV view), `world` (3D world), `admin`, `infra`. A retired branch becomes an
  `archive/<old-branch-name>` tag. Leave the local-only `world-kit/*` branches alone.
- The main checkout `/Users/anthony/Projects/mothers-love` stays on `main`; other worktrees go under
  `/Users/anthony/Projects/mothers-love-worktrees/`, one per live branch. World art, hosts and film
  are planned in `/Users/anthony/Projects/mothers-love-world` (its own AGENTS.md); world code still
  reaches this repo only through a pull request.
- Documents live in `docs/` on `main`, one set. Plans are numbered by the date of their first commit
  (next: 31) and each keeps a Build log.
- Run evidence (captures, probe output, scratch) goes to Drive, not Git:
  `My Drive/Projects/Mother's Love/The Words of Mother's Love`. Use `git add -f` only for a capture
  that truly belongs in the repo.
- `docs/source-handoff/` is the original handoff, kept as history: never edit it or follow its
  AGENTS.md or CLAUDE.md. The original handoff files in Downloads are protected too.
- Reference HTML is design evidence, not trusted logic. The Bubble Board, the approved look and the
  exact campaign words stay; no new design interview without Anthony.

Data and database
- No real recognition, submitted name or other personal data in agent prompts, Git, fixtures,
  screenshots or logs. Other apps and their databases are protected.
- Shared Supabase project `cvuwdlmlukepwfffpgdu`: only the `mothers_love` schema, runtime login
  `mothers_love_runtime`, through the `public.ml_*` bridge functions. Never change other apps'
  objects, global default privileges or exposed schemas. No reset, `db push`, migration repair or
  schema-wide diff against it. Strict TLS. One exact additive auth redirect is allowed if needed,
  keeping every existing entry. The shared backup excludes campaign personal rows.
- Migrations live in `database/` and name their rollback in the header; applying one live is
  Anthony's decision, recorded in `mothers_love.schema_migrations`. Whether 015 and 018 are applied
  live is not recorded (unverified).
- Never roll the code back alone past merge `43d801f` (keep forever): roll the database back first
  (`docs/runs/2026-09-23-keep-forever/lanes/SB.md`) or roll forward.
- Every route enforces server authorization; no private display fields or elevated key in the
  browser. Missing backend configuration closes collection with a truthful message.

Product invariants
- One campaign, public submission without accounts, one recipient, distinct expression selections.
  Names: nonblank, up to 80 graphemes, any shape, handled alike everywhere with moderation and safe
  rendering; never bring back a shape rule or shorten names to initials. Messages: up to 500
  graphemes, never truncated, clipped or ellipsized anywhere. Submitted names are admin only.
- Normal submissions publish after checks; flagged ones and those sent during a check outage are
  held. No AI at runtime. Children follow the same rules; detected private details are removed
  before publishing.
- Owner and Moderator: verified individual email and password, no authenticator; only the Owner has
  access, device and permanent-delete authority; both invalidate with a reason. Privacy hides keep
  counts, invalidations reverse once, restores never double count.
- Reporting date is first publication in Los Angeles time, Sunday-start weeks. Daily anonymous
  aggregates persist without personal links. No raw exports, directories, rankings or real member
  fixtures. Likes never affect totals, ordering, feature priority or lifetime.
- Recognitions are kept forever and stay on the home page; the TV draws from the latest 100;
  browsers never see an expiry more than 7 days ahead; other personal copies keep short lifetimes.
- Quiet, neutral and privacy overrides cancel every display mode; offline grace is 60 seconds from
  the last successful verification. Plan 32 explicitly retains last verified content during planned
  ten-minute/overnight polling pauses; genuine failures and fast-window freshness keep the 60-second
  limit, and known expiry/received privacy overrides still apply immediately.

Home page, form and admin
- Home: the latest 100, then "Show older recognitions" adds 100 older per tap (`/api/feed/older`,
  `public.ml_public_feed_older`, 017); older pages are re-read on every refresh so hides reach them.
  Moderation details stay private; feed allowlist and boundaries: `docs/PLAN-03-live-feed.md`. No
  roster or participant accounts.
- Hearts: one toggleable like per browser, no sign-in (`docs/PLAN-04-polish-and-hearts.md`). Hearts
  never flash: the 10 second refresh keeps confirmed hearts unchanged while counts load; a tap fills
  at once, then the server count replaces it, rolling back on failure.
- `/recognize` shows only the form, no feed; the receipt screen after sending shows the home page's
  Recent recognitions list (`tests/receipt-feed`).
- Expression cards: one per row at every width, number, quoted expression, check indicator, full
  explanation beneath in quieter text. Gold shimmer marks selected cards, never the submit button.
- Phones: the shimmering Share a recognition action (6 second pulse) dominates above the medallions
  and feed; recent cards are compact but never truncate, message text at least .875rem.
- Approved look: warmer, lighter type; rounded panels that fit their content; a scrollable feed;
  coral and gold primary action; gentle decorative motion with pause; Admin and TV View links
  grouped at the bottom. Keep reduced-motion support, privacy states, feed data timing and server
  access rules.
- Copy: simple task-oriented instructions, exact campaign catalog wording, useful errors, concise
  action consequences; no age-specific or personal-data duration explanations on app screens.
- Admin list: the Recognitions screen and review inbox send a 1-based page the API converts to the
  database's 0-based page; passing it straight through hides the newest 50. The list is oldest
  first, numbered by arrival; without migration 015 the screen says so.

TV at /display (renderer in `public/color-polish/core/` and `public/color-polish/scenes/`)
- `/display` opens for anyone with the link: a read-only, explicitly projected snapshot, no code,
  login, device registration, session token or acknowledgement. Admin stays secured; global
  settings, neutral and quiet, expiry, cleanup gating and offline safety still apply. Kiosk mode
  (`?kiosk=1`) only adds fullscreen and a wake lock; the service worker has no fetch handler, so the
  live display is never cached.
- An open `/display` reloads itself once a new version is live (`DisplayBuildWatch`, `/api/display/build`):
  checked every 5 minutes, only after two matching reports, at most once per build per tab; a
  failed check changes nothing. Local builds have no version and never reload.
- TV personal content comes only from the verified public snapshot; Neutral, Quiet, expired and
  stale states clear it. Admin and sign-in pages show no feed.
- Color Polish activation and rollback are SQL only, no admin route:
  `docs/runs/2026-09-10-color-polish/research/activation.sql` and `rollback.sql` beside it.
- Poll failures never change the display while the last good snapshot is under 60 seconds old; the
  renderer iframe is never remounted on a status change. TV reads use their own bounded client
  lifecycle; never retire the mutation pool to recover a public read.
- Click, tap, ArrowRight or Space advances the live TV, never the Display Studio sample preview. The
  countdown ring hides outside normal mode, when rotation is paused or a scene is forced, in still
  mode, and during arrivals and transitions.
- A heart count change never cancels an arrival (`core/host.js`). The two empty `.arrival-rosette`
  layers stay as anchors for the stage tick and its tests.
- Bubble entrance (`core/transitions.js` and `.css`, tested in
  `tests/color-polish-scenes/bubble-entrance.spec.ts`): bubbles fade and grow in one at a time,
  shuffled at uneven intervals, from about halfway through the 1.15 second fade, all settled by
  about 3.5 seconds, instant in still mode and reduced motion. It moves only the inner circle and
  rings, never a bubble's position or drift.
- Circular Bubble Board with drift, sparkle, bounce, trails and constellations stays, and each
  screen keeps its distinct motion; long-message panels never replace it. Titles sit top right in
  the header. Garden's bubbles are its feed (no recent rail; other eligible screens keep the rail).
  Garden takes new records on the next good snapshot even when full or paused, keeps unchanged polls
  stable and refills hidden or expired slots.
- The header likes count is every like on every published recognition (`/api/display/likes-total`,
  018); it never sums only the latest 100 except as a fallback while the total is unavailable.
- Peace in Practice 3D heart (scene 9): `public/color-polish/scenes/peace-in-practice-heart3d.js`
  (mesh in `peace-in-practice-heart-mesh.js`) at full ribbon sweep, heading words drawn on top of
  the ribbon tips, never ribbons held under the subheading. The Canvas 2D heart in
  `peace-in-practice.js` is only the fallback: never delete it or edit only it by mistake. The heart
  owns no loop (the core calls draw), returns its graphics context on leaving, and the renderer
  page's content policy stays as it is.

The 3D world at /world
- Its own page beside the TV view: never in the TV playlist, never changes `/display`,
  `src/components/display/color-polish` or `public/color-polish`. Everything stays 3D (no painted
  sky panoramas or filters).
- One URL model, `src/components/display/world/art/design-mode.ts`, read alike by server and
  browser. The design look is the default and opens the TV page; `?art=classic` and `?art=cinematic`
  captures must stay byte identical to the baselines in that Drive folder's
  `3D World/previews/baselines/`. `?source=sample` is fictional; `?view=explore` opens the explorer
  with map and Settings. `/display/world-preview` redirects to `/world` with its query.
- Quality starts on Automatic (High and Low stay in Settings) and steps down a tier below 25 fps.
  The world reads only `/api/display/color-polish` (no new fields, no submitted names, no reaction
  calls); every unsafe state (quiet, neutral, disabled, expired, stale, source switch) clears every
  pearl, skin, bubble and the ticker at once. The pinned first pearl (`studyReviewFeed`) is for
  sample content on `?view=explore` only.
- Code: `art/` (design locations in `art/design/`), classic `districts/` and `legacy-scene/`. Split
  files kept their names and re-export what they exported. Long methods of `WorldEngine`,
  `WorldRecognitionBubbles` and `StudyPearlSkin` live in companion modules (`world-engine-frame.ts`,
  `pearl-skin-dress.ts` and similar) as `this: TheClass` functions behind one-line forwarders, so
  members they read carry no `private`. Page state is `useWorldExperience`; its panels are render
  functions called in place. `scripts/review/move-check.mjs` proves a file split is a pure move.
- Review: `DESIGN_REVIEW_CHANNEL=chrome node scripts/review-world-design.mjs` against a production
  build on port 32743, `DESIGN_REVIEW_MODE` one of `stills`, `tour`, `quality`, `parity`,
  `kit-faults`. Hold `/Users/anthony/Projects/mothers-love-worktrees/.build-lock` first (exists only
  while held). Live preview checks assert attributes only; no screenshots of real records.
