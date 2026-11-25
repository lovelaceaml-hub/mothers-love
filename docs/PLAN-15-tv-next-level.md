# Plan 15: TV next-level pass

Project: $HOME/Projects/mothers-love. Live TV: https://mothers-love.vercel.app/display (Plan 12 renderer, untouched until Section Z promotes). Planner: Fable 5.1 in plan mode, interview grill mode, at Anthony's instruction, September 11, 2026. Plan file on approval: $HOME/Projects/mothers-love/docs/PLAN-15-tv-next-level.md. Record tree: $HOME/Projects/mothers-love/docs/runs/2026-09-12-tv-next-level/.

Approved by Anthony in plan mode on September 11, 2026; written here verbatim from the approved plan, with the record tree created at the same moment.

Runner: coordinator. Anthony's ruling at planning (September 11): the run coordinator is Opus 5 (high) in a fresh chat, not Fable; Fable acts only as an advisor when Opus asks for one (an explicit override of the routing table's coordinate row, logged here per routing rule 5). One coordinator chat launches Lane 0 and Section A first; after A lands, every other lane launches from the same chat in the sittings listed under Order of work. Reviews never block a lane. Mode: Parallel.

## Context

Plan 13 split the renderer into core/ and scenes/ and refactored every scene; tv/pick 463ce8d holds all eleven branches, verified, Opus-confirmed and pushed. Anthony watched it on the TV on September 11 and did not approve promotion. His brief (docs/runs/2026-09-11-tv-scenes/decisions/2026-09-11T20-25Z-anthony-tv-check-next-level-brief.md) asks for a larger pass: speech bubbles from the people in the art, a puzzle-piece world for Peacemakers, a glossy red heart with heart-shaped cards, a dominant 3D orbit centre, the weekly goal as the focus of Milestone, phrases instead of expression names, random selection across the pool, theatrical transitions and remarkable arrivals, and a generally more upbeat display. Calendar is approved as is.

Outcome: a new integration branch tv15/pick that Anthony approves on the TV, promoted to production with a recorded rollback, and the live TV changed only at that moment.

## Decisions (Anthony, September 11, 2026, plan-mode interview)

Fork rulings, recorded verbatim in the record tree at decisions/2026-09-11T22-00Z-anthony-plan15-forks.md:

1. Pool bound: "any time" means the seven-day display pool (every personal copy expires 168 hours after creation, product invariant). Anthony chose random selection that favors the less-shown: weight 1 divided by (1 plus times shown this session). Extending beyond seven days was declined.
2. Heart color: glossy true red, base #d7263d, highlight #ff8a95, shadow #8a0f22, soft specular gloss. The small hearts in that scene use the same family.
3. Peacemakers format: recognition globe. The world art becomes a sphere of puzzle pieces; each recognition pops out as a piece, holds face-on, then snaps onto a second, larger, slowly rotating globe that builds up through the scene.
4. Hold time: Anthony first chose exactly 3 seconds total; after the stress test (unreadable past 40 characters) he ruled 3 seconds plus 1 second per 40 characters of message, and the piece carries the full message, name and expression icon. A 160-character message holds 7 seconds; a 500-character message holds 15.5 seconds.
5. Transitions: the four-style flood family: bubble flood sweeping across (direction varies), rising tide from the bottom, vortex (gather to centre, burst outward to reveal), petal and heart storm. About 2.5 seconds, random with no immediate repeat, decorative bubbles carry expression icons and colors, never text.
6. Arrivals: cinematic frame on all eleven path styles, and Anthony asked for more than one frame style. Ruling recorded as: four frame styles (Light beam, Petal curtain, Aurora, Constellation gather), each combining with any of the 6 single and 5 group path styles, so the probe's 6 and 5 counts hold and a frame count of 4 is asserted additionally.
7. Circle rule: scene-local exception. Peacemakers uses puzzle pieces and Peace in Practice uses hearts; every other scene and every arrival stays circular; the circularity test exempts exactly those two card types; AGENTS.md gets one sentence recording the exception at promotion.

Delegated to the planner by the brief ("whichever works best", "not sure how to improve it", "any other suggestions"), named here so they are decisions rather than defaults:

8. Long messages on one page (Garden, and the reader collapse in Welcome, Peacemakers, Featured): grow the slot first, then shrink text to an 18 px floor at 1920 (36 px at 3840); pagination remains only when a message still overflows at the floor, and messages are never truncated.
9. Welcome always uses the six-bubble layout; the single reader bubble never appears there (follow-up 4 of Plan 13).
10. Milestone phrase bubbles: when a record has several expressions, use the weekly goal expression if the record includes it, otherwise the record's first expression.
11. Status revamp: medallions become 3D coins that flip between the icon face and the phrase face on a staggered cadence; the phrase is the primary label with the expression name as a small eyebrow; the two counts count up on mount; the light sweep is no longer clipped.
12. Nine Expressions revamp: a 3D stage; the nine cards sit on a gentle perspective arc, the focused card lifts forward and blooms with the phrase large; the others dim; all nine stay readable with no overflow.
13. Orbit centre: a layered 3D medallion (concentric depth rings, rotating halo, glow rays, particles) with the phrase large in the middle; planets at 0.8 scale, three size tiers by message length.
14. Click-advance during a transition is ignored (the existing manualAdvance guard), and reduced motion swaps scenes instantly with no flood.

## Inputs (frozen)

- Base: tv/pick at 463ce8d (all eleven Plan 13 scene branches merged, verified, Opus confirmed, pushed). Worktree $HOME/.claude/worktrees/mothers-love-tv-pick.
- Renderer: $HOME/Projects/mothers-love/public/color-polish/ (core/state.js, orbs.js, motion.js, chrome.js, arrivals.js, stage.js, host.js; scenes/<slug>.js and .css; renderer.html, renderer.css, boot.js). Classic scripts in one global scope, CSP script-src 'self', no inline scripts.
- Scene specs: $HOME/Projects/mothers-love/tests/color-polish-scenes/ (helpers.ts plus one spec per scene). Probe: scripts/color-polish-renderer-probe.mjs (asserts 10 scenes render, 6 single and 5 group arrival styles; widths 1920 and 3840; ms 0, 6000, 14000, 21000).
- Brief and coordinator notes: docs/runs/2026-09-11-tv-scenes/decisions/2026-09-11T20-25Z-anthony-tv-check-next-level-brief.md. Plan 13 follow-ups: docs/runs/2026-09-11-tv-scenes/lanes/follow-ups.md.
- Art: public/color-polish/assets/community.png (welcome, at left -20, top 325, 910 by 298), globe.png (peacemakers, at left 271, top 134, 604 by 482), heart_render.png and hands.png (declared, unused).
- Catalog phrases (core/state.js catalog[].phrase): 1 Greeting "How Are You?", 2 Gratitude "Thank you. It's all thanks to you. You've worked hard.", 3 Apology "I'm sorry. It must have been hard on you.", 4 Inclusiveness "It's okay. I understand.", 5 Concession "Please, after you.", 6 Respect "I'd love to hear more about your thoughts.", 7 Encouragement "I'll pray (or root) for you. Everything will go well.", 8 Consideration "Can I give you a hand with anything?", 9 Compliment "You're amazing. You're doing great!"

## Models, lanes, reviews

- Planner: Fable 5.1 (this plan). Run coordinator: Opus 5 (high) in a fresh chat, by Anthony's ruling; it writes the gap reports and work orders, compiles dispatches, reads diffs against orders, keeps the record tree, and reports; it authors no scene code. Fable is an advisor only, consulted when Opus names a question it cannot settle (a design contradiction, a ruling that needs Anthony, an escalation).
- Writer for every code lane, per the routing table: gpt-5.6-luna via codex-dispatch when Codex primary is below 80 percent; otherwise Gemini 3.8 Flash (High) via agy (writable root $HOME/.claude/worktrees/**). At planning time Codex primary is at 100 percent and resets Tuesday September 15, 6:12 PM Pacific; Gemini weekly is at 32 percent; Claude weekly at 69 percent; Fable weekly at 92 percent (resets Tuesday 11:00 PM Pacific). The lane's setup line names both; the coordinator picks by the live pool at launch and records the pick in the lane file.
- Spill when a writer's pool is full: Gemini 3.8 Flash (High), then Sonnet 5 (medium). Never Opus 5 or Fable for implementation. Writer escalation on failure: three Luna failures move the unit to gpt-5.6-terra (workspace-write), two more to gpt-5.6-sol, then Anthony. Gemini 3.1 Pro is never used.
- Landing review per lane: Sonnet 5 (high) on the diff, one round plus one confirmation pass after corrections (review budget). Hygiene sweep before each review: Haiku 4.5 (low).
- Completion review: one Opus 5 (high) review of tv15/pick before promotion (Section Z).
- Haiku 4.5 (low) carries every mechanical row: hygiene sweeps, ledger rows, lane-state updates in INDEX.md, filing probe screenshots into logs/<slug>/, README, HANDOFF and AGENTS link updates, Build log format checks. Never Haiku for scene code or reviews.
- Coordinator pool: Opus 5 bills Claude's weekly (69 percent at planning, refills Tuesday 11:00 PM Pacific) and the 5-hour window (41 percent, refills about 5:30 PM Pacific today); the Sonnet landing reviews and the Opus completion review share that pool. Every lane state and every ruling is written to the record tree the moment it happens, so a coordinator that hits a window limit is resumed from the Build log and INDEX.md in a fresh chat with no lost work. Until Codex primary refills (Tuesday September 15, 6:12 PM Pacific) every writer is Gemini 3.8 Flash (High) via agy; after that Luna is the primary writer. Anthony decides when the kickoff is pasted.
- Ledger: one row per dispatch via ledger-append.sh (agy, Codex) or ledger-from-transcript.py (Claude reviews).

Cross-cutting rules for every lane: circular bubbles everywhere except the two exempted card types (decision 7); no added white overlays; readable from across a room (message text never below the 18 px floor at 1920); reduced motion respected (S.still: no flood, no flip, no assembly, static layout); fictional data only; header, feed rail, QR, durations, playlist order, click-advance (live only) and safe states untouched; Studio sample preview keeps working; no em or en dash in produced text or comments; every scene CSS rule scoped to `#tv .scene[data-scene="N"]` (arrival: `#tv .event-stage`; transitions: `#tv #transition-layer`) where N is the renderer id, never Anthony's section number; no top-level const or let in a scene file without its scene prefix (shared global scope; the globals check in Section A enforces it); no rotateX or rotateY on any circular bubble or its ancestors (Plan 13 ruling; puzzle pieces, hearts, medallions, the orbit centre and the featured panel may use CSS 3D); scene scripts own no timers without cancelling them in onLeave.

Scene id map (Anthony's number, renderer id, slug): 1/1 welcome, 2/2 garden, 3/3 arrival, 4/4 featured, 5/5 calendar (no lane), 6/8 peacemakers, 7/6 status, 8/7 expressions, 9/9 peace-in-practice, 10/10 orbit, 11/11 milestone. Files and branches use the slug only.

## Branch and merge model

- tv15/base: cut from tv/pick at 463ce8d, first commit is the cherry-picked Plan 15 docs commit. Holds Sections A and B. Only path that touches core/*, renderer.html, renderer.css, boot.js, tests/color-polish-scenes/helpers.ts and scripts/color-polish-renderer-probe.mjs (additive assertions only).
- tv15/scene-<slug>: one per scene lane, cut from tv15/base after Section A lands, touches only its own files. Reuses the existing worktree directory $HOME/.claude/worktrees/mothers-love-tv-<slug> (check out the new branch there; the Plan 13 branch it held is merged and pushed).
- tv15/arrivals: Section C, cut from tv15/base after A, in the worktree mothers-love-tv-arrival; owns core/arrivals.js, scenes/arrival.js, scenes/arrival.css and arrival.spec.ts, so it merges like a scene branch even though one file is core (the only core file no other lane touches).
- tv15/pick: recreated from tv15/base (after B) each time Anthony chooses a subset; merge each chosen branch. Disjoint files, no conflicts. An unchosen branch stays parked.
- Promotion: after Anthony approves tv15/pick on the TV from the LAN preview, tv15/pick merges into codex/color-polish-v6 and then codex/mothers-love (production). No database change in any lane. The live TV changes only at that moment.

## Lane 0: Plan critique
Setup: read-only critic · high · Lane: Codex · Review: none
  Codex: gpt-5.6-sol · high (fallback while Codex primary is exhausted: Antigravity Gemini 3.8 Flash (High), read-only)
Worktree: none, read-only against $HOME/Projects/mothers-love
Depends on: none; launches alongside Section A
Agents: none
Reviewers: none (this lane is the reviewer)
Hygiene: none
Brief: argue against this plan; find missing decisions, unsafe assumptions, untestable acceptance criteria, scope creep, rollback gaps, and sections too ambiguous for the writer. All material objections, severity-ranked, evidence for each; fewer than five only with a plain statement of what was checked; approval is not an allowed output. Accepted findings become revised sections, resolved by Section Z before the completion review; disposition in the Build log and the decisions log. This lane satisfies the interview skill's plan-attack step and the steps skill's plan-review gate together; no second critique runs.

## Section A: Shared primitives on tv15/base
Setup: frontier · xhigh · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · xhigh (fallback: gpt-5.6-terra · high workspace-write after three Luna failures)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
  Claude: Sonnet 5 · medium (spill only)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-base, branch tv15/base
Depends on: none
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review

Owns: public/color-polish/core/state.js, core/orbs.js, core/motion.js, core/stage.js (onLeave only), core/speech.js (new), core/speech.css (new), renderer.html (script and link tags only), tests/color-polish-scenes/helpers.ts, scripts/color-polish-globals-check.mjs (new), docs/runs/2026-09-12-tv-next-level/lanes/base.md, logs/base/. Protected: every scenes/* file, core/arrivals.js, core/chrome.js, core/host.js, src/**.

Work (design from the planning-session helper, files and functions named):
1. Weighted random selection. In core/state.js add `chooseRandom(exclude, expressionId)` beside `choose()`: same filters, then a weighted draw with weight 1 divided by (1 plus `S.shownCount.get(id)`), where `S.shownCount` is a session map incremented by `addOrb` and by the arrival and stream renderers. Seed through `randSeed(hashText(...))` plus a clock salt so the probe stays reproducible with its fixed seed. Remove the `swapSlot` forced-long hack in core/motion.js (it sets `lastShown` to minus 100000 to make `choose()` re-pick the same record); replace it with an explicit `S.forceId` consumed once by the slot helper. `choose()` stays for any caller not migrated; every scene lane migrates its own calls.
2. onLeave hook. Add `onLeave: null` to the descriptor defaults in `registerScene` (core/stage.js line 5) and call `sceneDescriptor(prev).onLeave?.(root)` before the old root is removed at all three sites: the transition swap, the still-mode instant swap in `requestScene`, and the safe-state re-render in `renderNow`.
3. Reader-mode removal and one-page fit. In core/orbs.js add `drawSlots(records, positions, {readerBounds, forceId})` that draws N records into the scene's position table, preferring records that pass `smallFits`, and when a long record is drawn grows that slot (up to `readerBounds`) instead of collapsing the pass; in `fitCircle` add the grow-slot step before pagination and a font floor of 18 px at diameter scale 1920 (the loop today stops at 20 or 22, so the floor is lower and the slot grows first). Pagination stays only when the floor still overflows; the `verbatim` log assertion (`pages.join('') === r.message`) extends to the grown path. Messages are never truncated.
4. Speech bubbles. New core/speech.js (loaded after orbs.js) with `mountSpeech(root, speakers)` and `tickSpeech(dt)`: rounded-rectangle bubbles with a tail (border-radius 16 px, never 50 percent, so the circularity helper never matches them) rising from per-scene anchor points (`speakers: [{x, y}]`, a new descriptor field), carrying the nine catalog phrases through a shuffle bag with no immediate repeat (`S.speechBag`, `S.speechLast` in `blankState`), one bubble at a time per anchor, 6 to 9 seconds each, frozen on one phrase under S.still. Called from `coordinator` when the current descriptor has speakers.
5. Globals check. New scripts/color-polish-globals-check.mjs: parses every script listed in renderer.html and fails on any duplicate top-level name across files (the Plan 13 collision class); wired into `npm run lint` only if that script accepts an added step without touching src/**, otherwise run by the coordinator per lane.
6. Test helpers. In tests/color-polish-scenes/helpers.ts add `loadRenderer(page, {ms})` (the direct renderer harness now duplicated in arrival.spec.ts and garden.spec.ts, moved here; both specs switch to it in their own lanes) and `cardShape(frame, selector, kind)` plus `CIRCULARITY_EXEMPT = { peacemakers: ['.puzzle-card'], 'peace-in-practice': ['.heart-card'] }` consumed by `circularity(frame)`.

Acceptance (all must hold):
1. Probe at 1920 and 3840, ms 0, 6000, 14000, with --arrivals, into logs/base/after/: 10 scenes render, arrival sequence unchanged (singles 1,5,2,3,4,0 then groups 2,4,3,1,0), no page errors, and every scene's result.json state identical to the tv/pick 463ce8d baseline except added keys.
2. A unit spec (vitest or a Playwright direct-renderer check) shows `chooseRandom` never returns an excluded id, never returns a record failing the expression filter, is stable across two runs with the same seed, and over 200 draws from a pool where one record has been shown 5 times that record is drawn less than half as often as an unshown one.
3. A direct-renderer spec forces a scene change while a registered test descriptor has a pending timer; `onLeave` fires once at each of the three sites and no console error follows.
4. A fixture with a mostly-long pool (four of six records over 160 characters) renders six slots, no reader collapse, every message on one page at or above the 18 px floor, and the `verbatim` check passes; a 500-character message is either on one grown slot or paginated, never truncated.
5. Speech bubbles: a test descriptor with two anchors shows two `.speech-bubble` elements with `border-radius` 16 px, phrases drawn from the nine with no immediate repeat over 12 draws, `circularity` and `noOverflow` pass with them present, and under reduced motion one phrase stays fixed.
6. Globals check passes on tv15/base and fails on a fixture with a duplicated top-level name.
7. helpers.spec.ts passes through `loadRenderer`; typecheck, vitest, build pass; lint at the pre-existing 18 problems; scene, helpers and usable specs at the Plan 13 green bar (the legacy-fallback artifact is the only allowed failure).
8. Lane record lists every new function and every call site changed.

## Section B: Theatrical transitions on tv15/base
Setup: frontier · xhigh · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · xhigh (fallback: gpt-5.6-terra · high workspace-write)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-base, branch tv15/base
Depends on: Section A landed and reviewed
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review

Owns: core/stage.js (transition engine), core/transitions.js (new), core/transitions.css (new), renderer.html (the `#transition-layer` element and two tags), core/chrome.js (countdown hide only if needed; today `sceneCountdownHidden()` already returns true while `transition` is truthy), scripts/color-polish-renderer-probe.mjs (additive: log the transition style per scene change), lanes/transitions.md, logs/transitions/.

Work: replace the 1.15 s crossfade in `requestScene` and `tickTransition` with a registry `registerTransition(id, {cover, swap, reveal, duration})` and a phase machine: cover (about 0.9 s) fills `#transition-layer` (a DOM layer above `#stage` and `#event`, below the countdown and chrome) with 24 to 40 decorative bubbles carrying expression icons and catalog colors, animated with CSS transforms and opacity (GPU composited, cheap at 3840); swap (one frame): `onLeave`, old root removed, new root made visible; reveal (about 1.6 s) clears the layer. Four styles in core/transitions.js: `flood` (sweep; direction chosen from left, right, up, down per use), `tide` (rise from the bottom), `vortex` (gather to centre then burst outward), `storm` (petals and hearts, using `heartSVG` and the petal shapes already in core). Random pick with no immediate repeat through a seeded bag (`S.transitionBag`, `S.transitionLast`). S.still: instant swap, layer never populated. `manualAdvance` keeps ignoring input while a transition runs. `S.pendingScene` semantics unchanged so arrivals never race a cover. Frame budget: the draw loop's 25 fps budget holds at 3840 (measure with the probe's timing log).

Acceptance: common core checks (probe at both widths and all four ms checkpoints, no errors, 10 scenes, arrival counts) plus: over a full playlist loop driven through `loadRenderer`, every scene change logs a transition style, all four styles appear, no style repeats consecutively, each transition lasts 2.3 to 2.8 s, the countdown ring is hidden for its whole duration, `#transition-layer` is empty between transitions and under reduced motion, a click during a transition does not start a second one, and an arrival queued during a transition starts after it. Frame time sampled during a transition at 3840 stays under 40 ms per frame on the runner.

## Section B2: The Turning Nave transition on tv15/base
Setup: frontier · xhigh · Lane: Codex (Luna via codex-dispatch) · Review: controller
  Codex: gpt-5.6-luna · xhigh (fallback: gpt-5.6-terra · high workspace-write)
  Spill if Codex primary is full: Antigravity Gemini 3.8 Flash (High), then Sonnet 5 · medium
Worktree: $HOME/.claude/worktrees/mothers-love-tv-base, branch tv15/base
Depends on: Section B round 11 (dae3252) and the spec commit 906a1cc
Lane: Codex executor gpt-5.6-luna, one writer, this worktree only
Review: controller = Claude Opus 5 (this coordinator); diff against the allowlist plus the spec's own numeric identities
Agents: none
Read first: READ THE WHOLE SPECIFICATION BEFORE WRITING ANY CODE: $HOME/.claude/worktrees/mothers-love-tv-base/docs/runs/2026-09-12-tv-next-level/research/vortex-spec.md is 1735 lines and is the complete, final specification; every constant, formula, DOM shape, CSS rule, timeline beat, coverage proof, still-mode rule, performance budget and name in it is fixed and NO design decision is open to you, so implement it as written rather than re-deriving it. Then read $HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/transitions.js and $HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/transitions.css as they stand today (the round-11 implementation you are replacing), then $HOME/.claude/worktrees/mothers-love-tv-base/tests/color-polish-scenes/transitions.spec.ts, which is the gate you must keep green without editing it.
In scope: Replace the current round-11 transition implementation in transitions.js and transitions.css with The Turning Nave exactly as the specification defines it, following the spec's section 13 build order literally and in order: (1) write the constants and the projection first, `transitionNaveCamera` and `transitionNaveProject` and nothing else, then check the two identities of section 3.2 numerically at the swap against the table in section 3.3 before writing anything further; (2) the 70 bubbles, rim course first, with `transitionNaveBase` and `transitionNaveFrame`; (3) the z-index, the opacity chain and the filter quantisation, so near bubbles completely hide far ones; (4) the wash on the section 5.5 schedule, never visible; (5) the far canvas in the section 3.9 order, sampling `transitionNaveProject` and never duplicating its formulae, the 24 ribs first, and if they do not all pass through one pixel stop and fix that before anything else; (6) the near canvas and the depth split, so a near rib paints in front of a far bubble and behind a near one; (7) the reveal, the flare then the surge, with the flare core preventing the section 5.4 jump. There is exactly ONE projection function and both canvases and every bubble call it; duplicated projection arithmetic is the single highest-risk defect the spec names and is an automatic fail. The four style ids `flood`, `tide`, `vortex` and `storm` keep their existing names and registry shape, and the style bag, the `S.pendingScene` semantics, the `requestScene` guard, the wash element and the 70-bubble count are unchanged by design so the existing test gate stays green.
Protected: Every other file in this worktree. In particular $HOME/.claude/worktrees/mothers-love-tv-base/tests/color-polish-scenes/transitions.spec.ts is protected: the spec's section 11 proves every existing assertion in it still holds unchanged, so an assertion that fails is a defect in your implementation, never a test to edit. Do not touch docs/, scripts/, renderer.html, core/stage.js, or any other core/ file. Never run a git command that mutates state: no add, commit, checkout, stash, reset, revert, merge, rebase, branch, tag, push, clean or worktree command. Do not install packages and do not touch node_modules; the toolchain is already present and the sandbox has no network.
Acceptance: Run all five of these from the worktree root $HOME/.claude/worktrees/mothers-love-tv-base and report each command's exact exit status plus its output tail in your final message: (1) `node scripts/color-polish-globals-check.mjs` exits 0; (2) `grep -nE 'rotate|matrix3d|skew|scaleX|scaleY|perspective' public/color-polish/core/transitions.js` prints nothing and exits 1, because the spec forbids all six and the transform is `translate3d` plus a single-argument `scale`; (3) `npm run typecheck` exits 0; (4) `npx playwright test tests/color-polish-scenes/transitions.spec.ts` passes with zero failures, which is the gate section 11 proves holds unchanged; (5) `npm run lint` reports no new problems beyond the 18 already present at the baseline commit.
Verify: After the five acceptance commands, state in your final message the numeric result of build-order step 1, the two section 3.2 identities evaluated at the swap printed against the section 3.3 table, and then one line each confirming that the 24 ribs converge on a single pixel, that a near rib paints in front of a far bubble and behind a near one, that the wash is never visible at any sampled age, and that only one projection function exists in the file.
Completion output: Your final message states, in this order: the canary line; `completed` or `blocked`; the two files you changed and the fact that you changed nothing else; the five acceptance results with their exit statuses; the four verification statements; and any spec constant you could not honour, with the reason. Do not summarise the specification back to me; report only what you did and what the commands returned.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/transitions.js
$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/transitions.css
```

## Section C: Remarkable arrivals (tv15/arrivals)
Setup: frontier · xhigh · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · xhigh (fallback: gpt-5.6-terra · high workspace-write)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-arrival, branch tv15/arrivals
Depends on: Section A landed; gap report gaps/arrival.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review

Owns: core/arrivals.js, scenes/arrival.js, scenes/arrival.css, tests/color-polish-scenes/arrival.spec.ts, lanes/arrival.md, logs/arrival/. Protected: everything else (the probe's frame-count assertion is added by Section B's owner on tv15/base from this lane's `FRAME_STYLES` name; coordinate through the coordinator).

Work: a cinematic frame around every arrival. `FRAME_STYLES` (4) in scenes/arrival.js: Light beam (stage to near-black, a vertical beam opens and the bubble assembles inside it), Petal curtain (petals part from the centre to reveal the bubble), Aurora (a slow color wash sweeps behind a starfield, the bubble condenses from the stars), Constellation gather (scattered points draw lines then collapse into the bubble). Every frame: stage dim deepens from today's `.dimmed` to near-black with the blur kept; the bubble assembles from particles at 540 px (single) or 258 px (group) with a spinning 3D ring behind it (the ring is a separate element behind the bubble, never a transform on the bubble); the name is revealed by a shimmer sweep; the reading hold is unchanged; exit is a burst of petals and hearts, then the bubble flies toward the feed rail slot before `#event-items` empties. The 6 single and 5 group path styles keep their trajectories inside the frame (frame and path are chosen independently, both by seeded bags). Group arrivals use one frame for the whole group. S.still: instant show, no assembly, no burst. The feed rail and `S.returnScene` behavior are unchanged.

Acceptance: probe --arrivals lists 6 single and 5 group styles and 4 frames (the additive assertion), the 11-wave sequence completes with no page error; arrival.spec.ts through `loadRenderer` captures one screenshot per frame style at the assembly midpoint and one per path style at the entrance midpoint into logs/arrival/; `circularity` holds on `.event-orb` throughout entrance, hold and exit; the ring element carries the 3D transform and the bubble carries none; reduced motion shows the bubble within one frame; the stage brightness under the frame is measured below 12 percent luminance at the hold midpoint (a computed-style check on `#stage` filter and the frame overlay opacity).

## Section 1: Welcome (renderer id 1)
Setup: frontier · high · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · high (fallback: gpt-5.6-terra · high workspace-write)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-welcome, branch tv15/scene-welcome
Depends on: Section A; gaps/welcome.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/welcome.js, scenes/welcome.css, tests/color-polish-scenes/welcome.spec.ts, lanes/welcome.md, logs/welcome/.
Work: always six bubbles through `drawSlots` (no reader collapse, decision 9), records by `chooseRandom`; speech bubbles from the people in community.png through the `speakers` descriptor field (anchor points measured in the gap report, three to five figures); keep the Plan 13 depth layers, Z roll and ring spin; apply Plan 13 follow-ups 7 (stage clamp uses `a.d / 2 * scale`) and 9 (negative animation-delay on the rings); migrate to the 0.9 px blur cap for symmetry.
Acceptance: common scene spec plus: six `.orb` elements at 0, 6 and 14 s with the mostly-long fixture (never one); at least two `.speech-bubble` elements visible by 6 s, phrases from the catalog, no immediate repeat over 12 draws; `circularity` and `noOverflow` pass with speech bubbles present.

## Section 2: Recognition Garden (renderer id 2)
Setup: balanced · high · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · high (fallback: gpt-5.6-terra · high workspace-write)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-garden, branch tv15/scene-garden
Depends on: Section A; gaps/garden.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/garden.js, scenes/garden.css, tests/color-polish-scenes/garden.spec.ts, lanes/garden.md, logs/garden/.
Work: one-page fit through `drawSlots` and the grown slot (decision 8); `chooseRandom` for the five bubbles and for `gardenReplace`; garden.spec.ts switches to `loadRenderer`. Everything else stays as Plan 13 shipped.
Acceptance: common scene spec plus: with the mostly-long fixture, no `.orb-page-indicator` appears for any message up to 320 characters at 1920, the grown slot stays circular and inside the scene, and Plan 13's petal and flower assertions still pass.

## Section 3: Featured Recognition (renderer id 4)
Setup: frontier · high · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · high (fallback: gpt-5.6-terra · high workspace-write)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-featured, branch tv15/scene-featured
Depends on: Section A; gaps/featured.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/featured.js, scenes/featured.css, tests/color-polish-scenes/featured.spec.ts, lanes/featured.md, logs/featured/.
Work: the expression panel becomes the dominant 3D object (deeper perspective, layered medallion with translateZ tiers, glow, particles, the phrase large); when the expression flips at 15 s the three bubbles exit theatrically (burst) and three bubbles of the new expression enter (via `chooseRandom(exclude, expressionId)` with the sparse fallback); no reader collapse; Plan 13 follow-ups 1 (cancel the flip timers in `onLeave`, resolve the eyebrow from `panel.closest('.scene')`) and 2 (pass token instead of `S.sceneAge` for the remount guard).
Acceptance: common scene spec plus: at 14 s the eyebrow and every bubble's chips match the first expression, at 21 s the second, and a bubble burst is logged between them; the panel's `transform-style` is preserve-3d and no `.orb` ancestor carries a 3D rotation; a forced scene change at 15.2 s leaves the next scene's eyebrow untouched and logs no error.

## Section 4: We Are Peacemakers, puzzle world (renderer id 8)
Setup: frontier · xhigh · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · xhigh (fallback: gpt-5.6-terra · high workspace-write)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-peacemakers, branch tv15/scene-peacemakers
Depends on: Section A; gaps/peacemakers.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/peacemakers.js, scenes/peacemakers.css, tests/color-polish-scenes/peacemakers.spec.ts, lanes/peacemakers.md, logs/peacemakers/, and one new asset public/color-polish/assets/globe-puzzle.png if the gap report finds the existing globe.png cannot be masked into pieces in CSS (the asset is produced with the make-images skill from the existing globe, fictional, no people's data).
Work: ground-up rebuild. Left: the source world, globe.png rendered as a sphere of puzzle pieces (CSS clip-path polygons over the image, or the new asset). Every 3 s plus 1 s per 40 characters (decision 4) a piece detaches carrying one recognition (name, expression icon, full message), flies to a face-on hold position and holds for that time, then snaps into the recognition globe: a second, larger, slowly rotating sphere on the right built of pieces placed on a spherical grid with CSS 3D (`transform-style: preserve-3d` on the sphere, `backface-visibility: hidden` on pieces, no WebGL). Joined pieces show name and icon; the full message is visible only during the face-on hold (a class toggle keyed on the piece's facing). The globe keeps building for the whole dwell and never empties; when the grid is full, the oldest piece dissolves as a new one joins. Speech bubbles from the figures on or around the world art through `speakers` (anchors in the gap report). Records by `chooseRandom`. Puzzle-piece cards are `.puzzle-card` (exempt from circularity, decision 7). S.still: a static globe of eight pieces and one held piece, no rotation. Dead wrappers from follow-up 6 deleted.
Acceptance: common scene spec with `cardShape(frame, '.puzzle-card', 'puzzle')` in place of circularity for those cards plus: over 40 s through `loadRenderer` the joined piece count increases monotonically to at least six; each held piece's hold time equals 3 s plus 1 s per 40 characters within 0.3 s (logged); the message text is visible on a face-on piece and hidden on a piece rotated past 70 degrees; `noOverflow` holds; the sphere's `transform-style` is preserve-3d; speech bubbles present by 6 s; frame time at 3840 under 40 ms.

## Section 5: Status (renderer id 6)
Setup: frontier · high · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · high (fallback: gpt-5.6-terra · high workspace-write)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-status, branch tv15/scene-status
Depends on: Section A; gaps/status.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/status.js, scenes/status.css, tests/color-polish-scenes/status.spec.ts, lanes/status.md, logs/status/.
Work: decision 11. Each medallion becomes a 3D coin (preserve-3d, two faces) that flips on a staggered cadence between the icon face and the phrase face; the phrase becomes the primary label, the expression name a small eyebrow; the Today and Overall counts count up over 1.2 s on mount then stay still; the light sweep is no longer clipped by the grid (follow-up from the Plan 13 completion review); one ambient particle layer. Numbers stay legible; no bouncing.
Acceptance: common scene spec plus: all nine phrases present in the DOM; at 6 s and 14 s at least three medallions differ in flip state; both counts equal the fixture totals after 2 s; no card overflow; no `.orb` in this scene carries a 3D rotation (this scene has none).

## Section 6: Nine Expressions (renderer id 7)
Setup: frontier · high · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · high (fallback: gpt-5.6-terra · high workspace-write)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-expressions, branch tv15/scene-expressions
Depends on: Section A; gaps/expressions.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/expressions.js, scenes/expressions.css, tests/color-polish-scenes/expressions.spec.ts, lanes/expressions.md, logs/expressions/.
Work: decision 12. The nine cards sit on a gentle perspective arc (`perspective` on the scene root, per-card translateZ and small rotateY; these are cards, not bubbles); the focused card lifts forward and blooms with the phrase large and the principle beneath, with a particle bloom; the other cards dim to 70 percent; the bloom rotates through all nine over the dwell as today. Plan 13's fit rules stay (no overflow on the visible layer at 1920 and 3840).
Acceptance: common scene spec plus: the focused card's `transform` includes a positive translateZ and its phrase is rendered at least 1.6 times the grid-card phrase size; scrollWidth and scrollHeight never exceed client size on the visible layer of all nine cards in both states; over 30 s at least three different cards take focus.

## Section 7: Peace in Practice, red heart and heart cards (renderer id 9)
Setup: frontier · xhigh · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · xhigh (fallback: gpt-5.6-terra · high workspace-write)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-peace-in-practice, branch tv15/scene-peace-in-practice
Depends on: Section A; gaps/peace-in-practice.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/peace-in-practice.js, scenes/peace-in-practice.css, tests/color-polish-scenes/peace-in-practice.spec.ts, lanes/peace-in-practice.md, logs/peace-in-practice/.
Work: the canvas heart mesh (PIP_HEART_N 56, PIP_HEART_M 18, about 1120 quads per frame) becomes smooth and red: per-vertex normals with smooth shading, the decision 2 palette (base #d7263d, highlight #ff8a95, shadow #8a0f22, a specular gloss spot), mesh resolution raised only if the frame time at 3840 stays under 40 ms (else keep 56 by 18); the shadow and sparks retint to the red family with gold sparks kept. Recognition cards become hearts (`.heart-card`, exempt from circularity, decision 7): a small heart enters, grows to reading size showing name, icon and full message (one page, the 18 px floor applies), holds for the reading time, then explodes into 12 to 20 small hearts that remain as floating background hearts, accumulating until the scene changes (cap 160, oldest fade first); a new heart card enters as each explodes; three cards on screen at a time. Records by `chooseRandom`. Follow-up 5 (halve PIP_HEART_M if the TV stutters) stays documented; follow-up 6 dead wrapper deleted.
Acceptance: common scene spec with `cardShape(frame, '.heart-card', 'heart')` plus: over 40 s the background heart count strictly increases at each explosion and never exceeds 160; each explosion is logged with its piece count; the rendered heart canvas's dominant hue sampled at the hold midpoint is red (hue within 345 to 10 degrees, saturation above 60 percent) at three sample points; frame time at 3840 under 40 ms; at least two heart cards visible at every sampled second.

## Section 8: Expression Orbit (renderer id 10)
Setup: frontier · high · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · high (fallback: gpt-5.6-terra · high workspace-write)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-orbit, branch tv15/scene-orbit
Depends on: Section A; gaps/orbit.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/orbit.js, scenes/orbit.css, tests/color-polish-scenes/orbit.spec.ts, lanes/orbit.md, logs/orbit/.
Work: decision 13. The centre becomes a layered 3D medallion: concentric depth rings on translateZ tiers, a rotating halo, glow rays, particles, the expression icon and name with the phrase large; the orbiting bubbles drop to 0.8 scale with three size tiers by message length (under 80, under 200, over) while staying circular; records by `chooseRandom`; the Plan 13 shuffle bag and remount guard keep working with the pass token (follow-up 2); unused `p.theta` and `p.angle` removed (Plan 13 note).
Acceptance: common scene spec plus: the centre element's bounding box is at least 1.5 times the largest orbiting bubble's diameter; three distinct orbiting bubble diameters appear with the sample fixture; Plan 13's occlusion and z-sign assertions still pass; no `.orb` carries a 3D rotation.

## Section 9: Milestone and Weekly Goal (renderer id 11)
Setup: frontier · high · Lane: Codex (Luna via codex-dispatch; Antigravity Gemini 3.8 Flash (High) while Codex primary is at or above 80 percent) · Review: controller
  Codex: gpt-5.6-luna · high (fallback: gpt-5.6-terra · high workspace-write)
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: $HOME/.claude/worktrees/mothers-love-tv-milestone, branch tv15/scene-milestone
Depends on: Section A; gaps/milestone.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/milestone.js, scenes/milestone.css, tests/color-polish-scenes/milestone.spec.ts, lanes/milestone.md, logs/milestone/.
Work: the weekly goal expression becomes the most prominent element of the scene: its name and phrase at the largest text size on screen, with the medallion; the milestone number and progress move to a secondary rail. Stream bubbles say the phrase of one expression (decision 10: the goal expression if the record includes it, else the record's first) with the person's name, instead of "THANK YOU". The stream draws from the whole eligible pool through `chooseRandom` (the contributor floor of 14 becomes the whole pool), so all recognitions can appear, not only recent or goal-related ones; the gold rim still marks records that include the goal expression.
Acceptance: common scene spec plus: the goal expression's phrase is rendered at the largest computed font size in the scene; every `.stream-pearl` shows a catalog phrase and a name and none shows "THANK YOU"; with the 48-record sample at least 12 distinct records pass through the stream in 30 s; Plan 13's node density and per-node seed assertions still pass.

## Section Z: Pick, integration and release
Setup: balanced · high · Lane: Claude (coordinator glue) · Review: controller + independent
  Claude: Opus 5 · high coordinator for Git and release (Fable advisor on request); completion review by a fresh Opus 5 · high subagent in its own context, never the coordinator's chat
Worktree: $HOME/Projects/mothers-love (single writer) plus the tv15/pick worktree at $HOME/.claude/worktrees/mothers-love-tv-pick (check out tv15/pick there)
Depends on: whichever lanes Anthony picks; Lane 0 objections resolved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high on the merge; independent=Claude Opus 5 · high completion review
Hygiene: Haiku 4.5 · low sweep before review
Work: recreate tv15/pick from tv15/base, merge tv15/arrivals and the chosen scene branches, run the globals check, typecheck, vitest, build, lint, the probe at both widths with --arrivals, and the scene, helpers and usable specs on an env-loaded production server one lane at a time (Plan 13 runner lessons); resolve Lane 0's accepted objections and any landing-review findings deferred to integration; push; restart the LAN preview from the tv15/pick worktree (stop the tv/pick server first: `kill $(cat docs/runs/2026-09-11-tv-scenes/logs/pick/lan-preview.pid)` from the project folder) and send Anthony the address from logs/pick/lan-preview.txt. Anthony watches a full playlist cycle, at least two arrivals and one click advance on the TV. Opus review, fix blocking findings, one confirmation pass, then merge into codex/color-polish-v6 and codex/mothers-love, verify the production deployment shows the new renderer, update README quick links, HANDOFF (still describes Plan 12), AGENTS read-first list and the one-sentence circle-rule exception, and $HOME/Projects/README.md; stop the LAN preview; leave the worktrees for one week, then remove them in a follow-up chip only when Anthony asks.

## Rollback

- Before promotion nothing live changes: every lane is a branch, tv15/pick is a branch, the LAN preview is local. Rollback before promotion is simply not merging; the live TV keeps the Plan 12 renderer (codex/mothers-love at 1532068).
- At promotion the coordinator records in the Build log: the production commit of codex/mothers-love before the merge (1532068 unless changed), the merge commit, the new Vercel deployment id, and the previous deployment id (Plan 12 recorded dpl_9DsFVYvDX1fSXRirH3vGHfxeFwQd).
- If the TV shows a rendering fault after promotion: `git revert -m 1 <merge commit>` on codex/mothers-love and push (Vercel redeploys within minutes), or promote the previous deployment in the Vercel dashboard. Both restore the Plan 12 renderer. No database change exists in this plan, so no data rollback is needed; database settings stay at version 6 revision 2.
- Per-scene rollback after promotion: revert that scene branch's merge commit on tv15/pick, re-run Section Z's checks, promote again. Because scene files are disjoint, one scene reverts without touching another.
- If a scene stutters on the TV hardware but not on the runner: the documented first levers are PIP_HEART_M halved (peace-in-practice), the transition bubble count reduced to 24 (core/transitions.js), and the puzzle globe grid reduced (peacemakers); each is a one-value change on the branch.

## Common scene spec (tests/color-polish-scenes/<slug>.spec.ts, built on helpers.ts)
1. Circularity during entrance, steady state and exit, including a transition and an arrival: every .orb-slot, .orb and .event-orb has width equal to height within one pixel and computed border-radius of 50 percent; `.puzzle-card` and `.heart-card` are checked by `cardShape` instead (decision 7).
2. No overflow on the scene root.
3. Reduced motion: reducedMotion reduce renders the scene, getState().still is true, no runtime error, no speech rotation, no flood.
4. Studio sample preview: /admin/display, select the scene, renders from source sample, a click does not advance.
5. The scene-specific assertion named in its section. Multi-sample timelines longer than a few seconds run through `loadRenderer`, never through the Studio (Plan 13 lesson: the Studio host remounts scenes during long timelines).
Plus, per lane: globals check, typecheck, lint, test, build, the scene, helpers and usable specs on the production runner, and the probe at 1920 and 3840 at 0, 6000 and 14000 ms into logs/<slug>/.

## Gap reports
One per scene lane and for Section C at docs/runs/2026-09-12-tv-next-level/gaps/<slug>.md, written by Fable before that lane codes, with fields: Anthony's note (quoted), tv/pick 463ce8d does (file and line), Gap, Decision, Testable acceptance, Risk, Speech anchors (welcome and peacemakers only: measured x and y over the art). Anthony approves each report before its lane launches; reports for one sitting are written together. Anthony may instead rule "continue until the end" as in Plan 13, which turns approval into a notification.

## Order of work
1. Section A alone, plus Lane 0 alongside. Gap reports for sitting two written while A runs.
2. Sitting two (largest first): Section B on tv15/base, Section C, Section 4 (peacemakers), Section 7 (peace-in-practice).
3. Sitting three: Sections 1 (welcome), 3 (featured), 8 (orbit), 9 (milestone).
4. Sitting four: Sections 5 (status), 6 (expressions), 2 (garden).
5. Section Z. Anthony can call Section Z after any sitting with the branches landed so far.
Lanes verify one at a time on the production runner; landing reviews run when each lane lands and block nothing.

## Assumptions
- The globe art (globe.png) carries figures or a rim from which speech bubbles can rise; the gap report measures the anchors, and if it carries no figures the bubbles rise from three points on the world's rim.
- The TV's browser supports CSS 3D transforms (already used by the Plan 13 featured panel, which Anthony watched); WebGL is not used anywhere.
- Colors outside the two rulings (heart red, and the catalog colors on transition bubbles) stay as shipped. Durations, playlist order, feed rail, header and QR stay as live. Calendar keeps its Plan 13 code, and the Plan 13 calendar click ruling stands (day selection is Studio-only).
- Arrival frame count 4 and path counts 6 and 5 are the numbers the probe asserts after Section B lands its additive assertion.
- The renderer's message cap (state.js normalizes up to 4000 characters) is a defensive bound; the server enforces 500 graphemes and nothing in this plan changes it.

## Build log
- 2026-09-11: Plan drafted by Fable 5.1 in plan mode from Anthony's brief, Plan 13's Build log and follow-ups, and a read-only code map of tv/pick 463ce8d. Anthony ruled the seven forks in the interview (decisions 1 to 7) and delegated 8 to 14. Pools at planning: Claude 5 h 41 percent, Claude weekly 69 percent, Fable weekly 92 percent, Codex primary 100 percent (resets Tuesday September 15, 6:12 PM Pacific), Gemini weekly 32 percent. Baseline for the completion review: tv/pick 463ce8d; codex/mothers-love and origin at 1532068; live TV on the Plan 12 renderer. Anthony chose Parallel mode and ruled that Opus 5 coordinates the run with Fable as advisor only; the start time is his, with Gemini writing until Codex primary refills. At approval the plan is written to docs/PLAN-15-tv-next-level.md, the record tree is created with the fork rulings in decisions/, both are committed as a docs-only commit on codex/color-polish-v6 in the main checkout (which sits at 29f50b1, dirty only with next-env.d.ts and untracked Playwright evidence folders that are not staged), and the kickoff prompt is handed to Anthony. The coordinator's first act is to cut tv15/base from tv/pick 463ce8d and cherry-pick that docs commit onto it as the first commit, so the plan and record tree are readable inside every worktree (code identical to 463ce8d), as Plan 13 did.
- 2026-09-12: Section B2 opened. Anthony asked for a 3D architectural vortex with real depth covering the whole screen; eight agents produced four competing designs, three judges scored them, and the perspective tunnel won (mean 8.17, worst lens 8.0), absorbing the best of the other three. The result is The Turning Nave, specified in full at docs/runs/2026-09-12-tv-next-level/research/vortex-spec.md, committed at 014d429, with every constant fixed and no design decision left open. Root cause of all eleven earlier rounds, found while preparing the brief: renderer.css declares .stage { perspective: 1600px } and a later rule in the same file resets it to none, so the renderer has never had true perspective and every round faked depth with one scale multiplier; this design uses a real projection instead. The spec was carried into tv15/base as commit 906a1cc (code byte-identical to round 11 dae3252) so the build lane can read it inside its own worktree, and this plan gained Section B2 at 83a9e94. Dispatched to gpt-5.6-luna at xhigh, thread 01a095f3-26d4-79d2-8f72-c45019acbe63, allowlist limited to core/transitions.js and core/transitions.css, with tests/color-polish-scenes/transitions.spec.ts explicitly protected because spec section 11 proves every assertion in it still holds. Codex began rewriting transitions.js and the chat handed off before it finished; the lane record at docs/runs/2026-09-12-tv-next-level/lanes/B2.md carries the baseline, the allowlist, the dispatch parameters and the reviewer's checklist. Anthony's standing instruction for this lane, stated twice: stop asking him to confirm the design in prose, build it and show him a video of it playing, because he cannot picture it until it is made. Nothing reviewed, nothing merged, nothing promoted; the live TV still serves the Plan 12 renderer.
- 2026-09-12: Resume authority expanded to the full Plan 15 TV pass and test branch preview. Astra is the controller with six Luna implementation lanes running in parallel. B2 remains on tv15/base at 906a1cc with only public/color-polish/core/transitions.js and public/color-polish/core/transitions.css changed; its protected tests pass 14 of 14, globals and typecheck pass, and lint remains at the 18-problem baseline. The integrated test branch codex/tv15-full-preview is at 7efbb91 in $HOME/Projects/mothers-love-worktrees/tv15-b2-preview. Its current preview is https://mothers-love-mc677dgw8-lvzion.vercel.app/display. Integrated verification has globals clean at 349 declarations, typecheck clean, 222 Vitest tests passing, lint at the 18-problem baseline, and the 1920 and 3840 renderer probes passing for all 10 scenes plus 6 single and 5 group arrival styles. The preview shows the real-render feed in normal mode, click advance from scene 1 to scene 2 with 70 bubbles and 2 canvases, and zero page errors or failing requests. Work remains running while gaps and 152 tests are completed. Production is unchanged and promotion is held for Anthony's TV approval.
- 2026-09-12: Anthony watched the preview and ruled: "that transition was cool but way too intense. it needs to look gracious, nice, beautiful". This supersedes the prior intensity constants for the transition visuals. The new target keeps real depth, circular bubbles, full coverage, one projection function, and all four styles, while using a softer Turning Nave, pastel colors, and a gentler reveal. A seventh Luna lane is working on this bounded transition update in $HOME/Projects/mothers-love-worktrees/tv15-finish-graceful-transition on branch codex/tv15-finish-graceful-transition. Five shared fixes are also awaiting full integration verification: random same-second determinism, poll reset of shown counts and speech bags, replacement shown counts, the 18 px group floor, and grown-bubble actor geometry synchronization. Work remains running and nothing is promoted.
- 2026-09-12: Anthony superseded the gentle transition direction and ruled: "forget the transition for now. its something ill work on another time. use the original transition that is currently live." The exact Plan 12 transition from commit 15320682a90747267e420d369c441e6938603499 is being ported into the full preview branch codex/tv15-full-preview at $HOME/Projects/mothers-love-worktrees/tv15-b2-preview: the 1.15-second crossfade with tiny translate and uniform scale, with no Nave overlay. The gentle version is preserved locally at commit 64f5365 for later and receives no further work in this pass. Current checks include globals clean at 258 declarations, Welcome 14 passing, Expressions 5 targeted tests passing including both prior failures, Peacemakers 13 passing plus one gap-fix retest, and the heart cap test passing. Earlier integrated typecheck and 222 Vitest tests passed, with lint at the 18-problem baseline. Featured verification and final preview checks remain pending. Production is unchanged and nothing is promoted.
- 2026-09-12: The requested test preview implementation is complete at commit b8650739a4a35cbe490e941580c2827a4109d35e on codex/tv15-full-preview. Preview deployment dpl_4ZvXooEY66gys1MziS5qACqMeDmf is READY with a passing build at https://mothers-love-d4ve0196a-lvzion.vercel.app/display. The exact live Plan 12 transition is restored from commit 15320682a90747267e420d369c441e6938603499, with its 1.15-second crossfade, tiny translate, uniform scale, and no Nave overlay. The Nave version is preserved at commit 64f5365 for later. All seven new live-transition tests pass. All current 145 scene test titles have passing evidence across the initial run and focused reruns, not one clean 145-test invocation, and every known initial failure is resolved. Six usable tests pass, 222 Vitest tests pass, globals are clean at 258 declarations, typecheck passes, and lint remains at the 18-problem baseline. Final probes at 1920 and 3840 pass for all 10 scenes, 6 single arrival styles, and 5 group arrival styles with zero issues. Featured's two last failures pass with lazy orbit, Expressions 5 pass, Welcome 14 pass, and Peacemakers 13 pass plus one gap-fix retest. The preview record rewrites exactly two public GET endpoints and uses preview-only iframe same-origin compatibility, with no database credentials. Final deployed click smoke remains pending, and physical TV approval still gates production promotion. Production remains unchanged at commit 15320682a90747267e420d369c441e6938603499 and deployment dpl_GZdeMyoZDVtKB9gJSwDNeSxrp3LR.

- 2026-09-12: Final deployed preview click verification passed on `b865073`: source matched, normal mode, Welcome to Garden, no Nave overlay, zero page errors, and zero failed requests. A first cold-start timeout cleared on a fresh diagnostic and repeat check. Production reconfirmed unchanged at `15320682a90747267e420d369c441e6938603499`, deployment `dpl_GZdeMyoZDVtKB9gJSwDNeSxrp3LR`. Implementation for the requested test preview is complete; physical TV approval still holds promotion.
