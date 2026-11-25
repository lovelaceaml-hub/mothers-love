# Work order - garden correction r6: petal test on the direct renderer harness - Mother's Love TV (Plan 13)

Dispatch ID: agy-garden-20260911-r6
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-garden
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The coordinator measured the petal store directly in the renderer (no Studio host): 44 at 15 s and 17 s, 12 at 19 s, 0 at 20.5 s, 44 again at 23 s after the second burst, 5 at 26 s. The scene is correct. In the Studio, the host keeps polling and re-sending snapshots while the spec steps a long virtual timeline on one page, which re-mounts the scene and restarts its clock, so "petals are carried, not dropped" read 44 at 20.5 s. Long single-page timelines cannot be trusted through the Studio; drive the renderer directly instead.

## Hard rules
1. Edit only tests/color-polish-scenes/garden.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside $HOME/.claude/worktrees/mothers-love-tv-garden.

## The change
Rewrite "petals are carried, not dropped" to use the direct renderer harness that the arrival lane already uses. A copy of that spec is at docs/runs/2026-09-11-tv-scenes/orders/arrival-harness-reference.ts.txt in this worktree (read it; it routes `/probe` to a page with the sandboxed renderer iframe, serves `/color-polish/*` from `resolve(process.cwd(), 'public')`, bootstraps the MessageChannel, waits for the ready message and posts the first update; it uses only './helpers', '@playwright/test' and node built-ins, and no import.meta). Copy the harness functions you need into garden.spec.ts (keep them local to that file), post the first update with `scene: 'garden'`, wait until `getState().scene === 2`, then step with `window.colorPolishRuntime.step(ms)` to 15000, 17000, 20500 and 23000 in turn (reading `document.getElementById('living-garden').dataset.petals` after each step) and assert above 0, above 0, exactly 0, above 0. Leave the other five tests, which use openStudioScene, unchanged.

Append one sentence to "## Result" in docs/runs/2026-09-11-tv-scenes/lanes/garden.md naming this round and the reason.

End with `## COMPLETION` naming the files changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-garden/tests/color-polish-scenes/garden.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-garden/docs/runs/2026-09-11-tv-scenes/lanes/garden.md
```
