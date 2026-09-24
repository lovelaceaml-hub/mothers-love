# Work order - welcome correction r6: spin the ring's gradient, never its box - Mother's Love TV (Plan 13)

Dispatch ID: agy-welcome-20260911-r6
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-welcome
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 1 (data-scene="1"). Round: r6.

The coordinator measured the remaining overflow directly: the scene root's scrollHeight reads 643 (and earlier 645, 646, and 1833 wide) with no element's bounding box past the stage, and hiding individual bubbles removes it at different instants. The culprit is `.orb-slot::after`: it is a square box (inset -6 px) rotated by the welcomeRingSpin keyframes, and a rotated square's axis-aligned bounding box grows by up to 41 percent, so the ring's box sweeps past the stage edge as it turns even though the radial mask hides those pixels. The bubble clamp cannot help because the pseudo element rotates independently. Your previous edits are still uncommitted; build on them. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or the en dash.

## Correction
1. In welcome.css stop transforming the ring. Register an angle property and animate it instead: `@property --welcome-ring-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }`; change the ring's background to `conic-gradient(from var(--welcome-ring-angle), transparent 0%, #fff9 35%, color-mix(in srgb, var(--tint, #d9b477) 35%, transparent) 70%, transparent 100%)`; change `@keyframes welcomeRingSpin` to animate `--welcome-ring-angle` from 0deg to 360deg; remove every `transform` from the ring rule and its keyframes. Keep the 9 s duration, the per-slot delay variable, the `spin-reverse` class (animation-direction reverse), the mask, `pointer-events: none`, `z-index: -1`, and the still-mode and reduced-motion overrides. A browser without `@property` support simply shows a static ring, which is acceptable.
2. Nothing in welcome.js changes.

Append one line "Round r6: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/welcome.md. End with `## COMPLETION` listing every file changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-welcome/public/color-polish/scenes/welcome.css
/Users/anthony/.claude/worktrees/mothers-love-tv-welcome/docs/runs/2026-09-11-tv-scenes/lanes/welcome.md
```
