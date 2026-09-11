# Plan 12: TV stability, scene countdown and a dominant home action

## Goal

Anthony asked for three more follow-ups after Plan 11 went live, quoted exactly:

1. "The share recognition button needs to be even more prominent in your face, even in front of the floating icons, and then it should even get your attention. With something, and then the recent recognitions on that page, they need to be less vertical, not taking as much space."
2. "Sometimes the connection is glitchy. Sometimes it shows that it's not available or that it's connecting just for a brief second, and it comes back."
3. "every page, each scene, in the bottom-right corner, in a subtle way, in a small number, had a countdown until the next view comes. The time that it's counting down should really be discrete and not really draw too much attention to it. If it can have the design where not only is it counting down, but the circle around it is running out, and then once it gets to zero, that's when there's no more, and then it just moves on."

Requests 2 and 3 became lane LT, since both touch the TV display's polling and renderer. Request 1 became lane LM, on the home page.

## Diagnosis

Before writing any code, the coordinator pulled the Vercel runtime logs for the previous 6 hours. They showed no runtime errors and no failed responses: 1526 requests returned 200, 15 returned 304, and 1 returned 201. Since the backend was healthy the whole time, the flashes Anthony saw had to be caused by the client, not the server. That ruled out a database or API fix and pointed lane LT at the polling and rendering code instead.

## Authority and setup

Anthony approved implementation and production release in this task on the evening of September 10, 2026, Pacific time. Coordinator: Claude Fable 5.1. The prior two lanes, LC and LH, had each tried Gemini 3.8 Flash through agy first and failed, recorded at docs/runs/2026-09-10-color-polish/decisions/2026-09-11T00-05Z-LC-LH-gemini-failed-twice.md. On that basis, lanes LT and LM were routed directly to Claude Sonnet 5 as helpers, without a repeat Gemini attempt. Reviewer: the Fable coordinator, reading each diff and re-running verification in the main checkout. Release mode: A, full replacement of the existing production deployment. No database change was needed for either lane.

### Lane LT: TV stability and scene countdown

Setup: writer Sonnet 5 (routed directly, Gemini through agy failed twice earlier the same day), branch change/tv-countdown-stability, worktree /Users/anthony/.claude/worktrees/mothers-love-tv-countdown, based on 81592a9. Reviewer: the Fable coordinator. Order at docs/runs/2026-09-10-color-polish/orders/LT.md.

Three causes of the flashes were confirmed and fixed in src/components/display/color-polish-host/ColorPolishHost.tsx and src/components/display/color-polish/renderer.tsx. First, every new poll aborted the in-flight request, and the request timeout equaled the 5 second poll interval, so a healthy but slow read was always killed; the fix leaves an in-flight poll alone and raises the timeout to 9 seconds. Second, the renderer iframe was keyed on source plus a safe or active flag, so any momentary status change remounted the whole renderer and dropped the bootstrap handshake; the fix keys the iframe on source only and sends the safe state through the existing postMessage control instead. Third, found during correction: under React strict mode in development, the polling effect mounts, cleans up and mounts again before the first request clears its ref, so the new in-flight guard saw an aborted controller and skipped the request, leaving the display on checking for 5 seconds; the guard now ignores an aborted controller.

A countdown was added in public/color-polish/renderer.js, renderer.html and renderer.css: a 36 pixel ring, 2 pixel stroke, 45 percent opacity, colors from the existing palette, no glow and no label, in the bottom right corner of the stage. It drains over the scene's dwell time, driven from S.sceneAge, with the whole seconds remaining shown inside the ring. It restarts on each new scene and on a manual advance. It is hidden when the mode is not normal, when rotation is paused by the owner, in still mode, when a scene is forced away from the playlist on the live source, and during arrivals and transitions. It shows in the Studio preview while the preview is playing. Under reduced motion it steps once per second instead of animating smoothly. It is never logged.

tests/color-polish-usable/usable.spec.ts gained 4 journeys: glitch stability with repeated 503 responses and one 7 second response, a 60 second outage falling back as before, the countdown resetting on a manual advance, and a shared frame lookup used by the stability checks. That brought the file to 6 journeys total.

### Lane LM: dominant home action and compact recent recognitions

Setup: writer Sonnet 5 (routed directly, Gemini through agy failed twice earlier the same day), branch change/home-cta-compact, worktree /Users/anthony/.claude/worktrees/mothers-love-home-cta, based on 81592a9. Reviewer: the Fable coordinator. Order at docs/runs/2026-09-10-color-polish/orders/LM.md.

src/components/feed/HomeExperience.module.css changed, phone width rules only. The Share a recognition action is now full width, 60 pixels tall (48 pixels on screens under 580 pixels tall), bold at 1.05rem, z-index 5, and pulled up 18 pixels so it layers in front of the floating expression medallions. A ctaPulse animation runs every 6 seconds, a scale of 1.04 with a glow bloom lasting about 900 milliseconds, on top of the existing shimmer; the page's reduced-motion rule silences both.

Recent recognition cards on phones were made more compact: card padding 4 pixels by 8 pixels, list gap 4 pixels, header minimum height 20 pixels, medallion 22 pixels, name at .9rem, message at .875rem with 1.3 line height, expression chips at .72rem, and the heart keeps a 40 pixel tap target. The coordinator rejected the writer's first pass at .78rem for the message text as unreadable; the correction raised it to .875rem. Messages are never truncated.

Card height was measured, not assumed. Using the synthetic test fixture at 390 by 844, the first card measured 210.69 pixels before the change and 166.75 pixels after, 20.9 percent shorter.

tests/mobile-recognition/mobile-recognition.spec.ts gained 2 journeys: order, overlap, pulse and reduced motion; and the measured card height check, using named constants for the before and after numbers.

## Verification and finish

npm_config_cache=/tmp/npm-cache prefixes every npm and npx command. Typecheck, the full unit suite, a production build and the full Playwright browser suite run in the main checkout after both branches merge, alongside the renderer probe across all 10 scenes. Update README, HANDOFF, AGENTS and the Plan 10 run record. Push to origin codex/mothers-love and promote the resulting Vercel deployment to production, then confirm the changes live in the browser.

## Build log

- 2026-09-10: Anthony's three follow-up requests recorded above. Two lanes planned: LT for TV stability and the scene countdown, LM for the dominant home action and compact recent recognitions.

- 2026-09-10: Diagnosis before writing any code. Vercel runtime logs for the previous 6 hours showed no runtime errors and no failed responses: 1526 requests at 200, 15 at 304, 1 at 201. The flashes Anthony saw were client side, not a backend problem.

- 2026-09-10: Since lanes LC and LH had each already failed on Gemini 3.8 Flash through agy twice that same day, recorded at docs/runs/2026-09-10-color-polish/decisions/2026-09-11T00-05Z-LC-LH-gemini-failed-twice.md, lanes LT and LM were routed directly to Claude Sonnet 5 as helpers, with no repeat Gemini attempt.

- 2026-09-10: Lane LT landed as commit 905676f, "Keep the TV steady through brief poll glitches and add a discreet scene countdown," on branch change/tv-countdown-stability.

- 2026-09-10: Lane LT correction, made in the main checkout: commit ef0f693, "Start a fresh poll when the previous controller was already aborted." Found during correction, only under React strict mode in development: the polling effect mounts, cleans up and mounts again before the first request clears its ref, so the in-flight guard saw an aborted controller and skipped the next request, leaving the display on checking for 5 seconds. The guard now ignores an aborted controller.

- 2026-09-10: Lane LM landed as commit 1b631f1, "Dominant pulsing Share a recognition action and shorter recognition cards on phones," on branch change/home-cta-compact, after a legibility correction: the coordinator rejected the writer's first pass at .78rem for the message text as unreadable and required at least .875rem.

- 2026-09-10: Lane LM measurement correction, made in the main checkout: commit c28f8c6, "Measure the phone card heights in the compact-card journey." A reasoned pixel estimate is not a measurement; the test now measures the first card at 390 by 844 with the synthetic fixture and records both numbers with named constants: 210.69 pixels before, 166.75 pixels after, 20.9 percent shorter.

- 2026-09-10: Both branches merged into the integration branch codex/color-polish-v6, merge commit 1c0ae09, plus commit c28f8c6 on the integration branch for the measurement correction. Coordinator verification in the main checkout: typecheck clean, 222 of 222 unit tests, a production build, the renderer probe at zero issues across all 10 scenes with the countdown ring visible (for example, 166 seconds remaining on the Garden scene at the 14 second checkpoint), and 60 browser journeys passing across tests/color-polish-usable, tests/feed, tests/submission and tests/mobile-recognition, 1 skipped. Only the 3 pre-existing failures already listed in Plan 11 remain, unchanged: tests/mobile-recognition/mobile-recognition.spec.ts:110 needs PLAYWRIGHT_BASE_URL set; tests/submission/plan08/submission-form-refresh.spec.ts:13 expects an old color; tests/submission/submission.spec.ts:293 reports an axe contrast finding on the expressions guide. tests/display/display.e2e.spec.ts has 26 failing journeys that target the legacy display-app test id, which nothing has rendered since commit a7dca27; these are pre-existing and recorded as a follow-up to retire or rewrite.

- 2026-09-10: Anthony chose full replace, release mode A. Commit c28f8c6 was pushed to origin codex/mothers-love at about 6:35 PM Pacific time; Vercel production deployment dpl_QftFLj8ww2f83bkhDPsRGH18yqCm is READY at https://mothers-love.vercel.app.

- 2026-09-10: Live checks. renderer.js, renderer.html and renderer.css bytes match the build, and the countdown markup is served. /display is in the active phase with one sandboxed iframe and no connecting or unavailable text. At 375 pixels wide, the Share a recognition action measures 343 by 60 pixels, 106 pixels from the top, z-index 5, with the pulse animation running, above the Recent recognitions region at 246 pixels. Rollback runs through npx vercel rollback to dpl_9DsFVYvDX1fSXRirH3vGHfxeFwQd (commit 076c4cd, the Plan 11 build); no database change was involved in this release.

- 2026-09-10: Plan 12 is complete and live. Open follow-ups: retire or rewrite tests/display/display.e2e.spec.ts for the Color Polish host, the three pre-existing failing tests recorded above, and everything already open from Plans 10 and 11.
