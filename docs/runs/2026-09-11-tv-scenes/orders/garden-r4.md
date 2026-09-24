# Work order - garden correction r4: cadence from gardenNext - Mother's Love TV (Plan 13)

Dispatch ID: agy-garden-20260911-r4
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-garden
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

"the garden fills over a minute" still fails: consecutive garden_replacement log entries are 1.02 s apart. The log stamps entries with S.t, the host-controlled wall clock, and between the spec's virtual steps the Studio host re-sends its own clock, so `at` cannot measure the virtual cadence. The runtime exposes the replacement clock directly: `visualState().gardenNext` is V.next, which starts at 14 and advances by exactly 7 on every replacement.

## Hard rules
1. Edit only tests/color-polish-scenes/garden.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-garden.

## The change
Replace the log-spacing block with gardenNext assertions: sample `visualState().gardenNext` at every 6 s step (you already sample visualState); assert the first sample (2 s) reads 14; assert every consecutive difference is 0 or 7 (never more than one replacement per 6 s sample, never a partial step); assert the final sample (62 s) is at least 56 (at least six replacements in a minute); and keep the existing flowers-increase and max-five-actors assertions. Remove the log-based spacing code.

Append one sentence to "## Result" in docs/runs/2026-09-11-tv-scenes/lanes/garden.md naming this round.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-garden/tests/color-polish-scenes/garden.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-garden/docs/runs/2026-09-11-tv-scenes/lanes/garden.md
```
