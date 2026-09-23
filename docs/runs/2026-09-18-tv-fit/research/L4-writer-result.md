# Plan 17 Lane 4 result: today's fade for every scene change

## Files changed (absolute paths)
- /Users/anthony/.claude/worktrees/mothers-love-tv17-transitions/public/color-polish/core/transitions.js
- /Users/anthony/.claude/worktrees/mothers-love-tv17-transitions/public/color-polish/core/transitions.css
- /Users/anthony/.claude/worktrees/mothers-love-tv17-transitions/public/color-polish/core/stage.js
- /Users/anthony/.claude/worktrees/mothers-love-tv17-transitions/tests/color-polish-scenes/transitions.spec.ts

## What changed
`core/transitions.js` no longer registers the four Plan 15 styles (flood, tide, vortex, storm), no longer
shuffles a style bag, and no longer exposes a per-style descriptor. It now exports one crossfade
(`TRANSITION_DURATION = 1.15`, `transitionStart`, `transitionCleanup`, `transitionFrame`), where
`transitionFrame` is copied to match the live production renderer's `tickTransition` formula exactly
(`.tv17/prod/renderer.js`): `p = ease(age/duration)`; old scene `opacity 1-p`, `translateX(-15p) scale(1-.004p)`;
next scene `opacity p`, `translateX(20(1-p)) scale(.997+.003p)`.

`core/stage.js`'s `requestScene` no longer calls `transitionNextStyle()` or passes a style into
`transitionStart`; it now calls `transitionStart(old, prev, el)` directly, mirroring production's
`requestScene`. `tickTransition` no longer runs a three-phase cover/swap/reveal machine; it advances
`transition.age`, calls the new `transitionFrame`, and finishes (removes the old scene, clears inline
styles, calls `transitionCleanup()`, logs `scene_transition_end`, and resumes any `S.pendingScene`) when
`p >= 1`, matching production's single-phase finish exactly. `renderNow`'s interrupted-transition branch
was simplified to match (dropped the now-unnecessary `onLeaveFired` flag, since with a single-phase
transition `onLeave` for the departing scene only ever needs to fire once, at whichever point the
transition is either discarded by `renderNow` or completes naturally in `tickTransition`). `runtimeState()`
now reports `transition: {age, duration}` instead of `{age, style, phase, duration}` (the `style`/`phase`
fields no longer exist).

The `onLeave` scene-lifecycle hook (used by welcome, featured, orbit, milestone, peace-in-practice, status,
peacemakers, expressions) still fires exactly once whenever a scene actually leaves, in every mode (still
and animated), same as before this lane's changes — this is unrelated to which of the four styles played
and was preserved per the order's "keep every interface other core files and scenes call ... working."

`core/transitions.css` keeps the same `#transition-layer` still-mode guard; only its header comment was
updated, since the layer was already empty in every code path (none of the four stub styles ever wrote
visible children into it, so there were no style-specific CSS rules to delete).

`tests/color-polish-scenes/transitions.spec.ts` was rewritten to check the new behavior directly:
- All ten playlist scene changes: at transition start, mid-flight (400 ms in), and after completion, asserts
  no element or class matching flood/tide/vortex/storm exists (a new `retiredStyleArtifactCount` helper),
  plus the existing one-scene/no-transition/empty-layer checks.
- The crossfade formula is now sampled at three cumulative points through the 1.15 s duration (200 ms,
  575 ms, 950 ms of transition age) and checked against an in-test reimplementation of production's exact
  `ease`/opacity/transform formula, not just a single midpoint.
- Old scene removal at the end, still-mode instant swap with no transition, and a click during a transition
  not double-advancing (queues the requested scene instead) are all still covered, renamed for clarity.
- The onLeave-hook and held-arrivals-during-transition tests are unchanged in intent, still passing against
  the simplified implementation.

## Review round 1 fixes (this round)
The coordinator's round-1 review found two minor test gaps in `transitions.spec.ts`, both now fixed and
re-verified (transitions.spec.ts and tsc only, per the coordinator's instruction; full scene folder not
re-run this round):

1. **Click-during-transition test never reached the guard it claims to test.** `loadRenderer`'s bootstrap
   sends `control.source: 'sample'` (`tests/color-polish-scenes/helpers.ts` around line 579), and
   `manualAdvance` (`core/stage.js` around line 76) returns immediately whenever `S.source !== 'live'`,
   before it ever reaches the `active||transition` guard the test exists to check. So the original test
   would have passed even if that guard were deleted. Fixed by sending a second
   `color-polish:update` control message with `source: 'live'` (same snapshot, which already carries a
   ten-scene playlist from `buildActiveDisplayFixture()`) right after load, then re-running the
   mid-transition click check for real: it now asserts exactly one `scene_transition_start`, zero
   `manual_advance` log entries, and `state.scene` still 2 (the in-flight target, unaffected by the click).
   Added the counter-check the coordinator asked for: after the fade finishes and a real
   `page.waitForTimeout(750)` clears the wall-clock 700 ms manual-advance debounce (`lastManualAdvanceAt`
   is keyed off `performance.now()`, not the simulated clock the tests step with `colorPolishRuntime.step`),
   a click does advance — one `manual_advance` log entry, playlist scene 4 to 5 (the featured to calendar
   step in the fixture's playlist order).
2. **`retiredStyleArtifactCount` used substring class matching across the whole document**
   (`[class*="storm"]` etc.), which would false-fail on an unrelated class such as "brainstorm" from
   another lane's work anywhere in the app, not just a real leftover transition-style element. Replaced
   with `RETIRED_STYLE_SELECTOR = '.flood, .tide, .vortex, .storm, [data-transition-style]'` (a real CSS
   class selector already matches whole class-list tokens, not substrings) and scoped the search to only
   the two places a retired style could ever have left a trace: the `#transition-layer` subtree (which by
   design only ever holds transition-related content, so a full subtree search there is safe), and the
   `#stage > .scene` roots' own class list and data attributes via `.matches(selector)` (not their
   descendants, which may legitimately carry unrelated classes from other features).

## Verification
- Round 1 (initial implementation): `bash .tv17/verify.sh tests/color-polish-scenes/transitions.spec.ts` —
  7/7 passed. `npx tsc --noEmit` — clean. `npx vitest run` — 39 files, 222 tests, all passed.
- Round 2 (this round, after the coordinator's two fixes): `npm_config_cache=/tmp/npm-cache npx tsc
  --noEmit` — clean, no output. `bash .tv17/verify.sh tests/color-polish-scenes/transitions.spec.ts` —
  7/7 passed. Per the coordinator's instruction, only transitions.spec.ts and tsc were re-run this round;
  vitest and the full scene folder were not re-run (unchanged since round 1, and this round only touched
  the test file).
- Round 1's full-folder run: `bash .tv17/verify.sh` (full `tests/color-polish-scenes` folder, 145 tests)
  — 78 passed, 67 failed.
  All 7 transitions.spec.ts tests are among the 78 passed. The 67 failures are entirely outside this
  lane's allowlist and fall into two clusters unrelated to scene-change transitions:
  - Studio sign-in timeouts (`helpers.ts:131 signInAs`, expects `/admin` after login, gets stuck on
    `/admin/login`) — affects any spec that opens the Studio (calendar, expressions, featured, garden,
    milestone, orbit, peace-in-practice, peacemakers, status, welcome), an auth/environment path this
    lane never touched.
  - Scene-specific rendering/motion assertions (circular bubbles, medallion motion vocabularies, orbit
    depth blur, speech-bubble counts, etc.) in files this lane never touched (arrivals.js, garden.js,
    welcome.js, orbit.js, status.js, and friends).
  I did not check these out against `tv17/base` directly — the order's hard rules forbid `git checkout`/
  `stash`/`reset`/`worktree` in this worktree, and I have no second worktree to compare against — so I
  cannot certify they were already failing on the base commit. But every failing file and every failure
  cause is outside this lane's allowlist and outside anything `transitions.js`/`transitions.css`/`stage.js`'s
  transition code touches; the transitions suite itself is 100% green both standalone and inside the full
  run. Anthony should treat the Studio sign-in timeout in particular as worth checking independently
  (it looks like a local dev-server auth/credential setup issue, not a Plan 17 regression).

## Not run / limitations
- Did not run the full spec folder against `tv17/base` for a side-by-side comparison (forbidden by the
  hard rules against checkout/stash/reset/worktree in this workspace).
- Physical-TV/phone commissioning is out of scope for this lane per the project's standing rules.

## Dev server
Stopped the `next dev` process on port 3174 after round 1's verification, and again after round 2's
verification (the coordinator's fix pass started its own dev server via `.tv17/verify.sh`).

No question for Anthony — the order's decision (keep today's live fade for every scene, remove all four
Plan 15 styles) was unambiguous and fully implemented. The coordinator's round-1 review found no
blocking or major issues; both requested minor test-gap fixes are complete and verified above.
