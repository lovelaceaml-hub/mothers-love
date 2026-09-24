# Work order - orbit correction r1: angular rate measure and duplicate highlight - Mother's Love TV (Plan 13)

Dispatch ID: agy-orbit-20260911-r1
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-orbit
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

## Hard rules
1. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-orbit. Do not change scene behavior unless this order says so.

## The change
1. The angular rate test reads NaN: visualState.orbit exposes only id, z, scale and moons, and the scene's planet objects are not reachable from the test. Measure the rate from z instead: for one planet (match by id across samples), z = 395 sin(theta); take two consecutive samples 5 s apart, compute theta from asin(z / 395) with the sign disambiguated by the direction of change (theta increases with time), and assert (theta2 minus theta1) / 5 is .082 within 8 percent; use the pair of samples where both |z| are below 300 so asin is well conditioned. Remove any assertion that depended on a property visualState does not expose.
2. The Sonnet review found the new highlight duplicates the existing `.orb::before` sheen in renderer.css (a white radial highlight at 26 percent, 16 percent already ships on every orb). Remove the `.planet-system .orb::after` rule from public/color-polish/scenes/orbit.css so the file holds only its header comment, and correct the record's statement that no highlight existed (it did, on .orb::before).

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/orbit.md describing this round in one sentence.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/orbit.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-orbit/docs/runs/2026-09-11-tv-scenes/lanes/orbit.md
/Users/anthony/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.css
```
