# Lane 11 writer result: Arrival, bright, heavenly, full screen

Writer: fresh Claude Opus 5. Branch tv17/arrival, cut from tv17/pick 3d4b459.
Worktree: $HOME/.claude/worktrees/mothers-love-tv17-arrival.
Facts only. No verdict on the work.

## Changed files (all inside the L11 allowlist)

- $HOME/.claude/worktrees/mothers-love-tv17-arrival/public/color-polish/scenes/arrival.css
- $HOME/.claude/worktrees/mothers-love-tv17-arrival/public/color-polish/scenes/arrival.js
- $HOME/.claude/worktrees/mothers-love-tv17-arrival/public/color-polish/core/arrivals.js
- $HOME/.claude/worktrees/mothers-love-tv17-arrival/tests/color-polish-scenes/arrival.spec.ts

renderer.css and core/stage.js were not touched. No rule outside the allowlist was needed.

Diffstat: 4 files changed, 639 insertions, 32 deletions
(public/color-polish/core/arrivals.js 6, public/color-polish/scenes/arrival.css 93,
public/color-polish/scenes/arrival.js 43, tests/color-polish-scenes/arrival.spec.ts 529).

## Approach

1. Removed the near-black backdrop. `#tv .event-stage.active::before` with
   `background: rgba(14, 18, 17, 0.9)` and its `arrivalBackdropFade` keyframes are gone from
   arrival.css.

2. Added a bright backdrop element that is a child of `#tv`, not of the arrival frame, so it
   covers the whole 1920 by 1080 TV surface including the header, the footer and the live
   recognition rail. `arrivalSkyMarkup()`, `arrivalMountSky()`, `arrivalClearSky()` and
   `arrivalRemoveSky()` live in scenes/arrival.js. The element is
   `<div id="arrival-sky" class="arrival-sky" aria-hidden="true">` holding one opaque wash layer,
   nine soft light rays and one glow layer.

3. Colours come from the arrival's own tokens in renderer.css
   (`#tv:has(.event-stage.active)`: --scene-top #FFCCCF, --scene-floor #FFE18E, --scene-side
   #F7AED0, --scene-glow #FFF3B9B3), mixed toward cream #fffdf7 and white with `color-mix`. The
   wash is opaque, so nothing shows through it.

4. Layering, all from arrival.css: `#tv .arrival-sky { z-index: 40 }` sits above the header
   (z-index 30) and the footer that carries the rail (z-index 32);
   `#tv .event-stage.active { z-index: 41 }` lifts the live arrival, its orbs, ring, shimmer and
   exit burst above the backdrop. The queue dock (z-index 45) still paints above both, as it does
   today. The backdrop is `pointer-events: none`.

5. Lifetime, from core/arrivals.js: `arrivalMountSky()` runs in `beginEvent` inside the
   `if(!S.chain)` branch, so one backdrop covers a whole arrival chain, single or group;
   `arrivalClearSky()` runs in `endChain`; `arrivalRemoveSky()` runs in `cancelActiveEvent`.
   Visibility is additionally gated in CSS by `#tv:has(.event-stage.active) .arrival-sky
   { opacity: 1 }` over a base `opacity: 0` with a 600 ms transition, so the backdrop fades out
   the moment the arrival stage stops being active and cannot outlive the arrival even if the
   removal timer is pre-empted (for example by `clearPresentation()` in core/host.js, which is
   outside this lane's allowlist and was not changed). The element leaves the DOM 700 ms later,
   or at once in still mode.

6. Reduced motion and still mode: `#tv.still .arrival-sky`, `#tv.still .arrival-sky *` and the
   `prefers-reduced-motion: reduce` block set `animation: none !important` and
   `transition: none !important`. The backdrop is then a static bright layer at opacity 1 with no
   ray animation.

7. Not changed: arrival timing (entrance 3.6 s single, 4.7 s group, exit 1.35 s, hold from
   content), the orb, the 3D ring, the name shimmer, the four frame styles, the exit flight to
   the rail, the feed rail's own code and look, the header, the QR block, the playlist order and
   click advance. No scene duration is hardcoded anywhere in the change; the spec reads phases
   and the clock from runtime state.

## Spec changes (tests/color-polish-scenes/arrival.spec.ts)

Rewritten because they asserted the old dark backdrop:
- "G3 computed-style stage dim and near-black backdrop assertions hold at hold midpoint" is now
  "G3 computed-style stage dim holds, and the backdrop is a bright full screen layer above header
  and rail". It keeps the stage dim assertions, asserts the `::before` backdrop alpha is now 0,
  and asserts the backdrop element is a child of `#tv`, has opacity 1, `pointer-events: none`, a
  rect equal to the `#tv` rect within 1 px on all four sides, and a z-index above the header and
  the footer and below the active event stage.
- The reduced motion test now checks the backdrop element, its opacity 1, its ray count, and
  computed `animation-name: none` on both the backdrop and a ray.

Added:
- "the single arrival backdrop is bright at 1920 and at 3840, and orb text keeps AA contrast on
  it" and the same for the group arrival. Measures real pixels: a screenshot is decoded back into
  a canvas in the probe page and converted to WCAG relative luminance. Asserts whole screen mean
  luminance above 0.72 and above 0.9 times the pre-arrival mean; a 40 px column of the TV that
  only the backdrop paints has mean above 0.85 and minimum above 0.6; the contrast ratio between
  the computed colour of the orb recipient and message text and the measured bright background of
  the orb is at least 4.5. Then resizes to 3840 by 2160 and repeats geometry and luminance.
- "the header and the live recognition rail are covered during the single arrival and readable
  again after", and the same for the group arrival. Before: the header strip, the rail strip and
  the footer panel each have more than 0.2 percent of pixels darker than mid grey. During: each
  is below 0.02 percent, the header and rail minimum luminance is above 0.3, and their mean is
  above 0.6. After the chain drains: the backdrop element is gone and the dark text fractions are
  back above 0.2 percent.
- "every entrance style, single and group, runs under the bright backdrop": 11 consecutive waves,
  asserting the backdrop is present with opacity 1 and rays in every one, and that all 6 single
  and all 5 group styles were seen.
- "arrival timing is unchanged: single entrance, hold and exit keep their recorded lengths":
  samples phase and clock every 100 ms and asserts entrance 3.5 to 3.8 s, hold 7.9 to 8.3 s, exit
  1.25 to 1.55 s for the single, and entrance 4.6 to 4.9 s for the group.
- Two capture tests, one per width.

One harness fact found and worked around: the renderer fixture stubs
`window.requestAnimationFrame`, so Playwright's `frame.waitForFunction` never re-polls in this
suite and only passes when the predicate is already true on its first evaluation. The new checks
step the virtual clock explicitly or use `expect.poll` instead.

## Falsification check

The assertions were shown to fail. With `#tv .arrival-sky-wash` temporarily set to
`rgba(14, 18, 17, 0.9)` and nothing else changed:
- "the single arrival backdrop is bright at 1920 and at 3840" failed:
  `expect(during1920.mean).toBeGreaterThan(0.72)` received 0.4556061930730713.
- "the header and the live recognition rail are covered during the single arrival" failed:
  `expect(headerDuring.darkFraction).toBeLessThan(0.0002)` received 0.16523645182352392.
An earlier variant that also shrank the backdrop to the old 1812 by 615 event box failed
`expect(during1920.mean).toBeGreaterThan(beforeArrival.mean * 0.9)` with 0.7035542373060473
against 0.7263229165343652. The file was restored from a saved copy after each run and the final
diff contains no mutation.

## Exact command results

All run from $HOME/.claude/worktrees/mothers-love-tv17-arrival with
`npm_config_cache=/tmp/npm-cache`. Dependencies installed with `npm ci` in this worktree
(exit code 0). Playwright ran against a dedicated dev server on the free port 3187
(`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3187`), which was stopped afterwards; port 3187 confirmed
free at the end.

- `npm run typecheck` (tsc --noEmit): exit code 0, no diagnostics.
- `npm test` (vitest run): exit code 0. Test Files 39 passed (39), Tests 222 passed (222),
  duration 16.45 s.
- `npm run build` (next build): exit code 0, all routes built.
- `npx playwright test tests/color-polish-scenes/arrival.spec.ts
  tests/color-polish-scenes/transitions.spec.ts --workers=1`: exit code 0, 25 passed (5.2m).
  18 arrival tests and 7 transitions tests, listed individually as passing, including
  "the single arrival backdrop is bright at 1920 and at 3840, and orb text keeps AA contrast on
  it" (14.6s), "the group arrival backdrop is bright at 1920 and at 3840, and orb text keeps AA
  contrast on it" (13.6s), "the header and the live recognition rail are covered during the
  single arrival and readable again after" (5.4s), the same for the group arrival (7.0s),
  "every entrance style, single and group, runs under the bright backdrop" (15.6s),
  "arrival timing is unchanged" (9.4s), "G3 computed-style stage dim holds, and the backdrop is a
  bright full screen layer above header and rail" (3.4s), and "feed rail and returnScene behavior
  are unchanged after arrival chain" (3.4s).

`--workers=1` was used because this Mac was running several other lanes at load average 200 to
330 during the work. With the default parallel workers, unrelated pre-existing tests
(transitions.spec.ts and the first two arrival tests) timed out at 30 s and 60 s on
`frame.evaluate`; each of them passes when run serially or on its own, with no change to their
code.

## Captures

Directory: $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L11/after
Sixteen PNGs, single and group, at 1920 by 1080 and 3840 by 2160, four moments each:

- w1920-single-arrival-start.png, w1920-single-arrival-mid-flight.png,
  w1920-single-arrival-exit-flight.png, w1920-single-arrival-cleared.png
- w1920-group-arrival-start.png, w1920-group-arrival-mid-flight.png,
  w1920-group-arrival-exit-flight.png, w1920-group-arrival-cleared.png
- w3840-single-arrival-start.png, w3840-single-arrival-mid-flight.png,
  w3840-single-arrival-exit-flight.png, w3840-single-arrival-cleared.png
- w3840-group-arrival-start.png, w3840-group-arrival-mid-flight.png,
  w3840-group-arrival-exit-flight.png, w3840-group-arrival-cleared.png

The capture directory is set by the `L11_CAPTURE_DIR` environment variable; the spec's default is
the same path relative to the repository, so no machine path is committed.

## Limitations and open points

- The renderer's `clearPresentation()` in core/host.js (outside this lane's allowlist) does not
  remove the backdrop element. The CSS `:has(.event-stage.active)` gate makes it invisible and it
  stays `pointer-events: none`, so it cannot cover or block anything, but on that path the empty
  element can stay in the DOM until the next arrival mounts a fresh one, which removes it.
- The arrival's own frame styles still paint inside the event panel. On the bright backdrop the
  Aurora frame reads as a soft lavender panel around the orbs (visible in the mid flight
  captures). It is lighter than the old near-black backdrop but it is the most saturated area of
  the screen during an arrival. No frame style was changed in this lane.
- The queue dock pill stays above the backdrop, as it is today.
- Anthony's own check on the church TV has not happened. Nothing was deployed.
- Sixteen capture PNGs total about 55 MB and are untracked run evidence in the main checkout, not
  part of the branch commit.
