# Plan 17: TV text fit and Plan 15 release

Goal: every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV.

Status: approved by Anthony on September 18, 2026 ("im ready"). Interview held page by page in the Claude chat of that date.

## Context

Plan 15's test preview (branch `codex/tv15-full-preview` at `5a24f0b`, worktree `/Users/anthony/Projects/mothers-love-worktrees/tv15-b2-preview`, preview https://mothers-love-d4ve0196a-lvzion.vercel.app/display) was watched on the church TV. Anthony likes eight scenes and rejects Peacemakers and Peace in Practice. Production is `change/tv-qr-home` at `b7d92a0` (the Plan 16 100-message feed plus the September 18 QR change), pushed as `codex/mothers-love`, deployment `dpl_DEwMhtevRw9uf1WyuSFPUGotNm27`. Production still runs the Plan 12 single-file renderer; the preview runs the Plan 13 split `core/` plus `scenes/` renderer.

Reference captures from the interview: `node scripts/color-polish-renderer-probe.mjs <worktree> <out> [--width=3840] [--ms=0|6000|14000|21000]` renders every scene with fictional sample data. Anthony's TV photos of the Words that bring peace scene show the all-nine grid and the in-focus view running past the left and right screen edges.

## Decisions (Anthony, September 18, 2026)

1. Screen: problems were seen on the church TV. Every check runs at 1920x1080 and 3840x2160.
2. Welcome (renderer id 1): bubble text runs past the rim. Fix: bubbles grow to fit the full message. Never shorten a message, never add an ellipsis.
3. Featured (id 4): no change.
4. Expression Orbit (id 10): small bubbles' text must stay inside their rims. The gold centre circle fits the expression name, full quote and description with a margin from the rim. Bubbles passing over the centre circle is fine and stays.
5. Garden (id 2): no change.
6. Weekly Goal (id 11, slug milestone): bubbles stay inside the panel, never cut off at its top or bottom edge. The goal heading and date get room from the panel's top edge; the milestone block and its bar get room from the bottom edge; the empty gap between the progress bar and the milestone block closes.
7. Words that bring peace (id 7, slug expressions): keep the current tilt and drift motion exactly. Move everything inward so no box, panel or border ever reaches a screen edge at any moment of the motion, in both the all-nine grid and the one-in-focus view. The title must not sit on the panel's top border, and the "The stage turns through..." note must sit inside the layout.
8. Status (id 6) and Calendar (id 5): no change.
9. Peacemakers (id 8) and Peace in Practice (id 9): show exactly what the live TV shows today (Plan 12 production). Redesign is a separate later plan.
10. Delegated default, recorded: the Welcome rule (grow the bubble, keep the full message) applies to every message bubble on Orbit and Goal too.
11. Release: nothing goes live until Anthony has seen a new preview on the TV. Before promotion the branch must include production's `b7d92a0` (100-message feed and QR home link) so neither is undone. The release mode question from the `live-app-release` skill is asked at Section Z.

## Models, lanes, reviews

- Coordinator: Claude Opus 5 (high) in the kickoff chat. Writes work orders, dispatches, reads diffs, keeps the record tree; authors no scene code.
- Writer for every code lane: gpt-5.6-luna via codex-dispatch when Codex primary is below 80 percent; otherwise Gemini 3.8 Flash (High) via agy. At planning time Codex primary is at 100 percent, so Gemini 3.8 Flash (High) is the starting writer. Spill: Gemini 3.8 Flash (Medium), then Sonnet 5 (medium). Never Opus or Fable for implementation. Escalation: three Luna failures to gpt-5.6-terra, two more to gpt-5.6-sol, then Anthony.
- Landing review per lane: Claude Sonnet 5 (high), one round plus one confirmation pass (church app real people use: two rounds total).
- Hygiene sweeps, ledger rows, INDEX updates, README and HANDOFF links: Haiku 4.5 (low).
- Completion review: Claude Sonnet 5 (high) on the integrated branch before the TV preview. No Opus reviewer; no named reason for one.

Cross-cutting rules: Plan 15 cross-cutting rules stay in force (scene-scoped CSS, prefixed globals, 18 px message floor at 1920, reduced motion, fictional data only, header, feed rail, QR, durations, playlist order and click-advance untouched, no em or en dash). New rule for this plan: no message is ever truncated, clipped or ellipsized; every text box's content box must sit fully inside its visible container and inside the 1920x1080 or 3840x2160 viewport at the 0, 6, 14 and 21 second checkpoints and at the extremes of any motion.

## Branch and worktree model

- `tv17/base`: cut from `codex/tv15-full-preview` at `5a24f0b` in `/Users/anthony/Projects/mothers-love-worktrees/tv17-base`.
- One branch and worktree per lane, cut from `tv17/base`: `/Users/anthony/Projects/mothers-love-worktrees/tv17-<lane>`. Lanes own disjoint files.
- `tv17/pick`: integration branch in `tv17-base`; merges the lanes, then merges production `b7d92a0` (Section Z).

## Lane 0: Plan critique
Setup: read-only critic · high · Lane: Codex · Review: none
  Codex: gpt-5.6-sol · high (fallback while Codex primary is exhausted: Antigravity Gemini 3.8 Flash (High), read-only)
Worktree: none, read-only against /Users/anthony/Projects/mothers-love-worktrees/tv15-b2-preview and /Users/anthony/Projects/mothers-love
Depends on: none; launches alongside Lanes 1 to 3
Brief: attack this plan. All material objections, severity-ranked, evidence for each; approval is not an allowed output. Section Z resolves accepted findings before the completion review and records every disposition in the Build log.

## Lane 1: Bubble fit (Welcome, Orbit, Goal)
Setup: frontier · high · Lane: Codex (Luna via codex-dispatch; Gemini 3.8 Flash (High) via agy while Codex primary is at or above 80 percent) · Review: controller
Worktree: /Users/anthony/Projects/mothers-love-worktrees/tv17-fit, branch tv17/fit
Depends on: tv17/base
Reviewers: controller=Claude Sonnet 5 · high
Owns: public/color-polish/scenes/welcome.*, orbit.*, milestone.*, their scene specs under tests/color-polish-scenes/.
Work: decisions 2, 4, 6 and 10. Size each message bubble from its measured text so the full message fits with an inner margin; reflow the layout for the larger bubbles instead of shrinking text below the 18 px floor. Orbit centre circle fits name, quote and description with a rim margin. Goal: bubbles bounded by the panel; left column spacing per decision 6.
Acceptance: a new `textFits` assertion (every text element's scroll size within its client size, no ellipsis, content box inside its bubble's circle and inside the panel and viewport) passes for all three scenes with the mostly-long fixture at every checkpoint at both widths; existing Plan 15 specs for these scenes still pass; before and after probe captures filed in the lane log.

## Lane 2: Words that bring peace edges
Setup: balanced · high · Lane: Codex (same writer rule as Lane 1) · Review: controller
Worktree: /Users/anthony/Projects/mothers-love-worktrees/tv17-expressions, branch tv17/expressions
Depends on: tv17/base
Reviewers: controller=Claude Sonnet 5 · high
Owns: public/color-polish/scenes/expressions.*, tests/color-polish-scenes/expressions.spec.ts.
Work: decision 7. Keep the motion values unchanged; compute the motion's maximum reach and inset the grid and the focus panel so every box, border and shadow stays inside the viewport. Title clear of the panel's top border; footnote inside the layout.
Acceptance: sample the motion at 30 points across a full cycle in both views at both widths; every box's bounding rectangle, including rotation, stays at least 16 px (1920) inside the viewport; motion constants diff is empty; captures filed.

## Lane 3: Restore live Peacemakers and Peace in Practice
Setup: frontier · high · Lane: Codex (same writer rule as Lane 1) · Review: controller
Worktree: /Users/anthony/Projects/mothers-love-worktrees/tv17-restore, branch tv17/restore
Depends on: tv17/base
Reviewers: controller=Claude Sonnet 5 · high
Owns: public/color-polish/scenes/peacemakers.*, peace-in-practice.*, their scene specs.
Work: decision 9. Port the production Plan 12 scenes 8 and 9 from `public/color-polish/renderer.js` and `renderer.css` at `b7d92a0` into the split scene files, adapting only to the Plan 15 core interfaces. Known risk: the Plan 15 core differs from Plan 12; any core change needed is reported to the coordinator, not made in this lane.
Acceptance: side-by-side probe captures of production and this branch at 0, 6 and 14 seconds at both widths match visually (coordinator compares and files them); scene specs pass.

## Section Z: Integration, preview, release
Setup: coordinator · high · Lane: Claude coordinator; merges only
Work: merge Lanes 1 to 3 into tv17/pick; merge production `b7d92a0` and confirm the QR payload decodes to https://mothers-love.vercel.app/ and the feed shows 100 records; resolve Lane 0 findings; typecheck, unit tests, build, all scene specs, the probe at both widths; completion review; deploy a Vercel preview (not production) and give Anthony the link plus a live versus new side-by-side of all ten scenes. After Anthony approves on the TV, ask the `live-app-release` release question, then promote, record the rollback target, update README, HANDOFF and this Build log, and push the backup.

## Build log

- 2026-09-18: Plan written from the page-by-page interview. Codex's unsaved Plan 15 notes committed as a3eda16 on codex/color-polish-v6 and pushed.
- 2026-09-18 to 19: Parallel run, coordinator Claude Opus 5. Gemini writers could not run (agy headless permission gate), so writers were Claude: Sonnet 5, escalated per Anthony's new rule (failed review goes to a fresh, higher model: Opus 5, then Fable 5.1). Lane worktrees under /Users/anthony/.claude/worktrees/mothers-love-tv17-* (agy write scope). Lane 0 critique dispositions in decisions/. Anthony added Lane 4 (today's fade for every scene change, Plan 15 transition effects removed) and ruled: long messages page only when too long for the largest bubble; Welcome shows as many bubbles as fit whole; Welcome dwell 40 s (code default done, live setting pending). Lanes 2, 3, 4 reviewed by Opus 5 and merged with production b7d92a0 into tv17/pick 33ffbdc (tsc, 222 unit tests, build clean; full browser suite adds no new failures versus base after the Lane 2 fix). Lane 1 failed Opus review three times; round 4 (fresh Opus 5) is unreviewed at tv17/fit 71bf3f8. Anthony asked to see everything without waiting for review: preview https://mothers-love-ea1g20zjs-lvzion.vercel.app/display (tv17/preview-all a7ca45d). Production unchanged. Handoff: docs/runs/2026-09-18-tv-fit/HANDOFF-2026-09-19.md.
- 2026-09-19 (second run, coordinator Claude Fable 5.1): Anthony watched preview a7ca45d on the church TV and named changes (decisions/2026-09-19T05-45Z-anthony-tv-watch-feedback.md). His rulings this run (decisions/2026-09-19T06-20Z-anthony-60-seconds-and-opus-fable-only.md): every screen 60 seconds except Garden; no Sonnet, Opus for smaller tasks and Fable for bigger; every screen its own lane; one Fable review per Opus lane with the reviewer fixing what it finds, Fable lanes unreviewed; live durations change at release. Lanes, all merged into tv17/pick 2a75745: L1 round 5 Welcome reserved long bubble; L5 scenes paint edge to edge; L6 Orbit smaller bubbles and revolving medallions; L7 Words that bring peace smooth card switch; L8 Goal fuller swirl; L9 Peacemakers reserved bubble; L10 Peace in Practice reserved bubble and true 3D heart; L11 and L14 bright full screen entrance, single and group; L12 preview only per-screen links (/display?scene=<slug>, arrival, arrival-group); L13 new eleventh screen live-feed with database/014_color_polish_live_feed.sql WRITTEN BUT NOT RUN (activation and rollback files under the run's research/). Checks on 2a75745: tsc clean, vitest 255/255, build clean, full scene suite 274 passed 0 failed against a production build with synthetic config. Not done yet: preview deploy (blocked by the auto mode classifier, waiting on Anthony), Anthony's TV approval, local trial of the 014 SQL, the release question, production deploy, live playlist update to 60 seconds, README and HANDOFF updates, worktree cleanup. Note: AGENTS.md mentions September 18 heart and receipt feed changes from another chat; confirm what production runs before release.
