# Plan 13: TV scene review and refactor

Project: /Users/anthony/Projects/mothers-love. Live TV: https://mothers-love.vercel.app/display. Planner: Fable 5.1 (Anthony's instruction, September 10, 2026). Approved by Anthony in plan mode on September 10, 2026. Run record: /Users/anthony/Projects/mothers-love/docs/runs/2026-09-11-tv-scenes/INDEX.md.

Runner: coordinator. Section 0 runs alone and lands first. After that the coordinator launches two or three scene lanes per sitting, each in its own worktree and branch, and Anthony picks which scene branches merge.

## Context

Plan 10 shipped the Color Polish TV as a sandboxed iframe renderer built from the v6 prototype lineage. Anthony's section-by-section behavior prompts (independent bubble motion, garden growth and petal bursts, five plus five arrival choreographies, calendar count centered, orbit moons and real depth, a 3D milestone helix) were written against that prototype, but most never landed: the attached v6 2 prototype only partly implements them, and the live renderer inherited the same gaps. Anthony wants a written gap report per scene, then a refactor scene by scene, laid out so he can choose which scenes ship. Admin and Studio are out of scope except that the sample preview must keep working. Colors stay exactly as shipped.

Branches let Anthony pick any subset only after the single 941-line renderer is split so each scene owns its own files. That split is Section 0, with no visual change.

## Inputs (frozen)

- Behavior prompts: /Users/anthony/Downloads/Mother's Love TV Prototype — Section-by-Section Build Prompts.md (filename dash is the file's own).
- Color pass: /Users/anthony/Downloads/Mother's Love TV App — Complete Color & Visual Polish Pass.md (already live; reference only).
- Behavior prototype: /Users/anthony/Downloads/Mothers_Love_TV_Prototype_v6 2.html, sha256 e442f3a190eb850c447d3e5b41020c8effe6ed4ff7842447a84e0c705c47ab83. A base64-stripped copy for reading lives in the session scratchpad; lanes may regenerate one with sed. Anthony rejected v8; it was moved to the Trash.
- Live renderer: /Users/anthony/Projects/mothers-love/public/color-polish/renderer.js (941 lines), renderer.css (250), renderer.html (56). Host: src/components/display/color-polish-host/ColorPolishHost.tsx. Bridge: src/components/display/color-polish/renderer.tsx. Contract: src/lib/color-polish/contracts.ts. Sample data: src/components/display/color-polish/sample.ts and sample-fixture.ts. Probe: scripts/color-polish-renderer-probe.mjs. Journeys: tests/color-polish-usable/usable.spec.ts.

## Models, lanes, reviews

- Coordinator and planner: Fable 5.1. Fable writes the 11 gap reports; Gemini writes all code.
- Writer for every code lane: Gemini 3.8 Flash (High) through agy. Codex primary was at 100 percent at planning time (resets Tuesday September 15, 6:12 PM Pacific), so Luna is unavailable; Gemini is the named alternate. Writable root for agy is /Users/anthony/.claude/worktrees/**, so each lane worktree is /Users/anthony/.claude/worktrees/mothers-love-tv-<slug>.
- Spill if Gemini refuses: Sonnet 5 (medium). Never Opus or Fable for implementation.
- Landing review per lane: Sonnet 5 (high) on the diff, at most two rounds. Hygiene sweep before each review: Haiku 4.5 (low).
- Completion review: one Opus 5 (high) review of the tv/pick integration branch before production.
- Lane cap: two or three lanes per sitting. One writer per worktree, disjoint files.
- Ledger: one row per dispatch via ledger-append.sh (agy) or ledger-from-transcript.py (Claude reviews).
- Gemini model: only Gemini 3.8 Flash. Anthony's ruling, September 10: Gemini 3.1 Pro is outdated and is never used, not even as a fallback. When a section needs more thought, raise effort within 3.8 Flash before spilling to Sonnet 5.
- Haiku 4.5 (low) carries every mechanical row: the hygiene sweep before each review, ledger rows, lane-state updates in INDEX.md, filing probe screenshots into logs/<slug>/, README, HANDOFF and AGENTS link updates, and Build log format checks. Never Haiku for scene code or reviews.

Cross-cutting rules for every lane: circular bubbles at all times; no added white overlays; readable from across a room; reduced motion respected (S.still); fictional data only; header, feed rail, QR, durations, playlist order, click-advance (live only) and safe states untouched; Studio sample preview keeps working; no em or en dash in produced text or comments; every scene CSS rule scoped to `#tv .scene[data-scene="N"]` (arrival: `#tv .event-stage`), where N is the renderer id, never Anthony's section number. The `#tv` prefix is required because renderer.css already prefixes its Color Polish rules with `#tv`, so a rule scoped only by class would lose the cascade (Lane 0 objection 1).

Scene id map (Anthony's number, renderer id, slug): 1/1 welcome, 2/2 garden, 3/3 arrival, 4/4 featured, 5/5 calendar, 6/8 peacemakers, 7/6 status, 8/7 expressions, 9/9 peace-in-practice, 10/10 orbit, 11/11 milestone. Files and branches use the slug only.

## Branch and merge model

- tv/base: cut from codex/color-polish-v6 at 1532068. Holds Section 0, the gap reports, and any shared lane. Only path that touches core/*, renderer.html, renderer.css, contracts.ts, sample-fixture.ts.
- tv/scene-<slug>: one per scene, cut from tv/base, touches only its own files.
- tv/pick: recreated from tv/base each time Anthony chooses a subset; merge each chosen branch. Disjoint files, no conflicts. An unchosen branch stays parked and blocks nothing.
- tv/shared-<topic>: a shared change lands on tv/base first; open scene branches rebase.
- Promotion: after Anthony approves the Vercel preview of tv/pick on his TV, tv/pick merges into codex/color-polish-v6 and then codex/mothers-love (production). No database change in any lane.

## Lane 0: Plan critique
Setup: read-only critic · high · Lane: Codex · Review: none
  Codex: gpt-5.6-sol · high (fallback when Codex primary is exhausted: Antigravity Gemini 3.8 Flash (High), read-only)
Worktree: none, read-only against /Users/anthony/Projects/mothers-love
Depends on: none; launches alongside Section 0
Agents: none
Reviewers: none (this lane is the reviewer)
Hygiene: none
Brief: argue against this plan; find missing decisions, unsafe assumptions, untestable acceptance criteria, scope creep, rollback gaps, and sections too ambiguous for the writer. Accepted findings become revised sections, resolved before the completion review. Disposition recorded in the Build log.

## Section 0: Foundation split, no visual change
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
  Claude: Sonnet 5 · medium (spill only)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-base, branch tv/base
Depends on: none
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review

Owns: public/color-polish/** (renderer.js, renderer.css, renderer.html, new core/, scenes/, boot.js), docs/runs/2026-09-11-tv-scenes/lanes/base.md, docs/runs/2026-09-11-tv-scenes/logs/base/. Protected: everything else, including src/**, tests/**, contracts.ts, sample-fixture.ts.

Split renderer.js into ordered classic scripts sharing one global scope, listed in renderer.html in fixed order under the existing CSP (script-src 'self', no inline scripts):
- core/state.js: version, ASSETS, catalog, helpers, NAMES, ORDER, DWELL, S/slots/V, snapshot normalization, numbers (today lines 1 to 134).
- core/orbs.js: completeOrb, addOrb, smallFits, readerSlot, rightBubbles (shared by welcome, peacemakers and peace-in-practice, so it is core, never a scene file; Lane 0 objection 5), fitCircle, tickCirclePages, emptyPanel, safeScene, checkFullFits, fullReader.
- core/motion.js: floaters, actor physics, separation, burstAt, drawSceneFX, tickSlots (lines 309 to 341, 651 to 737, 771 to 792).
- core/chrome.js: feed rail, header, atmosphere, countdown, queue dock.
- core/arrivals.js: the event state machine; style tables and trajectories move to scenes/arrival.js.
- core/stage.js: scene registry, renderNow, postRender, requestScene, transition, coordinator, frame loop, window.colorPolishRuntime.
- core/host.js: MessageChannel bridge, prune, clear.
- scenes/<slug>.js and scenes/<slug>.css for all 11 slugs. Section 0 creates every file so no later lane edits renderer.html. Scene CSS files start with a header comment only; the existing renderer.css stays as the shared base.
- boot.js: init() only.

Registry contract registerScene(id, descriptor): markup(), mount(root), tick(dt), draw(dt), motion parameters (floaters, fxCanvas, arch opacity, topMargin, pace, depth range, retire, replaceEvery, replaceMode, entrance, burst), keepOut(), optional overrides integrate(actor, dt), place(actor), onRetire(actor). Shared code reads these instead of branching on scene numbers. Behavior must be identical after the split.

Also: replace the dead inline onclick on calendar days (renderer.js line 178, blocked by CSP today) with a data-day attribute and a delegated listener; today it never fires, so this is still no visual change. The listener never calls stopPropagation: on the live TV the document click listener from Plan 11 still advances the scene, so day selection is effectively a Studio sample preview affordance only (coordinator ruling on Lane 0 objection 6; Anthony may overturn it in Section 5).

Acceptance (all must hold):
1. Before the split, on untouched tv/base, run the probe six times (widths 1920 and 3840; ms 0, 6000, 14000) into docs/runs/2026-09-11-tv-scenes/logs/base/before/, then run the same six again and hash every PNG to learn which scenes are byte-deterministic.
2. After the split, rerun the six into logs/base/after/; every deterministic PNG hashes identical, and result.json states match exactly for all ten scenes.
3. Probe with --arrivals before and after; the 11-wave style sequence matches.
4. npm_config_cache=/tmp/npm-cache npm run typecheck, lint, test, build, test:e2e all pass (the three pre-existing failures recorded in Plan 12 remain the only failures).
5. Lane record lists every file moved with its old line range.

## Section 0b: Shared scene test helpers and visualState depth
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-base, branch tv/base
Depends on: Section 0 landed and reviewed
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: tests/color-polish-scenes/helpers.ts (new), public/color-polish/core/stage.js (visualState only), docs/runs/2026-09-11-tv-scenes/lanes/base-b.md.
Work: export from helpers.ts the admin session and overview mocks and the renderer bootstrap used by tests/color-polish-usable/usable.spec.ts (copied, since that spec is protected), plus `loadScene(page, slug, ms)` and `circularity(page)` helpers every scene spec calls; add z, depth, scale and blur to the visualState actor mapping (additive). Added at Lane 0 objections 3 and 8.
Acceptance: a smoke spec tests/color-polish-scenes/helpers.spec.ts loads the welcome scene through the helpers on /admin/display and asserts circularity; typecheck, lint, test, build, test:e2e pass; probe hashes unchanged from logs/base/after.

## Section 1: Welcome (renderer id 1)
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-welcome, branch tv/scene-welcome
Depends on: Section 0; gap report gaps/welcome.md approved by Anthony
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: public/color-polish/scenes/welcome.js, scenes/welcome.css, tests/color-polish-scenes/welcome.spec.ts, docs/runs/2026-09-11-tv-scenes/lanes/welcome.md, logs/welcome/.
Work: per-actor physics exists (mountFloaters: own rng, vx, vy, pace, phase, z). Widen speed and depth spread through motion params, add slow heading changes (nextTurn), keep keepOut around the copy block. Some bubbles rise, some drift left or right, some hover; visible near and far layers.
Acceptance: the common scene spec (below) plus a visualState check that at least three actors differ in speed by 30 percent or more and actor depth values span at least two layers (visualState actors expose z and depth after Section 0b; Lane 0 objection 3).

## Section 2: Recognition Garden (renderer id 2)
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-garden, branch tv/scene-garden
Depends on: Section 0; gaps/garden.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/garden.js, scenes/garden.css, tests/color-polish-scenes/garden.spec.ts, lanes/garden.md, logs/garden/.
Work: keep 5 bubbles and the 7 second cadence. Stronger sprout entrance. Replace the single bloom exit with swell, burst to petals, petals carried on a breeze, an energy spark back to the garden line, and a new plant growing. Add sway and light passes to the garden canvas. Cap particles as the existing fx cap does.
Acceptance: common spec plus visualState flower count strictly increases over 60 seconds; never more than 5 bubbles.

## Section 3: Recognition Arrival (renderer id 3)
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-arrival, branch tv/scene-arrival
Depends on: Section 0; gaps/arrival.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/arrival.js, scenes/arrival.css, tests/color-polish-scenes/arrival.spec.ts, lanes/arrival.md, logs/arrival/.
Work: audit the 6 single (singleTrajectory) and 5 group (groupTrajectory) styles for genuine difference. Keep the counts (the probe asserts them). Add particles, trails and real z spread to the weakest two of each. Every style resolves into the normal circular bubble.
Acceptance: common spec plus the probe --arrivals sequence still lists 6 and 5 styles; the lane's own arrival.spec.ts captures one screenshot per style at its entrance midpoint into logs/arrival/ (the probe script is protected and takes no arrival screenshots; Lane 0 objection 3).

## Section 4: Featured Recognition (renderer id 4)
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-featured, branch tv/scene-featured
Depends on: Section 0; gaps/featured.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/featured.js, scenes/featured.css, tests/color-polish-scenes/featured.spec.ts, lanes/featured.md, logs/featured/.
Work: staggered single replacement (retireAt offsets) instead of whole-scene repopulation; the expression panel stays dominant; keep the choose() fallback for sparse expressions.
Acceptance: common spec plus bubble count never drops to zero during 30 seconds and no two bubbles retire within the same second.

## Section 5: Calendar (renderer id 5)
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-calendar, branch tv/scene-calendar
Depends on: Section 0; gaps/calendar.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/calendar.js, scenes/calendar.css, tests/color-polish-scenes/calendar.spec.ts, lanes/calendar.md, logs/calendar/.
Work: day number small in a corner, count large and centered; past days get a warm completed treatment and a small entry pulse (the --day-delay hook). Placement stays on the frozen Los Angeles first-publish date; presentation only.
Acceptance: common spec plus screenshots at 1920 and 3840 showing the corner date and centered count, no cell overflow.

## Section 6: We Are Peacemakers (renderer id 8, data-scene="8")
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers, branch tv/scene-peacemakers
Depends on: Section 0; gaps/peacemakers.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/peacemakers.js, scenes/peacemakers.css, tests/color-polish-scenes/peacemakers.spec.ts, lanes/peacemakers.md, logs/peacemakers/.
Work: staggered replacement as in Section 4, plus depth layering with blur on deeper layers; nearest layer stays sharp.
Acceptance: common spec plus bubble count never zero; at least one actor blurred and one sharp at the 14 second checkpoint.

## Section 7: Status (renderer id 6, data-scene="6")
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-status, branch tv/scene-status
Depends on: Section 0; gaps/status.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/status.js, scenes/status.css, tests/color-polish-scenes/status.spec.ts, lanes/status.md, logs/status/.
Work: replace the single tickStatus transform with per-icon seeded phase, rate and amplitude, plus one ambient light or shimmer layer. No bouncing. Numbers stay still and legible.
Acceptance: common spec plus the nine medallion transforms differ from each other at the 6 second checkpoint.

## Section 8: Nine Expressions (renderer id 7, data-scene="7")
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-expressions, branch tv/scene-expressions
Depends on: Section 0; gaps/expressions.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/expressions.js, scenes/expressions.css, tests/color-polish-scenes/expressions.spec.ts, lanes/expressions.md, logs/expressions/.
Work: fit only. Card geometry is animated in JS (590 by 167 to 950 by 530), so change those numbers and the CSS together; responsive font size, line height, consistent alignment, no overflow at 1920 and 3840.
Acceptance: common spec plus scrollWidth and scrollHeight never exceed client size on all nine cards in both grid and focused states.

## Section 9: Peace in Practice (renderer id 9)
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice, branch tv/scene-peace-in-practice
Depends on: Section 0; gaps/peace-in-practice.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/peace-in-practice.js, scenes/peace-in-practice.css, tests/color-polish-scenes/peace-in-practice.spec.ts, lanes/peace-in-practice.md, logs/peace-in-practice/.
Work: independent motion; exit pops into hearts, peace symbols and soft particles (the hearts burst kind exists); replacement enters on its own timing.
Acceptance: common spec plus a burst is observed in visualState within 60 seconds and bubble count never zero.

## Section 10: Expression Orbit (renderer id 10)
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-orbit, branch tv/scene-orbit
Depends on: Section 0; gaps/orbit.md approved
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/orbit.js, scenes/orbit.css, tests/color-polish-scenes/orbit.spec.ts, lanes/orbit.md, logs/orbit/.
Work: slow the system (rate .102 today). Real depth: wider scale range, blur behind (the divide-by-1000 makes blur zero today), occlusion by z-index, shadow. Moons already orbit each planet; make them read as expression icons. Coordinated motion only, no independent drift.
Acceptance: common spec plus orbit z values span both signs and at least one planet passes behind the sun (z-index below the sun) within 30 seconds.

## Section 11: Milestone and Weekly Goal (renderer id 11)
Setup: balanced · high · Lane: Antigravity · Review: controller
  Antigravity: Gemini 3.8 Flash (High) (fallback: Gemini 3.8 Flash (Medium), then Sonnet 5 · medium)
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-milestone, branch tv/scene-milestone
Depends on: Section 0; gaps/milestone.md approved; shared fixture lane if the 48-record sample yields too few nodes
Agents: none
Reviewers: controller=Claude Sonnet 5 · high; independent=none
Hygiene: Haiku 4.5 · low sweep before review
Owns: scenes/milestone.js, scenes/milestone.css, tests/color-polish-scenes/milestone.spec.ts, lanes/milestone.md, logs/milestone/.
Work: ground-up build. Compact milestone and goal text on the left of the content area, a vertical 3D helix stream of small bubbles on the right, extreme depth (scale, blur, opacity, occlusion), per-bubble speed, radius, pace and rotation, expression icons in the stream, never empty, no visible loop. mountTributes and tickTributes become this lane's file.
Acceptance: common spec plus the stream shows at least 12 nodes at every sampled second for 30 seconds, each node carries its own seeded radius, speed and phase (no two nodes share all three), and no node moves more than 40 px between consecutive frames at 60 fps except at a deliberate respawn (Lane 0 objection 3 replaced the unverifiable "never repeats a path").

## Section 12: Pick, integration and release
Setup: balanced · high · Lane: Claude (coordinator glue) · Review: controller + independent
  Claude: Fable 5.1 coordinator for Git and release; Opus 5 · high completion review
Worktree: /Users/anthony/Projects/mothers-love (single writer)
Depends on: whichever scene lanes Anthony picks
Agents: none
Reviewers: controller=Claude Sonnet 5 · high on the merge; independent=Claude Opus 5 · high completion review
Hygiene: Haiku 4.5 · low sweep before review
Work: recreate tv/pick from tv/base, merge the chosen scene branches, run the full probe with --arrivals and the whole Playwright suite, push, send Anthony the Vercel preview URL. He watches a full playlist cycle and one click advance on the TV. Opus review, fix blocking findings, merge into codex/color-polish-v6 then codex/mothers-love, verify the production deployment, update README quick links, HANDOFF, AGENTS read-first list and /Users/anthony/Projects/README.md. Rollback (Lane 0 objection 7): before promoting, record the production commit of codex/mothers-love in the Build log; if the TV shows a rendering fault after promotion, `git revert -m 1 <merge commit>` on codex/mothers-love and push (Vercel redeploys), or promote the previous production deployment in the Vercel dashboard; both restore the Plan 12 renderer with no database change.

## Common scene spec (tests/color-polish-scenes/<slug>.spec.ts, built on Section 0b helpers.ts)
1. Circularity during entrance, steady state and exit, including a transition and an arrival: every .orb-slot, .orb and .event-orb has width equal to height within one pixel and computed border-radius of 50 percent.
2. No overflow on the scene root.
3. Reduced motion: reducedMotion reduce renders the scene, getState().still is true, no runtime error.
4. Studio sample preview: /admin/display, select the scene, renders from source sample, a click does not advance.
5. The scene-specific visualState assertion named in its section.
Plus, per lane: typecheck, lint, test, build, test:e2e, and the probe at 1920 and 3840 at 0, 6000 and 14000 ms into logs/<slug>/.

## Gap reports
One per scene at docs/runs/2026-09-11-tv-scenes/gaps/<slug>.md, written by Fable before that lane codes, with fields: Prompt asks, Prototype v6 2 does, Live does (renderer line), Gap, Decision, Testable acceptance, Risk. Anthony approves each report before its lane launches; reports for one sitting are written together.

## Order of work
1. Section 0 alone, pixel-proven, plus Lane 0 critique alongside. Then Section 0b on tv/base. Gap reports for sitting one are written while those run.
2. Sitting one: Sections 5, 7, 8 (calendar, status, expressions).
3. Sitting two: Sections 1, 4, 6 (welcome, featured, peacemakers).
4. Sitting three: Sections 9, 2 (peace in practice, garden).
5. Sitting four: Sections 10, 3 (orbit, arrival).
6. Sitting five: Section 11 (milestone).
Anthony can call Section 12 after any sitting.

## Assumptions
- Calendar placement stays on the Los Angeles first-publish date the database freezes (product invariant; database/001 lines 593 and 614). Anthony's prompt says "original submission date"; this plan treats that as the frozen first-publish date. If he means the moment of submission, that is a database change and a separate plan.
- Colors, durations, playlist order, feed rail, header and QR stay exactly as live. Admin and Studio code untouched.
- scripts/color-polish-reference.mjs and the approved reference PNGs are not regenerated; the probe is the before and after tool.
- Arrival style counts stay 6 and 5.

## Build log
- 2026-09-10: Anthony chose Parallel mode, ruled out Gemini 3.1 Pro entirely (3.8 Flash only), and asked that Haiku 4.5 carry the mechanical rows; setup lines updated before launch.
- 2026-09-10: Plan approved by Anthony in plan mode (Fable 5.1 planner, per his instruction). Baseline for the completion review: codex/color-polish-v6, codex/mothers-love and origin/codex/mothers-love all at 1532068. Working tree dirty only with two untracked Plan 10 order files (docs/runs/2026-09-10-color-polish/orders/LM.md, LT.md), not touched by this plan. Codex primary at 100 percent, Gemini weekly at 2 percent, Claude weekly at 36 percent at planning time. Anthony rejected the v8 prototype; /Users/anthony/Downloads/Mothers_Love_TV_Prototype_v8.html moved to the Trash by the coordinator. Section 0 not started.
- 2026-09-10 (evening, coordinator Fable 5.1, Parallel run started): Baseline confirmed before the first edit: codex/color-polish-v6 at 626ee3d, which is 1532068 plus the two Plan 13 docs commits (03456b4, 626ee3d); the working tree was clean. tv/base was cut from 626ee3d rather than 1532068 so the plan and record tree are readable inside the worktree under the Antigravity read gate (code identical). Worktree /Users/anthony/.claude/worktrees/mothers-love-tv-base with node_modules symlinked to the main checkout. Before-split probe baseline: two identical passes of six configs plus arrivals into docs/runs/2026-09-11-tv-scenes/logs/base/before/run1 and run2; 37 of 70 PNGs byte-deterministic, 33 vary between identical runs (listed in logs/base/before/determinism.txt), so the after-split comparison uses the deterministic set plus result.json state for every scene. Arrival style sequence before: singles 1,5,2,3,4,0 then groups 2,4,3,1,0.
- 2026-09-10: Lane 0 critique ran on Gemini 3.8 Flash (High) through agy (the plan's named fallback; Codex primary at 100 percent, resets Tuesday 6:12 PM). Eight objections, disposition: 1 (CSS specificity, #tv prefix required) accepted, plan rule updated; 2 (section number versus renderer id) accepted, every scene section header now carries its renderer id; 3 (untestable acceptance in Sections 1, 3, 11) accepted, criteria rewritten and Section 0b added for visualState depth; 4 (Section 0 refactors all scenes, so tv/pick never runs the monolith) rejected as a finding: that is the design, the split is pixel-proven before any scene branch is cut, and "unchosen branches stay parked" refers to behavior work, not source layout; 5 (rightBubbles unowned) accepted, it lives in core/orbs.js; 6 (calendar click versus click-advance) accepted with the coordinator ruling that the day listener never stops propagation, so live TV still advances and day selection is a Studio preview affordance, open for Anthony to overturn; 7 (no rollback) accepted, rollback added to Section 12; 8 (no shared test fixtures) accepted, Section 0b adds tests/color-polish-scenes/helpers.ts on tv/base. Full critique at docs/runs/2026-09-11-tv-scenes/logs/lane0/critique.out.
- 2026-09-10: Section 0 launched on Gemini 3.8 Flash (High) through agy in the tv/base worktree from the compiled order docs/runs/2026-09-11-tv-scenes/orders/base.md. Gap reports for sitting one written by Fable and awaiting Anthony's approval: gaps/calendar.md (only the entry pulse is missing; corner date, centered count and past-day shimmer are already live), gaps/status.md (per-icon timing already live; gap is motion vocabulary and an ambient layer; the plan's stated acceptance was already satisfied and is strengthened in the report), gaps/expressions.md (no overflow today; the real defect is the focused card 43 percent empty; the plan's scrollHeight acceptance must measure the visible layer because the hidden detail layer always overflows).
- 2026-09-10 (late evening): Section 0 landed and reviewed, commit 313edb9 on tv/base. Writer Gemini 3.8 Flash (High) via agy in three dispatches: the split (ended on a headless-denied command after writing every file, so the coordinator deleted renderer.js), the record and CSS headers, and a round-2 correction. Setup line held (balanced, high). Evidence: every probe state identical to the baseline in all six configs plus arrivals, both before and after round 2; 27 of 37 deterministic PNGs byte-identical, the other 10 within 68 pixels of feed-rail text noise; typecheck, vitest and build pass; lint has 14 pre-existing errors identical on the baseline; the full Playwright suite has 70 pre-existing failures identical to the baseline (Plan 12 counted only the four folders it ran). The coordinator's like-for-like e2e comparison found one real regression the Sonnet 5 review had missed: window.colorPolishRuntime was exposed by core/stage.js before scenes/arrival.js declared the style tables, so the host's getState poll between deferred scripts threw; round 2 moved the runtime exposure and the bootstrap listener to boot.js and the usable spec passes 6 of 6. Sonnet note carried into Section 0b: registry default replaceMode becomes null with peacemakers registering drift explicitly. Worktree node_modules is a real npm ci install (Turbopack rejects a symlink). Large probe PNG sets stay local under logs/base; the repo keeps the text evidence and the after-r2 1920 checkpoint set. Anthony still owes: approval of the three sitting-one gap reports and a ruling on the calendar click (day selection is Studio-only under the coordinator ruling).
- 2026-09-10 (late evening): Section 0b landed on tv/base (uncommitted, awaiting review). Gemini 3.8 Flash (High) via agy wrote tests/color-polish-scenes/helpers.ts and helpers.spec.ts, added z, depth, screenScale and blur to visualState actors, and changed the registry default replaceMode to null (peacemakers already registered drift). Verified: typecheck, vitest and build pass, lint unchanged at the pre-existing 18 problems, probe values identical to the Section 0 baseline except the four added keys, scene helpers spec and usable spec 8 of 8. Hygiene sweep clean. The Sonnet 5 landing review waits for the Claude 5-hour refill at 9:00 PM Pacific (95 percent at the time); commit follows that review. Setup line held.
- 2026-09-10 (evening): Anthony approved the three sitting-one gap reports as written, kept the calendar click ruling (day selection is Studio-only; live TV click still advances), and told the coordinator to start sitting one once Section 0b's review passes. Recorded in docs/runs/2026-09-11-tv-scenes/decisions/.
- 2026-09-10, 9:15 PM: Section 0b reviewed (Sonnet 5 high, no material findings, one record note corrected) and committed on tv/base. Sitting one launched: Sections 5, 7 and 8 on Gemini 3.8 Flash (High) via agy, worktrees /Users/anthony/.claude/worktrees/mothers-love-tv-{calendar,status,expressions}, branches tv/scene-<slug> cut from tv/base after the 0b commit; orders in docs/runs/2026-09-11-tv-scenes/orders/. Each lane runs no commands (headless gate); the coordinator verifies and reviews.

