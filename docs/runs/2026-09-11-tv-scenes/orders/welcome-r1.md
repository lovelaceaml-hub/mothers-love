# Work order - welcome correction r1: keep depth styling when still - Mother's Love TV (Plan 13)

Dispatch ID: agy-welcome-20260911-r1
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-welcome
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The Opus completion review found that public/color-polish/scenes/welcome.js line 55 (`if (S.still) return true;` at the top of the place override) makes welcome the only scene that drops its depth layering under reduced motion: core/stage.js postRender calls renderFloaters once at mount even when still, the other four depth-layer scenes write their layer scale, blur and z-index in that call, and welcome returns before writing anything. The gap report's Decision never authorized a still-mode opt-out.

## Hard rules
1. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or en dash. Read and write only inside $HOME/.claude/worktrees/mothers-love-tv-welcome.

## The change
1. In scenes/welcome.js remove the `if (S.still) return true;` early return so the place override always writes left, top, transform (home position with the layer scale), opacity, z-index and filter and syncs the slot record, exactly as the other lanes' place overrides do. Nothing moves when still because tickSlots never runs; the one mount-time write simply applies the layer.
2. In tests/color-polish-scenes/welcome.spec.ts, change the reduced-motion test: instead of asserting an empty or identity transform, assert that every `.orb-slot` has a `data-depth` value, that its computed transform is a matrix whose scale equals its layer's scale (far .84, mid .93, near 1) within .02, and that two readings 1000 ms apart (step 1000 via the runtime, then re-read) are identical (nothing moves while still). Keep circularity and still === true.

Append one sentence to "## Result" in docs/runs/2026-09-11-tv-scenes/lanes/welcome.md naming this round.

End with `## COMPLETION` naming the files changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-welcome/public/color-polish/scenes/welcome.js
$HOME/.claude/worktrees/mothers-love-tv-welcome/tests/color-polish-scenes/welcome.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-welcome/docs/runs/2026-09-11-tv-scenes/lanes/welcome.md
```
