# Plan 11: TV click advance and home polish

## Goal

Anthony asked for four small follow-ups after Plan 10 went live, quoted exactly:

1. "if I click on the TV display it goes to the next one"
2. "on the mobile app, put the share recognition button above the recent recognitions section. Make it stand out so that eyes divert to it. Make it shiny and shimmer"
3. "Share a recognition page doesn't need the live from campaign. just the form to fill out"
4. "For the examples in the name section include titles like B. S. or D."

Request 1 became lane LC. Requests 2, 3 and 4 became lane LH, since all three touch the same two files on the phone side of the app.

## Authority and setup

Anthony approved implementation and production release in this task on September 10, 2026. Coordinator: Claude Fable 5.1. Both lanes were first launched on Gemini 3.8 Flash through the agy CLI, in the worktrees Anthony's widened Antigravity gate now allows (bash, python3 and psql added, recorded at $HOME/Projects/docs/runs/2026-09-10-workflow-prune-2/decisions/2026-09-10T23-45Z-anthony-widened-agy-gate.md). Both failed to produce edits, so under the routing table's spill order (Gemini refuses, then Sonnet 5, never Opus or Fable) both lanes ran as Claude Sonnet 5 helpers instead. Reviewer: the Fable coordinator, reading each diff and re-running verification in the main checkout. Release mode: A, full replacement of the existing production deployment. No database change was needed for either lane.

### Lane LC: TV click advance

Setup: writer Sonnet 5 (spilled from Gemini 3.8 Flash), branch change/tv-click-advance, worktree $HOME/.claude/worktrees/mothers-love-click-advance, based on 2e05c75. Reviewer: the Fable coordinator. Order at docs/runs/2026-09-10-color-polish/orders/LC.md.

public/color-polish/renderer.js gained nextPlaylistEntry(), manualAdvance() and manualAdvanceKey(). A click, tap, ArrowRight or Space now advances to the next playlist scene, but only on the live TV in normal mode, never in the Studio sample preview. The advance is ignored during an arrival or transition, debounced at 700 milliseconds, and logged as manual_advance with scene ids only. The automatic rotation step now calls the same helper so both paths pick the next scene identically. tests/color-polish-usable/usable.spec.ts gained a browser journey for the TV click and a companion check that the Studio preview is unaffected; the fixture builder used by both was extracted into buildActiveDisplayFixture().

### Lane LH: home action, form-only recognize page, titled names

Setup: writer Sonnet 5 (spilled from Gemini 3.8 Flash), branch change/home-polish, worktree $HOME/.claude/worktrees/mothers-love-home-polish, based on 2e05c75. Reviewer: the Fable coordinator. Order at docs/runs/2026-09-10-color-polish/orders/LH.md.

src/components/feed/FeedHome.tsx removed the duplicate bottom mobile share dock, so the single Share a recognition action sits under the title and above Recent recognitions on phones. src/components/feed/HomeExperience.module.css gives that action a coral, peach and gold gradient, a soft glow and a gentle shimmer sweep (keyframes primaryShimmer), which the existing reduced-motion rule disables. src/components/submission/SubmissionForm.tsx no longer renders the compact live feed on /recognize (the CompactPublicFeed component stays in place for the home page), and both name placeholders now read "For example, Michelle, Maya Rodriguez, Mo, B. Daniel, S. Grace L., or D. Kim." src/components/submission/SubmissionExperience.module.css dropped the now-dead liveFeed rules. tests/feed/feed.spec.ts replaced the companion-feed journey with "shows the form only on the recognize page, with no live campaign feed."

## Verification and finish

npm_config_cache=/tmp/npm-cache prefixes every npm and npx command. Typecheck, the full unit suite, a production build and the full Playwright browser suite run in the main checkout after both branches merge, alongside a spot check that the three pre-existing failures at the prior live commit are unchanged. Update README, HANDOFF, AGENTS and the Plan 10 run record. Push to origin codex/mothers-love and promote the resulting Vercel deployment to production, then confirm the two changes live in the browser.

## Build log

- 2026-09-10: Anthony's four follow-up requests recorded above. Two lanes planned: LC for the TV click advance, LH for the home action, the form-only recognize page and the titled name examples.

- 2026-09-10: Both lanes were first launched on Gemini 3.8 Flash through agy after Anthony widened the Antigravity gate with bash, python3 and psql. LC's agy print mode launched the renderer probe as a background task, then ended while "standing by," with no edits. LH's agy reported a required "command" permission auto-denied in headless mode, with no edits; its logs do not record which command. Ledger rows agy-LC-20260910 (fail) and agy-LH-20260910 (blocked) record both attempts. Ruling and the follow-up question for Anthony are recorded at docs/runs/2026-09-10-color-polish/decisions/2026-09-11T00-05Z-LC-LH-gemini-failed-twice.md. Both lanes spilled to Sonnet 5 helpers under the routing table's spill order.

- 2026-09-10: Lane LC landed as commit f2702ae, "Advance the TV to the next scene on click, tap, right arrow or space," at 4:49 PM Pacific time, on branch change/tv-click-advance.

- 2026-09-10: Lane LH landed as commit ff56752, "Shimmering Share a recognition action above the phone feed, form-only recognize page, titled name examples," at 4:55 PM Pacific time, on branch change/home-polish.

- 2026-09-10: Both branches merged into the integration branch codex/color-polish-v6, merge commit 076c4cd. Coordinator verification in the main checkout: typecheck clean, 222 of 222 unit tests, a production build, and 55 browser journeys passing across tests/feed, tests/submission, tests/mobile-recognition and tests/color-polish-usable (3 in color-polish-usable, including the new click journey), with 1 skipped. 3 browser tests fail identically at the previous live commit 2e05c75, so they are pre-existing and unrelated to these two lanes: tests/submission/plan08/submission-form-refresh.spec.ts:13 expects the selected expression card background to contain rgb(255, 242, 200), but the earlier color pass now uses a gold gradient; tests/submission/submission.spec.ts:293 reports axe contrast findings on the expressions guide; tests/mobile-recognition/mobile-recognition.spec.ts:110 needs PLAYWRIGHT_BASE_URL set. Phone screenshots from the existing specs, built from synthetic data, showed the action above the feed at 320 pixels wide and the form-only recognize page at 768 pixels wide.

- 2026-09-10: Anthony chose full replace, release mode A. Commit 076c4cd was pushed to origin codex/mothers-love at about 5:20 PM Pacific time; Vercel production deployment dpl_9DsFVYvDX1fSXRirH3vGHfxeFwQd is READY at https://mothers-love.vercel.app. Live checks: renderer.js bytes match the build; at 375 pixels wide the single Share a recognition link sits at 108 pixels from the top, above the Recent recognitions region at 263 pixels, with the gradient and the primaryShimmer animation active; /recognize has no live feed, no "Live from the campaign" text, the form present, and both titled placeholders in place. Rollback runs through npx vercel rollback to dpl_BaxrmngrNd8yEjFttZUQBQBKTMRr (commit 06172bb, the Plan 10 build). No database change was involved in this release.

- 2026-09-10: Plan 11 is complete and live. Open follow-ups: the three pre-existing failing browser tests recorded above, the Antigravity gate still blocking something in headless mode after being widened (undetermined which command), and everything already listed in Plan 10's own follow-ups.
