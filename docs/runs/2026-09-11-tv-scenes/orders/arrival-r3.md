# Work order - arrival correction r3: timing and discriminating depth checks - Mother's Love TV (Plan 13)

Dispatch ID: agy-arrival-20260911-r3
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-arrival
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The Sonnet review worked your spec's timing against core: every new wave waits 0.65 s (core/host.js sets S.queueStart = S.t + .65) before beginEvent, and the entrance lasts 3.6 s for singles and 4.7 s for groups (core/arrivals.js). Your "resolve flat" sample therefore lands at about p .85, where single case 2's forward overshoot puts z near plus 108, so the test would fail against correct code. Also, positionEvent clamps z to minus 500, and unstarted group ranks report z minus 1000 (clamped), so the DOM check for group styles 0 and 4 passes on the old code too.

## Hard rules
1. Edit only tests/color-polish-scenes/arrival.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-arrival.

## The change
1. Timing: after pushing a wave, step 650 ms first (the queue gap), then treat entrance time zero as that point. The mid-entrance sample is at 650 plus 1800 ms (singles) or 650 plus 2350 ms (groups) after the push; the resolved sample is at 650 plus 3600 plus 100 ms (singles) or 650 plus 4700 plus 100 ms (groups). Use these for the circularity, screenshot and resolve checks. At the resolved sample assert every `.event-orb` has z 0 within 2 (z-index minus 600), scale 1 within .02 and opacity 1.
2. Depth: replace the DOM-based "start deep" check with direct calls to the trajectory functions in the renderer frame (they are global classic-script functions): `frame.evaluate(() => singleTrajectory(2, .15).z)` and `singleTrajectory(5, .15).z` are both below minus 450; for groups, evaluate `groupTrajectory(0, index, u, {x: 906, y: 307})` for index 0 (rank 0) and index 9 (rank 9) at u equal to each item's delay plus .15 (rank times .032 plus .15) and assert rank 9 starts at least 400 deeper than rank 0 (the added minus rank times 90 term times (1 minus u) to the 2.5); for style 4 evaluate index 0, 1 and 2 at u .2 and assert their z values differ from each other by at least 100 (the per-source zStart). Also assert `singleTrajectory(2, 1)`, `singleTrajectory(5, 1)`, `groupTrajectory(0, 3, 1, {x:906,y:307})` and `groupTrajectory(4, 5, 1, {x:906,y:307})` return z 0 within .5 and k 1 within .01. Note `groupTrajectory` returns early with z minus 1000 while p is below the rank's delay, so pick u values above the delay.
3. Keep the style-order test and the eleven-wave harness as they are.

Append one sentence to "## Result" in docs/runs/2026-09-11-tv-scenes/lanes/arrival.md naming this round.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-arrival/tests/color-polish-scenes/arrival.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-arrival/docs/runs/2026-09-11-tv-scenes/lanes/arrival.md
```
