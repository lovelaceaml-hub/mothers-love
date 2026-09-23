# Plan 17 Lane 5 review (Part A only: nothing cut off at the stage's edges)

Reviewer: Claude Fable 5.1, single review round, reviewer corrects its own findings (owner's ruling).
Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv17-entrance, branch tv17/entrance.
Reviewed: writer commit 3081426 on 33ffbdc. Result: merge 86f47b0 (tv17/pick 34472fe merged in, no conflicts) plus review commit 0c373d0.
Plan goal line checked against: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV." Nothing in this lane moves scene content, so it does not work against that line.

## Findings

1. BLOCKING (broken screen after integration), fixed. The writer's stage clip, clip-path inset resolving to TV 0,102 to 1920,787, cut the new eleventh screen, Live Recognitions full screen (renderer id 12). Its panel runs from y 118 to y 1055 on purpose. public/color-polish/scenes/live-feed.css only sets `overflow: visible` on the stage, which does not lift a clip-path, so after the merge everything below y 787 on that screen would have been blank background (the rail is hidden on that screen). live-feed.spec.ts measures boxes, not paint, so it did not catch this. Proven by mutation: with the fix removed the new test fails at "live feed: clip bottom, expected >= 1080, received 787".
2. MEDIUM (older browser fallback), fixed. `.scene { overflow:clip; overflow-clip-margin:60px }` degrades the wrong way. A browser that knows `overflow:clip` but not `overflow-clip-margin` (Safari 16 and later, and TV engines built on it) keeps the clip and drops the margin, so every scene would be cut at the scene box, x 54 and x 1866, which is exactly the fault Anthony reported. The scene clip was also redundant: the stage clip is tighter on all four sides (54, 24 and 25 px against a 60 px margin).
3. LOW, fixed. No `-webkit-clip-path` copy for older WebKit builds that only know the prefixed property.
4. LOW (test strength), fixed. The writer's paint proof was six sample points per scene at one checkpoint. Nothing covered Words that bring peace during its new glide and drift, and nothing covered scene 12.
5. INFO, no change needed. The arrival lane (branch tv17/arrival) mounts its `.arrival-sky` backdrop on #tv at z-index 40 and raises `#tv .event-stage.active` to z-index 41 with `overflow: visible`. Both are siblings of `#stage`, not descendants, so the stage clip cannot cut them. This lane did not touch `.event-stage`.
6. INFO, confirmed and sharpened. The square notches on the pink Featured card are an artifact of Playwright's old headless shell only. The writer said they were absent at 3840; they are present at 3840 too, in different tile shaped rectangles (see reviewed/w3840-ms6000/featured.png). The same capture taken with full Chromium in new headless mode (`channel: 'chromium'`) shows a complete card with no notch: reviewed/w1920-ms6000-full-chromium/featured.png. They existed before this lane (logs/captures/L3-after2) and are not caused by any clip. A later lane may want scripts/color-polish-renderer-probe.mjs to launch with `channel: 'chromium'` so captures stop showing them; that script is outside this lane's allowlist.
7. Checked, no finding: Goal panel, Orbit's medallion rings, Peacemakers and every other screen are not cut. The shown versus hidden comparison and the full sheet test below pass for all ten scenes, and the box comparison shows no element moved.

## What changed (allowlist only)

/Users/anthony/.claude/worktrees/mothers-love-tv17-entrance/public/color-polish/renderer.css
- `.stage` keeps `clip-path:inset(-24px -54px -25px -54px)` and gains the same value as `-webkit-clip-path`.
- `.scene` is now `overflow:visible; isolation:isolate`. The stage clip is the only paint limit.
- New rule: `#tv:has(#stage > .scene[data-scene='12'] .lf-panel) .stage` uses `inset(-24px -54px -318px -54px)`, that is TV 0,102 to 1920,1080, while scene 12 is in the stage (also during its fade). The top limit stays at the header rule. The rail (z-index 32) and header (z-index 30) still sit above the stage (z-index 3), so an incoming scene cannot paint over the rail while it fades back in.

/Users/anthony/.claude/worktrees/mothers-love-tv17-entrance/tests/color-polish-scenes/stage-edges.spec.ts (4 tests to 10, 5 per width)
- Scene clip assertion now requires `overflow: visible` on the scene and the stage.
- New: stage shown versus stage hidden screenshot comparison. Zero really differing pixels allowed in the header band (y 0 to 102) and the rail band (y 787 to 1080), at 19 checkpoints per width: all ten scenes at 6 s, Words that bring peace at 0, 6.3, 6.6, 7, 12 and 16.5 s (glide and drift), Welcome at 0, Orbit and Goal at 14 s. It also requires more than 1000 changed pixels in the stage rows, so the comparison cannot pass vacuously.
- New: a worst case magenta sheet far larger than the screen placed in the scene, at 12 checkpoints per width. Zero magenta pixels in the header band and at or below y 787, both 54 px side margins painted 100 percent out to x 0 and x 1919, coverage between the two lines above 99 percent.
- New: Live Recognitions full screen. Clip reaches y 1080, panel box inside the clip, real paint below the old rail line, header band untouched, probe at TV y 1026 painted, ordinary clip restored after leaving the screen.
- core/stage.js needed no change.

Note on the comparison tolerance: old headless Chromium rasterizes the page background one or two levels differently when the layer tree changes, and draws the four rounded screen corners differently. Measured on Words that bring peace: 149,896 header band pixels off by 1 level, 20 pixels off by 2 to 9, and 108 pixels inside the 12 px corner squares. The test counts a pixel only when a channel moves more than 8 levels outside the 16 px corner squares; real content moves channels by 180 to 240.

## Older smart TV browser behaviour (stated, not tested on hardware)

- `clip-path: inset()` on HTML elements: Chrome 55 and later, Safari 9.1 and later with the prefix, 13.1 and later without. Negative insets are valid.
- No clip-path support at all: scenes paint with no cut, and the header and rail still cover them by z-index. It degrades to not cutting.
- `overflow:clip` and `overflow-clip-margin` are no longer used, so their support no longer matters.
- `:has()` (Chrome 105, Safari 15.4) is needed by the scene 12 rule. live-feed.css and the existing scene colour tokens already depend on `:has()`, so this adds no new requirement. Without it, scene 12 would be cut at y 787; the rest is unaffected.

## Mutation check (assertions can fail)

With the scene 12 rule removed and the stage top inset changed to -60 px, the 1920 run gave 3 failed, 2 passed: "scene welcome: clip top, expected >= 102, received 66"; "scene welcome at 6000 ms: scene paint inside the header band, expected 0, received 65821"; "live feed: clip bottom, expected >= 1080, received 787". renderer.css was then restored.

## Command results (after the merge and the fixes)

npm and npx ran with npm_config_cache=/tmp/npm-cache. The merge changed no package file, so npm ci was not repeated. Server: production build with synthetic public config only (https://synthetic.supabase.test, synthetic-publishable-key) on port 3195, stopped afterwards. /Users/anthony/Projects/mothers-love/.env.local was never read or copied. No database touched, nothing deployed.

| Command | Result |
| --- | --- |
| npm run typecheck | exit 0 |
| npm test | 39 files, 233 tests, 233 passed |
| npm run build | exit 0 |
| npx playwright test stage-edges, live-feed, featured, expressions specs (2 workers) | 76 tests, 76 passed, 9.0 min |
| stage-edges.spec.ts alone | 10 tests, 10 passed, 2.8 min |
| scripts/color-polish-renderer-probe.mjs at 1920 and 3840, 6000 ms | "issues":[] and ten scenes, both widths |

Scene element boxes versus the old clipping (spec test, same at both widths, 0 boxes differ): welcome 122, garden 26, featured 100, calendar 156, status 173, expressions 332, peacemakers 30, peace-in-practice 159, orbit 54, milestone 61. Elements crossing the stage edge: welcome 1, featured 7, others 0.

## Captures

/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L5/reviewed/w1920-ms6000 and w3840-ms6000: the ten scenes plus live-feed.png.
/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L5/reviewed/w1920-ms6000-full-chromium: featured, welcome and expressions from full Chromium, without the headless shell notch artifact.
Looked at: Featured's pink card now shows its left border and glow out to the screen edge with no slice at x 54; Welcome's left side is uncut; Live Recognitions runs from y 118 to y 1055 uncut.

## For the owner and the integration lane

- Not run: the whole tests/color-polish-scenes folder. Only the four specs the review order named were run. welcome.spec.ts:370 (speech bubbles) is a known failure that is not this lane's.
- tv17/entrance now contains tv17/pick at 34472fe, so it merges back as a fast forward style merge with two changed files.
- The clip numbers are fixed pixels tied to the stage box (54, 126, 1812, 636), the header rule at 102 and the rail at 787. If any lane moves those, the spec fails loudly.
- The arrival lane needs nothing from this lane, and nothing here cuts it.
- The church TV has not been looked at. Everything here is headless Chromium at 1920 and 3840. Anthony's look at the TV remains the final check for item 2 of his feedback.
