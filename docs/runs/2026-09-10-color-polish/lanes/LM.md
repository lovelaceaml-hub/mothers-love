---
lane: LM
title: Dominant home action and compact recent recognitions
state: landed
model: Sonnet 5 (routed directly, Gemini through agy failed twice earlier that day)
runner: helper
worktree: $HOME/.claude/worktrees/mothers-love-home-cta
review: passed
depends_on: LC, LH
updated: 2026-09-10T23:40Z
---

# LM: Dominant home action and compact recent recognitions

## Work order

Full order at [orders/LM.md](../orders/LM.md). Anthony's request, quoted: "The share recognition button needs to be even more prominent in your face, even in front of the floating icons, and then it should even get your attention. With something, and then the recent recognitions on that page, they need to be less vertical, not taking as much space." Make the Share a recognition action dominant on phones, in front of the floating expression medallions, with an added attention cue; shrink recent recognition cards without truncating any message, and measure the result.

## Result

1b631f1, "Dominant pulsing Share a recognition action and shorter recognition cards on phones." src/components/feed/HomeExperience.module.css changed, phone width rules only. The Share a recognition action is full width, 60 pixels tall (48 pixels on screens under 580 pixels tall), bold at 1.05rem, z-index 5, pulled up 18 pixels so it layers in front of the floating expression medallions, with a ctaPulse animation every 6 seconds (scale 1.04 with a glow bloom, about 900 milliseconds) on top of the existing shimmer, both silenced by the page's reduced-motion rule. Recent recognition cards on phones: card padding 4 pixels by 8 pixels, list gap 4 pixels, header minimum height 20 pixels, medallion 22 pixels, name .9rem, message .875rem with 1.3 line height, chips .72rem, heart with a 40 pixel tap target. First card height measured with the synthetic fixture at 390 by 844: 210.69 pixels before, 166.75 pixels after, 20.9 percent shorter, messages never truncated. tests/mobile-recognition/mobile-recognition.spec.ts gained 2 journeys: order, overlap, pulse and reduced motion; and the measured card height check with named constants.

## Review

The coordinator read the diff and rejected the first pass: the message text was set to .78rem, which the coordinator judged unreadable at phone width, and required at least .875rem. The writer's first pass also reported a reasoned pixel estimate for the card height rather than an actual measurement; the coordinator required a real measurement from the test fixture instead. Both corrections were folded into commit 1b631f1 before it landed. A separate measurement correction was made afterward in the main checkout, commit c28f8c6, "Measure the phone card heights in the compact-card journey," which replaced the estimate with the test asserting and recording the actual measured heights (210.69 pixels before, 166.75 pixels after) using named constants.

## Runtime change

Routed directly to a Claude Sonnet 5 helper, with no repeat Gemini attempt: lanes LC and LH had each already failed on Gemini 3.8 Flash through agy twice earlier the same day, recorded at [decisions/2026-09-11T00-05Z-LC-LH-gemini-failed-twice.md](../decisions/2026-09-11T00-05Z-LC-LH-gemini-failed-twice.md). Branch change/home-cta-compact, worktree $HOME/.claude/worktrees/mothers-love-home-cta, based on 81592a9.

## Landing evidence

The coordinator reviewed the diff, required the legibility and measurement corrections above, passed the result, then re-ran verification in the main checkout as part of the combined LT and LM release: typecheck clean, 222 of 222 unit tests, a production build, and the mobile-recognition and feed browser journeys passing, including the 2 new journeys and the measured card height check. Full combined numbers are recorded in [the Plan 12 Build log](../../../PLAN-12-tv-stability-countdown-and-home-action.md) and the [run record's Plan 12 release section](../INDEX.md).

Merged into the integration branch codex/color-polish-v6 at merge commit 1c0ae09, plus the measurement correction commit c28f8c6 on the integration branch, then pushed to origin codex/mothers-love and deployed as Vercel production deployment dpl_QftFLj8ww2f83bkhDPsRGH18yqCm, READY, at about 6:35 PM Pacific time. Live check: at 375 pixels wide on https://mothers-love.vercel.app, the Share a recognition action measures 343 by 60 pixels, 106 pixels from the top, z-index 5, with the pulse animation running, above the Recent recognitions region at 246 pixels.
