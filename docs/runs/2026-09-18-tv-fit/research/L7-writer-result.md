# Plan 17 Lane 7 writer result (Claude Fable 5.1), Words that bring peace only

Plan goal, quoted: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."

Scope: the coordinator narrowed this lane mid-run to work items 5 and 6 (Words that bring peace). Items 1 to 4 (Peacemakers, Peace in Practice) were dropped before any edit was made to those files; `git status` shows them untouched and identical to 33ffbdc. Reserved bubble sizes and font steps are therefore not part of this lane: none were built here.

Worktree: /Users/anthony/.claude/worktrees/mothers-love-tv17-peace, branch tv17/peace, cut from tv17/pick 33ffbdc.

## Changed files
- /Users/anthony/.claude/worktrees/mothers-love-tv17-peace/public/color-polish/scenes/expressions.js
- /Users/anthony/.claude/worktrees/mothers-love-tv17-peace/public/color-polish/scenes/expressions.css
- /Users/anthony/.claude/worktrees/mothers-love-tv17-peace/tests/color-polish-scenes/expressions.spec.ts

Nothing else changed. renderer.css and core/ untouched.

## What was built
1. Every change of view is now a glide instead of a cut: grid to focus (6 s), focus to the next focus (every 10 s after that), and focus back to the grid (new, see 3). The chosen card grows from its grid place into the focus position while the other eight glide to the compact column; when focus moves on, the card leaving focus and the card gaining it cross over and swap places, and the card gaining focus is painted on top.
2. Switch timing: 1.1 s per glide (inside the 0.8 to 1.2 s ruling), smootherstep easing (no speed and no acceleration at either end). Peak measured speed 47 px per 20 ms step at 1920; the step size never changes by more than 2.6 px from one step to the next, so there is no lurch at the start, the end, or the half-way swap.
3. View cycle, read from `S.dwell[7]` in state (never hardcoded): grid until 6 s, then one focus per 10 s for as many whole focuses as fit before a closing grid hold of at least 4 s, then the reverse glide back to the grid. 30 s: two focuses (6 to 16, 16 to 26), grid from 26 s. 60 s: five focuses, grid from 56 s. 40 s (tested to prove the number is read, not matched): three focuses, grid from 36 s. A scene held past its dwell (rotation paused, Studio preview) repeats the plan and carries on to the following expressions.
4. Transform and opacity only during the glide: a travelling card gets `translate() scale()` in front of the unchanged `translate3d() rotateY()` pose; left, top, width, height and the focused or compact look change exactly once per glide, at the half-way point, while that card's words are at opacity 0.02 or less (asserted). The words keep their shape (one uniform counter-scale inside the stretching card) and fade out before the swap and in after it.
5. Reduced motion: when the scene is still (the normal reduced-motion case) nothing changed. When the owner forces lively motion on a reduced-motion device, no card travels: a frozen copy of the outgoing arrangement fades out over the incoming one fading in (1.1 s crossfade).
6. Lane 2's results kept. The tilt and drift constants (`expressions_ROW_Z`, `expressions_COL_ROTY`, 6 / 10 / 2.4 timing) are byte-identical, and Lane 2's motion spec (EXPRESSIONS_BASE_MOTION, keyframes) passes unchanged. The Plan 15 ramp resets every card's tilt and depth at each focus change, which used to show as a small jump; the glide solves the exact perspective projection so the card stays visually where it was while the ramp plays.

## Deviations and decisions to know about
- On a 30 s dwell the third focus (26 to 30 s, 4 s long, too short to read) is replaced by the glide back to the grid. This is the "reverse on the way back" of the work order and the "work well at both 30 and 60 seconds" instruction; it is a visible change to the 30 s cycle.
- On the way back to the grid the tilt and depth return with the glide (1.1 s) rather than over 2.4 s, because holding the focused panel's forward depth at an outer grid place measured 0.6 px from the scene edge (first version, caught by the spec).
- A card in flight carries no box-shadow (a shadow scaled with the card measured past the 16 px budget). The focused panel's ring and glow fade back to the plain card shadow in place during the last 0.8 s of its hold (its own 700 ms fade), so take-off has nothing to drop; shadows and glow return on landing.
- `.educational` now has `perspective: 1600px; transform-style: flat` (scene-scoped) instead of `preserve-3d`. Same perspective about the same centre: every card rect is identical to 0 px at 15 sampled ages, and a pixel diff of the resting grid shows only sub-pixel text and edge antialiasing. Reason: with depth sorting, cards that pass over each other while gliding cut through each other along hard lines where their tilted planes cross (seen in my first frames).
- Lane 2 specs adapted, not weakened: the leaving-focus glow spec now samples every 100 ms from take-off to landing for both leaves (to compact at 16 s, to grid at 26 s) instead of assuming an instant jump; the motion spec expects 0 s box-shadow transition on cards in flight and re-checks the 0.7 s / 0 s resting values at 19 s; the edge sweep steps to exact scene ages and measures in one round trip.

## Specs added or changed (all behavior tests, direct renderer)
- Edge sweep (both widths): the three glides are each sampled at 30 points; 29 in-flight points per glide must catch all nine cards in flight (783 asserted in-flight samples per width), every card at least 16 px (1920) or 32 px (3840) inside the scene box and the screen.
- No-jump spec (both widths): 20 ms steps from 5 s to 29.5 s, every card: at most 60 px per step, step size change at most 8 px, opacity change at most 0.03, and 40 to 60 in-flight samples per glide (0.8 to 1.2 s).
- Grow and glide spec: two laid-out boxes and two looks per card per glide, words invisible at the swap, words undistorted within 5 percent, every card strictly between its two places half-way, chosen card growing.
- Swap spec: the two cards overlap on the way, the one gaining focus is on top at every overlap sample (elementFromPoint), they end in each other's places, the other seven keep their slots.
- Dwell specs at 30, 40 and 60 s; held-past-dwell spec; reduced-motion crossfade spec.
- Proof the assertions can fail: with the 33ffbdc expressions.js and expressions.css copied into place under the new spec, 9 of 9 selected specs failed (no-jump: 71 jumps; edge sweep: 0 of 9 cards in flight; glow: not in flight; grow: 1 laid-out box; swap: 0 overlap samples; 30 s and 60 s dwell; held past dwell; crossfade: no ghost). New files then restored and cmp-verified. Log: scratchpad l7/prove-base.log (local).

## Command results (real counts)
The Mac ran at load average 250 to 430 throughout (other writers), so long runs were slow and some other-scene specs timed out under load.
- `npm run typecheck`: clean.
- `npm test`: 39 files, 222 of 222 passed (an earlier run under peak load showed 221 of 222; its one failure was not identified before two reruns passed 222 of 222).
- `npm run build` (synthetic public config only: fake Supabase address and key, no DATABASE_URL): build ok.
- `npx playwright test tests/color-polish-scenes/expressions.spec.ts` against that build (`next start` on port 3197, 2 workers): 33 passed, 0 failed (13.1 min).
- `npx playwright test tests/color-polish-scenes` (whole folder, 3 workers): 145 passed, 11 failed (30.3 min). The 11: two expressions Studio specs that pass in the expressions-only run above, and nine in other lanes' files (arrival 2, calendar 1, featured 2, garden 1, transitions 1, welcome 2), mostly test timeouts. Rerun of those nine serially (1 worker): 8 passed, 1 failed: welcome.spec.ts:370 (speech bubbles, expected 3 by 9 s, received 2). That one also fails with the 33ffbdc expressions files copied back in place, so it does not come from this lane.
- `node scripts/color-polish-globals-check.mjs`: passed, 21 files, 219 declarations, no duplicates.
- Dash check: no U+2013 or U+2014 in the three changed files.

## Captures
- Probe, all scenes, 1920 and 3840, ms 0, 6000, 14000, 21000: /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L7/after/w{1920,3840}-ms{0,6000,14000,21000}/ (probe logs alongside; the first w1920-ms6000 run timed out under load and was rerun, exit 0).
- Frames across the switches: /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L7/after/switch-frames/ (67 files). `f-1920-30-0NNNN.png` is the 30 s dwell at scene age NNNN ms: 5900 to 8500 is grid to focus, 15900 to 18500 is focus to focus, 25900 to 28500 is focus back to grid. `f-1920-60-*` is the 60 s dwell (26550 is a third focus change there; 55900 to 59500 is its return to the grid). `f-3840-30-*` is 3840 wide.
- Viewed by the writer: 6300, 6500, 16300, 16400, 16800, 26300 (1920, 30 s), 56550 and 59500 (60 s), and the probe's w1920-ms21000 expressions.png. Seen: cards mid-flight between places, the chosen card growing, the two cards crossing with the new one on top, the reverse glide, the full grid back at 59.5 s, resting focus view unchanged with its glow.

## Limitations
- The words dip through blank for an instant at the half-way swap (fade out, swap, fade in), because one card element carries both looks; a true text crossfade would need duplicate card content.
- Card corners and the 2 px border stretch slightly out of round during the 1.1 s glide (transform only, no border-radius animation), and the corner shape changes once at the half-way swap while the card is at peak speed with its words hidden.
- Shadows are off while cards fly; on compact cards they come back at once on landing (Lane 2's 0 s rule), on grid and focused cards with the 700 ms fade.
- The bloom petals (existing Plan 15 effect) stretch with the growing card during the first half of its glide.
- Not checked on the physical TV. The TV browser's smoothness at 3840 with nine transformed cards is unmeasured here.
- welcome.spec.ts:370 fails on this branch and with base expressions files alike (not this lane's file).
- Local server on port 3197 stopped; next-env.d.ts and the arrival spec's side-effect PNG writes were restored to HEAD. Nothing deployed.
