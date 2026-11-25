# Work order - welcome correction r5: clamp with the rotated extent - Mother's Love TV (Plan 13)

Dispatch ID: agy-welcome-20260911-r5
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-welcome
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 1 (data-scene="1"). Round: r5.

The coordinator's Playwright run of round r4 still fails the shared overflow assertion, now vertically: scene root scrollHeight 645 and 646 against 636. Cause: the Z rotation you apply during entrance and exit enlarges the slot's axis-aligned bounding box (a square of side s rotated by R spans s times (|cos R| + |sin R|)), so a bubble clamped by its unrotated half size still pokes past the stage edge by up to 10 px at small angles and far more at 45 degrees. Your previous edits are still uncommitted; build on them. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or the en dash.

## Correction
1. In placeWelcome compute the rotated half extent before clamping: `const rad = Math.abs(R) * Math.PI / 180; const spread = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)); const half = (a.d / 2) * scale * spread;` and keep the 8 px margin (`minX = half + 8`, `maxX = 1812 - half - 8`, `minY = half + 8`, `maxY = 636 - half - 8`). When minX exceeds maxX (a very large bubble at 45 degrees) centre it as you already do. Nothing else changes.

Append one line "Round r5: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/welcome.md. End with `## COMPLETION` listing every file changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-welcome/public/color-polish/scenes/welcome.js
$HOME/.claude/worktrees/mothers-love-tv-welcome/docs/runs/2026-09-11-tv-scenes/lanes/welcome.md
```
