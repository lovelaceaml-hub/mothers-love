# Work order - welcome correction r2: scale tolerance in the reduced-motion test - Mother's Love TV (Plan 13)

Dispatch ID: agy-welcome-20260911-r2
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-welcome
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

Round 1's scene change is correct and the spec is nearly right: the mount-time transform scale is the layer scale multiplied by the actor's depth breathing factor (core sets `a.depth = .948 + .048 * sin(...)`, so .90 to 1.0), and the test compared against the bare layer scale (off by up to .07).

## Hard rules
1. Edit only tests/color-polish-scenes/welcome.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside $HOME/.claude/worktrees/mothers-love-tv-welcome.

## The change
In the reduced-motion test, assert the measured scale is between layerScale times .88 and layerScale times 1.02 (inclusive) instead of within .02 of layerScale. Keep everything else, including the second reading after step(1000) being identical to the first.

Append one sentence to "## Result" in docs/runs/2026-09-11-tv-scenes/lanes/welcome.md naming this round.

End with `## COMPLETION` naming the files changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-welcome/tests/color-polish-scenes/welcome.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-welcome/docs/runs/2026-09-11-tv-scenes/lanes/welcome.md
```
