# Gap report: Section C, remarkable arrivals (tv15/arrivals)

Written by the coordinator (Opus 5 high) on 2026-09-11 from tv/pick 463ce8d, before the lane launches. Section C of $HOME/Projects/mothers-love/docs/PLAN-15-tv-next-level.md.

## Anthony's note (quoted)

"More dramatic and high quality new recognition entrances can be created. Since the new recognitions won't always be featured, their entrances need to be so dramatic and eye catching and the architecture so advanced that people couldn't help but stop and look saying wow. The design should be remarkable."

## What tv/pick 463ce8d does

- public/color-polish/scenes/arrival.js line 4: `SINGLE_STYLES`, six names. Line 5: `GROUP_STYLES`, five names. Line 6: `GROUP_TITLES`, five. `singleTrajectory` (line 12) and `groupTrajectory` (line 35) are pure functions of style and progress, returning x, y, z, k, alpha. Both already use a 1300 or 1100 perspective divisor, so depth exists but as a projected scale, never as a CSS 3D rotation.
- public/color-polish/core/arrivals.js line 13: `beginEvent` sets `entrance` 3.6 s single, 4.7 s group, `exit` 1.35 s, `hold` at least 8 s single and 30 s group, then line 30 raises `hold` to the measured reading time. Line 11 adds `dimmed` to `#stage`.
- renderer.css defines exactly one dim rule: `.dimmed{filter:blur(2px);opacity:.23}`. There is no brightness component today.
- `buildEvent` (line 18) writes the whole `#event` subtree in one `innerHTML`: `.event-world`, the single or group copy, `<canvas class="event-sparkles" id="event-canvas" width="1812" height="615">`, and `#event-items`. `eventElement` (line 116) appends one `.event-orb` per record at d 540 single, 258 group, and `positionEvent` (line 122) writes only `translate(...) scale(...)`, opacity and zIndex, never a rotation.
- `nextStyle(kind)` (line 103) is the seeded shuffle bag, keyed on `S.singleBag` and `S.groupBag` in `blankState()`, with a no-immediate-repeat swap at line 110.
- `drawEventParticles` (line 71) draws rings, ribbons and 115 or 155 sparks per frame on the 1812 by 615 canvas.
- The feed rail is `#feed-columns` in renderer.html, written by core/chrome.js (protected in this lane).
- The oversize group path: `active.oversize` is true when a wave of ten holds any record failing `smallFits`; `buildGroupPage` then shows the ten in five pages of two at d 518, re-entering with a 1.5 s entrance per page.

## Gaps and decisions

### G1. Where the frame bag lives. `blankState()` is in core/state.js, which Section A owns and Section C must not touch.
**Decision.** `FRAME_STYLES` and its bag live entirely in scenes/arrival.js, this lane's own file: `const ARRIVAL_FRAME_STYLES=['Light beam','Petal curtain','Aurora','Constellation gather']` plus module-level `let ARRIVAL_FRAME_BAG=[]` and `let ARRIVAL_FRAME_LAST=null`, and a local `nextArrivalFrame()` that mirrors `nextStyle`'s shuffle-and-swap logic seeded from `randSeed(2311+S.idCounter*53)`. Nothing is added to `blankState()`, nothing in core/state.js changes, and the path bag keeps using `nextStyle` untouched. Frame and path are therefore chosen independently, as the plan requires.
**Why the names are fixed here.** Section B adds the probe's frame-count assertion on tv15/base and needs the four names before Section C lands. These four strings are frozen by this report; Section C must use them verbatim and Section B may assert them.

### G2. Near-black dim without touching renderer.css or #stage.
The plan asks for "stage dim deepens from today's `.dimmed` to near-black with the blur kept", but renderer.css is protected in every lane and the cross-cutting rule scopes this lane's CSS to `#tv .event-stage`.
**Decision.** Do not modify `.dimmed` and do not add a rule targeting `#stage`. Add a full-bleed backdrop as `#tv .event-stage.active::before`, `position:absolute;inset:0;background:rgba(14,18,17,.9);z-index:0`, with the frame layers and `#event-items` above it. `#stage` keeps its existing `.dimmed` blur and opacity .23 underneath. Under `S.still` the backdrop is present but every animation on it is omitted.

### G3. The acceptance line "stage brightness under the frame is measured below 12 percent luminance" is not measurable as written.
**Decision.** Replace it with two deterministic computed-style assertions at the hold midpoint: `#stage` still carries `.dimmed` (computed `opacity` at or below 0.23 and a `blur(` in its computed `filter`), and the `::before` backdrop's computed `background-color` alpha is at or above 0.88. Together those bound the visible stage contribution below 12 percent without a pixel sample. Write both into arrival.spec.ts.

### G4. "The bubble flies toward the feed rail slot before #event-items empties" would otherwise reach into protected code.
**Decision.** The flight is visual only and reads the rail's geometry, never its logic: on exit, read `document.getElementById('feed-columns').getBoundingClientRect()` (or its first child's rect when one exists), convert to the event stage's coordinate space, and animate the exiting `.event-orb` there with the existing `positionEvent` transform vocabulary (translate, scale, opacity). Call no function in core/chrome.js, change nothing about `renderQueue`, and if `#feed-columns` is missing or zero-sized, fall back to today's exit vector so the exit never breaks.

### G5. The ring behind the bubble, and the no-3D-on-bubbles rule.
**Decision.** The spinning 3D ring is a sibling element, `.arrival-ring`, inserted into `#event-items` immediately before each `.event-orb` and positioned by the same transform the bubble gets, minus the scale. The ring carries `transform-style:preserve-3d` and its own `rotateY`/`rotateX` animation. `.event-orb` itself and every ancestor of it keep translate and scale only. arrival.spec.ts asserts the ring's computed transform contains a rotate and the orb's does not.

### G6. The oversize group path and the frame.
**Decision.** One frame per event, chosen in `buildEvent`, mounted once, and kept across all five `buildGroupPage` pages. The per-page 1.5 s entrance re-runs only the bubble assembly, never the frame open. Group arrivals use one frame for the whole wave of ten, as the plan states.

### G7. The particle assembly and the frame both draw. Frame budget at 3840.
**Decision.** The frame's own motion is CSS transforms and opacity on at most 40 elements per frame style (beams, petals, stars). It never draws on `#event-canvas`; `drawEventParticles` keeps its existing 115 and 155 counts unchanged. If the coordinator measures a frame over 40 ms at 3840, the documented first lever is halving the frame's element count, a one-value change.

### G7b. Arrivals must count what they show (Lane 0 objection O7).
Section A's `markShown(id)` is called only from `addOrb`. Arrivals build their bubbles through `eventElement` in core/arrivals.js, which this lane owns, so an arrival's records would never be counted and `chooseRandom` would keep favouring them everywhere else.
**Decision.** Call `markShown(r.id)` in `eventElement`, once per record per event, beside the existing `bindNumbers(el)`. Acceptance: after one single arrival and one group arrival, `getState()`'s shown counts include all eleven records exactly once each.

### G8. Exit burst.
**Decision.** The exit burst of petals and hearts reuses `heartSVG` from core/state.js (read-only use, no edit) and the petal ellipse drawing already in `drawEventParticles`; it is added as short-lived DOM elements in `#event-items`, cleared by the existing `$('event-items').replaceChildren()` calls, so no new timer survives the event. No `setTimeout` or `setInterval` in this lane that is not cancelled.

## Testable acceptance (replaces the plan's Section C acceptance line where they differ)

1. The probe with `--arrivals` lists 6 single and 5 group path styles, unchanged from today, and the 11-wave sequence completes with no page error. The four frame styles are asserted in arrival.spec.ts, not the probe (see G1).
2. arrival.spec.ts through `loadRenderer` captures one screenshot per frame style at the assembly midpoint and one per path style at the entrance midpoint into docs/runs/2026-09-12-tv-next-level/logs/arrival/.
3. `circularity` holds on `.event-orb` at the entrance midpoint, the hold midpoint and the exit midpoint.
4. `.arrival-ring`'s computed transform contains a rotate; no `.event-orb` and no ancestor of one does.
5. Reduced motion: the bubble is visible within one frame, no assembly, no burst, and the backdrop is present but static.
6. G3's two computed-style assertions hold at the hold midpoint.
7. Over four consecutive single arrivals, four different frame names are logged with no immediate repeat; frame and path vary independently (a logged pair of frame and path differs in at least one component every time).
8. `markShown` is called once per record per event (G7b).
9. The feed rail and `S.returnScene` behavior are unchanged: after the last arrival, `endChain` returns to the scene it left, and `#feed-columns`' content is what it was before the event.

## Risk

- The near-black backdrop plus the existing `.dimmed` could make the stage effectively invisible, which is the intent, but a scene whose own art is bright (peacemakers, welcome) may show a hard edge at the backdrop boundary. The backdrop is `inset:0` on `.event-stage`, which spans the full 1812 by 636, so no edge should appear; the spec's screenshots are the check.
- Reading `#feed-columns`' rect during exit is a layout read once per exit, not per frame. Doing it per frame would cost a forced reflow at 3840; the order must say once.
- Four frame styles times eleven path styles is 44 combinations and the spec cannot screenshot all of them. Coverage is four frames plus eleven paths, not the product.
