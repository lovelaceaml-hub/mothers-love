# Work order - garden correction r8: overflow sample before the first sprout - Mother's Love TV (Plan 13)

Dispatch ID: agy-garden-20260911-r8
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-garden
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

Round 7 is green except "garden renders circular bubbles and no overflow at 14 s", which reads scrollHeight 654. Cause: the garden's first replacement fires at 14.0 s and the newcomer sprouts from y 654 (core/motion.js renderFloaters, `y=mix(654,a.homeY,q)`), below the 636 px stage, so a 14 s sample can catch the sprout mid-rise. That entrance predates this lane and is clipped by the stage.

## Hard rules
1. Edit only tests/color-polish-scenes/garden.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-garden.

## The change
In that first test, take the noOverflow measurement at 12000 ms (a separate openStudioScene call, before the first replacement) and keep circularity and studioClickDoesNotAdvance at 14000 ms. Change nothing else.

Append one sentence to "## Result" in docs/runs/2026-09-11-tv-scenes/lanes/garden.md naming this round and the sprout origin.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-garden/tests/color-polish-scenes/garden.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-garden/docs/runs/2026-09-11-tv-scenes/lanes/garden.md
```
