# Work order - peacemakers correction r3: sharp threshold - Mother's Love TV (Plan 13)

Dispatch ID: agy-peacemakers-20260911-r3
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

## Hard rules
1. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers. Do not change scene behavior unless this order says so.

## The change
The coordinator measured that the core default path already writes tiny blurs (0.02 to 0.09 px) on near actors because screenScale breathes between .9 and 1.0, so "sharp" must mean blur below 0.15 px, not none. In the depth-layer test, change the sharp condition to `parseBlur(a.blur) < 0.15` (treat none or empty as 0). Keep the "blurred above 0.3 px" condition.

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/peacemakers.md describing this round in one sentence.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers/tests/color-polish-scenes/peacemakers.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers/docs/runs/2026-09-11-tv-scenes/lanes/peacemakers.md

```
