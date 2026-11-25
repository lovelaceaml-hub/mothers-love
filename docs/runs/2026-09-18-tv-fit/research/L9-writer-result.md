# L9 writer result: Peacemakers, one reserved long bubble

Writer: fresh Claude Opus 5. Worktree `$HOME/.claude/worktrees/mothers-love-tv17-peacemakers`, branch `tv17/peacemakers`, cut from `tv17/pick` 3d4b459. Facts only, no verdict.

## Changed files

- `$HOME/.claude/worktrees/mothers-love-tv17-peacemakers/public/color-polish/scenes/peacemakers.js`
- `$HOME/.claude/worktrees/mothers-love-tv17-peacemakers/public/color-polish/scenes/peacemakers.css` (comment only; the scene still needs no rules of its own)
- `$HOME/.claude/worktrees/mothers-love-tv17-peacemakers/tests/color-polish-scenes/peacemakers.spec.ts`

Nothing outside the allowlist was touched. `git status` in the worktree lists exactly these three files. No core change was needed.

## What the scene now does

1. Four bubbles: one reserved large bubble and three regular bubbles.
2. "Very long" is measured, not guessed. `peacemakersFitsWhole(record, diameter)` builds an offscreen copy of the real orb inside `#stage`, applies exactly the inline styles `core/orbs.js` `fitCircle()` applies (80 percent content width, 0.855 diameter height limit, the long-name and many-chip adjustments, the sub-335 px small-bubble adjustments), sets the message to the 18 px floor and compares `scrollHeight` with the limit. `fitCircle()` steps its font down and stops as soon as the content fits, so "fits at the floor" is exactly "the renderer will draw this message whole in a bubble this size". A record is very long when it does not fit the largest regular bubble (312 px).
3. The reserved bubble is the only bubble a very long recognition is ever placed in, at first render and at every replacement. Each regular bubble is only given a record that fits that bubble whole; if none is left, that bubble is left out rather than shown clipped.
4. With no very long recognition in the pool, the reserved bubble shows a regular message. It is never empty.
5. Several very long recognitions take turns in the reserved bubble, in `choose()`'s own least-recently-shown order.
6. Grapheme counts use `Intl.Segmenter` (`peacemakersGraphemes`), with a code-point fallback.
7. The title copy, the globe artwork, the bubble styling, the keep-out box, the drift replacement engine and the floater motion are the live Plan 12 ones, unchanged. The reserved bubble is the one bubble that holds still (`mount` sets `actor.large` by slot instead of by the core's `smallFits()` heuristic, so a regular bubble still drifts whatever the length of the message it fits whole).

## Reserved bubble size and font steps

Design stage is 1812 x 636 (`renderer.css .stage`); the TV scales it, so 18 px here is 36 px on a 3840 screen.

- Reserved bubble: x 1168, y 32, diameter 572. It clears the heading block (which ends at x 841), the globe artwork (which ends at x 875), the three regular bubbles, and the countdown ring (stage x 1756 to 1792), with 32 px top and bottom margins. Live's single reader bubble is 586 px; 572 is the largest circle that still leaves room for the other bubbles.
- Regular bubbles: 860, 14, 312 / 860, 326, 304 / 528, 320, 295 (production's diameters).
- Font in the reserved bubble, measured from the renderer (message font size, pages, read seconds), with ordinary two-chip records:

| graphemes | font | pages | read seconds | dwell |
| --- | --- | --- | --- | --- |
| 37 | 28 px | 1 | 9.00 | 60 |
| 250 | 28 px | 1 | 17.86 | 60 |
| 320 | 28 px | 1 | 22.86 | 60 |
| 360 | 27 px | 1 | 25.71 (computed) | 60 |
| 400 | 26.5 px | 1 | 28.57 | 60 |
| 480 | 23.5 px | 1 | 34.29 (computed) | 60 |
| 500 | 23 px | 1 | 35.71 | 60 |

The 37, 250, 320, 400 and 500 rows are the scene's own `peacemakers_reserved` log line, written after the renderer measured the bubble. The 360 and 480 rows are from a rotation later in the same scene, where the font and page count were read from the rendered bubble and the read seconds follow the core's own `max(9, characters / 14)`.

A 500 grapheme message fits whole at 23 px, which is 46 px on a 3840 TV. The 18 px floor is never reached, no message was paginated in any case tested, and no page indicator was ever shown. Paging inside the reserved bubble therefore did not occur; the core's pagination remains the last resort if a future message cannot fit.

Measured very-long threshold at the largest regular bubble (312 px), same record shape: 160 and 190 graphemes fit whole; 250, 320, 360, 400, 480 and 500 do not, so they can only appear in the reserved bubble.

The dwell is read from state (`S.dwell[S.s] ?? DWELL[S.s]`), never hardcoded; a spec case sets the peacemakers playlist entry to 45 seconds and the scene reports 45.

## Exact command results

Run from `$HOME/.claude/worktrees/mothers-love-tv17-peacemakers` with `npm_config_cache=/tmp/npm-cache`. `npm ci` completed with exit code 0 before any of these.

- `npm run typecheck`: exit 0, no diagnostics.
- `npm test`: 39 test files passed, 222 tests passed, 0 failed (12.02 s).
- `npm run build`: exit 0, Next 16.3.4 production build completed.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3193 npx playwright test tests/color-polish-scenes/peacemakers.spec.ts --workers=2`: 17 passed, 0 failed (39.8 s).
- Probe, 8 runs: `node scripts/color-polish-renderer-probe.mjs . <out>/w<width>-ms<ms> --width=<1920|3840> --ms=<0|6000|14000|21000>`. Every run reported `"issues":[]` and all ten scenes rendered.

Note on the Playwright run: `PLAYWRIGHT_BASE_URL` points at an unused port so that `playwright.config.ts` starts no dev server. The spec's `loadRenderer` harness intercepts every request and serves `public/color-polish/**` from disk, so no server is needed, and several other writers were running on this Mac at the time (load average peaked above 400). Per-test timeouts in this spec were raised to 150 s for that reason; the final run's slowest test took 8.2 s.

Assertions were checked for the ability to fail, by mutation:

- Removing `integrate: peacemakersIntegrate` from the scene descriptor: "with three very long recognitions at once, they take turns in the reserved bubble" failed with three very long recognitions on screen at once instead of one.
- Changing the reserved diameter from 572 to 420: "with an all-short pool ..." failed on the diameter, and "at 3840 the message still draws at or above the 36 px floor" failed with 2 pages instead of 1, which is also direct evidence that 572 is needed for a 500 grapheme message to fit whole.

Both mutations were reverted; the committed file is the 572 px, guarded version that passed 17/17.

## Captures

`$HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L9/after/w<width>-ms<ms>/peacemakers.png` for widths 1920 and 3840 at ms 0, 6000, 14000 and 21000 (each folder also holds the other nine scenes and `result.json`). This path is excluded from git in the main checkout, as Lane 3's captures are.

The renderer probe's sample pool holds only 74 to 90 character messages, so these captures show case 4 above: the reserved bubble holding a regular message, with three regular bubbles drifting. The very long cases are covered by the spec, not by these captures.

## Spec cases

17 cases in `tests/color-polish-scenes/peacemakers.spec.ts`, all behavior tests through the renderer DOM:

- all-short pool: four bubbles, one reserved at 1168/32/572, three regular at their diameters and positions, reserved not empty and not very long, four distinct records.
- one 250, one 400 and one 500 grapheme message: the reserved bubble's font steps down as the grapheme count rises, never below 18, always one page.
- 500 graphemes: whole, one page, no page indicator, no overflow, read seconds within the scene's own dwell.
- mixed pool with 250, 400 and 500: exactly one very long record on screen, in the reserved bubble; every bubble shows its whole message with no pagination and no overflow.
- three very long at once: they take turns in the reserved bubble (at least two distinct ones seen), never more than one very long on screen, every message whole at every step.
- the reserved bubble keeps its message when no very long recognition is waiting, with zero `bubble_exit_start` entries for it over 40 seconds.
- the reserved bubble holds still while the other bubbles drift.
- 3840: the message draws at or above the 36 px screen floor, one page, no overflow.
- dwell read from the snapshot (45 seconds fixture).
- the reserved bubble's box clears the heading, the globe artwork and every other bubble.
- carried over from Lane 3: production title copy and globe artwork, circularity at 0.3, 6, 14 and 20 seconds, no scene overflow, reduced motion still, the scene 8 keep-out box, drift retirement followed by a new bubble, and no live network request.

The Lane 3 case "a long message is shown alone in one large reader slot about 586 px wide" was removed: it asserted the live behavior Anthony has now replaced (a long message taking the whole right side and hiding the other recognitions).

## Limitations

1. The reserved bubble turns over only for another very long recognition. It does not trade one regular message for another. Reason: it is the biggest thing on the screen and the live drift replacement carries a bubble right off the stage and back, which left a visible hole in the first capture set at ms 21000 (that capture set was replaced). The pool only changes when a new snapshot re-renders the scene, so holding cannot hide a very long recognition that has just arrived.
2. When no remaining record fits a regular bubble whole (a pool that is almost all very long), that bubble is left out and the scene shows fewer than four bubbles rather than a clipped message.
3. The scene's fit test mirrors `core/orbs.js` `fitCircle()`'s constants. If `fitCircle()` changes its content width, height limit or floor, this scene's classification must be changed with it; the spec's whole-message and no-pagination assertions are what would catch the drift.
4. A regular bubble may now hold a message of up to about 190 graphemes, which the live renderer would have moved to the single reader bubble. That follows from the order's rule that the other bubbles take any message that fits them whole.
5. Nothing was deployed, and no physical TV check was run; that stays with Anthony.
