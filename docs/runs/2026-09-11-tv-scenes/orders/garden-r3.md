# Work order - garden correction r3: remove the petal truncation - Mother's Love TV (Plan 13)

Dispatch ID: agy-garden-20260911-r3
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-garden
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The Sonnet review found, in public/color-polish/scenes/garden.js around lines 289 to 291, a retire counter that keeps all 44 petals on the first burst but only the first 38 on every later burst (`petals.slice(0, 38)`). Neither the gap report nor the order asked for this; the 120 cap on V.garden.petals already bounds the array.

## Hard rules
1. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-garden.

## The change
Remove the retireCount logic and the slice: push every spliced petal into V.garden.petals on every burst, then apply the existing 120 cap by dropping the oldest. Change nothing else. In docs/runs/2026-09-11-tv-scenes/lanes/garden.md, make the Draw order paragraph accurate (every petal transfers on every burst) and append one sentence to "## Result" naming this round.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-garden/public/color-polish/scenes/garden.js
/Users/anthony/.claude/worktrees/mothers-love-tv-garden/docs/runs/2026-09-11-tv-scenes/lanes/garden.md
```
