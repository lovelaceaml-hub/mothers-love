# Work order - milestone correction r4: scale bar across samples - Mother's Love TV (Plan 13)

Dispatch ID: agy-milestone-20260911-r4
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-milestone
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

"extreme depth" now fails only on `expect(maxScale).toBeGreaterThanOrEqual(1.4)` per sample (1.31 at one sample). Like the z bars, the near extreme is reached only at particular phases.

## Hard rules
1. Edit only tests/color-polish-scenes/milestone.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-milestone.

## The change
Per sample assert maxScale >= 1.2; across all samples assert the largest maxScale >= 1.4. Keep every other assertion as it is after round 2 and round 3.

Append one sentence to "## Result" in docs/runs/2026-09-11-tv-scenes/lanes/milestone.md naming this round.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-milestone/tests/color-polish-scenes/milestone.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-milestone/docs/runs/2026-09-11-tv-scenes/lanes/milestone.md
```
