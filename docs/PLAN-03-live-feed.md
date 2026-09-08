# Plan 03: Live recognition home page

## Request
The home page becomes a live list of published recognitions, with a prominent Share a recognition button and a discreet visible Admin link. The full submission form moves to /recognize, preserving the cleaned expression cards. Normal submissions stay automatic; flagged or unavailable safety checks stay held. Name-verification options await Anthony's clarification, without blocking the requested feed work. No authentication friction or roster is introduced without his choice.

## Model and agent choices
Runner: current coordinator. Implementation: gpt-5.6-luna xhigh, two parallel writers in separate worktrees. Root owns integration, contracts, provider actions and release. Review: native Sol high controller review, plus an independent Terra high read-only privacy review because this introduces a public personal-content endpoint. Scope is the existing campaign only.

## Approved presentation change
ML-BUBBLE-APPROVED-V3 remains the palette, typography and expression-card reference. Anthony explicitly requested this new list-first home journey. Keep exact title/tagline and campaign expressions. The feed is a calm chronological list, newest first, with full messages and selected expression labels, no rankings, search or sender identity. Use current published recognitions only, bounded to the most recent 50. A small Admin text link is visible in the header. The submission form remains directly reachable at /recognize. Existing TV QR still opens the campaign home with its prominent form action.

## Data boundary
A new campaign-only read function returns explicit public fields only: id, recipient, message, expressionIds, firstPublishedAt, expiresAt. Never submittedName, reasons, held/hidden/invalid/expired records, pending accounts, tokens or audit data. Feed snapshot: {serverTime:string,items:PublicFeedRecognition[]}. Only published, unexpired records, stable ordering firstPublishedAt descending then id descending, maximum50. Neutral mode returns no personal items; cleanup health failure returns unavailable. Collection closure does not hide otherwise public recognitions. GET /api/feed uses no-store and an explicit application projection/validation of the allowlist. No browser database key or direct table grants.

Public feed client polls every10seconds, replaces the authoritative list, clears on fetch error or malformed data, clears on visibility loss and refreshes on return. Local expiry uses server time and elapsed monotonic time; no stale personal browser storage or offline cache. Complete text rendering uses React escaping. No simulated posts on production.

### Lane F: Feed and form journey
Own home/feed components, /recognize route, necessary public navigation changes and public browser tests. Preserve form behavior and exact expression catalog. Build phone/desktop empty, populated, loading, error and removal/expiry states with synthetic fixtures.

### Lane B: Public feed boundary
Own additive campaign-only SQL function, server feed query/route, shared feed types and relevant database/route tests. No existing function replacement or existing resource mutation. Restrict new function execution to mothers_love_runtime; revoke PUBLIC, anon and authenticated. Reuse existing strict TLS and schema-qualified SQL. Return only explicit fields and bound reads. Provide a rollback-only synthetic fixture and function/ACL preflight evidence.

### Lane I: Integration and release
Root validates the existing target, reviews the migration before external application, integrates source sequentially, runs focused tests/build and synthetic browser checks, publishes existing Vercel app, verifies live endpoint shape without recording personal content, updates docs and private backups. Independent review protects the new public boundary before production; other useful UI work continues in parallel.

## Build log
- Baseline a10adfa7085fc5c9f351a008b9e2dd8c9ee70981, clean. Two Luna writers authorized by the ongoing parallel workflow. No real records in tools, fixtures, agents or source. User clarification pending only for whose typed name concerns him. Existing automatic approval and keyword-based safety holds verified in code.

- Integrated both Luna lanes. Lint,77unit tests, productionbuild,18affected browser journeys and five rendered states passed. Independent privacy review PASS after the corrected fixture passed PostgreSQL17.6. Applied only additive campaignfunction004 and ledger row, existing shared functions unchanged. Native controller review and publication pending.

- Complete: final native correctionreview passed, all108source hashes matched. Final applicationdeploymentdpl_5ALoK5bWih68YJoNY3Gww5M49GDG passed12affected receipt/formjourneys and live navigation, sharingtext and restricted-feed checks. PrivateGitHub and syntheticDrivebackup verified. Localservers stopped and two clean feedworktrees removed. No new name-verification policy was chosen.

## Home motion follow-up
Anthony requests an animated home and brighter Share a recognition action. This explicitly authorizes a stronger coral/gold action treatment and gentle motion within the approved Bubble Board direction. Single Luna xhigh presentation lane runs alongside root visual verification and integration. Native Sol high controller review; routine visual change, no new independent security review. No backend, dependencies, catalog or feed timing changes. Reduced motion and a discreet pause control preserve comfortable use. Baseline a918ff3, clean; implementation started.

Latest steering: move Admin to the bottom beside a new TV View link (/display). Keep the bright Share a recognition action at the top. Existing TV pairing and authorization remain intact.

Home motion follow-up complete: brighter coral/gold action, gentle decorative motion, pause/reduced-motion support and Admin/TVView footerlinks deployed. Four local and four production visualmodes, six feedregressions, build/typecheck/lint and nativecontrollerreview passed. Source and private synthetic evidence backups verified. See research/motion-publication.md.
