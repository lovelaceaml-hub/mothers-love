# Plan 15 run record: TV next-level pass

> Current resume note, 2026-09-12: The requested test preview implementation is complete at commit `b8650739a4a35cbe490e941580c2827a4109d35e` on `codex/tv15-full-preview`. Preview: [mothers-love-d4ve0196a-lvzion.vercel.app/display](https://mothers-love-d4ve0196a-lvzion.vercel.app/display), deployment `dpl_4ZvXooEY66gys1MziS5qACqMeDmf`, READY with a passing build. The exact live Plan 12 transition is restored from commit `15320682a90747267e420d369c441e6938603499`, with a 1.15-second crossfade, tiny translate, uniform scale, and no Nave overlay. The Nave version remains preserved at commit `64f5365` for later. All seven new live-transition tests pass. All current 145 scene test titles have passing evidence across the initial run and focused reruns, with no single clean 145-test invocation; every known initial failure is resolved. Six usable tests pass, 222 Vitest tests pass, globals are clean at 258 declarations, typecheck passes, and lint remains at the 18-problem baseline. Final probes at 1920 and 3840 pass for all 10 scenes, 6 single arrival styles, and 5 group arrival styles with zero issues. Featured's two last failures now pass with lazy orbit, Expressions 5 pass, Welcome 14 pass, and Peacemakers 13 pass plus one gap-fix retest. The preview record rewrites exactly two public GET endpoints and uses preview-only iframe same-origin compatibility, with no database credentials. Final deployed click smoke passed with matching source, normal mode, Welcome to Garden, zero page errors, and zero failed requests. Physical TV approval still gates production promotion. Production remains unchanged at commit `15320682a90747267e420d369c441e6938603499` and deployment `dpl_GZdeMyoZDVtKB9gJSwDNeSxrp3LR`.

Plan: $HOME/Projects/mothers-love/docs/PLAN-15-tv-next-level.md
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

## Earlier lane states (historical)

All eleven code lanes are committed and every one passes its own spec suite with zero failures. tv15/pick at 363ab40 merges all of them onto tv15/base with no conflicts.

- B2 The Turning Nave (transition rebuild): **running, not reviewed**. Design complete and committed at 014d429; spec carried into tv15/base at 906a1cc; plan Section B2 added at 83a9e94; dispatched to gpt-5.6-luna xhigh. Lane record: lanes/B2.md. This supersedes the round-11 transition that Section B landed.
- Lane 0 critique: landed and dispositioned. 14 objections, 4 blocking; 11 accepted, 2 rejected on evidence, 1 accepted in part. decisions/2026-09-12T00-15Z-coordinator-lane0-disposition.md
- A base (shared primitives): committed, tv15/base 3e89529. Landing review waived by Anthony.
- B transitions: committed 6c522c1 plus rounds 3 to 5. Reviewed. **Anthony rejected the first version on the TV** because 24 decorative bubbles left the background fully visible; the coordinator had capped it at 24 on a performance objection and that was the wrong call. Rebuilt with a single full-bleed opaque wash that sweeps in, fully occludes at the swap and completes off the opposite edge, bubbles back to 40 as texture. Occlusion is measured and asserted for all four styles.
- C arrivals: committed 104aa09. Reviewed. Round 3 removed test instrumentation that was monkey-patching window.colorPolishRuntime in production scene code.
- 1 welcome: committed 4c2a109. 19 of 19.
- 2 garden: committed 40c335a. 8 of 8.
- 3 featured: committed dfdcaa7. 100 of 101, the one failure being the documented legacy-fallback artifact.
- 4 peacemakers: committed a31233c after four rounds and four blocking review findings. 14 of 14. The pieces are now genuinely cut from globe.png, which the earlier rounds never did.
- 5 status: committed f2023c7. 12 of 12.
- 6 expressions: committed 404514a. 13 of 13.
- 7 peace-in-practice: committed f1af4f4. 92 of 92, zero failures including the artifact.
- 8 orbit: committed cbb2d6c. 12 of 12.
- 9 milestone: committed d7d5d57. 11 of 11.
- Z pick, integration and release: tv15/pick 363ab40 verified. typecheck clean, 222 vitest tests, lint at the untouched baseline's 18 problems, globals check clean at 21 files and 253 declarations, production build clean, and all seven renderer probe runs clean at 1920 and 3840 with 10 scenes, no issues, and the arrival style sequence unchanged from tv/pick 463ce8d. Full Playwright suite running. Anthony's TV check pending. Nothing promoted; the live TV still serves the Plan 12 renderer.

## Outside the plan, at Anthony's instruction

- Message limit set to 249 graphemes on branch change/message-limit-249, commit 0357a68. Measured from the live pool: seven recognitions were created on 2026-09-11 at 249, 185, 173, 169, 123, 88 and 58 code points, nothing in the seven-day pool exceeded 249, median 88. Submission and admin edit enforce 249; the display, feed and preview read guards stay at 500 so no already published message is ever dropped on read. Not merged into tv15/pick.

## Cross-cutting lessons this run produced

- **Screen pixels are not stage pixels.** The renderer draws a fixed 1812 by 636 stage that the host scales. Four lanes independently wrote assertions comparing raw DOM rects against numbers taken from a gap report in stage units. Most reported "failures" in this run were that mistake, not defects.
- **Lengthening the transitions broke three other scenes' timing.** V.clock only advances while no transition runs, so going from 1.15 s to about 2.5 s pushed status's coin cadence, expressions' bloom and its scene changes past their fixed-offset assumptions. Those tests now drive the clock that actually animates them.
- **S.idCounter is never incremented anywhere.** Any seed of the form randSeed(k + S.idCounter * n) is a constant. It silently froze the transition style bag and the orbit centre's expression. core/arrivals.js relies on that constant deliberately, which is why the probe can assert a fixed arrival sequence.
- **step(ms) advances the renderer clock, not wall-clock, and clamps one call to 120 s.** Anything driven by a CSS transition or keyframe has not moved after a step.
- **loadRenderer and openStudioScene cannot share a page**: loadRenderer installs a catch-all route that aborts any other navigation.
- **Renderer internals are not on window**: top-level const and let in this shared script scope are not window properties.


<!-- lane: index state: running model: opus-5 worktree: none review: none updated: 2026-09-11T23:32Z -->
<!-- lane: lane0 state: landed model: gemini-3.8-flash-high worktree: $HOME/.claude/worktrees/mothers-love-tv-critic review: none updated: 2026-09-11T23:32Z -->
<!-- lane: base state: landed model: gemini-3.8-flash-high worktree: $HOME/.claude/worktrees/mothers-love-tv-base review: skipped-by-anthony updated: 2026-09-12T01:40Z -->
<!-- lane: transitions state: running model: gemini-3.8-flash-high worktree: $HOME/.claude/worktrees/mothers-love-tv-base review: sonnet-5 updated: 2026-09-12T01:55Z -->
<!-- lane: arrival state: running model: gemini-3.8-flash-high worktree: $HOME/.claude/worktrees/mothers-love-tv-arrival review: sonnet-5 updated: 2026-09-12T01:55Z -->
<!-- lane: peacemakers state: running model: gemini-3.8-flash-high worktree: $HOME/.claude/worktrees/mothers-love-tv-peacemakers review: sonnet-5 updated: 2026-09-12T01:55Z -->
<!-- lane: peace-in-practice state: running model: gemini-3.8-flash-high worktree: $HOME/.claude/worktrees/mothers-love-tv-peace-in-practice review: sonnet-5 updated: 2026-09-12T01:55Z -->
