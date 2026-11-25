# L1 review round 5 (Claude Fable 5.1, single reviewer, corrections made directly)

Plan goal line, quoted: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."

Reviewed: commit 0a7ea0e on 71bf3f8, worktree $HOME/.claude/worktrees/mothers-love-tv17-fit, branch tv17/fit.
Result: corrected in place. Final commit 0ec1bbf on tv17/fit. No second round.
Nothing was deployed, no database was contacted, no .env file was created or copied (synthetic public config only), sample data is fictional.

## Findings on 0a7ea0e

1. Blocking. The reserved bubble was 334 px and held about 206 graphemes, so a 250 grapheme message already paged (2 pages) and 400 and 500 grapheme messages paged too. This misses Anthony's point ("they won't have many pages").
2. Blocking. With longer pools the screen emptied: 4 bubbles for the mostly long pool, 2 for every message 180 to 420 graphemes, 1 for three long messages. Regular bubbles topped out at 80 to 136 graphemes, so medium messages queued for one small reserved bubble.
3. Major. Floor risk on drift replacement: core sets a bubble's "holds still" flag once at mount and never updates it, while the fit chose the 18 px floor from the new record. A drifting bubble that received a record over 160 characters would be laid out at 18 px and then breathe down to 0.9, which is 16.2 px drawn. Not seen in the writer's runs, but nothing prevented it.
4. Major. Nothing hard kept drifting bubbles off each other's words. Core's repulsion is soft, and only large still bubbles were protected. The after5 capture at 21 s shows an entering bubble over a neighbour.
5. Minor. welcome.spec.ts:384 (speech bubbles, expected 3 got 2) is a test timing artefact, not a scene defect. Each speech bubble swaps its phrase every 6 to 9 s with a half second fade; the test read one instant (10.5 s), which lands inside the second bubble's swap. It fails the same way on the untouched base.
6. Holds: grapheme counting with Intl.Segmenter, rim geometry (every line and chip inside max(3 percent, 12 px) from the rim), no truncation or ellipsis, dwell read from S.dwell[1], cascade deleted, reduced motion, circular bubbles, sparkle, spin.

## What I changed (welcome.js and welcome.spec.ts only)

Orbit and Goal files and text-fits.ts are identical to 71bf3f8 (git diff is empty). welcome.css unchanged.

Layout, all constants, in stage px at 1920 wide:

| bubble | kind | layer | drawn diameter | home centre | free disc |
| --- | --- | --- | --- | --- | --- |
| R | reserved, holds still | near | 420, 448 or 480 | 1134, 384 | 480 |
| T1 | regular | mid | 276, 296, or 308 still | 796, 164 | 312 |
| R1 | regular | far | 276, 296, or 316 still | 1478, 168 | 320 |
| R2 | regular | near | 276, 296, or 320 still | 1618, 464 | 324 |

- Reserved bubble: 420 px up to 140 graphemes (words from 28 px), 448 px up to 280 (from 24 px), 480 px beyond (from 22 px), words stepping down by half pixels to the 18 px floor, each step checked against the text as the browser lays it out. At 480 px it uses the compact name and chips core already uses for small bubbles (26 px name, small chips) instead of the 43 px "orb-large" name, which is what makes 500 graphemes fit: measured need is 470 px compact against 502 px with the large name. Its rim is 4 px clear of the community art (art ends at x 890).
- Regular bubbles: up to 50 graphemes 276 px with words from 24 px, up to 100 graphemes 296 px from 22 px, both drifting with words never under 20 px laid out (18 px at the bottom of the breath). Past that the bubble takes its home's full size and holds still with words down to 18 px. Measured capacity at full size is about 180 graphemes (T1), 200 (R1) and about 180 to 200 (R2) for ordinary text.
- Whether a bubble holds still is now decided by the fit and written to the actor every time a record is installed (fixes finding 3).
- Every home owns a free disc that touches no other disc, the art, the speech bubbles, the title words or the stage edge. A drifting bubble is kept on a leash inside its disc (5 to 23 px depending on its size) and turns round at the end of it; a still bubble sits on its home. So settled bubbles cannot overlap (fixes finding 4). The old "push clear of large bubbles" code is deleted.
- T1 sits in the open band above the art, right of the title. The title words end near x 490; T1's rim never comes left of x 640, and its bottom stays above the art and speech bubbles (y 320 against 325 and 358). This uses space left of the x 869 line the coordinator quoted as "about"; without it only two useful regular bubbles fit beside a 480 px bubble. keepOut became two boxes (title words; speech bubbles plus art) so core does not steer T1 out of its home.
- Flights: top bubbles fly in from and out to the top, away from the reserved bubble; R2 uses the right edge; the reserved bubble turns, sparkles and fades almost in place, so a 480 px disc never sweeps across neighbours' words. Entrance and exit spin, sparkle trail, glint, depth blur and paces are unchanged.
- Selection is unchanged in spirit: the reserved bubble takes the first long message (fits no regular bubble) it can show; with none, the first message. Regular homes take the next message in rotation that fits them whole; others wait for the reserved bubble. No cascade.
- Paging: only in the reserved bubble, only when the message does not fit 480 px at 18 px, fewest pages, only if all pages finish in the time left; otherwise it waits (welcome_long_waits).

Spec: constants updated (reserved 420 to 480, regular at most 320, full screen 4); pools assert a minimum count and that nothing up to 500 graphemes pages; a synthetic "cannot fit 480 px" record (500 wide capitals, nine chips, long name) exercises paging and waiting at 30, 40 and 60 s; new layoutProblems check each second (settled bubbles never overlap each other, the title text lines, the speech bubbles, the art, or leave the stage; flying bubbles never cross the title or the word area of a settled bubble), with an anti-vacuity test that moves a bubble and expects each failure; slots carry data-welcome-reserved and the spec checks it against the size; the speech bubble test reads 9 s to 10.5 s every quarter second (max must be 3, min at least 2).

## Bubble counts per pool (spec console output, final code)

| pool | dwell | bubbles | paging | in the reserved bubble |
| --- | --- | --- | --- | --- |
| eight short (40 to 130) | 30, 40, 60 s, and 60 s at 3840 | 4 to 4 | none | short messages at 420 px |
| 250, 400, 500 plus five short | 30, 40, 60 s, and 60 s at 3840 | 4 to 4 | none | 250 and 500 took turns, whole |
| three long only (250, 400, 500) | 60 s | 1 to 1 | none | 400 and 500, whole. Pool has nothing a regular bubble can hold. |
| mostly long (53, 63, 130, 250, 400, 500) | 60 s | 4 to 4 | none | 400, 250, 500, whole |
| every message 180 to 420 (180, 200, 240, 300, 360, 420) | 60 s | 3 to 3 | none | 420 and 360, whole; 180 and 200 in regular bubbles |
| five short plus the cannot-fit record | 60 s | 4 to 4 | that record, 3 pages, finishes in time | |
| five short plus the cannot-fit record | 30 s | 4 to 4 | none, it waits | |

Lowest drawn word size seen: 18.0 px at 1920, 36.0 px at 3840, breathing and flights included.

## Command results (worktree root, npm_config_cache=/tmp/npm-cache, final code)

| command | result |
| --- | --- |
| npm run typecheck | passed, exit 0 |
| npm test | 39 files, 222 tests passed, 0 failed |
| npm run build (synthetic public config) | passed, exit 0 |
| npx playwright test tests/color-polish-scenes/welcome.spec.ts, 1 worker, production build on port 3187 | 45 passed, 0 failed (6.2 min); log .tv17/rv5/full2.txt |

welcome.spec.ts:384 now passes (finding 5). Orbit and Goal specs were not rerun since their files did not change. Server on 3187 stopped. No em dash or en dash in either changed file (checked). .tv17 scratch not committed.

## Captures (welcome.png only)

$HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L1/reviewed/ : w1920 and w3840 at ms0, ms6000, ms14000, ms21000 (sample snapshot), plus w<width>-ms6000-long-pool (500, 250, 400, 60, 90, 120, 150, 180 graphemes) and w<width>-ms30000-all-180-to-420. I looked at them: four bubbles, words whole inside every rim, nothing over the title, people, speech bubbles, header or feed rail; the 21 s frame shows a top bubble flying in with its spin. Messages that end mid word in the long pool captures are my synthetic text cut to an exact length, not truncation by the scene.

## For Anthony

1. The screen now shows four bubbles, not six: one large and three regular. That is geometry. A bubble that holds 500 characters needs about 480 px, and beside it only three useful bubbles fit, even using the open space right of the title. If he prefers more bubbles, the reserved bubble has to shrink (for example 400 px holds about 350 characters, and longer ones would page again).
2. One bubble now floats right of the title, above the people. It is about 150 px clear of the title words. If he dislikes it there, the alternative is three bubbles total.
3. A pool made only of very long messages (250 characters and up) shows one bubble at a time, since those can only go in the reserved bubble.
4. Possible later improvement, not done: wrapping text to the circle's curve instead of a rectangular column would raise every bubble's capacity by roughly 40 percent; it needs core markup changes outside this lane.
5. The physical TV was not checked.
