# Lane 10 writer result: Peace in Practice, one reserved long bubble plus a true 3D heart

Writer: fresh Claude Opus 5. Worktree `/Users/anthony/.claude/worktrees/mothers-love-tv17-pip`, branch `tv17/pip`, cut from `tv17/pick` 3d4b459.
Facts only, no verdict.

## Changed files

- `/Users/anthony/.claude/worktrees/mothers-love-tv17-pip/public/color-polish/scenes/peace-in-practice.js`
- `/Users/anthony/.claude/worktrees/mothers-love-tv17-pip/public/color-polish/scenes/peace-in-practice.css`
- `/Users/anthony/.claude/worktrees/mothers-love-tv17-pip/tests/color-polish-scenes/peace-in-practice.spec.ts`

`git diff --stat`: 3 files changed, 1089 insertions, 277 deletions. Nothing outside the allowlist was touched; `git status` shows only those three files.

## What the scene did before

Production's `rightBubbles()` for scene 9 drew four bubbles at `ps = [[885,23,312],[1301,26,320],[824,323,304],[1454,330,295]]`, but if **any** of the four chosen records failed the core's `smallFits()` it threw all four away and drew a single 586 px reader in their place. So one long recognition took over the whole screen and the other three disappeared.

## Reserved bubble: layout and size steps

Layout, in stage coordinates (the stage is 1812 x 636):

| Bubble | Position | Diameter |
| --- | --- | --- |
| Regular A | production's `ps[0]`, x 885, y 23 | 312 |
| Regular B | production's `ps[2]`, x 824, y 323 | 304 |
| Reserved | centred on (1500, 332) | 456, 504 or 552 |

The reserved bubble stands where production's `ps[1]` and `ps[3]` were. Four bubbles plus a circle large enough to hold a 500 grapheme message whole do not both fit to the right of the title and the illustration, so the scene now shows three bubbles instead of four. That is the one visible change beyond the reserved bubble itself.

Size steps, picked by grapheme count (`Intl.Segmenter`, granularity grapheme):

| Graphemes | Diameter | Message font at that step |
| --- | --- | --- |
| up to 150 | 456 | 28 px down to 18 px as the count rises |
| 151 to 280 | 504 | 20 px at 280 graphemes |
| 281 and up | 552 | 22 px at 500 graphemes |

After the grapheme step is picked, the scene measures the record with the core's own `fitCircle()` on a detached copy of the bubble and moves up a step if it does not lay out whole, so a long name or nine expression chips are handled by measurement rather than by the count alone. The font itself is stepped down by `fitCircle()`, which stops at the core's 18 px floor (36 px drawn at 3840, where the whole TV is scaled by two).

"Very long" is measured, not guessed: a record is very long when `fitCircle()` cannot lay it out whole at 304 px, the smaller of the two regular diameters.

### Measured capacity (the core's own fitCircle, at 1920 drawing units)

Typical record means a 14 grapheme name and one expression chip. Worst record means an 80 grapheme name, all nine expressions and a like count, which is the hardest record the product's invariants allow.

| Diameter | Typical: largest whole message | Worst: largest whole message | 500 graphemes, typical | 500 graphemes, worst |
| --- | --- | --- | --- | --- |
| 304 (regular B) | 179 graphemes | 6 | 4 pages | 94 pages |
| 312 (regular A) | 209 graphemes | 6 | 3 pages | 94 pages |
| 456 (step 1) | 500 at 18 px | 176 | 1 page, 18 px | 4 pages |
| 504 (step 2) | 500 at 20 px | 283 | 1 page, 20 px | 3 pages |
| 552 (step 3) | 500 at 22 px | 408 | 1 page, 22 px | 2 pages |

So a 500 grapheme message fits the reserved bubble **whole** at 22 px for any ordinary record. Only the extreme record (80 grapheme name plus all nine chips plus 500 graphemes) still has to page, and then into **two** pages inside the reserved bubble and nowhere else. Two pages take 2 x max(9, pageLength/14) which is about 18 to 22 seconds against the scene's 60 second dwell, and the spec asserts that against `visualState().dwell[9]` rather than a hardcoded number. The pages put back together are byte for byte the whole message; nothing is ever truncated, clipped or ellipsized.

### Rules implemented

1. Exactly one reserved bubble, and a very long recognition appears nowhere else. The other two bubbles only ever take records that lay out whole in them.
2. The reserved bubble grows with the message and the font steps down toward the 18 px floor as the grapheme count rises.
3. With no very long record in the pool the reserved bubble shows a regular record, so it is never empty. When several very long records are in the pool they take turns in it: replacement is handled by the scene's own `onRetire` hook, which overrides the core's next record choice.
4. Everything else is production: the title copy, the hands banner, the ambient hearts, the bubble styling, the drift, the keep-out box over the title, the 18 px floor, the playlist, the header, the feed rail, the QR and click-advance.

One new keep-out box was added: `{ x: 0, y: 250, w: 700, h: 386 }` over the illustration. Production kept four bubbles on the right and four bubbles of a similar size hold each other there. With two regular bubbles and one large reserved one, the pair had far more room and drifted across the turning heart, the raised hands and the flowers (measured at 6 s the left bubble had reached x 36, against x 824 at rest). The box keeps them off the artwork, which is the arrangement the live TV shows. The drift itself is unchanged and the spec asserts the bubbles still move.

## The turning heart, made a real solid

Anthony after the TV watch: "when it spins around it shows as a flat heart, it needs to be fully 3D". The live scene rotated `heart_render.png` with `perspective(800px) rotateY(...)`, so at the ms 6000 checkpoint the drawn angle is about 70 degrees and the image is squeezed to about 35 percent of its width. At 90 degrees it is a line.

**Technique.** A parametric heart surface, shaded and painted with plain Canvas 2D in `peace-in-practice.js`. No network load, no CDN, no library, no new asset file, no WebGL context, so the renderer's content security policy (`default-src 'none'; script-src 'self'; img-src 'self' data:`) is untouched and no new file was added to the assets folder.

The surface takes the classic heart outline `x(t) = 16 sin(t)^3`, `y(t) = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t` (the vertical scaled by 1.09 to match the live artwork's proportions) and puffs it into a closed solid: the outline is swept from the back pole to the front pole, shrinking toward the heart's centre as `sin(psi)` and moving through the depth axis as `-T cos(psi)`. Half depth T is 10.5 model units against a 32 unit width, so the solid is 21 thick.

Mesh: 216 samples around the outline by 16 rings pole to pole, 3456 quads, about half of them front facing on any frame. Vertex normals are gathered from the surrounding faces (the parametric derivatives both vanish at the cleft and at the bottom point, and using them there put a dark crease down the middle of the heart and a starburst around the highlight). Back faces are dropped, the rest are sorted by depth and painted far to near. Each quad is filled with a gradient between the shade at its inner ring edge and the shade at its outer ring edge, which is what removed the concentric terracing a flat shaded mesh leaves. Shading is Lambert over a rose to crimson ramp (deep 126,34,62 through mid 206,86,122 to light 243,158,182), a Blinn specular of power 22 that travels with the turn, and a rim term.

Size, place, colour family, spin rate and direction are unchanged: the canvas fills the same 390 x 363 `#heart-host` at left 198, top 232, the turn is still `draw(clock * 0.55 + 6)` at 7.5 degrees per unit, and the fourteen small floating hearts are untouched. The canvas backing store is 780 x 726, twice the CSS box, so it is one canvas pixel per device pixel on a 3840 wide TV and supersampled at 1920.

Reduced motion: the heart is drawn once at a three quarter angle (40 degrees) and never redrawn. The spec asserts the silhouette does not change after stepping the runtime 9 seconds.

### Measured silhouette, canvas pixels, identical at 1920 and 3840

| Angle | Width | Height | Painted pixels | Width against face on |
| --- | --- | --- | --- | --- |
| 0 | 602 | 592 | 218236 | 1.00 |
| 45 | 510 | 593 | 210558 | 0.85 |
| 90 | 396 | 592 | 182976 | **0.658** |
| 135 | 510 | 593 | 210557 | 0.85 |
| 180 | 602 | 592 | 218236 | 1.00 |

The old flat image at 90 degrees measures 16 px wide against 602 (0.027); that number comes from the mutation run below.

### Frame cost

Measured in headless Chromium on this Mac by calling `window.pipHeartRenderer.draw()` 40 times, at both viewport widths. The canvas is the same size at either width, so the numbers match.

| Width | Median draw | p95 draw | Max draw | Median full coordinator step |
| --- | --- | --- | --- | --- |
| 1920 | 2.4 ms | 3.7 ms | 4.1 ms | 2.6 ms |
| 3840 | 2.5 ms | 3.3 ms | 8.6 ms | 2.9 ms |

Headless Chromium rasterizes Canvas 2D in software, so a TV browser with GPU canvas acceleration should be faster than this, not slower.

## Verify: exact commands and results

Run from `/Users/anthony/.claude/worktrees/mothers-love-tv17-pip` with `npm_config_cache=/tmp/npm-cache`. `npm ci` was run in this worktree (exit 0, no symlinked node_modules).

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass, no output, exit 0 |
| `npm test` (vitest) | 39 test files passed, **222 of 222 tests passed**, exit 0 |
| `npm run build` | pass, all routes emitted, exit 0 |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3197 npx playwright test tests/color-polish-scenes/peace-in-practice.spec.ts --workers=2` | **15 of 15 passed** in 1.6 m, exit 0 |

`PLAYWRIGHT_BASE_URL` is set to an unused port so no dev server is started: every one of these tests serves the renderer through `loadRenderer`'s own route interception, so nothing is fetched over the network and no port is occupied. Several other writers are running on this Mac and port 3100 was left alone. Nothing was deployed.

### The fifteen scene tests

Pools required by the order are all covered: all short; one 250, one 400 and one 500 grapheme message; three very long at once. Plus the hardest record the product allows.

1. all short pool: three bubbles filled, the reserved one holds a regular record, every message whole
2. a 250, a 400 and a 500 grapheme message only ever appear in the reserved bubble
3. a 500 grapheme message fits the reserved bubble whole, above the 18 px floor
4. several very long recognitions take turns in the reserved bubble and leave the other bubbles alone
5. the reserved bubble clears the heading, the heart artwork and the other bubbles
6. the hardest record is never truncated and any paging finishes inside the scene dwell read from state
7. no message font below 18 px, and the TV is drawn at double size on a 3840 screen
8. the turning heart keeps most of its width edge on, at 1920 and at 3840
9. the heart is shaded, not a flat silhouette
10. reduced motion renders the scene still with the heart held at a three quarter angle
11. bubbles stay circular and inside the scene at 0.3 s, 6 s, 14 s and 21 s
12. the regular bubbles keep the live drift and stay clear of the artwork
13. the production title copy, the hands banner and fourteen ambient hearts
14. a studio click does not advance away from the scene
15. no recognition data is fetched from a live network endpoint

### The assertions can fail

Two deliberate mutations were made, the spec was run, and both failed as intended; the source was then restored and the full spec passed again.

- `PIP_RESERVED_STEPS = [304]` (reserved bubble no larger than a regular one): test 3 failed, the 500 grapheme message no longer fits whole.
- `PIP_HEART_HALF_DEPTH = 0.4` (a flat heart): test 8 failed with `edge on width 16 against face on width 602 at 1920`, ratio 0.027 against the required 0.5.

## Captures

Probe, fictional sample data only, every scene at both widths and all four checkpoints:
`/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L10/after/w{1920,3840}-ms{0,6000,14000,21000}/peace-in-practice.png`
Every probe run reported `"issues":[]` (no page errors, no console errors).

Heart frames at 0, 45, 90, 135 and 180 degrees of the spin, plus a whole scene frame, at both widths:
`/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L10/heart/w{1920,3840}-heart-{0,45,90,135,180}deg.png`
`/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L10/heart/w{1920,3840}-ms6000-scene.png`

I looked at all of them. At 0 and 180 degrees the heart is a full rose heart with a highlight on the upper left lobe. At 45 and 135 the near lobe clearly stands in front of the far one and the highlight has travelled with the turn. At 90 it is a rounded solid 396 px across, never an edge.

Captures are local only and are not committed.

## Limitations and things to look at

1. **Three bubbles, not four.** This scene now shows three recognitions at a time instead of four. A reserved circle large enough for a 500 grapheme message and four production sized bubbles do not both fit to the right of the title and the illustration. If Anthony wants four back, the reserved bubble has to come down to about 430 px, and then a 500 grapheme message pages into two.
2. **A new keep-out box over the illustration.** Without it the two remaining regular bubbles drift across the heart and the hands. This is a change to where the bubbles may wander, though not to how they move.
3. **The extreme record still pages.** An 80 grapheme name plus all nine expressions plus 500 graphemes needs two pages at 552 px. Everything ordinary fits whole.
4. **A visible seam down the middle of the heart.** The two lobes meet in a crease that runs from the cleft to the point. That is inherent to inflating this outline; a version that eased the depth where the outline pinches was tried and looked worse (it read as folded paper), so it was reverted. Fine radial streaks from the outline sampling are visible if you stand close to a 3840 screen.
5. **WebGL was tried and dropped.** A per pixel shaded WebGL path removes the streaks entirely, but this Playwright Chromium has no WebGL unless launched with `--enable-unsafe-swiftshader`, which neither `playwright.config.ts` nor `scripts/color-polish-renderer-probe.mjs` do, and both are outside this lane's allowlist. That path could not be exercised by the spec or the probe, so the single Canvas 2D path is what ships and what every check here covers.
6. **The scene spec does not use `openStudioScene`.** The `/admin/login` sign-in flow fails to reach `/admin` in this worktree's dev server for every color-polish scene spec, not only this one. That is pre-existing and outside the allowlist. `loadRenderer` exercises the same renderer code and DOM.
7. `window.pipHeartRenderer` is a new named debug handle on the renderer window, next to the existing `colorPolishRuntime`, used by the frame cost measurement above.
8. Physical TV commissioning is not done. These are headless captures, not Anthony's screen.
