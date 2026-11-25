# Work order - Section 6 correction round 1: spec typing - Mother's Love TV (Plan 13)

Dispatch ID: agy-peacemakers-20260911-r1
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-peacemakers
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The coordinator's typecheck (tsc --noEmit, strict) fails on your spec with three errors: tests/color-polish-scenes/peacemakers.spec.ts lines 55, 64 and 67, `Parameter 'a' implicitly has an 'any' type` (callbacks over the visualState actors array). The build fails on the same errors. The scene code is fine.

## Hard rules
1. Edit only tests/color-polish-scenes/peacemakers.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside $HOME/.claude/worktrees/mothers-love-tv-peacemakers.

## The change
Declare one local type near the top of the spec, for example `type VisualActor = { id: string; x: number; y: number; d: number; scale: number; opacity: number; vx: number; vy: number; life: string; readingPages: number; z: number; depth: number; screenScale: number; blur: string }`, type the value returned by `frame.evaluate(() => (window as any).colorPolishRuntime.visualState())` as `{ actors: VisualActor[]; fx: number; flowers: number }` (cast the evaluate result), and annotate every callback parameter over `actors` with `(a: VisualActor)`. Do not add `any` annotations and do not add eslint-disable comments. Read tests/color-polish-scenes/welcome.spec.ts in this worktree's sibling lanes is not available to you, so follow the shape above.

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/peacemakers.md: "Round 1: the spec types the visualState actors (strict tsc had three implicit any errors)."

End with `## COMPLETION` naming the two files changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-peacemakers/tests/color-polish-scenes/peacemakers.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-peacemakers/docs/runs/2026-09-11-tv-scenes/lanes/peacemakers.md
```
