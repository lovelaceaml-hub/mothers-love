# Work order - featured correction r4: the remount test reads a variable that is not on window - Mother's Love TV (Plan 13)

Dispatch ID: agy-featured-20260911-r4
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-featured
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 4 (data-scene="4"). Round: r4.

The coordinator's Playwright run of round r3 passes every test except the one you added, "keepAge remount preserves current expression and does not re-flip when sceneAge >= 15": its last assertion reads `(window as any).V`, but `V` is declared with `let` at the top level of a classic script, and `let` never creates a window property, so it is undefined. Your previous edits are still uncommitted; build on them. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or the en dash.

## Correction
1. In that test remove the `featuredAdvanced` read and its assertion. Replace it with a behavioural check: after the keepAge remount, wait 900 ms (`page.waitForTimeout(900)`) and re-read the panel classes and the h2 name; assert the name still equals the name before the remount and that neither `flip-out` nor `flip-in` is present, which proves no second flip fired. Keep the other assertions.

Append one line "Round r4: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/featured.md. End with `## COMPLETION` listing every file changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-featured/tests/color-polish-scenes/featured.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-featured/docs/runs/2026-09-11-tv-scenes/lanes/featured.md
```
