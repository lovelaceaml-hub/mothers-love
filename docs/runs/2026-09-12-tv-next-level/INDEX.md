# Plan 15 run record: TV next-level pass

Plan: /Users/anthony/Projects/mothers-love/docs/PLAN-15-tv-next-level.md
Runner: coordinator (Opus 5 · high in a fresh chat, Anthony's ruling; Fable advisor only). Mode: Parallel.
Base: tv/pick 463ce8d. Branches: tv15/base, tv15/arrivals, tv15/scene-<slug>, tv15/pick.
Coordinator chat opened 2026-09-11T23:30Z (Opus 5 high). tv15/base cut at b2eb842 (463ce8d plus the cherry-picked docs commit d8fa176; code byte-identical to 463ce8d). Writer for every code lane this sitting: Gemini 3.8 Flash (High) via agy, because Codex primary reads 100 percent (resets Tue 6:12 PM). Gemini weekly 32 percent, Claude weekly 71 percent, Claude 5h 58 percent at launch.

## Layout
- orders/: work orders per lane (base, transitions, arrival, then one per scene slug), compiled by the coordinator.
- lanes/: lane record files, one per lane, with state planned, running, landed, reviewed, merged.
- gaps/: gap reports per scene lane and for Section C, written by the coordinator, approved by Anthony before the lane launches.
- decisions/: Anthony's rulings and lane spills.
- logs/: probe screenshots and verification output per lane.

Anthony ruled continue until the end on 2026-09-11T23:50Z (decisions/2026-09-11T23-50Z-anthony-continue-until-the-end.md): gap reports are notifications, no sitting waits on his approval.

All nine gap reports are written (gaps/), one per scene lane plus Section C; Section B needs none. Three findings in them change what the plan said:
- gaps/peacemakers.md G1: the existing globe.png already is a puzzle globe with a piece lifting out and four figures around it, so the plan's contingency asset globe-puzzle.png must NOT be created.
- gaps/expressions.md G1: the plan says the bloom "rotates through all nine over the dwell as today", but the shipped code blooms one card per visit (S.bloomIndex, advanced in requestScene). The code is followed and the plan sentence is recorded as a correction for Section Z.
- gaps/peace-in-practice.md G7: the plan's optional mesh-resolution raise is declined outright; the frame budget goes to the 160 background hearts instead.

## Lane states
- Lane 0 critique: **landed and dispositioned** (Gemini 3.8 Flash High read-only, attempt 4; attempts 1 and 3 died on transport errors, attempt 2 on the headless permission gate). 14 objections: 4 blocking, 7 should-fix, 3 notes. Critique at lanes/lane0.md; the coordinator re-verified every claim and recorded 11 accepted, 2 rejected and 1 accepted in part at decisions/2026-09-12T00-15Z-coordinator-lane0-disposition.md. The two findings nothing else had caught: the renderer probe physically cannot observe transitions (core/host.js takes the `replayed` branch to `renderNow` on every probe step, so `requestScene` never runs), and the plan's two frozen input documents were absent from tv15/base. Both are fixed. Order orders/lane0.md, logs logs/lane0/.
- A base (shared primitives): running, round 2 (Gemini 3.8 Flash High, tv15/base in mothers-love-tv-base). Round 1 items 1 to 5 landed in the worktree (weighted chooseRandom and markShown, the onLeave hook at all three sites, drawSlots with the reader collapse removed and an 18 px font floor, core/speech.js and speech.css, scripts/color-polish-globals-check.mjs); round 2 (orders/base-r1.md) finishes the test helpers, fixes a grown-slot overlap the coordinator found in the diff, runs verification and writes lanes/base.md. Orders orders/base.md and orders/base-r1.md, logs logs/base/.
- B transitions: planned. Frame style names for its probe assertion are frozen in gaps/arrival.md G1: Light beam, Petal curtain, Aurora, Constellation gather.
- C arrivals: planned. Gap report written: gaps/arrival.md.
- 1 welcome: planned. Gap report written: gaps/welcome.md.
- 2 garden: planned. Gap report written: gaps/garden.md.
- 3 featured: planned. Gap report written: gaps/featured.md.
- 4 peacemakers: planned. Gap report written: gaps/peacemakers.md (the existing globe.png already is a puzzle globe, so no new asset).
- 5 status: planned. Gap report written: gaps/status.md.
- 6 expressions: planned. Gap report written: gaps/expressions.md.
- 7 peace-in-practice: planned. Gap report written: gaps/peace-in-practice.md.
- 8 orbit: planned. Gap report written: gaps/orbit.md.
- 9 milestone: planned. Gap report written: gaps/milestone.md.
- Z pick, integration and release: planned
<!-- lane: index state: running model: opus-5 worktree: none review: none updated: 2026-09-11T23:32Z -->
<!-- lane: lane0 state: running model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-critic review: none updated: 2026-09-11T23:32Z -->
<!-- lane: base state: running model: gemini-3.8-flash-high worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-base review: sonnet-5 updated: 2026-09-11T23:32Z -->
