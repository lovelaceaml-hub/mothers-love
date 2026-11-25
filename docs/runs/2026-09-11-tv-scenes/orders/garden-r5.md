# Work order - garden correction r5: petal expiry sample - Mother's Love TV (Plan 13)

Dispatch ID: agy-garden-20260911-r5
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-garden
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

"petals are carried, not dropped" failed in the integrated run: it expects the petal count at 24 s to be lower than at 17 s, but the second replacement bursts at about 21.8 s and refills the store, so the 24 s count can be higher. The coordinator's timing was wrong; the scene is right.

## Hard rules
1. Edit only tests/color-polish-scenes/garden.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside $HOME/.claude/worktrees/mothers-love-tv-garden.

## The change
Sample on one page: step to 15000 then 17000 (data-petals above 0, the first burst at about 14.8 s), then step to 20500 (before the second burst at about 21.8 s; petal life is 2.2 to 4.7 s so every first-burst petal has expired) and assert data-petals is 0, then step to 23000 and assert data-petals is above 0 again (the second burst). Keep the rest of the spec as it is.

Append one sentence to "## Result" in docs/runs/2026-09-11-tv-scenes/lanes/garden.md naming this round.

End with `## COMPLETION` naming the files changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-garden/tests/color-polish-scenes/garden.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-garden/docs/runs/2026-09-11-tv-scenes/lanes/garden.md
```
