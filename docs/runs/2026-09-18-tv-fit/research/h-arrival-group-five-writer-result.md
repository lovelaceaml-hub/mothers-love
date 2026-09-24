# Lane H: Entrance, group of five (writer result)

Branch `tv17/h-arrival-group`, commit **bfcaab3**, worktree `/Users/anthony/.claude/worktrees/mothers-love-tv17-h-arrival-group`. Not pushed, not merged, nothing deployed.

## Chosen size and measured text
- Drawn bubble: **240 px** at 1920 (480 px at 3840), down from 300 px. Layout size moved to 240 as well, so the drawn over layout factor is 1.0 and every word is drawn at the size it is laid out at.
- Measured smallest drawn message text at 1920: **18.5 px** (recipient 26 px); at 3840 it is 37 px and 52 px. The hard floor inside `fitCircle` is 18 px, so the worst case for a long group message is exactly 18 px drawn at 1920, which still holds Anthony's floor. Going below 240 drawn would push that worst case under 18 px, which is why 240 is the size chosen.
- No message is truncated or ellipsized: anything that does not fit at once still pages, verbatim.

## Arrangement (frame coordinates inside the 1812 by 972 arrival frame, TV adds 54,54)
- `ARRIVAL_GROUP.slots = [[386,264],[906,264],[1426,264],[646,716],[1166,716]]`, a 3 over 2 stagger centred on the group centre (cx 906, cy 490).
- Measured live at 1920 in TV units: (441,320), (962,319), (1479,316) on the upper row, (699,773), (1222,768) on the lower row. Closest centre to centre distance is about 515 px against a 240 px bubble, so no bubble touches another, the title, the caption, the waiting pill or the caption band.

## Changed files
- `public/color-polish/scenes/arrival.js`: group size constants (240 layout, 240 drawn, five slots), caption title for style 5, five slot arrival orders, style 4 sway sign, scene copy wording.
- `public/color-polish/core/arrivals.js`: group fires on five, caption A WAVE OF FIVE, slot lookup, oversize page count now derived from the item count (three pages for five), trajectory index for pair pages.
- `public/color-polish/core/chrome.js`: five queue dots and "Next five release together".
- `src/components/display/color-polish-host/ColorPolishHost.tsx`: `ARRIVAL_GROUP_SIZE = 5` and its comment (drives /display?scene=arrival-group).
- `tests/color-polish-scenes/arrival.spec.ts`: group assertions updated to five and 240 (exact drawn size at both widths, circle overlap check, 3 over 2 stagger, text floor, paging over three pages) plus three new tests (wave of five renders five ids once with every word on screen, oversize paging reaches all five messages, fewer than five arrive as singles).
- `tests/display/scene-link.test.ts`: the two assertions that named ten (`ARRIVAL_GROUP_SIZE` and the thin snapshot size).

## What was run
- `npm run typecheck`: clean.
- `npm test`: 255 of 255 passed (run before the last two small edits, which were an entrance order constant and test-only changes).
- `npm run build`: clean, run after the final edits (exit code 0, all routes built).
- Captures (production build, synthetic public config, own port 3188 so no other chat's server was touched):
  - `/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/h-arrival-group-five-1920.png`
  - `/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/h-arrival-group-five-3840.png`
  - Both were inspected: five smaller bubbles, 3 over 2, every word inside its bubble, title, A WAVE OF FIVE caption, and a five dot waiting pill reading "Group of 5 on screen".

## What was skipped, on Anthony's mid-lane ruling to get this visible fast
- The full `tests/color-polish-scenes` folder run was **not run in this lane**. The integration lane runs it before release.
- `tests/color-polish-scenes/arrival.spec.ts` was **not run to completion** against the final code. Its last partial run had one failure in `the four reworked entrances start deep and resolve flat`, caused by the five slot arrival order for group style 4; the order was changed to `[0,3,4,2,1]` and the test's copy of it updated so both depth checks separate again, but that fix has not been re-run. One other new test had a first run failure because it read `active.items` instead of the exposed `active.ids`; that is also fixed and unverified.
- Limitation to carry: the spec edits in this commit are unverified. Run `bash .tv17/verify-studio.sh tests/color-polish-scenes` in the integration lane before release.

## Round 2 (commit 0074a81)

Anthony saw only 2 bubbles on the preview because his real recognitions are long, so the oversize pair pages took over the wave. Fixed.

- **All five always together.** `oversize` is now always false for a wave, so the two at a time pair pages are never reached (`buildGroupPage` is left in place but unreachable). A long message flips through its own reading pages inside its own bubble, verbatim, never truncated or ellipsized.
- **Chosen diameter: 400 px drawn, laid out at 300** (drawn over layout 1.333), up from 240. Slots in frame coordinates (1812 by 972, TV adds 54,54), a 3 over 2 stagger centred on the group centre cx 906, cy 500: `[[286,340],[906,340],[1526,340],[596,660],[1216,660]]`. Neighbour gap 220 px in a row and about 45 px on the diagonal, ring glow clear of the title by about 29 px, of the waiting pill by about 51 px, of the bottom caption by about 40 px and of the frame edge by about 51 px.
- **Smallest drawn text at 1920: 24.0 px** for a long message (the 18 px layout floor times 1.333) and 24.7 px for a short one; recipient 34.7 px. Both are well above the 18 px floor, and twice that at 3840.
- **Hold fix:** the wave hold counted a per page floor of 8 seconds while the page cycler uses 9, so the last page of a 4 page message could never come up. The hold now counts the same 9 second floor for any multi page bubble. Measured: 30 s for five short messages, 36 s for five 400 to 500 character messages (4 pages).
- **Ran:** `npm run typecheck` clean, `npm run build` clean (both after the final edit). Two captures at 1920, inspected: `/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/h-arrival-group-five-r2-short-1920.png` and `.../h-arrival-group-five-r2-long-1920.png`. The long one uses a 27 character name and a record with five expressions; all five bubbles show, every message pages inside its own bubble (01 / 03 and 01 / 04 CONTINUED), nothing is clipped.
- **Skipped:** no unit tests, no playwright spec runs, no test edits, per Anthony's speed ruling.
- **Stale tests for the integration lane to fix (do not assume they pass):** in `tests/color-polish-scenes/arrival.spec.ts` the `GROUP_LAYOUT` and `GROUP_DRAWN` constants are still 240, which stales "the four reworked entrances start deep and resolve flat", "a wave of five draws five smaller bubbles, one per recognition, with every word on screen" and the group branch of `expectFullScreenComposition` (exact diameter, drawn over layout, and the vertical centre tolerance of 12 against the new centre at TV 554); "arrival records log exactly one arrival_record_shown per record for single arrival and oversize group wave" still expects three pair pages; and "a 500 grapheme message fits whole on the full screen single orb and the group pairs" still measures the group wave as a `pair`.
