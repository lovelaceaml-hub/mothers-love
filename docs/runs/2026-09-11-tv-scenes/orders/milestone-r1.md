# Work order - Section 11 correction round 1: depth threshold - Mother's Love TV (Plan 13)

Dispatch ID: agy-milestone-20260911-r1
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-milestone
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The coordinator ran your spec: 11 of 12 pass. "extreme depth" fails at `expect(minZ).toBeLessThanOrEqual(-550)` with minZ minus 535.6 at one sample. The scene code is right (depth 360 to 520 plus the offset reaches minus 630 only at particular phases); the coordinator's acceptance bar was too tight for a single sample.

## Hard rules
1. Edit only tests/color-polish-scenes/milestone.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-milestone.

## The change
In "extreme depth": per sample, assert minZ <= -500 and maxZ >= 300 (was -550); additionally assert that across all samples the smallest minZ observed is <= -600. Keep every other assertion (blur at least 1.5 px on one node and none on another, largest scale at least 1.4).

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/milestone.md: "Round 1: the per-sample depth bar is minus 500 with minus 600 required at some sample; the first run measured minus 536 at one sample."

End with `## COMPLETION` naming the two files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-milestone/tests/color-polish-scenes/milestone.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-milestone/docs/runs/2026-09-11-tv-scenes/lanes/milestone.md
```
