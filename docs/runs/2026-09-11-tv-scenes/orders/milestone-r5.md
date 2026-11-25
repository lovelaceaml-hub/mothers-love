# Work order - milestone correction r5: drop the left copy, widen the campaign and goal rail - Mother's Love TV (Plan 13)

Dispatch ID: agy-milestone-20260911-r5
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-milestone
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 11 (data-scene="11"). Round: r5.

Anthony reviewed the scene on his TV and asked two things: the words on the left ("Every kind word helped us get here", "Expressions of Mother's Love, recognized together", the month line and "Every expression matters") are removed; and "the actual growing campaign and the goal should extend all the way to the left so that that space is bigger." Today milestoneScene() renders a `.progress-intro` column at left 15 px (358 px wide) and the `.progress-sculpture` panel starts at left 431 px with a 310 px wide `.progress-rail` holding the milestone block and the weekly goal block; the helix stream starts at 364 px inside the sculpture.

Read first, inside your worktree: public/color-polish/scenes/milestone.js and milestone.css (yours), public/color-polish/renderer.css (read only: .progress-intro, .progress-sculpture, .progress-rail, .progress-milestone, .progress-goal, .stream-world, .stream-canvas, .stream-node, .stream-caption), tests/color-polish-scenes/milestone.spec.ts and helpers.ts.

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
1. Remove the `.progress-intro` div from milestoneScene() entirely (the eyebrow "A shared milestone", the h1, the intro line, both paragraphs). Nothing else in the markup order changes.
2. In milestone.css (scoped to `#tv .scene[data-scene="11"]`), override the layout so the sculpture starts at the left edge and the rail is wide: `.progress-sculpture { left: 0; }`, `.progress-rail { left: 46px; width: 560px; }`, `.stream-world { left: 650px; }`. Update the stream canvas attributes in the markup to match the new stream width (`width="1162" height="622"`) so drawStream scales crisply; the node positions already use the live clientWidth.
3. Scale the rail typography up to fill the wider rail while staying inside its 553 px height with no clipping (the rail is flex column with space-between; measure with the sample data: the threshold is a four digit number with a comma at most, the goal name is one word): eyebrows 15 px with 2.4 px letter spacing; `.threshold` about 136 px; `.progress-milestone h2` 32 px; `.row` 19 px; both `.progress-track` 12 px tall with the fill marker enlarged to match; `.goal-head` 15 px; `.week-range` 15 px; goal medallion 62 px; `.progress-goal h3` 36 px; `.goal-values` 19 px with `b` 38 px; `.goal-caption` 15 px; `.goal-rank` 17 px. Adjust margins so the two blocks fill the rail without overflow; if the sample or live numbers cannot fit at these sizes, reduce the threshold size first, never clip.
4. The stream keeps its density (at least 14 nodes) and depth; the wider stream world means nodes have more room, so widen the node radius range modestly (`radius: 170 + rng() * 210`) and keep the same rise and turn ranges so the existing spec bounds still hold.

## Acceptance (update milestone.spec.ts, keep the existing tests passing)
- New: at 2000 ms `.progress-intro` does not exist; `.progress-rail` has scrollHeight at most clientHeight plus 1 and scrollWidth at most clientWidth plus 1; the rail's left edge within the scene is under 60 px and its width is at least 540 px.
- Existing: the stream shows at least 14 nodes at every sampled second, each with its own seeded radius, speed and phase; extreme depth; circularity of any bubbles; reduced motion still. Keep them, adjusting the radius bounds if a test encoded the old range.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-milestone/public/color-polish/scenes/milestone.js
$HOME/.claude/worktrees/mothers-love-tv-milestone/public/color-polish/scenes/milestone.css
$HOME/.claude/worktrees/mothers-love-tv-milestone/tests/color-polish-scenes/milestone.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-milestone/docs/runs/2026-09-11-tv-scenes/lanes/milestone.md
```
