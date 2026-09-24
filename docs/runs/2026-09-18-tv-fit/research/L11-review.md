# Lane 11 review: Arrival, bright, heavenly, full screen

Reviewer: Claude Fable 5.1 (single review, reviewer corrects; ruling 2026-09-19 07:40Z).
Plan goal line checked first: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV." This lane is Anthony's named change (watch feedback item 4) and does not conflict with it.

Worktree /Users/anthony/.claude/worktrees/mothers-love-tv17-arrival, branch tv17/arrival.
Reviewed commit 80673f0 (writer). Final commit a87fed1 (review fixes).

## Verdict
Passes after corrections. The writer's structure (backdrop on #tv, CSS gate, lifetime hooks) is sound. The look did not pass as delivered in one of the four frame styles, and that style happened to be the only one in all 16 writer captures.

## Findings

1. HIGH (look). Aurora frame painted a dim lavender slab with square corners over the bright sky, single and group. Its ribbons were teal, violet and rose at 40 percent, designed for the old dark backdrop. Measured panel mean luminance 0.64. On a church TV this still reads as "the recognition area is darker than the rest", which is what Anthony objected to. Fixed: ribbons are now cream, gold and soft rose with a hint of pale lilac, no screen blend; stars carry a gold glow so they read on light. Panel mean now above 0.7 in every frame style.
2. MEDIUM (look). The frame layer had no corner radius, so any frame that fills the box showed a hard square corner and a hard vertical edge at x=54 outside the rounded panel. Fixed: `.arrival-frame` has a 40 px radius matching the panel.
3. LOW (look). Sky rays were cream on cream and could not be seen. Fixed: rays are white shafts, slightly stronger, on a slightly warmer wash (gold 36 percent, rose 34 percent). All writer luminance thresholds still pass.
4. LOW (look). The small style caption (bottom left) sat under the frame layer and washed out under the new light ribbons. Fixed: z-index 3 inside the arrival frame.
5. LOW (lifetime). After `clearPresentation()` or the prune path in core/host.js the invisible backdrop element stayed in the DOM until the next arrival. Safe (opacity 0, no pointer events, no personal content inside it), but untidy. Fixed inside the allowlist: the element removes itself on the end of its own fade out.
6. LOW (test). G3 used a fixed 1000 ms wait for the stage dim transition and failed once under load (opacity 0.230143 against 0.23). This wait predates the lane. Fixed with a poll for the settled values.
7. INFO, no change. Queue dock pill stays above the backdrop. It is part of the arrival (it says how many are waiting and what is on screen) and it was above the arrival before. Left as is; Anthony can ask for it to hide.
8. INFO, no change. The rose and gold arrival panel (`.event-world`, Plan 15 colours in renderer.css) is still a visible rounded panel on the sky. It is bright and in palette, so it was kept. If Anthony wants the panel to melt into the sky completely, that is a small follow up in arrival.css.
9. INFO. The one time gold name shimmer crosses the name for about 3 seconds at the start of reading. Unchanged from live. The new frame captures wait for it to finish.

## Checks that passed without change
- Backdrop is a child of #tv, 1920 by 1080, z-index 40, above header (30) and footer with rail (32); live arrival at 41. All 11 waves run under it (writer test, rerun).
- Gap phase between chained arrivals keeps `.event-stage.active`, so the backdrop does not flicker inside a chain.
- Cannot outlive the arrival: visibility is gated on `#tv:has(.event-stage.active)`. New tests push a quiet update and an unavailable (stale or offline) update mid arrival, single and group: the event stage loses `active`, has zero children, no orb or `data-event-id` remains, no "Sample n.n" text remains anywhere in #tv, backdrop opacity reaches 0 and the element is gone. Privacy hides use the same `clearPresentation()` and `cancelActiveEvent()` paths. The backdrop itself holds no text.
- Countdown ring: hidden whenever `active` or `transition` is set (core/chrome.js), so it never paints over the backdrop during an arrival. Transitions spec passes, 7 of 7.
- No dependence on the stage's overflow: the backdrop and the event stage are siblings of #stage under #tv; high z-index scene parts stay inside #stage through its `isolation:isolate`. renderer.css and core/stage.js untouched (empty diff against 3d4b459).
- Timing, orb, ring, shimmer, exit flight: unchanged in code; timing test passes.
- Reduced motion and still mode: static backdrop at opacity 1, rays present, `animation-name: none`.
- Allowlist respected in both commits. No em dash or en dash in the four files.
- Assertions can fail: with the writer's CSS restored, the new frame test failed on the radius (received 0, expected at least 36); with only the radius added, it failed on "single Aurora panel mean luminance" (received 0.6445, expected above 0.7). Files restored after each run.

## Changed in a87fed1
- public/color-polish/scenes/arrival.css: Aurora ribbons and stars, frame radius, rays and wash, caption z-index.
- public/color-polish/scenes/arrival.js: backdrop removes itself on the end of its fade out.
- tests/color-polish-scenes/arrival.spec.ts: 4 safe mode tests, 1 all frame styles capture and luminance test, G3 poll.

## Command results (run from the worktree, npm_config_cache=/tmp/npm-cache)
- npm run typecheck: exit 0.
- npm test: 39 files passed, 222 tests passed.
- npm run build: exit 0.
- npx playwright test tests/color-polish-scenes/arrival.spec.ts tests/color-polish-scenes/transitions.spec.ts --workers=1: 30 passed (6.1m); 23 arrival, 7 transitions. First full run was 29 passed, 1 failed (finding 6), then fixed and rerun.
- No server was needed or started: these specs serve public/color-polish from disk through Playwright routing, so PLAYWRIGHT_BASE_URL pointed at an unused port (3211) only to skip the config's own web server. Nothing left listening.

## Captures
/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L11/reviewed (24 PNGs): the writer's 16 moments again with the corrected look, plus 8 new: every frame style (Light beam, Petal curtain, Aurora, Constellation gather) for single and group at 1920, named w1920-<kind>-frame-<n>-<style>.png.

## For Anthony
- Not deployed. Your own look on the church TV is still the real check.
- Two optional taste calls, both small: hide the "waiting" pill during the entrance, and let the rose and gold panel melt fully into the sky.
- The old tracked screenshots under docs/runs/2026-09-12-tv-next-level/logs/arrival still show the dark look; an existing test rewrites them on every run and they were restored, not committed.
