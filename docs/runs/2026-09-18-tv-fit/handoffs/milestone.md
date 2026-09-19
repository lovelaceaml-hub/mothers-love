# Plan 17 handoff: Weekly Goal

Plan goal line (outranks this handoff): "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."

## Where this screen stands (2026-09-19)
- Built in lane L8, merged into tv17/pick 2a75745 (/Users/anthony/Projects/mothers-love-worktrees/tv17-base).
- State: 52 pearls: 24 reading pearls in one rising helix, 28 soft depth pearls; about 21 drawn at once; near words 18 px or more; a record at most twice, never adjacent.
- Checks on tv17/pick 2a75745: typecheck clean, 255 of 255 unit tests, build clean, 274 of 274 scene tests against a production build with synthetic config.
- Anthony's TV link for this screen (Vercel preview, needs his Vercel session): https://mothers-love-1vgu7sp37-lvzion.vercel.app/display?scene=milestone
- 2026-09-19 update: funnel vortex with many bubble sizes and the three caption removals merged into tv17/pick 9f8d56b (branch tv17/h-milestone b7bc183). Anthony saw preview https://mothers-love-ofay8zu1p-lvzion.vercel.app/display?scene=milestone and said "looks right." Details: lanes/L8.md. The all-screens test folder was not rerun after this merge.
- NOT done: nothing is released.

## Anthony's rulings that bind any further work
- Writers are Opus 5 (smaller tasks) or Fable 5.1 (bigger tasks), never Sonnet. An Opus change gets exactly one Fable review and the reviewer fixes what it finds; Fable work is not reviewed.
- Every screen is its own lane. Every screen shows for 60 seconds by default, Garden 180; read the dwell from state, never hardcode it. The live saved playlist changes to 60 seconds at release, not before.
- Never truncate, clip or ellipsize a message; 18 px drawn floor at 1920 (36 at 3840) for text a viewer reads.
- Stop and ask before any production deploy, any change to the live database or the live saved playlist. Preview deploys are run by Anthony (the auto mode classifier refuses them): `cd /Users/anthony/Projects/mothers-love-worktrees/tv17-base && npm_config_cache=/tmp/npm-cache npx vercel deploy --yes`.
- Never copy /Users/anthony/Projects/mothers-love/.env.local into a worktree; tests use synthetic public config only (pattern: /Users/anthony/Projects/mothers-love-worktrees/tv17-base/.tv17/verify-studio.sh). Fictional sample data only. No em dash or en dash anywhere.

## Read first
- /Users/anthony/Projects/mothers-love/docs/PLAN-17-tv-fit-and-release.md (including its Build log)
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/INDEX.md
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/decisions/2026-09-19T05-45Z-anthony-tv-watch-feedback.md and /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/decisions/2026-09-19T06-20Z-anthony-60-seconds-and-opus-fable-only.md
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/lanes/L8.md
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/L8-review.md

## Execution envelope
- Project / unit: Plan 17: TV text fit and Plan 15 release, Lane L8: Weekly Goal
- Lane: Claude (Opus 5 writer plus one Fable 5.1 review, or Fable 5.1 writer with no review, per Anthony's ruling)
- Read first: the three files above, plan first
- In scope: only what Anthony asks to change on this screen after watching it on the TV; this screen's own files (allowlist below)
- Protected / out of scope: production, the shared Supabase database, the live saved playlist, every other screen's files, header, feed rail, QR, playlist order, click-advance, real recognition data
- Acceptance: Anthony's named change is visible on the per-screen preview link; this screen's spec passes with assertions that can fail; typecheck, unit tests and build clean; full scene folder still 0 failures
- Verify: npm run typecheck; npm test; npm run build; bash .tv17/verify-studio.sh tests/color-polish-scenes/<this screen's spec>; then the full folder; captures at 1920 and 3840 into /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/
- Completion output: Build log facts, changed files, verification evidence, commit and push status, limitations, the refreshed per-screen link
- Record file: /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/lanes/ (this screen's lane file; append, do not rewrite)
- Board: pending
- Critique: none; one Fable review covers an Opus change

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv17-h-milestone/public/color-polish/scenes/milestone.js
/Users/anthony/.claude/worktrees/mothers-love-tv17-h-milestone/public/color-polish/scenes/milestone.css
/Users/anthony/.claude/worktrees/mothers-love-tv17-h-milestone/tests/color-polish-scenes/milestone.spec.ts
```

Worktree for any change: create it with `git -C /Users/anthony/Projects/mothers-love-worktrees/tv17-base worktree add -b tv17/h-milestone /Users/anthony/.claude/worktrees/mothers-love-tv17-h-milestone tv17/pick`, run `npm ci` there with npm_config_cache=/tmp/npm-cache, and never edit /Users/anthony/Projects/mothers-love-worktrees/tv17-base directly unless you are the integration lane.

## Copy-paste kickoff for a fresh chat
```text
Run the The Words of Mother's Love Plan 17 lane L8: Weekly Goal at /Users/anthony/Projects/mothers-love/docs/PLAN-17-tv-fit-and-release.md

Read first: /Users/anthony/Projects/mothers-love/docs/PLAN-17-tv-fit-and-release.md (including its Build log) and /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/INDEX.md, then /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/handoffs/milestone.md (this screen's state, rulings, envelope and allowlist).

Gate: the Plan 17 Build log must show the 2026-09-19 second run entry with tv17/pick 2a75745; if it does not, stop and report. First action: ask Anthony what he saw for this screen on the church TV at https://mothers-love-1vgu7sp37-lvzion.vercel.app/display?scene=milestone and change only what he names.
```
