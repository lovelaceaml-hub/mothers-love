# Work order - milestone correction r2: per-sample depth bars - Mother's Love TV (Plan 13)

Dispatch ID: agy-milestone-20260911-r2
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-milestone
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

## Hard rules
1. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-milestone. Do not change scene behavior unless this order says so.

## The change
"extreme depth" now fails on maxZ 237 at one sample (the bar was 300). The helix reaches its extremes only at particular phases, so per-sample bars must be looser: per sample assert minZ <= -500 and maxZ >= 200; across all samples assert the smallest minZ <= -600 and the largest maxZ >= 300. Keep the blur and scale assertions.

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/milestone.md describing this round in one sentence.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-milestone/tests/color-polish-scenes/milestone.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-milestone/docs/runs/2026-09-11-tv-scenes/lanes/milestone.md

```
