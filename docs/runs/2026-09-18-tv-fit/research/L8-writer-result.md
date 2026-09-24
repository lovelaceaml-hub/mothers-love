# L8 writer result: Goal, fuller swirl (fresh Claude Opus 5)

Facts only. Fable 5.1 reviews.

Branch `tv17/goal` in `/Users/anthony/.claude/worktrees/mothers-love-tv17-goal`, cut from tv17/fit 71bf3f8.
Anthony's words this lane answers: "Goal page: the swirling recognitions need to be fuller, with more bubbles."

## Changed files

- `/Users/anthony/.claude/worktrees/mothers-love-tv17-goal/public/color-polish/scenes/milestone.js`
- `/Users/anthony/.claude/worktrees/mothers-love-tv17-goal/tests/color-polish-scenes/milestone.spec.ts`

`public/color-polish/scenes/milestone.css` is in the allowlist and is unchanged: the pearl stays 236 px, because
that is the size its words need (see "Pearl size" below). Nothing outside the allowlist was touched.

## What changed in the scene

1. The swirl carries 52 pearls where it carried 26 (`STREAM_TARGET`), capped by the pool (see "Small pools").
2. Pearls take their phase from the golden angle instead of a random draw, so they spread around the helix
   instead of clumping into one crowd in the middle of the panel.
3. The turning radius is drawn from the square root of a flat number between 150 and 405 px, so pearls spread
   evenly over the whole turning area. A flat radius put as many pearls in the narrow middle ring as in the wide
   outer one, which is what left the sides bare. 405 px is the widest radius at which a pearl's own drawn edge
   plus its wobble still stays inside the panel's 581 px half width at every angle and depth: the worst case,
   computed over the whole depth and angle range, measures 566 px from the centre line.
4. The swirl, the light currents and the sparks turn about the panel's centre line (0.50) instead of 0.52.
5. Pearls enter and are recycled `STREAM_EDGE` (180 px) outside the panel, and their starting positions are
   spread over that same travel, so the mounted spread and the recycling loop agree.
6. The per frame filter string (blur, contrast, brightness, drop shadow) is only written when it actually
   changes. With twice the pearls that string was the costly part of the frame.

Untouched: pearl size and styling, opaque pearl fill, the edge fade band (`STREAM_FADE_BAND` 40 px) and the
no-crossing behaviour, depth range, blur and tone, reduced motion, the left column, the header, the feed rail,
the QR, playlist order, click-advance, and every scene duration (the specs read the dwell from state).

## Before and after bubble counts

Same 48 record studio sample, same fixture, same measurement, 1920 wide, sampled once a second across a whole
60 second showing (61 samples). "Drawn" means a pearl whose effective opacity is above 0.1.

| | before (71bf3f8) | after |
| --- | --- | --- |
| pearls mounted | 26 | 52 |
| drawn at once, fewest | 5 | 12 |
| drawn at once, most | 15 | 27 |
| drawn at once, mean | 10.1 | 20.4 |
| most pearls on one record at once | 1 | 2 |
| pearls cut by the panel edge | 0 | 0 |
| leftmost and rightmost pearl edge reached, in the 1160 px panel | 115 and 1083 | 88 and 1088 |

After series, drawn per second:
`[21,21,22,23,21,23,19,20,19,19,18,18,19,20,18,18,15,15,18,18,15,16,14,12,13,18,19,22,24,24,26,25,25,27,26,27,26,24,22,23,24,25,24,23,21,23,20,18,19,19,18,17,18,18,19,19,18,22,20,22,22]`

Before series, drawn per second:
`[11,11,12,11,13,13,12,11,12,12,11,10,10,12,13,13,13,11,10,10,10,9,8,7,8,7,7,6,5,5,7,7,10,10,9,8,7,8,9,9,10,11,11,13,15,14,14,14,14,14,12,11,11,9,9,8,8,9,9,8,8]`

Read plainly: the mounted count is exactly doubled and the count actually on screen is roughly doubled
(mean 10.1 to 20.4). The extreme left and right reach was already close to the panel edges before this lane;
what changed there is how often pearls are out at the sides rather than stacked in the middle, which is what
the capture pairs show.

With the six record mostly-long fixture the scene mounted 6 pearls and drew 1 to 3 at a time; it now mounts 18
and drew 5 or more at every sample of a 30 second run.

## A record on more than one pearl at once

Before this lane a record could not appear twice at once: `mountTributes` capped the swirl at the pool size
(`Math.min(26, pool.length)`) and both the mount loop and the recycle draw excluded every id already on screen.
Measured: most pearls on one record at once was 1, on both fixtures, at every sample.

Now a record can hold more than one pearl, but only when the pool is smaller than the swirl. The cap is
`ceil(pearls / pool)` limited to 3 (`STREAM_MAX_COPIES`), and the mount assigns records in whole passes over the
pool, so a record's copies sit a full pass apart in the swirl rather than side by side. The recycle draw honours
the same cap. Measured: 48 records and 52 pearls gives a cap of 2 and at most 2 pearls on one record at once;
6 records gives 18 pearls, a cap of 3, and at most 3. A pool of 52 or more records gives 52 pearls, cap 1, and
no record twice, exactly as before.

## Spec

`tests/color-polish-scenes/milestone.spec.ts`, three new tests plus two edits to existing ones.

New, with the stated minimums as named constants (`MIN_MOUNTED_PEARLS` 52, `MIN_DRAWN_PEARLS` 11,
`MIN_MEAN_DRAWN_PEARLS` 18, `MAX_PEARLS_PER_RECORD` 3):

- "the swirl is full: at least 11 pearls drawn inside the panel, none cut at its edges, for a whole 60 second
  showing". The showing's length is read from state (`visualState().dwell[11]`), never written into the file;
  the fixture sets the milestone playlist entry to 60 seconds and the test asserts state agrees. It steps the
  whole dwell one second at a time and asserts: 52 or more pearls mounted; at least 11 drawn at every second and
  at least 18 on average; no drawn pearl crossing the panel's top, bottom, left or right edge; no record on more
  than 3 pearls; no drawn pearl standing still between one second and the next; more records than the minimum
  passing through during the showing; and `textFits` empty at four checkpoints across the dwell.
- "at 3840 the swirl carries the same pearls ... at 0, 6, 14 and 21 s": the same count, edge and `textFits`
  assertions at the 4K viewport.
- "a pool smaller than the swirl still fills the panel, and a record never takes more pearls than the pool
  needs": six records, 18 pearls mounted, at least 5 drawn at every second of 30 seconds, no crossings, at most
  3 pearls per record, `textFits` empty.

Edits to existing tests, no assertion weakened:

- "the stream is dense, continuous and individual" matched pearls across checkpoints by record id. A record can
  now hold more than one pearl, so it matches by the motion triple (rise, radius, turn) that the same test
  already asserts is unique per pearl.
- That test and "extreme depth" now stop the renderer frame's own animation loop inside the renderer frame only,
  so their checkpoints measure the time they step rather than the time the machine took to answer. Without it
  both are wall-clock sensitive, which on a loaded machine made "moved down" stop meaning "recycled at the top".
- "mostly-long fixture ..." and "tribute pearls are fully opaque ..." had their time budgets raised from 120 s to
  240 s, because the same steps now move 52 and 18 pearls instead of 26 and 6. Assertions unchanged.

These assertions can fail: run against the unchanged scene, mounted is 26 (needs 52), the drawn minimum is 5
(needs 11) and the mean is 10.1 (needs 18). Both numbers above were measured that way, by putting the HEAD
version of milestone.js back in place and running the same measurement.

## Verification, exact results

Run from `/Users/anthony/.claude/worktrees/mothers-love-tv17-goal`, with this lane's own dev server on port 3188
(`npx next dev --hostname 127.0.0.1 --port 3188`, stopped afterwards) and synthetic public config only
(`NEXT_PUBLIC_SUPABASE_URL=https://synthetic-project.supabase.test`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=synthetic-publishable-key`, `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3188`).
`.env.local` was never read or copied. `npm ci` was run in this worktree with `npm_config_cache=/tmp/npm-cache`.

- `npm run typecheck`: passed, no output (tsc --noEmit; tsconfig includes `tests/**/*.ts`).
- `npm test`: passed, 39 test files, 222 tests.
- `npm run build`: "Compiled successfully in 15.6s", no errors or warnings.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3188 npx playwright test tests/color-polish-scenes/milestone.spec.ts
  --workers=1 --timeout=90000 --retries=1`: **17 passed (3.1m)**, no test used its retry, no flaky line.
- Probe captures, all eight, no issues reported by any run:
  `node scripts/color-polish-renderer-probe.mjs . <out> --width=<1920|3840> --ms=<0|6000|14000|21000>` into
  `/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L8/after/w<width>-ms<ms>/`
  (each folder holds every scene; Goal is `milestone.png`).

Earlier full-file runs on this Mac failed 3 to 7 tests, every one a timeout or a sign-in timeout, while three
other lanes were running Playwright at the same time (load average above 400 and a 20 minute file). Each of
those tests was re-run on its own and passed, and the final run above, taken when the machine was free, passed
all 17 in 3.1 minutes.

## Before and after captures

- Before, the current live look this lane started from:
  `/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L1/after3/w1920-ms6000/milestone.png`
- After: `/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L8/after/w1920-ms6000/milestone.png`
  and the seven others under `.../captures/L8/after/`.

## Pearl size, and why nothing shrank

A sweep in the browser, using the renderer's own pearl markup and this run's own geometry (every rendered line
inside the circle by at least max(3 percent of the diameter, 12 px)), measured the worst case of all nine
catalog phrases against a long name at diameters 184 to 236 px. 236 px is the only size that fits, with 3.5 px
to spare; 226 px misses by 1.5 px and 200 px by 17.7 px. So more bubbles could not come from smaller bubbles,
and the count came from the swirl's own spread instead.

## Limitations

1. More pearls in the same panel means more of them pass in front of each other. Pearls are opaque by Plan 17
   decision 6, so a pearl behind can have part of its words covered by the one in front while it passes. Every
   pearl's own words fit inside its own rim (that is what `textFits` asserts, and it is empty at every
   checkpoint at both widths); what a nearer pearl covers is not measured by any test. This is visible in the
   captures, for example `w1920-ms14000/milestone.png`. It was already true of the 26 pearl swirl and is more
   frequent now.
2. The swirl's count varies across a showing: 12 at its thinnest and 27 at its fullest over the 60 seconds
   measured. The thin moments are the pearls' own different rise speeds drifting out of their even start, not a
   gap in the supply of records.
3. The scene now restyles 52 elements per frame instead of 26. The filter string is cached so it is only written
   when the depth it draws changes, but no frame-rate measurement was taken on the church TV hardware. Nobody
   has watched this on the TV yet; that is Anthony's approval step.
4. Verification ran on a machine shared with three other lanes' Playwright runs, so the timings above are not
   comparable to a quiet machine.

## QUESTION FOR ANTHONY

On the Goal swirl, a pearl's words are drawn smaller the further back it is: measured at 1920, the phrase text
runs from about 11 px on the furthest pearls to about 29 px on the nearest. That is how this scene has always
worked (before this lane it was 11.4 to 27.8 px), and it is separate from the 18 px floor, which the fit rules
place on recognition message text, which Goal pearls do not carry: they show the catalog phrase and the name.
Holding a true 18 px floor on the far pearls would mean giving up the depth that makes this a swirl, or making
every pearl far larger, and either one undoes "fuller, with more bubbles".

Which do you want on the Goal screen: the fuller swirl as delivered, with the far bubbles' words small, or
fewer and bigger bubbles whose words are all readable from across the room?
