# L8 review: Goal, fuller swirl (Fable 5.1, single review, corrections made by the reviewer)

Plan goal line: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."

Owner's words for this lane: "On the goal page, the swirling recognition needs to be fuller, with more bubbles."

Reviewed: branch `tv17/goal` in `$HOME/.claude/worktrees/mothers-love-tv17-goal`, writer commit 18d4997 on 71bf3f8.
Review commit: **89e9ab8** on `tv17/goal`. Files changed, all inside the allowlist:
`public/color-polish/scenes/milestone.js`, `public/color-polish/scenes/milestone.css`, `tests/color-polish-scenes/milestone.spec.ts`.

## Verdict

The writer's swirl was fuller but it was a pile. Corrected in this review. The corrected swirl is as full as the writer's, readable, inside the panel, and cheaper to draw than the scene was before the lane. Ready for Anthony's look on the TV.

## How it was measured

One measurement, run in headless Chromium against three versions of the scene (before the lane 71bf3f8, the writer's 18d4997, the reviewed scene), 48 record studio sample, 1920 wide, stepped one second at a time through a 60 second showing (61 samples). "Near" means a pearl drawn at depth 0 or more. "Covered" is the share of a near pearl's words (phrase and name boxes, sampled on a grid) lying under a pearl drawn in front of it. "Clear" means at most a tenth covered.

| | before the lane | writer 18d4997 | reviewed 89e9ab8 |
| --- | --- | --- | --- |
| pearls mounted | 26 | 52 | 52 |
| drawn at once, fewest / most / mean | 5 / 15 / 10.1 | 12 / 27 / 20.3 | 19 / 24 / 21.0 |
| near pearls' words covered, mean | 0.26 | 0.50 | 0.07 |
| near pearls more than half covered, mean per second | 0.6 | 3.0 (of 5.9) | 0.2 (of 3.0) |
| near pearls with clear words, fewest / most / mean | 0 / 3 / 1.4 | 0 / 4 / 2.1 | 1 / 5 / 2.7 |
| copies of one record drawn touching (pair samples) | 0 | 22 | 0 |
| copies of one record both near the front | 0 | 6 | 0 |
| most pearls drawn on one record at once | 1 | 2 | 1 |
| pearls cut by a panel edge | 0 | 0 | 0 |
| pearl edges reached, in the 1162 px panel | 115 to 1085 | 88 to 1089 | 67 to 1097 |

## Findings

1. **Blocking: the scene sat with most near words covered.** Writer's swirl: near pearls' words 50 percent covered on average, 3.0 of 5.9 near pearls more than half covered at a typical second, and seconds with no clear near pearl at all. Cause: every pearl took the full turn, and a pearl is at its largest exactly where it crosses the centre line, so 52 of them stacked in the middle (see `captures/L8/after/w1920-ms14000/milestone.png`). Doubling the count had raised clear pearls only from 1.4 to 2.1.
2. **Blocking: near half words under 18 px.** On the near half of the writer's swirl (and of the scene before it) words drew from 15.5 px, because the turn was centred behind the panel plane (depth offset 110 to 175 behind).
3. **Major: copies of one record side by side.** With 48 records and 52 pearls the writer allowed two pearls per record chosen at random: 22 touching pair samples and 6 samples with both copies near the front in one showing. With 6 records it allowed three per record.
4. **Major: frame cost.** Measured, not estimated (see below): the writer's scene ran at well under half the frame rate of the scene before the lane. The writer's filter cache did little, since the filter string changed almost every frame.
5. Minor: the writer's comment spoke of "three radius bands" that the code did not have. Replaced.
6. Holds, checked: left column untouched (no left column rule changed, captures identical), opaque pearls, edge fades, no pearl cut at any edge at any of the 61 seconds at 1920 or the four checkpoints at 3840, reduced motion, dwell read from state (`visualState().dwell[11]`), allowlist respected, no em dash or en dash in the three files.

## What I changed

- **Two layers, same 52 pearls.** 24 reading pearls take the full turn as one even helix (same rise and turn, a golden angle apart, turn centred on the panel plane), so the pearls that are near at the same moment are spread across the panel instead of stacked. 28 depth pearls stay behind them the whole way round, small and soft, out to the sides of the panel; they can never cover a reading pearl on its near half. This is the coordinator's direction made structural: near pearls are for reading, far pearls are decoration.
- **Word sizes, final numbers.** Near half reading pearls (scale 1 or more): 18.0 px or more at 1920, 36.0 at 3840, up to 27 px at the front. Smallest words anywhere: 11.1 px at 1920 (22.2 at 3840) on the furthest depth pearls, against 10.7 px before the lane. Depth pearls run 11.1 to 15.7 px and never come forward. Reading pearls on their far half run 13.4 to 18 px.
- **Copies.** A record holds at most two pearls (three only when the pool is 3 records or fewer). The two copies are always one reading pearl and one depth pearl, never two in one layer while another record exists, and they are placed half the loop apart in height; all pearls now rise at nearly the same speed (23 to 24.5 px a second) so that gap holds for the whole showing. A re-entering pearl takes a record nobody holds, else the record whose holder is furthest away. Measured at pools of 2, 6, 12, 26, 30, 40 and 48 records: zero touching copies and zero near copies at every pool; for 6 records and up, a record was never even drawn twice at the same moment. A pool of 6 now mounts 12 pearls (was 18) and draws 4 to 6.
- **Frame cost.** Fully faded pearls (more than half of them at any moment) are hidden, so nothing is painted or filtered for them. The per frame drop shadow filter became a box shadow on the round node (same offset, blur and colour; it scales with the pearl). Near pearls now carry no filter at all; blur and tone on far pearls are stepped and only written when the step changes.
- **Spec.** `MIN_DRAWN_PEARLS` 11 to 16, `MAX_PEARLS_PER_RECORD` 3 to 2, small pool 18 to 12 mounted and 5 to 4 drawn. New assertions in the 60 second test: near words 18 px or more, no words under 11 px, at least one near pearl with clear words at every second, mean covered share 0.2 or less, no touching copies, no two near copies. The 3840 test asserts the sizes (36 and 22 drawn) and no touching copies; the small pool test asserts no touching and no near copies. Run against the writer's scene the two swirl tests fail (drawn minimum 12 against 16; 18 mounted against 12), and by the measurement above the covered share (0.50 against 0.2) and touching copies (22 against 0) would fail too.

## Frame cost, measured

Headless Chromium on this Mac, CPU throttled 4 times, live animation for 12 seconds, three interleaved rounds while other agents loaded the machine (load average 10 to 31). Software rendering, so only the comparison means anything, not the absolute numbers.

| | frames per second, three rounds | median frame, ms |
| --- | --- | --- |
| before the lane, 26 pearls | 14.0, 10.9, 9.4 | 67 to 91 |
| writer, 52 pearls | 8.8, 3.2, 8.9 | 108 to 242 |
| reviewed, 52 pearls | 19.5, 18.0, 19.1 | 50 to 51 |

Script time per frame is small in all three (0.3 to 0.6 ms throttled); the cost was paint and filters. I kept 52 pearls because the reviewed scene is cheaper than what the TV already runs. Not measured on the church TV itself.

## Command results

From `$HOME/.claude/worktrees/mothers-love-tv17-goal`, synthetic public config only (`https://synthetic-project.supabase.test`, `synthetic-publishable-key`), own dev server on port 3188, stopped afterwards (port confirmed free). `.env.local` never read or copied. No database touched. Nothing deployed.

- `npm run typecheck`: passed, no output.
- `npm test`: 39 files, 222 tests passed.
- `npm run build`: compiled successfully, no errors or warnings.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3188 npx playwright test tests/color-polish-scenes/milestone.spec.ts --workers=1 --timeout=180000`: **17 passed (3.2 m)**, first run, no retries.
- Probe, 8 runs (1920 and 3840, 0, 6000, 14000, 21000 ms): no issues reported by any run.

## Captures

Reviewed Goal captures: `$HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L8/reviewed/w<1920|3840>-ms<0|6000|14000|21000>/milestone.png`.
Compare with the writer's `.../captures/L8/after/` and the look before the lane `.../captures/L1/after3/w1920-ms6000/milestone.png`. I looked at the PNGs at both widths: full across the right side, several whole readable pearls at once, smaller soft pearls filling behind and at the sides, left column unchanged.

## What the owner should know

1. The writer's question is answered by the coordinator's direction and is closed: near pearls read at 18 px or more, far pearls are decoration at 11 px or more. No owner decision is pending.
2. The swirl now has a steadier look: reading pearls rise together as one turning helix rather than overtaking each other. Depth pearls still turn at their own speeds. This is a visible change of character from the writer's version and from before the lane, made to stop the pile. It is Anthony's call on the TV.
3. The largest near pearls (scale up to 1.51, about 355 px) start their edge fade as soon as their rim nears the panel's top or bottom, so a very large pearl can look partly see through for a second or two while entering or leaving (visible in a 14 s frame). That is the decision 6 edge fade, unchanged by this lane and present before it.
4. Nobody has watched this on the church TV yet.
