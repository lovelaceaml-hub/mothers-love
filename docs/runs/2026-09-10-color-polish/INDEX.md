# Color Polish implementation run

Plan: [Plan 10](../../PLAN-10-color-polish.md). Runner: one Codex coordinator, two separate Luna max writer worktrees, followed by sequential Luna max integration.

Latest review policy: Anthony requested one consolidated Opus high review and no further review after the second failed verdict. Earlier Sol and Sonnet reviews were cancelled before verdict. Formal failed verdict count:0.

## Baseline and scope

Authoritative application baseline: facab7a06d6b6364df710bf08aafe072df04d09d on private GitHub branch codex/mothers-love, rechecked unchanged after both lanes landed. Controller branch: codex/color-polish-v6. Latest Home, submission and catalog work is protected. Production at https://mothers-love.vercel.app remains on its prior deployment.

| Lane | State | Model | Evidence |
|---|---|---|---|
| L0 | Critique delivered, decisions recorded | Sol max | [Disposition](decisions/critic-disposition.md) |
| LV | Landed,15e737e | Luna max | [Renderer lane](lanes/LV.md), [browser summary](logs/renderer-probe.json) |
| LD | Landed,d8278c7 and532ae8e | Luna max | [Data lane](lanes/LD.md) |
| LI | Implementing TV and Studio integration | Luna max | [Integration capsule](orders/LI.md), [lane](lanes/LI.md) |
| LF | Landed, 06172bb | Sonnet 5 (spilled from Gemini 3.8 Flash) | [Order](orders/LF.md), [lane](lanes/LF.md), [gate decision](decisions/2026-09-10T22-55Z-LF-gemini-gate-unmet.md), [launch log](launch/LF.out) |
| LC | Landed, f2702ae | Sonnet 5 (spilled from Gemini 3.8 Flash) | [Order](orders/LC.md), [lane](lanes/LC.md), [launch log](launch/LC.out) |
| LH | Landed, ff56752 | Sonnet 5 (spilled from Gemini 3.8 Flash) | [Order](orders/LH.md), [lane](lanes/LH.md), [launch log](launch/LH.out) |

Visual worktree: /Users/anthony/Projects/.worktrees/mothers-love-color-v6/visual. Data worktree: /Users/anthony/Projects/.worktrees/mothers-love-color-v6/data. Both writers stopped before integration began in /Users/anthony/Projects/mothers-love. Root owns Git, scripts, documentation, review, database and deployment actions.

## Verification so far

222 unit tests passed after data support. Corrected011 executes in an isolated local PostgreSQL cluster with rollback-only synthetic checks for zero, ties, focus freeze, live target, anonymous history, auth, activation, stale version and rollback. Migration 011 was applied by Codex through its Supabase connector at 3:13 PM Pacific time, named mothers_love_color_polish_v6 and mothers_love_color_polish_qr_compat in Supabase migration history; it was not added to the campaign ledger mothers_love.schema_migrations at that time. Migration 012 and full activation followed later the same day; see the Closing section below.

Standalone opaque-iframe browser probe passed10scenes and6single/5group entrance styles after fixing counter resets. Typecheck, renderer syntax and focused lint passed. Matched-state fidelity, long messages, privacy transitions, combined Studio/TV journeys, full lint/build, Opus review, production release and private backup remain pending.

## Reference evidence

[Approved source manifest](../../design/color-polish-v6/manifest.json), [additional user files](research/additional-sources.json), [baseline checks](logs/baseline-verification.md), [consolidated Opus review](research/opus-review.md). Downloads originals remain unchanged. All captures and fixture records are fictional.

## Closing

Color Polish TV and sample preview are live at https://mothers-love.vercel.app/display and https://mothers-love.vercel.app/admin/display. Fix lane LF landed as commit 06172bb, deployed as dpl_BaxrmngrNd8yEjFttZUQBQBKTMRr, READY. Migration 012 and activation were applied through Anthony's prepared paste, [research/release-paste.sql](research/release-paste.sql), which combined migration 012, its ledger row and the activation block from [research/activation.sql](research/activation.sql), all preconditions checked, all or nothing. The result matched: settings version 6, enabled true, revision 2, cleanup healthy, ledger rows 10. Live checks confirmed the API, the database ledger and the TV display all agree. Rollback runs through [research/rollback.sql](research/rollback.sql), a version-checked disable that returns the TV to the preserved V6 renderer on its next 5 second poll. Prior deployments dpl_2ba7dzvVR8kH8YKh4HzwfBsuqbNc (a7dca27) and dpl_CmSSPmnFHXQcTq9jew1jsT1GFHsH (facab7a) remain available in Vercel.

Open follow-ups: detailed pixel parity, advanced preview drafts and preset editing (deferred by Anthony), no admin route yet for activate or rollback (SQL only), full lint cleanup, and the physical TV, audio chime and phone camera QR checks as unexecuted human checks. Ledger rows for migrations 010 and 011 remain absent from mothers_love.schema_migrations, tracked only in Supabase migration history. The Antigravity gate decision is also open: add bash, python3 and psql to its allow-list, or route such lanes elsewhere.

## Follow-up release

Two more of Anthony's requests landed the same evening: lane LC (the TV click advance) and lane LH (the home action, form-only recognize page and titled name examples). Both were first launched on Gemini 3.8 Flash through agy after Anthony widened the Antigravity gate; both failed to produce edits and spilled to Sonnet 5 helpers. See [the ruling](decisions/2026-09-11T00-05Z-LC-LH-gemini-failed-twice.md) and the full history at [Plan 11](../../PLAN-11-tv-click-and-home-polish.md).

Branches change/tv-click-advance and change/home-polish merged into the integration branch, merge commit 076c4cd. Coordinator verification in the main checkout: typecheck clean, 222 of 222 unit tests, a production build, and 55 of 56 browser journeys passing across tests/feed, tests/submission, tests/mobile-recognition and tests/color-polish-usable (3 in color-polish-usable, including the new click journey), 1 skipped. 3 browser tests fail identically at the previous live commit 2e05c75, so they are pre-existing and unrelated: tests/submission/plan08/submission-form-refresh.spec.ts:13 expects the selected expression card background to contain rgb(255, 242, 200), but the color pass now uses a gold gradient; tests/submission/submission.spec.ts:293 reports axe contrast findings on the expressions guide; tests/mobile-recognition/mobile-recognition.spec.ts:110 needs PLAYWRIGHT_BASE_URL set.

Anthony chose full replace, release mode A. Commit 076c4cd was pushed to origin codex/mothers-love at about 5:20 PM Pacific time; Vercel production deployment dpl_9DsFVYvDX1fSXRirH3vGHfxeFwQd is READY at https://mothers-love.vercel.app. Live checks: renderer.js bytes match the build; at 375 pixels wide the single Share a recognition link sits at 108 pixels from the top, above the Recent recognitions region at 263 pixels, with the gradient and the primaryShimmer animation active; /recognize has no live feed and no "Live from the campaign" text, the form is present, and both titled placeholders show. Rollback runs npx vercel rollback to dpl_BaxrmngrNd8yEjFttZUQBQBKTMRr (commit 06172bb, the Plan 10 build); no database change was involved.
