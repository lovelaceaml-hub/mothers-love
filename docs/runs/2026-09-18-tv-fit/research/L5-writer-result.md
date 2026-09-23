# Plan 17 Lane 5 writer result (Part A only)

Writer: Claude Opus 5. Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv17-entrance, branch tv17/entrance, cut from tv17/pick 33ffbdc.
Scope: Part A only. The coordinator withdrew Part B (the arrival) mid lane and moved it to another writer. No file under scenes/arrival.css, scenes/arrival.js, core/arrivals.js or tests/color-polish-scenes/arrival.spec.ts was edited at any point in this lane; `git status` in the worktree lists only the two files below.

## Changed files

1. /Users/anthony/.claude/worktrees/mothers-love-tv17-entrance/public/color-polish/renderer.css (2 rules changed, 3 comment lines added)
2. /Users/anthony/.claude/worktrees/mothers-love-tv17-entrance/tests/color-polish-scenes/stage-edges.spec.ts (new, 4 tests)

public/color-polish/core/stage.js was in the allowlist but needed no change and was not touched.
The `.event-stage` rule and the `#tv:has(.event-stage.active)` rule in renderer.css were NOT changed, per the coordinator's merge constraint.

## Approach

The V6 block of renderer.css carried `.stage { overflow:hidden }` and `.scene { overflow:hidden }`. The stage box is `top:126; left:54; width:1812; height:636`, that is TV rectangle 54,126 to 1866,762, so every scene was sliced by a hard vertical line 54 px inside each screen edge. The fix replaces the two box clips with one explicit paint region on the stage:

```
.stage { overflow:visible; clip-path:inset(-24px -54px -25px -54px); isolation:isolate; perspective:none; }
.scene { overflow:clip; overflow-clip-margin:60px; isolation:isolate; }
```

The negative insets resolve to the TV rectangle 0,102 to 1920,787: the real left and right screen edges, the header rule (`.tv-header` top 31 plus height 71 equals 102) and the feed rail (`.footer` top 787). The scene keeps a clip box so it stays a clip container, with a 60 px margin so it never cuts before the stage does. Nothing about scene layout, durations, playlist order, click advance or the QR was touched, and no scene duration is hardcoded anywhere in the change.

Ordinary scene content still cannot paint over the header or the rail for two independent reasons: the stage clip stops at y 102 and y 787, and the stage's z-index (3) is below the header (30) and the footer (32). Both are asserted.

## Verify commands, run in this worktree, with real results

All npm and npx runs used `npm_config_cache=/tmp/npm-cache`. `npm ci` was run in this worktree; node_modules was never symlinked. /Users/anthony/Projects/mothers-love/.env.local was never read or copied. The Studio specs were run against a production build started with synthetic public config only (NEXT_PUBLIC_SUPABASE_URL=https://synthetic.supabase.test, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=synthetic-publishable-key), on free port 3191, following the pattern in .tv17/verify-studio.sh. The server was stopped when the lane finished.

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0, no diagnostics |
| `npm test` | 39 test files, 222 tests, 222 passed, 0 failed, 2.76 s |
| `npm run build` | exit 0, production build completed |
| `npx playwright test tests/color-polish-scenes` (workers 2, final run) | 151 tests, 149 passed, 2 failed, 5.9 min |
| `npx playwright test tests/color-polish-scenes/stage-edges.spec.ts` | 4 tests, 4 passed (1920 and 3840) |

### The two failures in the final suite run

1. `garden.spec.ts:158 bubbles stay circular through sprout, swell and burst`, error `page.goto: net::ERR_ABORTED; maybe frame was detached?`. Re-run on its own with the change applied: 1 passed in 7.9 s. Load related, not a regression.
2. `welcome.spec.ts:370 speech bubbles visible count reaches at least 2 by 6 s and 3 by 9 s with border-radius 16px`, `expect(visibleAt9).toBe(3)` received 2. This is a pre-existing failure. Run serially three times with the change: failed 3 of 3, received 2 each time. Run serially three times with renderer.css restored to tv17/pick: failed 3 of 3, received 2 each time. Identical with and without the change.

### Earlier parallel runs, recorded for completeness

Two full parallel runs (workers 4) were taken while other lanes were also running servers and browsers on this Mac, and both were dominated by Studio sign-in and navigation timeouts:
- with the change: 112 passed, 39 failed;
- with renderer.css restored to tv17/pick (stage-edges excluded): 124 passed, 23 failed; 6 tests failed only in that baseline run.

22 tests failed only in the changed run. Re-running exactly those, serially, with the change applied: 20 passed, 1 failed (welcome.spec.ts:370, the pre-existing failure above), 1 title did not match the grep. No failure in either parallel run is attributable to Lane 5.

## Acceptance evidence

### Scene element bounding boxes are unchanged versus tv17/pick

Measured with a probe harness that mirrors scripts/color-polish-renderer-probe.mjs: all ten playlist scenes, checkpoint 6000 ms, every descendant of the live `.scene` recorded as left, top, width, height in TV coordinates. "Before" was measured with renderer.css at tv17/pick, "after" with the change.

| Width | Elements compared | Boxes that differ by more than 0.01 px |
| --- | --- | --- |
| 1920 | 1690 | 0 |
| 3840 | 1690 | 0 |

Per scene element counts in that harness (identical before and after, at both widths): welcome 134, garden 108, featured 106, calendar 154, peacemakers 92, status 173, expressions 332, peace-in-practice 221, orbit 133, milestone 237.

The new spec also proves this from inside the test run: for each of the ten scenes it measures every scene box, then injects `#tv .stage{overflow:hidden;clip-path:none}` and `#tv .scene{overflow:hidden;overflow-clip-margin:0}` to restore the tv17/pick clipping at runtime, measures again, and asserts every box matches. Counts recorded by that spec, identical at 1920 and 3840: welcome 122, garden 26, featured 100, calendar 156, status 173, expressions 332, peacemakers 30, peace-in-practice 159, orbit 54, milestone 61. (These differ from the harness counts because the spec reaches each scene through `loadRenderer` plus `setScene`, not through a fresh snapshot per scene.)

### Nothing is cut at the stage's left or right edge

The new spec checks, for each of the ten scenes at 1920 and 3840:
- the stage clip resolves to left 0 or less, right 1920 or more, top between 102 and 126, bottom between 762 and 787;
- the scene's own clip margin is at least 54 px, so it never cuts before the stage;
- stage z-index is below both the header and the footer;
- every scene element whose box crosses the stage edge keeps its whole on screen part inside the clip;
- four magenta paint probes are injected into the live scene and read back from a real screenshot: at TV (26, 396) and (1894, 396) the probe must be painted; at TV (960, 112) and (960, 775), between the header rule and the stage and between the stage and the rail, it must be painted; at TV (960, 70), inside the header band, and (960, 800), inside the feed rail band, it must not be painted and the band must stay light.

Elements that cross the stage edge, counted by the spec (same at both widths): welcome 1 of 121, featured 7 of 99, all other scenes 0.

The assertions can fail. With renderer.css restored to tv17/pick the first test fails at `scene welcome: clip left, Expected <= 0, Received 54`. With the geometry assertions temporarily removed as well, it fails at `scene welcome: probe at TV x 26 was cut, pixel 231,240,225`, which is the background colour.

### Pixel evidence from the captures

Featured scene, 1920, 6000 ms, row y 500, reading left to right from the screen edge:

| TV x | Before (tv17/pick) | After |
| --- | --- | --- |
| 38 | 226,239,213 background | 226,217,204 panel glow |
| 44 | 226,239,213 background | 248,165,197 panel border |
| 50 | 225,238,213 background | 254,230,223 panel interior |
| 56 | 253,227,223 panel | 253,227,223 panel |

The `.feature-panel` box is left 36.4, so before the change its left edge, border and glow were cut off by the stage box at x 54. They now paint.

Header band and feed rail band pixels are byte identical before and after. Sampled at TV (60,45), (960,70), (300,95), (960,830), (200,980), (1700,900) on welcome, calendar and milestone: every one of the 18 pairs matches exactly.

## Capture paths

`node scripts/color-polish-renderer-probe.mjs <this worktree> <output> --width=<w> --ms=<ms>`, all four runs reporting `"issues":[]` and all ten scenes:

- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L5/after/w1920-ms0
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L5/after/w1920-ms6000
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L5/after/w3840-ms0
- /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L5/after/w3840-ms6000

Each folder holds the ten scene PNGs plus result.json. The arrival mid flight screenshots named in the order's Verify line belonged to Part B and were not taken, because Part B moved to another writer.

## The notch finding

The square notches on the pink expression card in logs/captures/L3-after2/w1920-ms6000/featured.png are a capture side raster artifact of headless Chromium, not a clip, not a layout fault, and not something any file in this lane's allowlist can cause or fix.

Evidence:

1. Reproduced exactly. A fresh capture from this worktree at tv17/pick, width 1920, ms 6000, gives the identical pixel at TV (370, 660): 225,205,203, the same value as the L3-after2 capture.
2. It moves with the checkpoint. At the same width, TV (370, 660) reads 253,231,233 at ms 0 and 255,246,242 at ms 14000, both painted; and TV (60, 400) reads 228,231,217, unpainted, at ms 0 and 225,210,207, unpainted, at ms 14000, but 253,222,222, painted, at ms 6000. The missing rectangle is in a different place at every checkpoint.
3. It is absent at 3840. At width 3840, ms 6000, TV (370, 660) reads 254,238,237, painted.
4. No element and no ancestor clip is involved. `document.elementsFromPoint` at the centre of the notch and at three points around it returns the identical stack every time: `.feature-panel`, `.feature-stage`, `.scene`, `#stage`, `.background`, `#tv`. No element with its own background, overflow or clip-path sits between them.
5. Forcing a repaint fills it in. The `.feature-panel` carries a 3D transform from the paused `featuredIdleSway` animation, computed `matrix3d(0.997564, 0, -0.0697565, ...)`, so it is composited on its own layer. Setting `filter: opacity(0.999)` on that element and screenshotting again turns TV (370, 660) into 254,238,237, painted. Removing the filter returns it to 225,205,203. Waiting 0.7 s and 2.2 s without forcing the repaint changes nothing, so it is layer rasterization, not screenshot timing.
6. The affected element belongs to featured.css and featured.js, which are not in this lane's allowlist, and Anthony did not report a notch on the TV, only the cut off left side.

No fix applied. If a lane wants the captures free of it, the change belongs in the capture harness, for example forcing a repaint of transformed layers before `page.screenshot`, not in the scene CSS.

## Limitations

- Physical TV commissioning is not done. Everything here is headless Chromium at 1920x1080 and 3840x2160.
- The clip rectangle is written as fixed pixel insets tied to the stage's own fixed geometry (54, 126, 1812, 636), the header rule at 102 and the rail top at 787. If another lane moves the stage box, the header height or the footer top, these four numbers must move with it. The new spec asserts the resolved rectangle, so it will fail loudly rather than drift silently.
- The arrival overlay is untouched. `.event-stage` still carries `overflow:hidden` and its own inset box, so the arrival is not edge to edge from this lane's work. That is the other writer's Part B.
- `welcome.spec.ts:370` fails on tv17/pick and still fails. It is outside this lane's allowlist and was left alone.
- The parallel suite runs in this lane were noisy because other writers were running servers and browsers on the same Mac at the same time. The authoritative numbers above are from the quieter two worker run plus targeted serial re-runs.
- This is a writer report. It states facts and does not grade the work.
