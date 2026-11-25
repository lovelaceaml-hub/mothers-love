---
lane: LH
title: Home action, form-only recognize page, titled name examples
state: landed
model: Sonnet 5 (spilled from Gemini 3.8 Flash)
runner: helper
worktree: $HOME/.claude/worktrees/mothers-love-home-polish
review: passed
depends_on: LF
updated: 2026-09-10T23:55Z
---

# LH: Home action, form-only recognize page, titled name examples

## Work order

Full order at [orders/LH.md](../orders/LH.md). Anthony's requests, quoted: "on the mobile app, put the share recognition button above the recent recognitions section. Make it stand out so that eyes divert to it. Make it shiny and shimmer." "Share a recognition page doesn't need the live from campaign. just the form to fill out." "For the examples in the name section include titles like B. S. or D."

## Result

(helper appends its result summary, changed files, verification evidence, limitations)

## Review

(coordinator appends)

## Runtime change

First launched on Gemini 3.8 Flash (High) through agy, branch change/home-polish, based on 2e05c75, in worktree $HOME/.claude/worktrees/mothers-love-home-polish, after Anthony widened the Antigravity gate with bash, python3 and psql. agy reported a required "command" permission auto-denied in headless mode, with no edits; its logs do not record which command. Raw launch output at [launch/LH.out](../launch/LH.out); full ruling at [decisions/2026-09-11T00-05Z-LC-LH-gemini-failed-twice.md](../decisions/2026-09-11T00-05Z-LC-LH-gemini-failed-twice.md). Under the routing table's spill order (Gemini refuses, then Sonnet 5, never Opus or Fable), the lane moved to a Claude Sonnet 5 helper in the same worktree and branch, with the same order.

## Landing evidence

Result: commit ff56752, "Shimmering Share a recognition action above the phone feed, form-only recognize page, titled name examples," 5 files. src/components/feed/FeedHome.tsx removed the duplicate bottom mobile share dock, so the single Share a recognition action sits under the title and above Recent recognitions on phones. src/components/feed/HomeExperience.module.css gives that action a coral, peach and gold gradient, a soft glow and a gentle shimmer sweep (keyframes primaryShimmer), which the existing reduced-motion rule disables. src/components/submission/SubmissionForm.tsx no longer renders the compact live feed on /recognize, though CompactPublicFeed stays in place for the home page, and both name placeholders now read "For example, Michelle, Maya Rodriguez, Mo, B. Daniel, S. Grace L., or D. Kim." src/components/submission/SubmissionExperience.module.css dropped the now-dead liveFeed rules. tests/feed/feed.spec.ts replaced the companion-feed journey with "shows the form only on the recognize page, with no live campaign feed."

The coordinator reviewed the diff and passed it, then re-ran verification in the main checkout as part of the combined LC and LH release: typecheck clean, 222 of 222 unit tests, a production build, and the browser journeys across tests/feed and tests/submission passing with the updated recognize-page expectation. Full combined numbers are recorded in [the Plan 11 Build log](../../../PLAN-11-tv-click-and-home-polish.md) and the [run record's Follow-up release section](../INDEX.md).

Merged into the integration branch codex/color-polish-v6 at merge commit 076c4cd, then pushed to origin codex/mothers-love and deployed as Vercel production deployment dpl_9DsFVYvDX1fSXRirH3vGHfxeFwQd, READY, at about 5:20 PM Pacific time. Live checks at 375 pixels wide: the single Share a recognition link sits at 108 pixels from the top, above the Recent recognitions region at 263 pixels, with the gradient and the primaryShimmer animation active; https://mothers-love.vercel.app/recognize has no live feed, no "Live from the campaign" text, the form present, and both titled placeholders in place.
