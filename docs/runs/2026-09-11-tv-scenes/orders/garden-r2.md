# Work order - garden correction r2: sharp threshold and replacement spacing - Mother's Love TV (Plan 13)

Dispatch ID: agy-garden-20260911-r2
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-garden
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

## Hard rules
1. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-garden. Do not change scene behavior unless this order says so.

## The change
The coordinator measured that the core default path already writes tiny blurs (0.02 to 0.09 px) on near actors because screenScale breathes between .9 and 1.0, so "sharp" must mean blur below 0.15 px, not none. In the depth-layer test, change the sharp condition to `parseBlur(a.blur) < 0.15` (treat none or empty as 0). Keep the "blurred above 0.3 px" condition.

Also, "the garden fills over a minute" fails with spacing minus 10.98: the log entries must be read in time order. Collect the runtime log (getState().log) at the final sample only, filter entries whose type is garden_replacement, sort them by their `at` field ascending, de-duplicate by `at`, and assert every consecutive difference is between 6 and 8 seconds (the first replacement is at about 14 s and then every 7 s). Note the runtime log keeps at most 1400 entries, so read it once at the end rather than accumulating across samples.

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/garden.md describing this round in one sentence.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-garden/tests/color-polish-scenes/garden.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-garden/docs/runs/2026-09-11-tv-scenes/lanes/garden.md

```
