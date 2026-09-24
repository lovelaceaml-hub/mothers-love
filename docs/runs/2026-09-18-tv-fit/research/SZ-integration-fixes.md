# SZ: integration fixes after the full scene run

Goal of this step: take the merged tv17/pick branch from 271 passed, 2 failed to zero failures, and settle whether each failure was a real defect a viewer would see or a test problem.

Worktree: /Users/anthony/Projects/mothers-love-worktrees/tv17-base, branch tv17/pick.
Start: f2c6df8. Result: 2a75745.
Files changed: tests/color-polish-scenes/helpers.spec.ts and tests/color-polish-scenes/welcome.spec.ts. No scene code, no CSS and not core/speech.js: neither defect lives in the renderer.

## 1. helpers.spec.ts:77, orb-slot rectangles intersect

Verdict: stale test, not a real overlap.

Cause. The failing pair was in scene 1 (Welcome): slot-6 (the reserved bubble) and slot-7. The old test took one reading 40 ms into the scene and compared the square bounding rectangles of the .orb-slot elements. Those two squares cross at a corner (about 26 by 111 px in the probe viewport), but the bubbles are circles, and the circles never meet. Measured every quarter second for 90 s with the same mostly-long fixture, in stage px:

- Scene 1, settled bubbles: the closest any two circles come is 24.3 px apart (slot-6 and slot-7). The closest a bubble in flight comes to a settled bubble's word area (the inner 80 percent) is 64.6 px away.
- Scene 9 (Peace in Practice), settled bubbles: the closest is 7.8 px apart (the reserved slot-5 and slot-6). Scene 9 passed the old rectangle check only by chance of layout.

So at rest and in flight no bubble or its words cover another. The old test also carried a comment that scene 1 shows a single 586 px slot, which has not been true since the Welcome rebuild (one reserved bubble plus three regular).

Fix. The test now checks what the lanes guarantee and what a viewer sees:

- It samples both scenes every half second across a 60 second showing on the frozen renderer clock, not once.
- It judges circles taken from the drawn boxes (so a bubble in flight is judged where it is seen), and asserts each box is square, so the circle reading is valid.
- Two settled bubbles (life steady, opacity above 0.9) may not overlap by more than 0.5 px. The word areas (inner 80 percent) of any two visible bubbles (opacity above 0.3), settled or flying, may never meet. This is the same rule the Welcome lane's own layoutProblems uses, and stricter than the Peace lane's own allowance against the reserved bubble.
- It asserts the scene stays on screen and that more than 60 of the 120 samples really had two or more settled bubbles to compare, so it cannot pass by comparing nothing.
- A new unit test, "the bubble overlap rule catches touching circles and ignores rectangle corners", feeds the rule made-up circles and proves it reports touching settled circles and covered words, and ignores corner crossings and faded bubbles. The check can still fail.

## 2. welcome.spec.ts:382, speech bubbles 2, 2, 2, 2, 2, 2, 2 from 9 s to 10.5 s

Verdict: the scene is right, the test was flaky under load. Made deterministic.

What the scene does (public/color-polish/core/speech.js and primeWelcome in public/color-polish/scenes/welcome.js), traced on the renderer clock:

- Speaker 0 shows at once. Speaker 1 appears at 2.5 s, speaker 2 at 5.0 s. All three are showing together from about 5.5 s.
- Each then swaps its phrase every 6 to 9 s behind a half second fade out and a half second fade in. With the test seed: speaker 0 swaps at 6.0 s, speaker 1 at 8.9 s (back by 9.4 to 9.9 s), speaker 2 at 12.2 s.
- So the design does reach three speech bubbles well before 9 s, and at 9 s exactly one of them is in the middle of a swap. It never dropped below two in the 30 s traced.

The older single file renderer (b7d92a0:public/color-polish/renderer.js) has no speech bubbles at all; they arrived with Plan 15 (commits 4c2a109 and 3e89529), and this run did not change their schedule. The new reserved bubble to the right of the title does not interfere: the speech bubbles are obstacles in the Welcome lane's own layout checks, and both "no speech bubble rect intersects ... any orb slot" and the round 5 showing tests pass in the full run.

Cause of the flake. The schedule runs on the renderer clock, which the test drives with runtime.step. The fade itself is a CSS opacity transition, which runs on wall time. The test stepped the clock, then read computed opacity a few milliseconds later. When speaker 1 came back from its 8.9 s swap, the browser created a new 0 to 1 transition; on a busy machine (the full run, two workers) the browser had not ticked that transition before all seven readings were taken, so the bubble read opacity 0 every time and the count stayed at 2. Alone, a frame arrived in time and it read 3. The earlier adjustment (reading seven times) could not help, because all seven readings happen within the same few wall clock milliseconds.

Fix. The test now runs on the renderer clock alone: one load, 42 quarter second steps from the scene start to 10.5 s, and after each step every fade on the speech bubbles is carried to its end (element.getAnimations then finish), so wall time plays no part. It was not weakened; it now proves more:

- a bubble counts only if it is not fading and its finished opacity is exactly 1 (before, anything not exactly 0 counted);
- one speaker at the start, never fewer than two from 6 s to 10.5 s, all three together by 9 s, and all three together again inside 9 s to 10.5 s;
- the clock is checked to have really reached 10.5 s;
- the border radius and phrase catalogue checks that follow are unchanged.

A first version finished every animation in the document and timed out under a six worker stress run; limiting it to the three speech bubbles fixed that, and the test has a 90 s timeout for headroom.

## Command results

- Speech test stress, 12 repeats on 6 workers (npx playwright test tests/color-polish-scenes/welcome.spec.ts -g "speech bubbles visible count" --repeat-each=12 --workers=6): 12 passed.
- helpers.spec.ts alone: 6 passed.
- npm run typecheck: clean.
- npm test: 40 files, 255 tests passed.
- Full folder, fresh production build, synthetic config (bash .tv17/verify-studio.sh tests/color-polish-scenes): 274 passed, 0 failed, 8.8 minutes. Log: /Users/anthony/Projects/mothers-love-worktrees/tv17-base/.tv17/full-scenes-sz.txt (not committed). 274 is the earlier 273 plus the one new unit test.
- The arrival PNGs rewritten by the arrival spec were restored with git checkout before committing. .tv17 was not committed. No database, no deploy, no .env.local.

## Observation, not acted on

Speech swap times are independent per speaker, so over a long showing two speakers could be mid swap at the same moment and only one speech bubble would show for about half a second. It did not happen in the 30 s traced (the nearest was speaker 1 coming back at 24.3 s as speaker 0 faded). This predates Plan 17 and was outside this task, so it is recorded here only.
