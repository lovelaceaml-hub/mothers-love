---
lane: transitions
title: Theatrical transitions on tv15/base
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-base
review: sonnet-5 on landing
depends_on: base
updated: 2026-09-12T03:35Z
---

## Work order

Implement Section B (theatrical transitions) on tv15/base for Plan 15. Replace the 1.15 second crossfade with a transition registry and a three-phase machine (cover about 0.9 seconds, one-frame swap firing onLeave and switching roots, and reveal about 1.6 seconds, total 2.5 seconds) running four styles: flood, tide, vortex, and storm. Populate a dedicated `#transition-layer` with exactly 24 decorative elements carrying expression icons and catalog colors with zero text nodes, animated exclusively via CSS transforms and opacity. Select styles using a seeded shuffle bag with no immediate consecutive repeats, preserve onLeave error handling across all three departure sites, hide the countdown ring during transitions, and respect still mode under reduced motion.

## Result

### Round 2 test corrections
Two tests previously failed because they attempted to access renderer internals on `window`: test 6 read `window.S.pool` and pushed to `window.S.queue`, while test 8 read `window.SCENES[1]`, `window.SCENES[2]`, and `window.SCENES[4]`. Neither property exists on `window` because `S` is declared with `let` in `core/state.js` and `SCENES` is declared with `const` in `core/stage.js`, which places them in a shared top-level script scope rather than as properties on the global object. Test 6 was corrected to queue arrivals through the public snapshot update path over `probePort` using `buildActiveDisplayFixture`, observing queue state via `colorPolishRuntime.getState().queueLength`. Test 8 was corrected to mutate and restore descriptors via `window.sceneDescriptor(id)` and control stillness via `colorPolishRuntime.setPlaying(false)`, cleaning up modified hooks in finally blocks.

### New functions in public/color-polish/core/transitions.js
- `registerTransition(id, descriptor)`: registers a transition style descriptor containing `coverDuration` (0.9s), `revealDuration` (1.6s), total `duration` (2.5s), `init`, `cover`, `swap`, and `reveal` callbacks.
- `transitionRegister`: aliased export pointing to `registerTransition`.
- `transitionDescriptor(id)`: returns descriptor for specified style id, defaulting to `flood`.
- `transitionNextStyle()`: draws from a seeded shuffle bag (`TRANSITION_BAG`) without consecutive repeats, seeded from `randSeed(4801 + (S.idCounter || 0) * 59)`.
- `transitionCreateBubbles(layer)`: creates exactly 24 round bubble elements with expression icons (1 to 9) and catalog colors, containing zero text nodes.
- `transitionCreateStormElements(layer)`: creates exactly 24 elements alternating between 12 hearts (`heartSVG`) and 12 petals, carrying expression icons and colors, containing zero text nodes.
- `transitionCleanup()`: empties all children from `#transition-layer` and removes `.active` class.
- `transitionStart(styleId, oldRoot, prevSceneId, nextRoot)`: activates `#transition-layer`, populates 24 decorative elements, primes initial frame, and returns active transition state.

### Changed call sites with absolute paths and line numbers
- `/Users/anthony/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/stage.js:17` (`renderNow`): calls `transitionCleanup()` to ensure `#transition-layer` is immediately cleared and deactivated whenever `renderNow` resets the stage.
- `/Users/anthony/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/stage.js:46-57` (`requestScene`): on `S.still` path, logs `scene_transition_start` with `style: 'instant'`, fires `onLeave` before old root removal, and returns without starting a transition. On animated path, draws next style via `transitionNextStyle()`, logs `scene_transition_start` with `{from: prev, to: id, style}`, hides new root, and initializes `transition = transitionStart(style, old, prev, el)`.
- `/Users/anthony/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/stage.js:78-120` (`tickTransition`): drives three-phase machine:
  - Phase 1 `cover` (0 to 0.9s): evaluates `desc.cover(transition, p)` on the 24 elements.
  - Phase 2 `swap` (at 0.9s): fires outgoing scene `onLeave` guarded with `try / catch` logging `scene_onleave_error`, removes old root from `#stage`, reveals new root (`style.opacity = ''`), calls `desc.swap(transition)`, and enters `reveal` phase.
  - Phase 3 `reveal` (0.9s to 2.5s): evaluates `desc.reveal(transition, p)`.
  - At 2.5s: calls `transitionCleanup()`, clears `transition = null`, logs `scene_transition_end` with `{scene: S.s, style: finishedStyle}`, and dequeues any `S.pendingScene`.
- `/Users/anthony/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/stage.js:165` (`runtimeState`): exposes `transition: transition ? {age: transition.age, style: transition.style, phase: transition.phase, duration: transition.duration} : null`.
- `/Users/anthony/.claude/worktrees/mothers-love-tv-base/public/color-polish/renderer.html:10`: added `<link rel="stylesheet" href="/color-polish/core/transitions.css">`.
- `/Users/anthony/.claude/worktrees/mothers-love-tv-base/public/color-polish/renderer.html:46`: added `<div class="transition-layer" id="transition-layer" aria-hidden="true"></div>` between `#event` and `#scene-countdown`.
- `/Users/anthony/.claude/worktrees/mothers-love-tv-base/public/color-polish/renderer.html:74`: added `<script src="/color-polish/core/transitions.js" defer></script>`.

### Exact bag seed
`randSeed(4801 + (S.idCounter || 0) * 59)`

### Four style ids
`flood`, `tide`, `vortex`, `storm`

### Confirmation of core/chrome.js
Confirmed that `public/color-polish/core/chrome.js` line 32 already ends with `||!!active||!!transition`. Because `transition` is a truthy object during any transition, `sceneCountdownHidden()` returns `true` for the entire transition duration, and `updateSceneCountdown()` keeps `#scene-countdown` hidden. Therefore `core/chrome.js` required no change.

### Verification and unexecuted items
Per Hard Rule 8 and Lane 0 Disposition O3, dev server, Playwright, and renderer probe were not executed in this headless container. All 9 acceptance criteria are implemented in `tests/color-polish-scenes/transitions.spec.ts` for coordinator execution. Code passed `npm run typecheck`, `npm test`, `npm run lint` (18 baseline problems, 0 new), and `node scripts/color-polish-globals-check.mjs` (21 files, 196 declarations, 0 duplicates).

## Review
