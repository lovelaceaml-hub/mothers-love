# Work order - Section 9 correction round 2: spec typing - Mother's Love TV (Plan 13)

Dispatch ID: agy-peace-in-practice-20260911-r2
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-peace-in-practice
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The coordinator's strict typecheck fails on your spec: tests/color-polish-scenes/peace-in-practice.spec.ts lines 113 and 117, `Parameter 'b' implicitly has an 'any' type`. The build fails on the same errors. The scene code is fine.

## Hard rules
1. Edit only tests/color-polish-scenes/peace-in-practice.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside $HOME/.claude/worktrees/mothers-love-tv-peace-in-practice.

## The change
Declare a local `type VisualActor = { id: string; x: number; y: number; d: number; scale: number; opacity: number; vx: number; vy: number; life: string; readingPages: number; z: number; depth: number; screenScale: number; blur: string }`, cast the `frame.evaluate(() => (window as any).colorPolishRuntime.visualState())` result to `{ actors: VisualActor[]; fx: number; flowers: number }`, and annotate every callback parameter over `actors` with `(b: VisualActor)` (or the name you used). Add no `any` annotations and no eslint-disable comments.

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/peace-in-practice.md: "Round 2: the spec types the visualState actors (strict tsc had two implicit any errors)."

End with `## COMPLETION` naming the two files changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-peace-in-practice/tests/color-polish-scenes/peace-in-practice.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-peace-in-practice/docs/runs/2026-09-11-tv-scenes/lanes/peace-in-practice.md
```
