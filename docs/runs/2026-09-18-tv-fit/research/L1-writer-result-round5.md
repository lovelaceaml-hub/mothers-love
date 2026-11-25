# L1 round 5 writer result: Welcome, one reserved long bubble

Writer: fresh Claude Opus 5. Worktree $HOME/.claude/worktrees/mothers-love-tv17-fit, branch tv17/fit, cut from round 4 (71bf3f8). Commit 0a7ea0e.
Plan goal line, quoted: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."

Facts only, no verdict. No .env file was created or copied; nothing contacted a database; all sample data is fictional.

## Changed files

- $HOME/.claude/worktrees/mothers-love-tv17-fit/public/color-polish/scenes/welcome.js
- $HOME/.claude/worktrees/mothers-love-tv17-fit/tests/color-polish-scenes/welcome.spec.ts

Not changed: public/color-polish/scenes/welcome.css, tests/color-polish-scenes/text-fits.ts, and every Orbit and Goal file (orbit.js, orbit.css, milestone.js, milestone.css and their specs), as the order required.

## How the reserved bubble and the size steps work

### The six fixed bubbles

Welcome now draws six bubbles at six fixed homes of fixed size. Nothing in the
layout depends on which messages are drawn, so a long message cannot take,
shrink, move or page any other bubble. The round 3 and round 4 cascade (the
welcomeChooseSet shrink fallback and the room-for-<id> deferral) is deleted,
along with the largest-free-circle search and the slot permutation search.

The free area is x 869 to 1782, y 8 to 628 of the 1812 by 636 stage: exactly
what placeWelcome's clamps allow, right of the title block and the three
speech bubbles. Homes and drawn diameters, in stage px at 1920 wide:

| bubble | kind | depth layer | drawn diameter | home centre | box |
| --- | --- | --- | --- | --- | --- |
| TL | regular | far | 274 | 1006, 145 | x 869 to 1143, y 8 to 282 |
| TC | regular | mid | 294 | 1306, 155 | x 1159 to 1453, y 8 to 302 |
| TR | regular | near | 314 | 1625, 165 | x 1468 to 1782, y 8 to 322 |
| R | reserved | near | 334 | 1057, 461 | x 890 to 1224, y 294 to 628 |
| BC | regular | far | 254 | 1365, 501 | x 1238 to 1492, y 374 to 628 |
| BR | regular | far | 274 | 1645, 491 | x 1508 to 1782, y 354 to 628 |

The closest two home circles come is 15.16 px (TC to TR). The reserved
bubble's left rim sits at x 890, the community art's right edge, so it covers
no part of the hero art; the art is fully opaque across its 910 px width
(checked by reading the alpha channel of community.png), which is why the
reserved bubble starts at 890 rather than at the 869 the other bubbles use in
the band above the art.

Depth layers keep their Plan 15 meaning: near bubbles are the biggest and
sharpest, far ones the smallest and softest, with the far and mid paces and
blurs unchanged. A bubble in a layer is laid out at drawn / layer scale px
(far 0.84, mid 0.93) and drawn back down by that scale, so its words are drawn
at the size its message asks for whatever depth it sits at.

### Long, and where a long message goes

A message is long when its whole text cannot be drawn inside any regular
bubble at the floor size. The reserved bubble is the only place a long message
appears and the only bubble that ever turns pages. Every regular bubble only
ever holds a message that fits it whole; a message that fits none of them is
left for the reserved bubble on a later pass, and nothing else changes.

With no long message in the pool the reserved bubble takes the first message
in rotation order instead, drawn at its own 334 px size with larger words, so
it is never empty.

### The size steps

Sizes come from the message's grapheme count (Intl.Segmenter), not its UTF-16
length. A regular bubble grows through the steps up to its own diameter while
its words step down; the reserved bubble keeps its 334 px size and only its
words step.

| up to graphemes | drawn diameter | drawn words | used by |
| --- | --- | --- | --- |
| 36 | 254 | 22 px | every bubble |
| 56 | 264 | 21 px | every bubble |
| 80 | 274 | 20 px | TL, TC, TR, BR |
| 114 | 294 | 20 px | TC, TR |
| 136 | 314 | 20 px | TR |
| 100 | 334 | 24 px | the reserved bubble |
| 134 | 334 | 22 px | the reserved bubble |
| 158 | 334 | 20 px | the reserved bubble |
| 206 | 334 | 18 px | the reserved bubble |

The step is a starting point, not the answer: the chosen size is then measured
against the text as the browser lays it out (the same rim geometry as round 4,
every line and chip inside the circle max(3 percent of the diameter, 12 px) in
from the rim), and the words step down half a pixel at a time to the floor
until they fit. A message with long words, many expression chips or a long
name therefore ends up smaller than the table suggests, or, in a regular
bubble, is simply not put there. Nothing is ever truncated, clipped or
ellipsized.

### Floors

Drawn words never go below 18 px at 1920 wide (36 px at 3840). Core breathes a
drifting bubble between 0.9 and 0.996 of its size, so a drifting bubble is
laid out with 20 drawn px words that dip to 18 at the bottom of the breath;
the reserved bubble (which does not drift) and any other bubble whose record
is too long to drift use 18 exactly.

### Paging

Only the reserved bubble pages, only for a message too long to fit it whole,
always at the floor so the pages are as few as possible, and only when every
page is read (core shows a page for max(9, characters / 14) seconds) inside
the time left in the scene. The dwell is read from S.dwell[1] every time it is
needed, with DWELL[1] and then 60 as fallbacks; nothing is hardcoded. When a
long message's pages will not finish in time it waits (logged as
welcome_long_waits) and the reserved bubble takes the next one that will.

## Where the grapheme numbers come from

The step table was measured, not guessed. A scratch harness rendered the real
bubble markup in the real renderer and binary-searched the largest message
that fits, using welcome.js's own rim geometry, for a fictional record with
two expression chips and a fourteen character name. Largest whole message, in
graphemes:

| layout diameter | at 18 px | at 20 px | at 22 px | at 24 px |
| --- | --- | --- | --- | --- |
| 254 | 42 | 38 | 36 | 30 |
| 274 | 96 | 80 | 62 | - |
| 294 | 136 | 114 | 80 | - |
| 302 | 158 | 114 | 80 | - |
| 314 | 162 | 136 | 104 | - |
| 326 | 206 | 158 | 134 | 102 |
| 334 | 206 | 158 | 136 | 102 |
| 380 | 277 | 236 | 188 | 140 |
| 480 | 515 | 375 | 309 | 262 |

Two shelves in core's own markup ladder show up in those numbers: at 335 px
the compact chrome (26 px recipient, small chips) switches off and capacity
drops, and at 450 px the orb-large styling starts. The layout keeps every
bubble under 335 px for that reason.

What this means in practice, for the bubbles as they are drawn:

- the reserved bubble holds about 206 graphemes whole, and pages beyond that;
- the regular bubbles hold about 136 (TR), 104 (TC), 102 (TL and BR) and 80
  (BC) graphemes whole.

A 500 grapheme message needs about 480 px at the 18 px floor, and a 220
grapheme message about 360 px (about 380 px in a bubble that drifts, whose
words are laid out at 20). Neither fits any bubble this layout can hold beside
five others, which is why the reserved bubble pages the longest messages
rather than growing: see the limitation and the question at the end.

## What the spec covers

tests/color-polish-scenes/welcome.spec.ts now checks the round 5 rules from
the DOM, and every check can fail. The assertions that matter:

- Whole messages, read off the screen. welcomeSample compares each bubble's
  rendered `.message` text with the record's whole message from the pool. A
  bubble that is not the reserved one and does not show its whole message is
  a failure. This is Anthony's "the other bubbles only ever take messages
  that fit them whole", read straight from what is drawn.
- Only the reserved bubble pages, and only for a message that cannot show
  whole even there, judged by the spec's own fit probe (fitsWhole in
  text-fits.ts renders the real bubble markup at 334 px with 18 px words).
- No bubble is drawn at a size the fixed layout does not have: every bubble
  is either at or under the largest regular size (314 px) or at the reserved
  size (334 px).
- Words drawn at 18 px or larger at 1920, 36 px or larger at 3840, at every
  sample, entrances and exits included.
- Pages finish in time: at every sample, the pages still to come, at core's
  reading pace of max(9, characters / 14) seconds each, fit inside the dwell.
- The pools the order named: all short; mixed with one 250, one 400 and one
  500 grapheme message; three long messages at once; every message long. Each
  at 30, 40 and 60 second dwells where the dwell changes the answer, and at
  1920 and 3840 wide.
- Three long messages take turns: over a four minute Welcome-only scene, the
  250, 400 and 500 grapheme messages appear only in the reserved bubble, at
  least two of the three get a turn, and the other bubbles are never touched.
- Two anti-vacuity tests prove the checks can fail: forcing a message to 64 px
  makes the fit assertion report the spill, and claiming a paging record shows
  whole makes the single-page rule report it.

## Verification

Every command was run from the worktree root with npm_config_cache=/tmp/npm-cache.

| command | result |
| --- | --- |
| npm run typecheck (tsc --noEmit) | passed, no output, run again on the final tree |
| npm test (vitest run) | 39 files, 222 tests passed, 0 failed, run again on the final tree |
| npm run build | passed, exit 0; logs .tv17/studio-build.log and .tv17/r5-build.log (the second on the final tree) |
| npx playwright test welcome.spec.ts orbit.spec.ts milestone.spec.ts | 76 tests, 74 passed, 2 failed; log .tv17/r5-run2.txt |
| 8 probe captures | no page or console error in any scene of any run |

The Welcome, Orbit and Goal specs need the production build, not the dev
server: openStudioScene signs in at /admin/login, which the dev server without
backend configuration cannot complete (round 4 found the same). The run above
therefore used .tv17/verify-studio.sh, which builds the app with synthetic
public configuration only (NEXT_PUBLIC_SUPABASE_URL=https://synthetic.supabase.test)
and serves it on port 3181. No .env file was created or copied and no database
was contacted.

### The two failures

1. welcome.spec.ts:384, "speech bubbles visible count reaches at least 2 by
   6 s and 3 by 9 s": expected 3 visible speech bubbles at 9 s, received 2.
   This is the speech bubble timing test round 4 recorded as failing on the
   untouched base. It passed in the earlier round 5 run at a different worker
   count (.tv17/r5-run1.txt) and failed here, so it is timing dependent.
   Round 5 changed nothing in the speech bubbles or their timing.
2. orbit.spec.ts:369, "across six fresh opens at 300 ms": failed at
   signInAs with `toHaveURL(/\/admin/)` timing out after 5 s while the page
   was still at /admin/login. It opens six Studio pages in a row; the same
   test passed in the first run. Orbit was not touched this round.

Reruns, each with --workers=1 --repeat-each=2 against the same production
build:

- orbit.spec.ts:369: 2 passed. It was a sign-in timing flake.
- welcome.spec.ts:384: 2 failed, the same "expected 3, received 2". To place
  it, round 4's welcome.js and round 4's welcome.spec.ts were copied back over
  the two files from `git show HEAD:...` and the same test was run again the
  same way: **2 failed on round 4's code as well** (reported there as
  welcome.spec.ts:380). Round 5 was then restored and the two files verified
  by SHA-256 against the copies taken before the swap. So this failure is the
  base speech bubble timing failure round 4 already recorded, not a round 5
  regression; round 5 changed nothing in the speech bubbles.

### Pool results, from the spec's own console output

| pool | dwell | bubbles | paging |
| --- | --- | --- | --- |
| eight short (40 to 130 graphemes) | 30 s | 6 to 6 | none |
| eight short | 40 s | 6 to 6 | none |
| eight short | 60 s | 6 to 6 | none |
| eight short, 3840 wide | 60 s | 6 to 6 | none |
| one 250, one 400, one 500 with five short | 30 s | 6 to 6 | the 250, 2 pages |
| one 250, one 400, one 500 with five short | 40 s | 6 to 6 | the 250, 2 pages |
| one 250, one 400, one 500 with five short | 60 s | 6 to 6 | the 250, 2 pages |
| one 250, one 400, one 500 with five short, 3840 wide | 60 s | 6 to 6 | the 250, 2 pages |
| three long only (250, 400, 500) | 60 s | 1 to 1 | the 250 and the 400, 2 pages each, one at a time |
| mostly long (53, 63, 130, 250, 400, 500) | 60 s | 4 to 4 | the 250 and the 400, 2 pages each, one at a time |
| every message long (180 to 420) | 60 s | 2 to 2 | the 300 and the 360, 2 pages each, one at a time |

Bubble readings from the paging test, at the 60 s dwell, with the
mostly-long fixture (layout diameter, drawn diameter, pages, drawn message
size):

- 1920 wide: mostly-short-2 326/270/1 page/19.77 px; mostly-emoji
  314/303/1/19.32; mostly-250 334/334/2 pages/18.00; mostly-short-1
  302/231/1/20.17.
- 3840 wide: the same four bubbles at the same sizes, with words drawn at
  39.54, 38.63, 36.00 and 40.35 px.

The lowest drawn message size seen anywhere in the run is 18.00 px at 1920
and 36.00 px at 3840, both in the reserved bubble at its floor.

## Captures

Eight probe runs of the whole playlist with the fictional sample snapshot, at
1920 and 3840 wide and at 0, 6000, 14000 and 21000 ms, into
$HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L1/after5/
as w1920-ms0, w1920-ms6000, w1920-ms14000, w1920-ms21000, w3840-ms0,
w3840-ms6000, w3840-ms14000 and w3840-ms21000. Each folder holds one PNG per
scene; Welcome is welcome.png. Command, per run:

    npm_config_cache=/tmp/npm-cache node scripts/color-polish-renderer-probe.mjs . \
      <that folder> --width=<1920|3840> --ms=<0|6000|14000|21000>

All eight runs finished with `"issues":[]`, meaning no page error and no
console error in any scene of any run, and all eight welcome.png files were
written. The probe shoots every scene, so the eight folders hold 80 PNGs and
227 MB in total; if that is too much to keep in the run record, only the eight
welcome.png files are needed for this lane.

What the Welcome captures show: six bubbles, three across the top, the
reserved bubble at the bottom left and two at the bottom right, every message
whole inside its rim, no bubble over the title block, the speech bubbles or
the community art. The sample snapshot's messages are all short, so the
reserved bubble holds an ordinary message drawn at its larger size, which is
the "never empty, never a gap" case. At 21000 ms drift replacements have
happened and an entering bubble is mid spin, with its words turned inside the
circle.

## Limitations and deviations

1. **The number of bubbles follows the pool, and a pool of long messages
   fills few bubbles.** This is the direct consequence of the rule Anthony
   asked for: a regular bubble only ever takes a message that fits it whole,
   and a long message only ever goes in the one reserved bubble. Measured
   this round: eight short messages fill all six bubbles; a pool of six
   messages of 180 to 420 graphemes fills two; a pool of only 250, 400 and
   500 grapheme messages fills one. The cause is geometry, not the code: six
   circles in the free area cap at about 300 drawn px each, and a 180
   grapheme message already needs more room than that at the floor. The one
   question at the end asks Anthony to choose.
2. **A 500 grapheme message pages.** The reserved bubble is 334 px, the
   largest circle the free area holds beside the other five, and it shows
   about 206 graphemes whole; a 500 grapheme message needs about 480 px. So
   it pages in the reserved bubble, in as few pages as possible, and only
   when those pages finish inside the dwell. The order asked for the reserved
   bubble to be sized for a 500 grapheme message "if the layout can hold that
   diameter without covering the hero art, title or other bubbles"; it cannot,
   so paging, the order's last resort, applies.
3. **At a 30 second dwell some long messages wait.** The 500 grapheme
   message needs about 36 seconds of reading and is left to a later pass at
   30 seconds; it shows at 40 and 60. This is checked by a test at each of
   the three dwells.
4. **The step table's grapheme numbers are for one shape of record**
   (two expression chips, a fourteen character name). A record with more
   chips or a longer name has less room; the measurement pass catches that
   and steps the words down, or leaves the message to the reserved bubble, so
   nothing spills, but such a record may be treated as long at a lower
   grapheme count than the table suggests.
5. **The physical TV was not checked.** Nothing was deployed.
6. **Not run:** the rest of tests/color-polish-scenes (the order named three
   specs), and any Studio spec of the other scenes.
7. The reserved bubble's rim sits at x 890 rather than the 869 the other
   bubbles use, so that it stays clear of the community art, which is opaque
   to its right edge. That costs the bottom centre bubble about 20 px of
   diameter.

## Housekeeping

`git status` in the worktree shows only the two allowlisted files changed.
Scratch, logs and the measurement harness live under .tv17/ and are not
committed. The lane's dev server (3171) and production server (3181) are
stopped. No em dash or en dash was written into any file (checked).

## QUESTION FOR ANTHONY

Welcome now shows only messages that fit whole, so how many bubbles are on
screen follows the pool. Measured this round: six bubbles when the messages
are short (40 to 130 characters), four when a couple of them are long, two
when every message is 180 characters or longer, and one when they are all 250
or longer. The rest wait their turn in the one reserved bubble. The reason is
geometry, not a bug: six circles fit the free area only at about 300 px each,
and a 180 character message needs more room than that before its words reach
the 18 px floor.

Which do you want on the TV?

1. This: six small bubbles when the messages are short, and long messages one
   at a time in the reserved bubble, accepting that a screen full of long
   messages shows only one or two bubbles.
2. Fewer, larger bubbles, say three or four instead of six, so messages up to
   about 250 or 350 characters fit whole in an ordinary bubble and the screen
   is never nearly empty. The reserved bubble would still be the only place a
   longer message goes.
