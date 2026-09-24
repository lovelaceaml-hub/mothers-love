# Work order - orbit correction r3: landing review corrections - Mother's Love TV (Plan 13)

Dispatch ID: agy-orbit-20260911-r3
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-orbit
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 10 (data-scene="10"). Round: r3.

The Sonnet 5 landing review of your previous round (r2) found the items below. Your previous edits are still uncommitted in the worktree; build on them. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or the en dash. Keep every rule of the previous order (scene prefix on top-level const and let, scoped CSS, circular bubbles, still mode, shipped colors only).

## Corrections
1. Blocking: a keepAge remount (core/host.js line 31 calls renderNow(S.s,{keepAge:true}) whenever recognitions change, and the Studio does it repeatedly) calls orbitScene() again and draws a fresh id, so the sun expression changes mid-pass. requestScene zeroes S.sceneAge before markup while keepAge preserves it, so at markup time replace `const id = orbitNextId();` with `const id = (S.sceneAge > 0.5 && ORBIT_LAST) ? ORBIT_LAST : orbitNextId();`.
2. Should-fix: remove the dead `V.orbitId = id;` line (V is replaced by postRender right after markup, so nothing can read it).
3. Spec: the pre-existing rate test measured 0.0894 against an upper bound of 0.0886 on the coordinator's loaded runner (the rate constant 0.082 is unchanged). Widen the window to 0.082 times 0.88 to 1.12 and add a comment that the measurement is wall-clock sampled.

Append one line "Round r3: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/orbit.md. End with `## COMPLETION` listing every file changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.js
/Users/anthony/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/orbit.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-orbit/docs/runs/2026-09-11-tv-scenes/lanes/orbit.md
```
