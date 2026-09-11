# Work order - Section 5 correction round 1: pulse settle assertion - Mother's Love TV (Plan 13)

Dispatch ID: agy-calendar-20260911-r1
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-calendar
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The coordinator ran your spec. 12 of 13 pass. The test "past days pulse once on entry and settle" fails at its second half: after openStudioScene(freshPage, 'calendar', 6000) it expects zero pulse animations whose playState is not 'finished', but receives 8. Cause: openStudioScene pauses every document animation at the checkpoint (`a.pause(); a.currentTime = ms`), so a pulse that has fully elapsed reports playState 'paused', never 'finished'. The CSS is correct; the assertion is wrong.

## Hard rules
1. Edit only tests/color-polish-scenes/calendar.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-calendar.

## The change
In that test's second half, replace the playState check with a timing check: for every animation whose animationName is `calendar-entry-pulse`, read `anim.effect.getComputedTiming()` and assert that its `endTime` (delay plus duration for one iteration) is less than or equal to `anim.currentTime` (both in milliseconds), which proves each pulse has fully elapsed at the 6000 ms checkpoint even though the helper paused it. Also assert there are exactly as many such animations as there are `.day.past` elements (each past day pulsed once). Keep the first half of the test (the 300 ms checkpoint) unchanged.

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/calendar.md: "Round 1: the settle assertion now compares getComputedTiming().endTime with currentTime because the shared helper pauses animations at the checkpoint."

End with `## COMPLETION` naming the two files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-calendar/tests/color-polish-scenes/calendar.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-calendar/docs/runs/2026-09-11-tv-scenes/lanes/calendar.md
```
