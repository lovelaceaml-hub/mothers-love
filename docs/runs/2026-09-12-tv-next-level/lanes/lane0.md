---
lane: lane0
title: Plan critique
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-critic
review: none
depends_on: none
updated: 2026-09-11T23:59Z
---

## Objections

### O1 [blocking] Circular probe dependency and impossible assertion between Section B and Section C
Section: Section C (tv15/arrivals) and Section B (tv15/base)
Evidence: Plan 15 line 131 ("Depends on: Section A landed; gap report gaps/arrival.md approved"), line 136 ("Protected: everything else (the probe's frame-count assertion is added by Section B's owner on tv15/base from this lane's FRAME_STYLES name; coordinate through the coordinator)"), line 140 ("Acceptance: probe --arrivals lists 6 single and 5 group styles and 4 frames (the additive assertion)"), line 120 (Section B owns probe.mjs), and Order of work line 290 (Section B and Section C run concurrently in Sitting Two).
Why it fails: Section C branches from tv15/base after Section A, before Section B lands. Section C cannot have Section B's probe edits in tv15/arrivals, and Section C is forbidden from editing the probe ("Protected: everything else"). Section B cannot assert Section C's four arrival frames on tv15/base because arrival frames only exist on the tv15/arrivals branch, so adding that assertion to tv15/base would break Section B's own acceptance suite.
What would fix it: Make Section C depend on Section B landing on tv15/base, or move the arrival frame assertions to tests/color-polish-scenes/arrival.spec.ts instead of the global probe script.

### O2 [blocking] Peacemakers acceptance criterion is mathematically impossible under Decision 4
Section: Section 4 (We Are Peacemakers, renderer id 8)
Evidence: Plan 15 line 191 ("Every 3 s plus 1 s per 40 characters (decision 4) a piece detaches carrying one recognition... flies to a face-on hold position and holds for that time, then snaps into the recognition globe"), line 192 ("over 40 s through loadRenderer the joined piece count increases monotonically to at least six; each held piece's hold time equals 3 s plus 1 s per 40 characters within 0.3 s (logged)").
Why it fails: A standard short recognition message is 160 characters, which requires a hold time of 7.0 seconds (3 s plus 160 / 40). Sequential hold time alone for 6 pieces is 42.0 seconds, before adding flight entrance, orientation settling, and snap animation durations. In a 40-second test window, a sequential pipeline with realistic messages can snap at most 4 or 5 pieces, guaranteeing test failure.
What would fix it: Either extend the test window in loadRenderer to 60 seconds (matching the scene's dwell), allow pieces to detach on an overlapping schedule, or specify a fixed short fixture message for this test.

### O3 [blocking] Probe cannot verify scene transitions because replayed snapshots call renderNow
Section: Section B (Theatrical transitions on tv15/base)
Evidence: Plan 15 line 120 ("scripts/color-polish-renderer-probe.mjs (additive: log the transition style per scene change)"), line 124 ("every scene change logs a transition style, all four styles appear"), compared with scripts/color-polish-renderer-probe.mjs:70 (`replayKey: index + 1`) and public/color-polish/core/host.js:29 (`if(!previousReady||wasSafe||replayed){renderNow(S.s);...}`).
Why it fails: When the probe iterates through scenes, it passes an incremented replayKey in its control message, which sets replayed to true. In host.js, any replayed update executes renderNow directly, clearing any transition and instantly replacing stage children. Because requestScene is never called during probe scene stepping, transitions never trigger and transition styles are never logged by probe.mjs.
What would fix it: Update Section B to verify transitions exclusively in direct Playwright specs via loadRenderer and requestScene, and remove transition assertions from the synthetic probe.

### O4 [blocking] Missing source documents cited as required inputs
Section: Inputs (frozen) and Gap reports
Evidence: Plan 15 line 11 ("His brief (docs/runs/2026-09-11-tv-scenes/decisions/2026-09-11T20-25Z-anthony-tv-check-next-level-brief.md) asks for a larger pass"), line 42 ("Brief and coordinator notes: docs/runs/2026-09-11-tv-scenes/decisions/2026-09-11T20-25Z-anthony-tv-check-next-level-brief.md. Plan 13 follow-ups: docs/runs/2026-09-11-tv-scenes/lanes/follow-ups.md"), and line 286 ("One per scene lane and for Section C at docs/runs/2026-09-12-tv-next-level/gaps/<slug>.md, written by Fable before that lane codes, with fields: Anthony's note (quoted)...").
Why it fails: Neither `docs/runs/2026-09-11-tv-scenes/decisions/2026-09-11T20-25Z-anthony-tv-check-next-level-brief.md` nor `docs/runs/2026-09-11-tv-scenes/lanes/follow-ups.md` exists in the repository. The coordinator and writers cannot quote Anthony's exact notes or inspect the Plan 13 follow-up specifications to author the mandatory gap reports.
What would fix it: Commit the missing brief and follow-ups markdown files to docs/runs/2026-09-12-tv-next-level/decisions/ before starting gap reports, or inline Anthony's verbatim notes directly into INDEX.md.

### O5 [should-fix] Section A speech bubble integration violates core/stage.js ownership boundary
Section: Section A (Shared primitives on tv15/base)
Evidence: Plan 15 line 90 ("Owns: ... core/stage.js (onLeave only)"), line 96 ("Called from coordinator when the current descriptor has speakers"), and public/color-polish/core/stage.js:67 (`function coordinator(dt){...}`).
Why it fails: Section A restricts its modification of core/stage.js strictly to onLeave hooks. However, work item 4 requires mounting speech elements and ticking them inside coordinator in core/stage.js, while postRender in core/stage.js must initialize speaker anchors. A writer following file-ownership constraints cannot wire speech bubbles without breaching the onLeave restriction or leaving speech bubbles uncalled.
What would fix it: Change Section A's Owns list to include `core/stage.js (onLeave, speech hooks, and speaker mount)`.

### O6 [should-fix] Untestable luminance acceptance check in Section C
Section: Section C (Remarkable arrivals)
Evidence: Plan 15 line 140 ("the stage brightness under the frame is measured below 12 percent luminance at the hold midpoint (a computed-style check on #stage filter and the frame overlay opacity)").
Why it fails: Computed CSS styles do not expose a luminance percentage value; getComputedStyle returns raw filter strings like blur or brightness and alpha values. Layer compositing, backdrop filters, and overlay blend modes cannot be evaluated as a single luminance metric by Playwright's getComputedStyle API.
What would fix it: Replace the computed-style luminance test with either an explicit CSS property assertion (such as overlay opacity >= 0.88 and #stage filter includes brightness <= 0.2) or a canvas RGB pixel sample check in Playwright.

### O7 [should-fix] Orphaned cross-scene requirement for S.shownCount tracking
Section: Section A, Section C, and Section 9
Evidence: Plan 15 line 93 ("where S.shownCount is a session map incremented by addOrb and by the arrival and stream renderers"), line 90 (Section A protects core/arrivals.js and scenes/*), line 136 (Section C owns core/arrivals.js without mentioning S.shownCount), and line 256 (Section 9 owns scenes/milestone.js without mentioning S.shownCount).
Why it fails: Section A defines the requirement that arrivals and milestone stream nodes increment S.shownCount, but Section A is forbidden from modifying core/arrivals.js or scenes/milestone.js. Neither Section C nor Section 9 includes work instructions or acceptance criteria to update S.shownCount. Consequently, recognitions shown during arrivals and milestone streams will never be counted, causing chooseRandom to bias toward already-shown records.
What would fix it: Explicitly add incrementing S.shownCount to the Work and Acceptance criteria of Section C and Section 9.

### O8 [should-fix] Undefined reading duration and layout geometry for Peace in Practice heart cards
Section: Section 7 (Peace in Practice, renderer id 9)
Evidence: Plan 15 line 230 ("Recognition cards become hearts (.heart-card, exempt from circularity, decision 7): a small heart enters, grows to reading size showing name, icon and full message (one page, the 18 px floor applies), holds for the reading time, then explodes... three cards on screen at a time").
Why it fails: The plan does not specify what "the reading time" is for Scene 7: Decision 4 was explicitly ruled for Peacemakers puzzle pieces (3 s plus 1 s per 40 characters), whereas the renderer default is Math.max(9, len / 14) and settings has readingSeconds (20 s). Furthermore, heart shapes taper sharply at the bottom, making a 500-character message at an 18 px font floor impossible to fit without text clipping unless exact dimensions and padding rules are specified.
What would fix it: Explicitly state whether Scene 7 uses Decision 4 timing or standard reading timing, and define the bounding box and padding boundaries for `.heart-card`.

### O9 [should-fix] Status 3D coin flip contradicts card label layout
Section: Section 5 (Status, renderer id 6)
Evidence: Plan 15 line 204 ("Each medallion becomes a 3D coin (preserve-3d, two faces) that flips on a staggered cadence between the icon face and the phrase face; the phrase becomes the primary label, the expression name a small eyebrow... Acceptance: all nine phrases present in the DOM; at 6 s and 14 s at least three medallions differ in flip state").
Why it fails: In public/color-polish/core/state.js, medallions are compact circular badges (roughly 50 px). Catalog phrases are up to 60 characters long (for example: "I'll pray (or root) for you. Everything will go well."). Rendering a full phrase inside the reverse face of a 50 px coin makes the text completely unreadable on a TV, while simultaneously making "the phrase the primary label" in the card text redundant and conflicting.
What would fix it: Clarify Anthony's intent: does the 3D coin flip show only the expression number or icon on the reverse face while the card text displays the phrase, or what exact text is rendered on the coin face?

### O10 [should-fix] Circularity exemption lookup in helpers.ts lacks scene slug resolution
Section: Section A and helpers.ts
Evidence: Plan 15 line 98 ("CIRCULARITY_EXEMPT = { peacemakers: ['.puzzle-card'], 'peace-in-practice': ['.heart-card'] } consumed by circularity(frame)"), compared with tests/color-polish-scenes/helpers.ts:338 (`export async function circularity(frame: Frame): Promise<CircularityResult>`).
Why it fails: The circularity helper in helpers.ts accepts only a Playwright Frame, with no slug parameter. The active scene element in the DOM has `data-scene="8"` or `data-scene="9"`, which are numeric IDs, not the string keys ('peacemakers', 'peace-in-practice') used in CIRCULARITY_EXEMPT. Without an explicit ID to slug mapping inside circularity(), the exemption table will never match and will fail on puzzle pieces and heart cards.
What would fix it: Define CIRCULARITY_EXEMPT using numeric scene IDs (`{ 8: ['.puzzle-card'], 9: ['.heart-card'] }`) or have circularity() map `document.querySelector('#stage .scene')?.dataset.scene` to its slug via a shared dictionary.

### O11 [should-fix] Unverified 4K frame budget on embedded TV hardware
Section: Section B, Section 4, and Section 7
Evidence: Plan 15 line 124 ("Frame time sampled during a transition at 3840 stays under 40 ms per frame on the runner"), line 192, line 231, line 298.
Why it fails: Testing 3840x2160 frame times exclusively on Anthony's Mac in headless Chromium provides zero signal for physical TV hardware. Smart TVs use low-power ARM GPUs with limited memory bandwidth that struggle with large DOM trees, 3D CSS compositing (`preserve-3d`), canvas rasterization, and 40 simultaneous animated DOM elements.
What would fix it: Cap transition bubbles at 24 by default (rather than 40) and define a reduced-complexity fallback mode for 3D puzzle and heart meshes when running on TV display devices.

### O12 [note] Scope creep on Peacemakers scene with unrequested speech bubbles
Section: Section 4 (We Are Peacemakers)
Evidence: Plan 15 line 191 ("Speech bubbles from the figures on or around the world art through speakers (anchors in the gap report)"), line 297 ("The globe art (globe.png) carries figures or a rim from which speech bubbles can rise... if it carries no figures the bubbles rise from three points on the world's rim").
Why it fails: Anthony's brief asked for speech bubbles from people in the art (which exists in Welcome's community.png, not globe.png). Globe.png has no people. Adding floating speech bubbles with general catalog phrases around a rotating globe of puzzle pieces carrying full personal recognitions adds visual confusion and clutters the scene.
What would fix it: Restrict speech bubbles to Welcome (Section 1) where human figures actually exist, and remove speech bubbles from Peacemakers.

### O13 [note] Scope creep on Milestone stream pool destroys milestone contributor semantics
Section: Section 9 (Milestone and Weekly Goal)
Evidence: Plan 15 line 256 ("The stream draws from the whole eligible pool through chooseRandom (the contributor floor of 14 becomes the whole pool), so all recognitions can appear, not only recent or goal-related ones").
Why it fails: Decision 10 only delegated phrase bubble selection when a record contains multiple expressions. Replacing the contributor pool logic (which explicitly displays milestone contributors and goal-matching recognitions) with an unweighted random draw breaks the narrative function of the Milestone scene.
What would fix it: Preserve the milestone contributor pool in contributorPool(), applying chooseRandom only for filling supplemental stream nodes once milestone contributors have been placed.

### O14 [note] Emergency rollback leaves codex/color-polish-v6 development branch desynchronized
Section: Rollback
Evidence: Plan 15 line 267 ("merge into codex/color-polish-v6 and codex/mothers-love"), line 273 ("If the TV shows a rendering fault after promotion: git revert -m 1 <merge commit> on codex/mothers-love and push").
Why it fails: If an emergency rollback reverts only the production branch codex/mothers-love, codex/color-polish-v6 remains at the broken merge commit. Any future lane or release cut from codex/color-polish-v6 will reintroduce the reverted defect.
What would fix it: Specify that an emergency promotion revert must be applied to both codex/mothers-love and codex/color-polish-v6.

## What I checked

I read every file using direct file reads without executing shell commands:
- [docs/PLAN-15-tv-next-level.md](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/docs/PLAN-15-tv-next-level.md): examined all sections including Context, Decisions 1 through 14, Inputs, Models/Lanes/Reviews, Branch and merge model, Lane 0, Section A, Section B, Section C, Sections 1 through 9, Section Z, Rollback, Common scene spec, Gap reports, Order of work, Assumptions, and Build log.
- [docs/runs/2026-09-12-tv-next-level/INDEX.md](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/docs/runs/2026-09-12-tv-next-level/INDEX.md): examined run layout, branch definitions, and planned lane states.
- [docs/runs/2026-09-12-tv-next-level/decisions/2026-09-11T22-00Z-anthony-plan15-forks.md](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/docs/runs/2026-09-12-tv-next-level/decisions/2026-09-11T22-00Z-anthony-plan15-forks.md): verified Anthony's 7 explicit fork rulings, coordinator selection, and delegated decisions 8 through 14.
- [docs/runs/2026-09-11-tv-scenes/INDEX.md](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/docs/runs/2026-09-11-tv-scenes/INDEX.md): examined Plan 13 run history and verified that cited brief and follow-up files are absent.
- [scripts/color-polish-renderer-probe.mjs](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/scripts/color-polish-renderer-probe.mjs): verified replayKey stepping logic, requestAnimationFrame stubbing, lack of transition triggering, and arrival assertion structure.
- [public/color-polish/renderer.html](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/renderer.html): verified DOM layout, script ordering, and transition layer placement.
- [public/color-polish/boot.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/boot.js): verified colorPolishRuntime interface, reduced-motion listeners, and setScene behavior.
- [public/color-polish/core/state.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/core/state.js): verified blankState, choose(), S.lastShown, catalog constants, and number formatting.
- [public/color-polish/core/stage.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/core/stage.js): verified registerScene, renderNow, requestScene, coordinator loop, transition execution, and onLeave hook call sites.
- [public/color-polish/core/motion.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/core/motion.js): verified swapSlot, floater physics, and particle emitters.
- [public/color-polish/core/orbs.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/core/orbs.js): verified addOrb, fitCircle, circular pagination, and readerSlot collapse logic.
- [public/color-polish/core/arrivals.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/core/arrivals.js): verified arrival event pipeline, hold durations, and style definitions.
- [public/color-polish/core/host.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/core/host.js): verified applySnapshotPayload, replayed branch calling renderNow, and message validation.
- [public/color-polish/scenes/welcome.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/scenes/welcome.js): verified six-bubble layout, depth layers, and speaker anchor requirements.
- [public/color-polish/scenes/garden.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/scenes/garden.js): verified garden replacement timing and direct harness usage.
- [public/color-polish/scenes/featured.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/scenes/featured.js): verified 3D panel structure, flip timers, and DOM isolation.
- [public/color-polish/scenes/peacemakers.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/scenes/peacemakers.js): verified globe rendering, thread animation, and baseline bubble slots.
- [public/color-polish/scenes/status.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/scenes/status.js): verified medallion sizing, phrase placement, and monthly metrics.
- [public/color-polish/scenes/expressions.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/scenes/expressions.js): verified 9-card perspective arc and bloom mechanics.
- [public/color-polish/scenes/peace-in-practice.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/scenes/peace-in-practice.js): verified 3D canvas heart mesh vertices, quad counts, and floating heart accumulation.
- [public/color-polish/scenes/orbit.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/scenes/orbit.js): verified 3D center medallion requirements and planetary orbits.
- [public/color-polish/scenes/milestone.js](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/scenes/milestone.js): verified contributorPool logic, weekly goal expression display, and stream pearls.
- [public/color-polish/assets/](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/public/color-polish/assets/): checked directory contents to verify presence of community.png, globe.png, puzzle.png, and missing globe-puzzle.png.
- [tests/color-polish-scenes/helpers.ts](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/tests/color-polish-scenes/helpers.ts): checked circularity, noOverflow, SCENE_IDS, and openStudioScene.
- [tests/color-polish-scenes/arrival.spec.ts](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/tests/color-polish-scenes/arrival.spec.ts): inspected direct renderer harness setup.
- [tests/color-polish-scenes/garden.spec.ts](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/tests/color-polish-scenes/garden.spec.ts): inspected living garden assertions and direct harness.
- [tests/color-polish-scenes/peacemakers.spec.ts](file:///Users/anthony/.claude/worktrees/mothers-love-tv-critic/tests/color-polish-scenes/peacemakers.spec.ts): inspected 14 s timing checks, overflow rules, and actor lifecycle assertions.
