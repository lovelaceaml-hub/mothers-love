# L10 review: Peace in Practice, one reserved long bubble and a true 3D heart

Reviewer: Claude Fable 5.1 (single review, corrections made by the reviewer, no second round).
Worktree `$HOME/.claude/worktrees/mothers-love-tv17-pip`, branch `tv17/pip`.
Reviewed commit dc3f2cf (on tv17/pick 3d4b459). Corrections commit: fbe3c90.

Plan goal line checked against: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."
Owner's words checked against: item 7 (one reserved large bubble for the long recognitions) and item 10 ("The big rotating heart ... needs to actually be a 3D heart. When it spins around it shows as a flat heart. It needs to be fully 3D.").

## Findings

1. HIGH, corrected. The heart was a real volume but did not look good enough for the church TV. It was 66 percent as thick as it is wide, so edge on it read as a plain egg. The surface was a 3456 quad mesh with one gradient per quad: horizontal banding, fine radial streaks, and a hard seam from the cleft to the point, all visible in the writer's own frames (`logs/captures/L10/heart/w3840-heart-0deg.png`, `...-90deg.png`). It was also drawn 301 px wide against the live artwork's 278 px.
2. HIGH, corrected. A new bubble could slide under the reserved bubble with its words cut off. The writer's own capture `logs/captures/L10/after/w1920-ms21000/peace-in-practice.png` shows "Ava J." flying in from the right underneath the reserved bubble. Production brings a new bubble in from the left, the right or below; with a large fixed bubble on the right, the first two cross the reserved bubble or the heading and the heart.
3. MEDIUM, corrected. Reserved bubble turnover left its place empty. For the next message the reserved bubble burst (hearts), disappeared, and a new one flew in: about 5 seconds with a hole where the biggest bubble belongs. Same defect as Lane 9 finding 2.
4. MEDIUM, corrected. No check of the time left in the scene. A very long message could be taken with too little of the 60 seconds left to read it. Same defect as Lane 9 finding 3.
5. MEDIUM, corrected. The reserved bubble held one message for up to 34 seconds by the core's timer regardless of length, and with one very long message in the pool that message came straight back. Now the same rule as Peacemakers: at least 18 seconds or the whole reading time, then another very long message, otherwise a regular one takes a turn.
6. LOW, corrected. A regular bubble with nothing allowed to replace it burst and re-entered with the same message. It now holds and tries again 12 seconds later, as on Peacemakers.
7. LOW, no change. The writer's keep-out box over the illustration (x 0, y 250, w 700, h 386) does its job. In a 60 second simulation the steady bubbles reached at most 6 px into it and 5 px into the title box. The rightmost hands of the banner (stage x 700 to 843) sit under the lower regular bubble part of the time, as they do on the live TV today.
8. Verified as claimed: exactly one reserved bubble; a very long recognition only ever appears in it; regular bubbles only take messages that fit whole (measured with the core's own `fitCircle`); 500 graphemes whole on one page in the 552 px step (asserted; the writer measured 22 px, 44 px at 3840); font never below 18 px (36 px at 3840); nothing truncated, clipped or ellipsized; the hardest record the product allows (80 grapheme name, nine expressions, 500 graphemes) pages inside the reserved bubble only, two pages, all text kept; reserved bubble inside the stage, clear of header, feed rail, heading and heart (asserted), and of the countdown ring (by geometry: 375 px from the bubble centre against a 276 px radius); dwell read from state (a 45 second playlist entry reports 45); title copy, hands banner, fourteen floating hearts, heart box position and size as live; only the three allowlisted files changed; no new asset file; no em dash or en dash in the diff or commit messages; fictional data only.

## What I changed (all inside the allowlist)

- `public/color-polish/scenes/peace-in-practice.js`
  - Heart: replaced the mesh with a smooth algebraic heart solid, `(x^2 + 9/4 y^2 + z^2 - 1)^3 - x^2 z^3 - 9/80 y^2 z^3 = 0`, which face on is the same rounded heart as the live artwork and has a soft dimple at the cleft instead of a seam. It is shaded for every pixel in plain Canvas 2D (no WebGL, no library, no asset, nothing fetched): the solid turns about its vertical axis, so each pixel row is an independent slice; the slice is turned, its visible side painted along the row with a depth buffer, and each pixel's own surface normal is looked up in a pre-lit 512 x 512 sphere table (soft wrap light, a broad gloss with a tight core, a low bounce light, gentle rim darkening). The light is fixed to the screen, so the highlight slides over the surface as the heart turns. Where the near lobe passes in front of the far one, the step in depth is softened so no stair stepped line shows. The outline is cut with an antialiased vector path at device resolution: the canvas is 390 x 363 on a 1920 TV and 780 x 726 on a 3840 TV (one canvas pixel per TV pixel); the shading is always computed at 390 x 363 and enlarged smoothly by two at 3840.
  - Same place (the live 390 x 363 box at left 198, top 232), same size as live (280 px wide face on, live 278), colours measured from `heart_render.png` (deep 146,58,82; mid 214,90,121; light 250,124,152), same spin speed and direction (`draw(clock * 0.55 + 6)` at 7.5 degrees per unit, 4.125 degrees per second). The heart is redrawn only when it has turned 0.1 degrees, about every other frame.
  - Reduced motion: drawn once at 40 degrees (three quarter view), never redrawn.
  - Reserved bubble: changes its message where it stands. Words fade out (0.6 s), the circle eases to the step the next message needs (0.7 s, only when the size differs), the core's `installNext()` installs and fits the message, words fade in (0.9 s). It never bursts or leaves (`retireAt = Infinity`). Turn order: another very long recognition first, otherwise a regular message. Hold: 18 seconds or the whole reading time. Time left: a message is only taken if its reading time fits what is left of the dwell read from `S.dwell` and `S.sceneAge`; no limit when the scene is held. A `pip_reserved` log line records each turn.
  - Regular bubbles: picked again under the scene's rule the moment the core chooses a replacement; held when nothing may replace them; a new one always rises from below its resting place (production's third way in).
  - The writer's diameter steps (456, 504, 552), positions, measured "very long" rule and keep-out boxes are kept.
- `public/color-polish/scenes/peace-in-practice.css`: the two word fade rules, scoped to scene 9, off in still mode and under reduced motion.
- `tests/color-polish-scenes/peace-in-practice.spec.ts`: 21 cases (was 15). New or replaced: heart proportions at both widths (thickness between 0.40 and 0.50 of the width, widest part in the upper half, tapering at least 1.6 to 1 from upper to lower, a dip between the lobes, live size, one canvas pixel per TV pixel); heart surface smoothness at both widths (largest neighbour step, largest bend, seam across the centre line); reserved bubble refreshes in place and is never empty, moved or burst across 58 seconds, turns at least 18 seconds apart; on the live playlist every message arrives with time to be read; dwell from the saved playlist; the circle eases between sizes with whole words at every size and the font smaller for the longer message; across 60 seconds no steady bubble sits more than 24 px over the heading or artwork or 36 px over the reserved bubble, and no bubble flies under the reserved bubble or across the heading.

## Heart proportions and frame cost

Measured from the canvas, identical in proportion at both widths:

| | 1920 (canvas 390 x 363) | 3840 (canvas 780 x 726) |
| --- | --- | --- |
| Face on width x height | 280 x 274 | 558 x 548 |
| Edge on width | 130 | 260 |
| Thickness against width | 0.464 | 0.466 |
| Edge on, widest row | 29 percent down from the top | 32 percent |
| Edge on, width a quarter down against four fifths down | 126 to 68 | 252 to 134 |
| Dip between the lobes | 10 percent of the height | 10 percent |
| Largest shade step between neighbouring pixels (of 255) | 5.6 | 3.1 |
| Largest bend (band or streak measure) | 3.0 | 2.0 |
| Shade difference across the centre line | 4.7 | 4.7 |

The writer's heart was 0.658 thick with its widest row at the middle. Live flat image: 0.03.

Draw cost, measured in the scene in headless Chromium on this Mac (software canvas), 50 forced draws:

| Width | Median | p95 | Max |
| --- | --- | --- | --- |
| 1920 | 1.9 ms | 2.2 ms | 2.4 ms |
| 3840 | 2.1 ms | 2.9 ms | 3.2 ms |

With real animation frames (240 frames, drop shadow on): draw median 2.1 ms, max 6.7 ms at 1920 and 7.8 ms at 3840. Because of the 0.1 degree rule the heart is redrawn on about every other frame, so the average per frame is about half of that. One time set up at first showing: 45 to 65 ms (slices and light table), cached for the life of the page. Memory: about 4 MB.

## Command results (after corrections, run in the worktree, npm_config_cache=/tmp/npm-cache)

- `npm run typecheck`: exit 0.
- `npm test`: 39 files passed, 222 tests passed, 0 failed.
- `npm run build`: exit 0.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3197 npx playwright test tests/color-polish-scenes/peace-in-practice.spec.ts --workers=1`: 21 passed, 0 failed (1.9 min), run twice. The unused port only stops Playwright from starting a dev server; the spec serves `public/color-polish` from disk, so no server was started or left running.
- Probe, 8 runs (1920 and 3840 at ms 0, 6000, 14000, 21000): every run `"issues":[]`.
- Mutation checks, each failed as intended and was reverted (source compared byte for byte afterwards): thickness 0.66 (the egg) and 0.03 (flat) fail the proportions case; a 24 x 24 light table (banding) fails the smoothness case; no time left rule fails the live playlist case; no rise from below and no artwork keep-out each fail the 60 second case; no regular turn fails the refresh case; a size jump fails the easing case.

Captures:
- Heart frames at 0, 45, 90, 135, 180 degrees, both widths: `$HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L10/heart-reviewed/w{1920,3840}-heart-{0,45,90,135,180}deg.png`. I looked at all of them and at enlarged crops of the outline and the cleft: smooth, no band, streak or seam; the outline is clean at both widths.
- Scene captures: `$HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L10/reviewed/w{1920,3840}-ms{0,6000,14000,21000}/peace-in-practice.png`.

Measured in a 60 second simulation on the playlist dwell: all short pool, the reserved bubble showed three messages (turns at 18.6 and 37.2 seconds). Mixed pool, a 250 grapheme message first (504 px), a 320 grapheme message took over at 19.3 seconds (552 px, 22.9 seconds of reading), then at 43.5 seconds a regular message took the turn because the 500 grapheme one (35.7 seconds) no longer fit the time left; it gets the first turn at the next showing.

## For the owner

1. Edge on, the heart is a rounded teardrop: full behind the lobes, tapering to the point. That is what a real puffed heart looks like from the side; it cannot show two lobes from that angle.
2. The screen shows three bubbles (one reserved, two regular), not the four that live shows. This was the writer's call and I kept it: four production size bubbles plus a circle big enough for 500 graphemes do not fit beside the heading and the illustration.
3. The reserved bubble changes size with the message (456, 504 or 552 px). On Peacemakers it is one fixed size (572 px). The change of message is otherwise the same on both screens.
4. New regular bubbles always rise from below on this screen. Peacemakers still uses production's three ways in; if this looks better on the TV, the same two lines can go there.
5. The probe's sample pool has no very long message, so the captures show the regular message case; the very long cases are proven by the spec.
6. In a test loop that never yields to the browser, Chromium stalls about half a second on every sixtieth heart draw at 3840 (its own canvas queue). With real animation frames it does not happen (measured above). It only makes the 3840 test cases slower.
7. WebGL was not used, so there is one drawing path and it is the one every check here covers.
8. Nothing was deployed, no database was touched, `.env.local` was not read or copied, no physical TV check was run.
