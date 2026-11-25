---
lane: LT
title: TV stability and scene countdown
state: landed
model: Sonnet 5 (routed directly, Gemini through agy failed twice earlier that day)
runner: helper
worktree: $HOME/.claude/worktrees/mothers-love-tv-countdown
review: passed
depends_on: LC, LH
updated: 2026-09-10T23:20Z
---

# LT: TV stability and scene countdown

## Work order

Full order at [orders/LT.md](../orders/LT.md). Anthony's requests, quoted: "Sometimes the connection is glitchy. Sometimes it shows that it's not available or that it's connecting just for a brief second, and it comes back." and "every page, each scene, in the bottom-right corner, in a subtle way, in a small number, had a countdown until the next view comes. The time that it's counting down should really be discrete and not really draw too much attention to it. If it can have the design where not only is it counting down, but the circle around it is running out, and then once it gets to zero, that's when there's no more, and then it just moves on." Find and close every path that shows connecting or unavailable for a moment while a good snapshot under 60 seconds old exists; add a discreet countdown ring to every scene.

## Result

905676f, "Keep the TV steady through brief poll glitches and add a discreet scene countdown." Changes in src/components/display/color-polish-host/ColorPolishHost.tsx and src/components/display/color-polish/renderer.tsx: an in-flight poll is now left alone instead of aborted by the next poll, and the request timeout was raised from 5 seconds to 9 seconds so a healthy but slow read is not killed; the renderer iframe is now keyed on source only instead of source plus a safe or active flag, so a momentary status change no longer remounts the whole renderer and drops the bootstrap handshake, with the safe state carried through the existing postMessage control instead. A countdown ring was added in public/color-polish/renderer.js, renderer.html and renderer.css: 36 pixels, 2 pixel stroke, 45 percent opacity, palette colors, no glow or label, bottom right of the stage, draining over the scene dwell from S.sceneAge with the whole seconds remaining shown inside, restarting on each scene and on a manual advance, hidden when the mode is not normal, when rotation is paused by the owner, in still mode, when a scene is forced away from the playlist on the live source, and during arrivals and transitions. It shows in the Studio preview while playing, and steps once per second under reduced motion. It is never logged. tests/color-polish-usable/usable.spec.ts gained 4 journeys: glitch stability with repeated 503 responses and one 7 second response, a 60 second outage falling back as before, countdown reset on manual advance, and a shared frame lookup, bringing the file to 6 journeys total.

## Review

The coordinator read the diff and passed it, then found one remaining issue when re-running verification in the main checkout: under React strict mode in development, the polling effect mounts, cleans up and mounts again before the first request clears its ref, so the new in-flight guard saw an aborted controller and skipped the next request, leaving the display on checking for 5 seconds. The coordinator made the correction directly in the main checkout rather than sending the lane back, since the fix was a one-line guard change: the in-flight guard now ignores an aborted controller. Commit ef0f693, "Start a fresh poll when the previous controller was already aborted."

## Runtime change

Routed directly to a Claude Sonnet 5 helper, with no repeat Gemini attempt: lanes LC and LH had each already failed on Gemini 3.8 Flash through agy twice earlier the same day, recorded at [decisions/2026-09-11T00-05Z-LC-LH-gemini-failed-twice.md](../decisions/2026-09-11T00-05Z-LC-LH-gemini-failed-twice.md). Branch change/tv-countdown-stability, worktree $HOME/.claude/worktrees/mothers-love-tv-countdown, based on 81592a9.

## Landing evidence

The coordinator reviewed the diff and passed it, made the correction above in the main checkout, then re-ran verification as part of the combined LT and LM release: typecheck clean, 222 of 222 unit tests, a production build, the renderer probe at zero issues across all 10 scenes with the countdown ring visible (for example, 166 seconds remaining on the Garden scene at the 14 second checkpoint), and the color-polish-usable browser journeys passing, including the 4 new journeys. Full combined numbers are recorded in [the Plan 12 Build log](../../../PLAN-12-tv-stability-countdown-and-home-action.md) and the [run record's Plan 12 release section](../INDEX.md).

Merged into the integration branch codex/color-polish-v6, then pushed to origin codex/mothers-love and deployed as Vercel production deployment dpl_QftFLj8ww2f83bkhDPsRGH18yqCm, READY, at about 6:35 PM Pacific time. Live check: https://mothers-love.vercel.app/display is in the active phase with one sandboxed iframe and no connecting or unavailable text; renderer.js, renderer.html and renderer.css bytes match the build and the countdown markup is served.
