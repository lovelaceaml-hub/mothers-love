# Work order - Section 0 correction round: load-order race - Mother's Love TV (Plan 13)

Dispatch ID: agy-base-20260911-r2
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-base
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

This corrects one defect found by the coordinator's like-for-like Playwright comparison after the Section 0 split (order: docs/runs/2026-09-11-tv-scenes/orders/base.md in this worktree). Two live-TV journeys in tests/color-polish-usable/usable.spec.ts fail with `ReferenceError: SINGLE_STYLES is not defined` thrown inside `visualState` at public/color-polish/core/stage.js line 101.

Cause: `window.colorPolishRuntime = {...}` is assigned at the end of core/stage.js, which loads before scenes/arrival.js declares the `SINGLE_STYLES`, `GROUP_STYLES` and `GROUP_TITLES` constants. The host page polls `window.colorPolishRuntime.getState()` as soon as the object exists, and `runtimeState` calls `visualState`, which reads `SINGLE_STYLES`. Deferred scripts run in order but the page can service that poll between two of them, so the runtime object must not exist until every script has loaded. The original single-file renderer never had this window. The same reasoning applies to `window.addEventListener('message', receiveBootstrap)` at the end of core/host.js: a bootstrap message serviced before the scene scripts load would render with no scenes registered.

## Hard rules

1. Edit only the files in the allowlist. Run no shell commands (the headless gate denies them; the coordinator verifies). Read and write only inside $HOME/.claude/worktrees/mothers-love-tv-base.
2. Never run git commands that change state. Never write the em dash (U+2014) or en dash (U+2013).
3. Move code verbatim. Change nothing else.

## The change

1. In $HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/stage.js: cut the entire `window.colorPolishRuntime={ ... };` statement (the object literal with getState, visualState, setScene, setPlaying, setClock, step, clear, catalog) out of the file. Leave `runtimeState`, `visualState`, `stepRuntime` and `changeRate` where they are.
2. In $HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/host.js: cut the last line `window.addEventListener('message',receiveBootstrap);` out of the file.
3. In $HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/boot.js: paste both, in this order, immediately before the final `init();` line and after the `init` function definition: first the `window.addEventListener('message',receiveBootstrap);` line, then the `window.colorPolishRuntime={...};` statement. Add one comment line above them: `// Exposed only after every core and scene script has loaded, so no host poll or bootstrap message can run before the registry is complete.`

## Record

Append to $HOME/.claude/worktrees/mothers-love-tv-base/docs/runs/2026-09-11-tv-scenes/lanes/base.md, at the end of the "## Files moved" table, one row: `| public/color-polish/boot.js (round 2) | 243, 930-940 | window.addEventListener('message', receiveBootstrap), window.colorPolishRuntime (moved from host.js and stage.js so the runtime is exposed only after every script loads) |`. Change nothing else in that file.

## Required completion output

End with `## COMPLETION`: the three code files changed and the record row added, and confirm that stage.js no longer contains `window.colorPolishRuntime` and host.js no longer contains `addEventListener('message'`.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/stage.js
$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/core/host.js
$HOME/.claude/worktrees/mothers-love-tv-base/public/color-polish/boot.js
$HOME/.claude/worktrees/mothers-love-tv-base/docs/runs/2026-09-11-tv-scenes/lanes/base.md
```
