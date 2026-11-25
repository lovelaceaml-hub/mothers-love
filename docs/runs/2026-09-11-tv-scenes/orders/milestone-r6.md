# Work order - milestone correction r6: landing review corrections - Mother's Love TV (Plan 13)

Dispatch ID: agy-milestone-20260911-r6
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-milestone
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 11 (data-scene="11"). Round: r6.

The Sonnet 5 landing review and the coordinator's Playwright run of your previous round (r5) found the items below. Your previous edits are still uncommitted in the worktree; build on them. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or the en dash. Keep every rule of the previous order (scene prefix on top-level const and let, scoped CSS, circular bubbles, still mode, shipped colors only).

## Corrections
1. Blocking (spec): the new test measures getBoundingClientRect inside the Studio preview, where #tv is scaled to about 0.46, so `rail.width` reads 259 screen pixels and the `>= 540` assertion fails every run. Normalize by the live scale: `const scale = sceneRect.width / 1812;` then assert `rail.width / scale >= 540` and `rail.leftWithinScene / scale < 60`.
2. Should-fix (spec): the sample data never exercises the worst case (a four digit threshold with a 13 character goal name such as Encouragement). If tests/color-polish-scenes/helpers.ts offers a way to pass fixture overrides into the Studio scene (read `buildActiveDisplayFixture(overrides)` and `openStudioScene`), add a second test that forces month expressionCounts summing above 1000 and goal expressionId 7, then asserts `rail.scrollHeight <= rail.clientHeight + 1` and that `.goal-name` has scrollWidth at most clientWidth + 1. If the helper cannot inject overrides without editing it (helpers.ts is not in your allowlist), record that as a deferred follow-up in the lane record instead.

Append one line "Round r6: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/milestone.md. End with `## COMPLETION` listing every file changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-milestone/tests/color-polish-scenes/milestone.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-milestone/docs/runs/2026-09-11-tv-scenes/lanes/milestone.md
```
