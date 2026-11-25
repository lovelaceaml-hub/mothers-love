# Consolidated Opus high completion review

Date: 2026-09-10, coordinator Fable 5.1 (Claude Desktop), reviewer Claude Opus 5 (read-only subagent). Range reviewed: facab7a..a7dca27, 122 files. Hygiene sweep (Haiku 4.5, read-only) ran alongside; its findings are listed at the end. This is the single consolidated review Anthony requested; no further review is launched after corrections. Formal failed verdict count: 0.

VERDICT: PASS. No blocking-class defect found. No files edited by the reviewer.

## Findings

MAJOR. src/components/display/color-polish-host/ColorPolishHost.tsx lines 101 to 106 and 174. When /api/display/color-polish fails, the host shows the static "temporarily unavailable" panel and never falls back to the legacy V6 renderer; the fallback fires only when a successful snapshot reports presentation.enabled false. Scenario: the new SQL raises one of its own guards or hits the 5 second statement timeout, so after the 60 second grace every TV goes blank even though the legacy /api/display/snapshot path is healthy. Fix: after repeated color-polish 503s with no cached personal content, render V6DisplayExperience (it re-verifies independently) instead of the unavailable panel.

MAJOR. database/011_color_polish.sql line 305. Every public TV read runs as a read-write transaction that takes one global pg_advisory_xact_lock and performs INSERT ... ON CONFLICT DO NOTHING for a row that changes once per week. Scenario: several TVs plus phone viewers serialize behind that single lock for the full snapshot transaction, pushing requests past statement_timeout and the 8 second client deadline, which then retires the pooled display client. Fix: read the frozen color_polish_weekly_focus row first and take the lock and insert only when the current week's row is missing.

MINOR. public/color-polish/renderer.js line 241. receiveBootstrap accepts a bootstrap from any parent origin (only 'null' is rejected) and no frame-ancestors or X-Frame-Options header covers /color-polish/renderer.html. Scenario: a third-party page embeds the renderer and drives it with fabricated content (no user data leaks: CSP is connect-src 'none' and the renderer never fetches). Fix: add Content-Security-Policy frame-ancestors 'self' for /color-polish/* in next.config.ts.

MINOR. public/color-polish/renderer.css line 4. Reduced motion is handled only in CSS; the JS-driven motion (feed lane transforms in tickFeeds, canvas atmosphere, the rAF coordinator) keeps animating. Fix: set S.still from matchMedia('(prefers-reduced-motion: reduce)').

MINOR. ColorPolishHost.tsx line 75. The public poll uses credentials 'include', sending admin session cookies to a fully public route that ignores them. Fix: credentials 'omit'.

MINOR. src/components/display/color-polish/renderer.tsx line 372. The window message listener from handleLoad is removed only by a 10 second timer that is never cleared on unmount. Fix: clear it in the frameKey cleanup effect.

## Verified OK by the reviewer

- No personal or admin data on the wire: the route reuses the projectPublicDisplaySnapshot allowlist; submittedName and reason have no path into the response; color-polish.test.ts proves an injected private key is dropped.
- No HTML injection: every interpolation of name and message into innerHTML is wrapped in esc(); long messages use textContent; the QA log records only ids and booleans.
- Iframe and bridge: sandbox allow-scripts (opaque origin), no-referrer, renderer CSP default-src 'none' and connect-src 'none'; personal data travels only over a transferred MessagePort; the parent accepts ready messages only from the iframe window with origin 'null' and a matching nonce and sequence; init() blanks the page if opened top-level.
- Grants: 011 revokes all table and function privileges from PUBLIC, anon, authenticated and service_role, enables and forces RLS on both new tables, sets search_path '' on every function, and grants only EXECUTE on the four public.ml_color_polish_* bridges to mothers_love_runtime.
- Activate bridge: ml_authorize(payload, 'owner') on an active membership plus exact match on both settings.version and presentation.revision under FOR UPDATE; scripts/color-polish-local-database.sql asserts anonymous 401, moderator 403, owner ok, stale 409 and version-checked rollback.
- Safety states: quiet and neutral clear the snapshot and unmount the iframe; the 60 second stale check uses performance.now deltas and resets the cursor; the revision regression guard returns before lastVerified is refreshed; expiry is enforced in SQL, in projection and in the renderer. The usable browser test loads /display for real, asserts the synthetic name inside the iframe, then flips to quiet and asserts the iframe is gone.
- Delta safety: 007 always returns the full recognition list, so the host's whole-snapshot replace loses nothing.
- Data: all aggregates derive from daily_aggregates via ml_aggregate_json; Sunday Los Angeles weeks; weekly focus frozen by ON CONFLICT DO NOTHING then re-read; multi-day, negative and future rows fail closed; server and client independently re-derive the goal target.
- Regressions: no existing source file changed except the two page.tsx entry points. Typecheck clean, 222 of 222 unit tests passing, production build succeeds.

Reviewer note: no admin API route exists yet for the presentation get, patch and activate bridges, so activation is SQL-only today, matching the plan's deferral of preset editing.

## Coordinator visual check (synthetic renders against the approved references)

scripts/color-polish-renderer-probe.mjs at 1920 wide, fictional sample data only, compared scene by scene with docs/design/color-polish-v6/references/*-1920-14s.png. Nine scenes match the approved design: welcome, garden, featured, calendar, expressions, status, peacemakers, peace in practice, orbit (sample counts differ where the ported fixture differs; layout, artwork, color and typography match).

Defect, Milestone scene: the weekly goal range renders "INVALID DATE NaN-NaN" and the replay panel shows "The milestone remains. No current personal recognitions are available to replay." Cause: the port builds next.goal.week from insights.goal.weekStart (renderer.js line 106) but never assigns S.week or S.goalExpression, which the template (line 194), contributorPool() and tributeContent() (line 771) still read, exactly as the approved.html did after its own weekly computation (approved.html line 653). Live data has the same shape, so the live TV would show the same defect in that scene. Accepted for correction in the fix lane.

## Hygiene sweep findings (Haiku 4.5, read-only)

1. README.md line 5 says current work is Plan 09; Plan 10 is current.
2. $HOME/Projects/README.md still points the project at Plan 09.
3. PLAN-10 Build log entries have words run together (lines 35, 37, 39, 43).
4. docs/runs/2026-09-10-color-polish/INDEX.md line 22 says the production migration is not applied while HANDOFF.md says the database support is deployed.
No dead links, no missing referenced files, no em or en dashes in changed source.
