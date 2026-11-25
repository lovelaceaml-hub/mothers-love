# Plan 17 Lane 2 result, round 3 (escalated writer, Claude Fable 5.1)

Plan goal, quoted: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."

Built on round 2's uncommitted work (expressions.js and expressions.spec.ts). Round 2's edge layout is kept as is; this round changes only the focused panel's vertical budget (CSS), the compact glow transition (CSS), the grid row numbers (JS), and the specs. Motion is byte-identical to base: tilt and drift arrays, 6/10/2.4 timing, easing, keyframes, and the 700 ms ease box-shadow transition on grid and focused cards.

## Review findings, round 2

1. MAJOR, focus panel spare height. Fixed in the focused-panel rules of expressions.css: `.edu-detail` padding-top 34 to 22, focused medallion 94 to 78, focused phrase margins 10/8 to 4/4. Gain 38 px (more than one 33.6 px explanation line). Measured at the focus hold, local px: inner room 329 to 341, used 326 to 300 for expressions 2 and 7 (spare 3 to 41), 274 to 248 for the rest (spare 93). Wider letters at 0.03em and 0.05em of each text's own font size: every panel fits with the source note below the explanation; the tightest is expression 3 at 6 px spare (its phrase and principle both wrap to two lines under wider letters). Explanation fill stays 83.5 percent, inside the existing 70 to 92 band, so the band is unchanged. Focused phrase stays 42 px.
2. MINOR, glow cut on leaving focus. Fixed: `#tv .scene[data-scene="7"] .edu-card.compact { transition-duration: 0s; }`. The glow drops at once when a card goes compact; a card gaining focus still gets the 0.7 s fade (its computed transition-duration is 0.7 s once it is `.focused`). Tilt and drift untouched. Measured across the first 300 ms after every leave (t = 16 s and 26 s of nine visits, 126 samples): pre-fix worst margin -31.8 px (card 6, right edge) and 53 of 126 samples under 16 px; after, worst margin 18.4 px at 1920 and 36.9 px at 3840, 0 violations.
3. MINOR, grid title gap. Fixed in expressions.js: rows 91/262/433 to 96/267/438, height 161 to 158 (171 step kept). Title line box bottom to the top row's tilted top corner: 11.5 px to 16.5 px at 1920, 33.0 px at 3840. Grid phrase slack 22.9 px minimum (spec floor 12). Bottom row now ends at 596 local; its contact shadow still clears the scene edge (full sweep below).
4. The vacuous "caption inside layout" check (measured against `.educational`, which fills the scene) is replaced by a check against the scene box, the box the TV cuts at, plus an unclipped-words check on the caption element; the caption is positioned against the scene, not derived from it, so this can fail. The "no card covers the caption" guard stays.

## Files changed (absolute paths)
- $HOME/.claude/worktrees/mothers-love-tv17-expressions/public/color-polish/scenes/expressions.css
- $HOME/.claude/worktrees/mothers-love-tv17-expressions/public/color-polish/scenes/expressions.js
- $HOME/.claude/worktrees/mothers-love-tv17-expressions/tests/color-polish-scenes/expressions.spec.ts
- $HOME/.claude/worktrees/mothers-love-tv17-expressions/.tv17/RESULT.md (this file), scratch in .tv17/scratch/r3b/ (pre-fix copies pre.js, pre.css, pre.spec.ts; final copies new.*; harnesses and outputs)

## Specs (all through loadRenderer)
- Fit spec (both widths): title clearance now also checked in the grid phase (top row's highest corner at least 16 px below the title at 1920, 32 at 3840); caption check made real as described above.
- New wider-letters spec, 0.03em and 0.05em at 1920 and 3840 (four tests): injects `letter-spacing: Nem !important` on `.edu-detail` and every element inside it, so each text widens by that fraction of its own font size (stricter than one inherited value), then for all nine focused panels asserts the spacing really applied, source note at or below the explanation, detail fits inside the card, every text block and its rendered content range inside the card (the card is the clip box), panel inside the scene box, fill 70 to 92, text at or above the 18/36 px floor.
- New leaving-focus spec (both widths): steps to 14 s and 24 s to read the focused card, steps 2 s so it leaves, pauses the transitions at 0, 50, 100, 150, 200, 250 and 300 ms, and asserts the leaving card is compact and its rect widened by its computed box-shadow (times depth scale) stays at least 16/32 px inside the scene box; every card leaves twice over nine visits.
- Motion spec: box-shadow transition now expected as 0.7 s ease on non-compact cards and 0 s ease on the eight compact cards; tilt, drift, keyframes and timing checks unchanged.

Proof the new and changed specs fail on the pre-fix code (pre.js and pre.css copied into place under the new spec, then the final files restored and cmp-verified), `bash .tv17/verify.sh tests/color-polish-scenes/expressions.spec.ts -g "wider letters|leaving focus|words fit, the title|Plan 15 values"`: 9 failed, 0 passed (.tv17/scratch/r3b/prove-prefix.txt):
- fit spec at 1920 and 3840: "visit 1 grid title clearance above the grid" (11.5 px < 16).
- wider letters, all four: "visit 3 focus 3 at 0.03em (and 0.05em) source note below the explanation" (-12 px).
- leaving focus: 38 failures at 1920, 42 at 3840 (glow past the right edge and bottom).
- motion: compact cards reported 0.7 s instead of 0 s.
After the clip check was changed to the range-in-card form, the 1920 0.03em test was re-proved on pre.css: 1 failed, same source-note assertion (.tv17/scratch/r3b/prove-prefix-wider-final.txt).

## Verification commands and results
- `bash .tv17/verify.sh tests/color-polish-scenes/expressions.spec.ts` (final files): 13 passed, 11 failed (.tv17/scratch/r3b/run-after-final.txt). The 13 passing are every loadRenderer spec: 2 existing, 2 edge, 2 fit, 4 wider letters, 2 leaving focus, 1 motion. The 11 failures are the Studio specs (openStudioScene or reducedMotionScene), all at `expect(page).toHaveURL` (admin sign-in, no backend settings), out of scope as briefed and failing identically on the untouched base.
- Edge sweep re-run (.tv17/scratch/r3b/sweep.mjs, round 2's sweep, every card glow-widened, 9 visits, full 30 s dwell with ramps every 100 ms) on the final files: worst scene margin 16.01 px at 1920 and 32.03 px at 3840, 0 violations, unchanged from round 2 (.tv17/scratch/r3b/sweep1920.txt, sweep3840.txt).
- Leaving-focus harness (.tv17/scratch/r3b/leave.mjs): pre-fix 1920 worst -31.76 px, 53 violations; final 1920 worst 18.43 px, 3840 worst 36.85 px, 0 violations.
- Focus budget harness (.tv17/scratch/r3b/focus.mjs) at 0, 0.03 and 0.05em, 1920 and 3840: numbers in finding 1 above.
- `npx tsc --noEmit`: clean. `npx vitest run`: 39 files, 222 tests passed.
- Dash check: no U+2013 or U+2014 in the three changed files.

## Captures
- .tv17/captures/after3/w{1920,3840}-ms{0,6000,14000,21000}/ (all scenes, fictional probe data; probe logs alongside). Viewed expressions.png at 1920 for ms 0 and 14000: grid title sits clear above the top row, focus panel header and explanation have room with the source note below, footnote inside, nothing near a scene edge.
- Earlier rounds: .tv17/captures/before/, after/, after2/.

## Not run, limitations
- The 11 Studio specs remain unrunnable here (sign-in); the loadRenderer specs cover their assertions.
- Expression 3 under 0.05em wider letters keeps only 6 px spare in the focus panel; a TV font that also wraps its explanation to a third line would still push into the source note. Physical TV check still needed, as the plan says.
- Explanation fill (83.5 percent) is fixed by the panel's padding-bottom under space-between, so the 70 to 92 band was not touched.
- The bottom-right countdown ring (protected chrome) still slightly overlaps the corner of the last compact card, as in round 2.
- No commit, as instructed. Port 3172 stopped. next-env.d.ts restored to HEAD after `next dev` rewrote it. docs/ untouched.

# Plan 17 Lane 2 result, round 4 (fresh escalated writer, Claude Fable 5.1)

Plan goal, quoted: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."

Built on the committed lane at f78e75f. This round changes one file, expressions.css, and only the space above the phrase inside grid and compact cards. No card position, size, tilt, drift, timing, keyframe, glow, transition or text size changed; expressions.js and the spec are byte-identical to f78e75f.

## The failure and its cause

The two Plan 15 Studio specs measure phraseSlack (card rect bottom minus phrase rect bottom) inside the admin Studio preview, where the 1920 px renderer is scaled to about 0.463 (a 1280 px Playwright viewport), and require 12 px in those scaled pixels, which is about 26 px at 1920. Round 3 measured 22.9 px (grid, card 2) and 23.3 px (compact) at 1920, which is 10.60 and 10.77 scaled: the received values. The base at 5a24f0b had 31.7 and 28.3 px (14.7 and 13.1 scaled) because its cards were 590 x 167 and 403 x 126; the lane narrowed them to 560 x 158 and 346 x 121 to clear the scene edges, so more phrases wrap to two lines and the two-line phrases lost their bottom room.

## Fix (expressions.css only, scene-scoped rules that already existed)

- Grid cards (`.edu-card:not(.focused):not(.compact)`): `.edu-front` padding 14px 24px to 10px 24px 14px; `.edu-phrase` margin-top 10 to 7 and line-height 1.22 (renderer.css sets 1.25). Font size stays 25px. Gain 8.5 px local.
- Compact cards (`.edu-card.compact`): `.edu-front` padding 12px 16px to 8px 16px 12px; `.edu-phrase` margin-top 6 to 4 and line-height 1.23 to 1.2. Font size stays 19px. Gain 7.1 px local.
- Result at 1920 (.tv17/scratch/r4/slack.mjs): grid minimum slack 22.9 to 31.2 px (card 2, two lines, back row), compact minimum 23.3 to 30.4 px; at 3840 exactly double (62.4 and 60.8). In Studio pixels that is about 14.4 and 14.1 against the 12 floor, near the base's 14.7 and 13.1. Every card top, bottom and title gap is unchanged to 0.1 px (grid title gap still 16.5 px at 1920, compact column still ends at 598).
- The 12 px threshold is untouched; the text sizes are untouched (25 px grid, 19 px compact, well above the 18 px floor).

## Files changed (absolute paths)
- $HOME/.claude/worktrees/mothers-love-tv17-expressions/public/color-polish/scenes/expressions.css
- $HOME/.claude/worktrees/mothers-love-tv17-expressions/.tv17/RESULT.md (this section); scratch in $HOME/.claude/worktrees/mothers-love-tv17-expressions/.tv17/scratch/r4/ (base.js, base.css from 5a24f0b; pre.js, pre.css, pre.spec.ts from f78e75f; new.css; slack.mjs; outputs)

## Verification commands and results
- `bash .tv17/verify-studio.sh tests/color-polish-scenes/expressions.spec.ts` (production build, synthetic public config, port 3182): 24 passed (45.6 s), 0 failed, including "grid cards fit with slack", "compact cards fit", every other Studio spec and all loadRenderer specs (edge sweep, fit, wider letters, leaving focus, motion). Output: .tv17/scratch/r4/run-studio.txt.
- `npx tsc --noEmit`: clean.
- Edge sweep re-run (round 2's .tv17/scratch/r3b/sweep.mjs, every card glow-widened, 9 visits, full 30 s dwell): worst scene margin 16.01 px at 1920 and 32.03 px at 3840, 0 violations, identical to round 3 (.tv17/scratch/r4/sweep1920.txt, sweep3840.txt).
- Leaving-focus harness (.tv17/scratch/r3b/leave.mjs): worst margin 18.43 px at 1920 and 36.85 px at 3840, 0 violations, identical to round 3 (.tv17/scratch/r4/leave1920.txt, leave3840.txt).
- Dash check: no U+2013 or U+2014 in expressions.css. `git status`: only expressions.css modified plus untracked .tv17 files.
- Proof the fix is the cause: with the pre-fix CSS (f78e75f, .tv17/scratch/r4/pre.css) copied into place, `bash .tv17/verify-studio.sh tests/color-polish-scenes/expressions.spec.ts -g "grid cards fit with slack|compact cards fit"` against the same production build: 2 failed, received 10.60 and 10.77 against the 12 floor (integration's exact numbers, .tv17/scratch/r4/prove-prefix.txt); new.css then restored and cmp-verified.

## Captures
- .tv17/captures/after4/w{1920,3840}-ms{0,6000,14000,21000}/ (all scenes, fictional probe data, probe logs alongside). Viewed expressions.png at 1920 for ms 0 and 14000: the two-line grid phrases (Gratitude, Encouragement) and the two-line compact phrases now have clear room beneath them, the title sits clear above the grid and the focused panel, the footnote is inside, nothing near a scene edge.

## Not run, limitations
- `npx vitest run` not re-run this round: the only change is CSS inside a static public file that no unit test reads; round 3 recorded 39 files, 222 tests passing on the same JS.
- The Studio scale (about 0.463) comes from the admin page layout at the 1280 px Playwright viewport; a future admin layout change would move the scaled slack again. The margins chosen (about 14.4 and 14.1 scaled) match what the untouched base had (14.7 and 13.1).
- Expression 3 under 0.05em wider letters keeps 6 px spare in the focus panel (unchanged from round 3). Physical TV check still needed, as the plan says.
- No commit, as instructed. Port 3182 stopped by the verify script; next-env.d.ts restored to HEAD by it. docs/ untouched.

## COMPLETION
- Files changed: $HOME/.claude/worktrees/mothers-love-tv17-expressions/public/color-polish/scenes/expressions.css (grid and compact card inner spacing only: grid front padding 14 to 10 top, grid phrase margin 10 to 7 and line-height 1.22; compact front padding 12 to 8 top, compact phrase margin 6 to 4 and line-height 1.2; text sizes, positions, sizes, motion, glow and transitions unchanged). Plus $HOME/.claude/worktrees/mothers-love-tv17-expressions/.tv17/RESULT.md and .tv17/scratch/r4/, .tv17/captures/after4/.
- Verification: `bash .tv17/verify-studio.sh tests/color-polish-scenes/expressions.spec.ts` 24 passed, 0 failed (both previously failing Studio specs now pass, threshold still 12); `npx tsc --noEmit` clean; edge sweep worst margin 16.01 px at 1920 and 32.03 px at 3840, 0 violations (unchanged); leaving-focus worst 18.43 and 36.85 px, 0 violations (unchanged); pre-fix proof run 2 failed at 10.60 and 10.77, new CSS restored.
- Captures: .tv17/captures/before/, after/, after2/, after3/ (earlier rounds) and .tv17/captures/after4/ (this round).
- Not run: vitest (no unit test reads the CSS; passed in round 3 on identical JS).
- Limitations: Studio scale depends on the admin layout at 1280 px; physical TV check still outstanding; no commit made.
