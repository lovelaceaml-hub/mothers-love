# L6 writer result: Expression Orbit, smaller bubbles and revolving medallions

Writer: fresh Claude Opus 5. Worktree /Users/anthony/.claude/worktrees/mothers-love-tv17-orbit-goal, branch tv17/orbit-goal, cut from tv17/fit 71bf3f8. Facts only, no verdict.

Scope actually done: Expression Orbit only (items 8 of the September 19 TV watch), after the coordinator's scope change. Goal (item 3) was dropped before any edit was made: milestone.js, milestone.css and milestone.spec.ts were never touched in this worktree and still match 71bf3f8 (git status lists only the three files below).

## Changed files

- /Users/anthony/.claude/worktrees/mothers-love-tv17-orbit-goal/public/color-polish/scenes/orbit.js
- /Users/anthony/.claude/worktrees/mothers-love-tv17-orbit-goal/public/color-polish/scenes/orbit.css
- /Users/anthony/.claude/worktrees/mothers-love-tv17-orbit-goal/tests/color-polish-scenes/orbit.spec.ts

Diffstat: 3 files changed, 412 insertions, 34 deletions.

## What changed

1. Draw scale. The orbit projection magnified a planet from 0.782 of its layout size at the back of the ring to 1.385 at the front. The size swing is now softened to 35 percent of that (ORBIT_SCALE_SOFTEN), so the drawn scale runs 0.924 to 1.135. Position, z order, blur and tone still come from the raw projection, so the depth of the scene is unchanged.
2. Layout font floor. The floor is 18 divided by the back-pass scale, so it falls from 23.1 px to 19.5 px. The words are still drawn at 18.0 px or larger everywhere (36 at 3840). Because a message needs a smaller circle to hold it at 19.5 px, every measured planet diameter comes down with it.
3. Starting tiers. The Plan 15 tiers 195 / 227 / 263 become 165 / 192 / 222, scaled by the same floor ratio. A planet still grows only as much as its own message needs, measured on a hidden copy, font to the floor first.
4. Stated caps. ORBIT_SOFT_CAP = 336 px, 70 percent of the 480 px gold centre. A planet that fits inside it is never drawn wider than it, however near the viewer it comes. A planet whose own message cannot show whole any smaller is the single exception and is then not magnified at all: it is drawn at its layout size times the back-pass scale, the smallest circle that still shows those words at 18 px, and ORBIT_MAX_DIAMETER keeps that inside the hard cap ORBIT_DRAWN_CAP = 544 px, the room under the scene title.
5. Medallions. They now travel a tilted ring outside the bubble's rim (radius d/2 + 26 px, vertical tilt 0.94, their own 21.5 px radius on top) instead of the old flat 50 px path that crossed the words. They pass in front of the bubble on the near half of the ring (z index 4) and behind it on the far half (z index 1). orbit.css holds the bubble on layer 2 between them, including for a bubble marked data-long, which renderer.css otherwise lifts to z-index 940 and which was why the symbols went behind the recognition. The stage clamp now uses the wider of the planet box and the medallion ring, so nothing leaves the 1812 by 636 stage.
6. Dwell. Nothing in orbit.js reads or hardcodes a dwell; the scene's pacing comes from the runtime, and the new spec exercises the scene at both a 30 and a 60 second dwell read from the snapshot.

## Before and after, sample snapshot (the build Anthony watched)

Probe, renderer, scene 10, 1920 and 3840 wide at 0, 6000, 14000 and 21000 ms, 32 planet readings each side.

| | tv17/fit 71bf3f8 (before) | tv17/orbit-goal (after) |
| --- | --- | --- |
| Planet layout diameter | 261 to 291 px | 235 to 255 px |
| Planet drawn diameter | 214 to 394 px | 221 to 287 px |
| Largest drawn against the 480 px centre | 0.82 | 0.60 |
| Message layout font | 23.1 px | 19.5 px |
| Message drawn font | 18.0 px or more | 18.0 px or more |
| Pages per planet | 1 | 1 |
| Probe browser errors | 0 | 0 |

The peak drawn diameter falls 27 percent (394 to 287). The smallest drawn diameter rises slightly (214 to 221) because the back pass is pinned by the 18 px drawn floor and cannot shrink.

Whole sample pool measured through the scene's own sizing (48 records, 53 to 90 characters): 233 to 288 layout px, every one on one page, font 19.5 or 20.0.

Long fixtures, after (layout px, all on one page, font 19.5): mostly-emoji 123 characters 294, mostly-250 390, mostly-400 474, mostly-500 542. Before, the 500 grapheme planet sat at 695 layout px and was drawn at the 544 px room cap all the way round; it is now 542 layout px drawn at a constant 501 px.

## The 500 grapheme case, as the order asked

A 500 grapheme message cannot fit a small orbiting bubble. The drawn area those words need at the 18 px floor is fixed, so the smallest circle that shows them whole is about 500 px drawn, above the 336 px soft cap. It was not truncated and it was not paginated. It is the one planet allowed past the soft cap, and even then it is never magnified: it is drawn at the smallest circle its own words fit, 501 px instead of the previous 544 px, still inside the room under the title, still on one page, still at 18 px or larger. Pagination was rejected for it because at a 30 second dwell no page split of 500 graphemes fits the dwell at core's reading pace of max(9, characters / 14) seconds per page, so paging would have cost words on screen rather than saved space. Everything up to about 190 graphemes now stays inside the soft cap.

## Verification, run in this worktree

Local dev server for the studio tests: next dev on 127.0.0.1:3421 (a free port), with synthetic public env values only (NEXT_PUBLIC_SUPABASE_URL=https://synthetic.test, a synthetic publishable key). /Users/anthony/Projects/mothers-love/.env.local was never read or copied. The server was stopped afterwards; nothing is listening on 3421.

- npm run typecheck: pass, no output.
- npm test (vitest run): 39 test files passed, 222 tests passed.
- npm run build: Compiled successfully, 36 static pages generated, no errors.
- npx playwright test tests/color-polish-scenes/orbit.spec.ts (PLAYWRIGHT_BASE_URL=http://127.0.0.1:3421, workers 1): 24 passed, 0 failed, 3.6 minutes. 19 of those are the pre-existing Plan 15 and Plan 17 Lane 1 orbit tests, unchanged except where noted below; 5 are new.
- Probe captures: node scripts/color-polish-renderer-probe.mjs . <out> --width=<1920|3840> --ms=<0|6000|14000|21000>, 8 runs, every one reporting issues [] and all ten scenes.

New assertions, all of which fail on 71bf3f8 (checked by restoring the two scene files from that commit and rerunning):

1. "the orbiting bubbles are smaller than the build Anthony watched and the gold centre stays the dominant circle": with the sample snapshot at both widths and all four checkpoints, every planet is drawn inside the soft cap, inside 85 percent of the old 399 px peak and smaller than the 480 px centre, every message shows whole at the drawn floor, and each planet fails an independent whole-fit check at its own diameter with the old 23.1 px floor, which proves the same record's planet was larger in that build. On 71bf3f8: "fixture-22 at 273 px is smaller than the old build's planet for the same record" fails.
2. "a planet is drawn wider than the soft cap only when its own message cannot show whole any smaller": over 60 seconds on three fixtures, any planet past 336 px drawn must fail text-fits.ts's own independent whole-fit check at the soft cap layout size, and every planet stays inside 544 px. On 71bf3f8: "mostly-short-2 is drawn 338 px, past the 336 px soft cap" fails.
3. "orbit.js states the soft cap and the hard cap it measures against": the scene's own fit log must carry softCap 336, drawnCap 544, a font at or above the floor and verbatim true. On 71bf3f8: "stated soft cap" fails.
4. "the expression medallions revolve around their recognition": over 30 seconds, every medallion must pass both in front of and behind its bubble, the bubble must stay on layer 2 even when marked data-long, and a medallion painted in front must sit outside the rim and must not overlap any rendered rectangle of the recipient name or the message. On 71bf3f8: "mostly-400 bubble layer at 0 s" fails.
5. "orbit holds through a full showing at both the 30 and the 60 second dwell": with the playlist duration set to 30 and then 60, the runtime dwell is read from the snapshot, text fits at every 5 second checkpoint through the whole showing, four planets still hold records at the end (the pool does not run dry), every message is drawn at 18 px or larger, and both the planets and the medallions are still travelling more than 20 px in the last third of the dwell. This one also passes on 71bf3f8; it is a holding test for the 60 second ruling, not a test of the size change.

Changed existing assertions, both in orbit.spec.ts:

- "long-only fixture ...": the old assertion that the 500 grapheme planet reaches the room under the title (544 px) no longer describes the scene. It now asserts that planet stays inside the room cap, genuinely needs more than the soft cap, and is drawn at its layout size times the back-pass scale, within 3 px, which is the smallest circle its words fit. Title updated to match.
- "the expression medallions revolve ...": the fixture list was reduced from two fixtures to the mostly-long fixture alone, which still puts a data-long record on screen, because the two fixture version exceeded a 300 second test timeout while this Mac was running a dozen other lanes.

## Capture paths

- After (this branch): /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L6/after/w1920-ms0, w1920-ms6000, w1920-ms14000, w1920-ms21000, w3840-ms0, w3840-ms6000, w3840-ms14000, w3840-ms21000 (orbit.png plus result.json in each, and the other nine scenes for reference).
- Before (tv17/fit 71bf3f8, this writer's own baseline run): /private/tmp/claude-501/-Users-anthony-Projects/bb31cf60-1f58-42c7-955f-4c1c46edcadd/scratchpad/captures/before/ (session scratch, not committed). The lane's published before image is the one the order named, /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L1/after3/w1920-ms6000/orbit.png.

## Limitations

- The back pass cannot get smaller. A planet at the far side of the ring is drawn at 221 px rather than 214 px, slightly larger than before, because the 18 px drawn floor sets that size. All of the reduction is in the near pass, which is where the bubbles looked too big.
- The front text is smaller on screen than before: the message is drawn at 18 to 22 px instead of 18 to 32 px. That follows directly from smaller bubbles at the same 18 px floor.
- The 500 grapheme planet is still drawn larger than the gold centre (501 px against 480 px). No smaller circle shows those words whole at 18 px. The sample snapshot and the real campaign messages seen so far are 53 to 90 characters, so this case did not appear in any capture.
- Not run in this worktree: the other scenes' Playwright specs and npm run test:e2e as a whole. Only the orbit spec, typecheck, unit tests and build were run, per the order.
- The Mac was running many other lanes during this work (load average above 300 for most of it). Under that load, three Playwright tests timed out in a first pass and passed on rerun with one worker. The numbers above come from runs that completed.
- Physical TV confirmation is not part of this lane. Nothing was deployed.
