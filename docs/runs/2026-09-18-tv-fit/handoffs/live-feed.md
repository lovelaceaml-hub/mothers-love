# Plan 17 handoff: Live Recognitions (new eleventh screen)

Plan goal line (outranks this handoff): "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."

## Where this screen stands (2026-09-19)
- Built in lane L13, merged into tv17/pick fd1268e ($HOME/Projects/mothers-love-worktrees/tv17-base).
- State: Panel fills y 118 to 1055 in two columns, rail text sizes (18 px messages), QR inside, rail hidden only on this screen, 60 seconds, last in rotation. database/014 is WRITTEN BUT NOT RUN; it needs a trial on a throwaway local Postgres and Anthony's approval before it touches the shared production database. Rollback order is in rollback-live-feed.sql.
- Checks on tv17/pick 2a75745: typecheck clean, 255 of 255 unit tests, build clean, 274 of 274 scene tests against a production build with synthetic config.
- Anthony's TV link for this screen (Vercel preview, needs his Vercel session): https://mothers-love-3nt3siq75-lvzion.vercel.app/display?scene=live-feed
- Anthony approved this screen on 2026-09-19 (this screen only). Nothing is released; full suite, typecheck and build must be rerun on fd1268e before release.

## Anthony's rulings that bind any further work
- Writers are Opus 5 (smaller tasks) or Fable 5.1 (bigger tasks), never Sonnet. An Opus change gets exactly one Fable review and the reviewer fixes what it finds; Fable work is not reviewed.
- Every screen is its own lane. Every screen shows for 60 seconds by default, Garden 180; read the dwell from state, never hardcode it. The live saved playlist changes to 60 seconds at release, not before.
- Never truncate, clip or ellipsize a message; 18 px drawn floor at 1920 (36 at 3840) for text a viewer reads.
- Stop and ask before any production deploy, any change to the live database or the live saved playlist. Preview deploys are run by Anthony (the auto mode classifier refuses them): `cd $HOME/Projects/mothers-love-worktrees/tv17-base && npm_config_cache=/tmp/npm-cache npx vercel deploy --yes`.
- Never copy $HOME/Projects/mothers-love/.env.local into a worktree; tests use synthetic public config only (pattern: $HOME/Projects/mothers-love-worktrees/tv17-base/.tv17/verify-studio.sh). Fictional sample data only. No em dash or en dash anywhere.

## Read first
- $HOME/Projects/mothers-love/docs/PLAN-17-tv-fit-and-release.md (including its Build log)
- $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/INDEX.md
- $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/decisions/2026-09-19T05-45Z-anthony-tv-watch-feedback.md and $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/decisions/2026-09-19T06-20Z-anthony-60-seconds-and-opus-fable-only.md
- $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/lanes/L13.md
- $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/L13-writer-result.md
- $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/activation-live-feed.sql
- $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/rollback-live-feed.sql

## Execution envelope
- Project / unit: Plan 17: TV text fit and Plan 15 release, Lane L13: Live Recognitions (new eleventh screen)
- Lane: Claude (Opus 5 writer plus one Fable 5.1 review, or Fable 5.1 writer with no review, per Anthony's ruling)
- Read first: the three files above, plan first
- In scope: only what Anthony asks to change on this screen after watching it on the TV; this screen's own files (allowlist below)
- Protected / out of scope: production, the shared Supabase database, the live saved playlist, every other screen's files, header, feed rail, QR, playlist order, click-advance, real recognition data
- Acceptance: Anthony's named change is visible on the per-screen preview link; this screen's spec passes with assertions that can fail; typecheck, unit tests and build clean; full scene folder still 0 failures
- Verify: npm run typecheck; npm test; npm run build; bash .tv17/verify-studio.sh tests/color-polish-scenes/<this screen's spec>; then the full folder; captures at 1920 and 3840 into $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/
- Completion output: Build log facts, changed files, verification evidence, commit and push status, limitations, the refreshed per-screen link
- Record file: $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/lanes/ (this screen's lane file; append, do not rewrite)
- Board: pending
- Critique: none; one Fable review covers an Opus change

```allowlist
$HOME/.claude/worktrees/mothers-love-tv17-h-live-feed/public/color-polish/scenes/live-feed.js
$HOME/.claude/worktrees/mothers-love-tv17-h-live-feed/public/color-polish/scenes/live-feed.css
$HOME/.claude/worktrees/mothers-love-tv17-h-live-feed/tests/color-polish-scenes/live-feed.spec.ts
$HOME/.claude/worktrees/mothers-love-tv17-h-live-feed/database/014_color_polish_live_feed.sql
$HOME/.claude/worktrees/mothers-love-tv17-h-live-feed/src/lib/color-polish/contracts.ts
$HOME/.claude/worktrees/mothers-love-tv17-h-live-feed/src/lib/color-polish/validation.ts
$HOME/.claude/worktrees/mothers-love-tv17-h-live-feed/src/lib/server/color-polish.ts
$HOME/.claude/worktrees/mothers-love-tv17-h-live-feed/src/components/admin/color-polish/ColorPolishStudio.tsx
```

Worktree for any change: create it with `git -C $HOME/Projects/mothers-love-worktrees/tv17-base worktree add -b tv17/h-live-feed $HOME/.claude/worktrees/mothers-love-tv17-h-live-feed tv17/pick`, run `npm ci` there with npm_config_cache=/tmp/npm-cache, and never edit $HOME/Projects/mothers-love-worktrees/tv17-base directly unless you are the integration lane.

## Copy-paste kickoff for a fresh chat
```text
Run the The Words of Mother's Love Plan 17 lane L13: Live Recognitions (new eleventh screen) at $HOME/Projects/mothers-love/docs/PLAN-17-tv-fit-and-release.md

Read first: $HOME/Projects/mothers-love/docs/PLAN-17-tv-fit-and-release.md (including its Build log) and $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/INDEX.md, then $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/handoffs/live-feed.md (this screen's state, rulings, envelope and allowlist).

Gate: the Plan 17 Build log must show the 2026-09-19 second run entry with tv17/pick 2a75745; if it does not, stop and report. First action: ask Anthony what he saw for this screen on the church TV at https://mothers-love-1vgu7sp37-lvzion.vercel.app/display?scene=live-feed and change only what he names.
```
