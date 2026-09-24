# Work order - orbit correction r2: a random expression every pass - Mother's Love TV (Plan 13)

Dispatch ID: agy-orbit-20260911-r2
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-orbit
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 10 (data-scene="10"). Round: r2.

Anthony reviewed the scene on his TV and asked: "In the Expression Orbit section, it only keeps showing the greeting expression, but it needs to rotate randomly through each different expression for each pass it goes through." Root cause: orbitScene() and the backside swap in tickOrbit read `S.featured`, which core sets from the weekly goal expression (Greeting this week). The scene must keep its own random choice per pass and never read S.featured.

Read first, inside your worktree: public/color-polish/scenes/orbit.js and orbit.css (yours), public/color-polish/core/state.js (read only: catalog, choose, medallion, shimmer, icon), public/color-polish/core/orbs.js (read only: addOrb and the slot fields, including `expression`), tests/color-polish-scenes/orbit.spec.ts and helpers.ts.

## Hard rules (every lane)
1. Read and write only inside your worktree, and edit only the files in the allowlist at the end. Run no shell commands: the coordinator runs typecheck, lint, build, the scene spec and the probe. Never write the em dash or the en dash anywhere (code, comments, text, record); use a comma, colon or a second sentence.
2. Shared global scope: every scene file loads as a classic script sharing one global lexical scope with every other scene file and with core/*. Any top-level `const` or `let` you add must carry your scene prefix (for example `FEATURED_BAG`, `ORBIT_BAG`, `CALENDAR_FX`). Any new top-level function gets a name that starts with your scene slug. Do not wrap an existing unwrapped file in an IIFE.
3. Scene CSS: every rule in your scene .css file is scoped to `#tv .scene[data-scene="N"]` (your renderer id, given below) and still-mode overrides to `#tv.still .scene[data-scene="N"]`. Keyframe names carry your scene slug. Colors stay exactly as shipped: reuse the palette already present in renderer.css and the catalog tints (`var(--tint)`), add no new hue, add no white overlay panels.
4. Circular bubbles at all times: `.orb-slot`, `.orb` and `.event-orb` must keep a square bounding box (getBoundingClientRect width equals height within 1 px) with border-radius 50 percent. Therefore never apply rotateX, rotateY, skew or perspective to a bubble element or any of its ancestors inside the scene. A Z rotation (`rotate(...)`) is allowed anywhere because a rotated square keeps a square bounding box. Bubbles stay inside the stage (0..1812 by 0..636) and outside the scene keepOut box.
5. Reduced motion: when `S.still` is true (or `#tv.still` is set) nothing animates: no CSS animation runs, canvases draw one static frame, and no runtime error occurs. Respect `prefers-reduced-motion: reduce` in CSS.
6. Untouched: header, feed rail, QR, durations, playlist order, click advance (live only), safe states, core/*, renderer.css, renderer.html, contracts, sample data, other scenes. The Studio sample preview at /admin/display must keep rendering your scene from the sample data with no click advance.
7. Performance: the renderer runs on a television. Keep per-frame work bounded (cap particles, reuse arrays, no per-frame DOM creation, no per-frame querySelector loops beyond a few elements). Prefer transforms and opacity for CSS animation.
8. Tests: update your scene spec in tests/color-polish-scenes/<slug>.spec.ts so every existing test still holds or is adjusted to the new behavior, and add the tests named in "Acceptance" below. Specs use the helpers in tests/color-polish-scenes/helpers.ts (openStudioScene, circularity, noOverflow, studioClickDoesNotAdvance, reducedMotionScene). Each openStudioScene call opens a fresh page, so state never carries between calls. Multi-second timelines through the Studio are unreliable (the host re-sends snapshots and remounts); keep Studio checkpoints short and independent.
9. Record: append one line beginning "Round rN:" (your round number) to the "## Result" section of your lane record file, naming what changed. End your reply with `## COMPLETION` listing every file changed and every top-level identifier you added.

## The change
1. Add top-level `let ORBIT_BAG = []` and `let ORBIT_LAST = 0`, and `orbitNextId()`: refill the bag with a shuffled copy of ids 1 to 9 when empty (Fisher-Yates with Math.random); if the first draw of a fresh bag equals ORBIT_LAST, move it to the end of the bag; record ORBIT_LAST and return the id. orbitScene() calls orbitNextId() once per markup and stores the id on `V.orbitId`; the sun, its medallion, name, phrase and principle use that id. Never read S.featured anywhere in this file.
2. Planets follow the expression with a fallback: choose up to four records carrying the id with `choose(exclude, id)`; when fewer than four exist, fill with `choose(exclude)` (any record) and pass `expression: null` for those slots. Show the "No current recognitions" line only when the pool is empty.
3. Backside swap: replace `choose(slots.map(x=>x.id),S.featured)` with `choose(slots.map(x=>x.id), b.expression) || choose(slots.map(x=>x.id))` so a planet whose expression has no more records still swaps to some record instead of freezing.
4. Everything else stays as shipped: orbit rate 0.082, depth cues, moons, the sun styling. Do not touch orbit.css beyond its header comment unless a rule is required by the change.

## Acceptance (update orbit.spec.ts, keep the existing tests passing)
- Existing tests keep passing (circularity, no overflow, Studio click, z signs, sun crossing, rate window, blur and shadow, reduced motion).
- New: across six fresh opens at 300 ms, the `.orbit-sun h2` text shows at least two distinct catalog names.
- New: at 300 ms the sun name matches a catalog entry and every `.planet-system` contains one `.orb-slot`.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.js
/Users/anthony/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.css
/Users/anthony/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/orbit.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-orbit/docs/runs/2026-09-11-tv-scenes/lanes/orbit.md
```
