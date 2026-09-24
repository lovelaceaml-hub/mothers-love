# Work order - Section 3 correction round 1: spec typing - Mother's Love TV (Plan 13)

Dispatch ID: agy-arrival-20260911-r1
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-arrival
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The coordinator's strict typecheck fails on your spec: tests/color-polish-scenes/arrival.spec.ts(60,78): error TS2339: Property 'id' does not exist on type 'never'. The build fails on the same error. The scene code is fine.

## Hard rules
1. Edit only tests/color-polish-scenes/arrival.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-arrival.

## The change
Read line 60 and the value whose element type collapsed to `never` (an array literal typed as `never[]`, or a filter narrowing to never). Give it an explicit element type, for example declare `type ArrivalRecord = { id: string; recipient: string; message: string; createdAt: string; firstPublishedAt: string; expiresAt: string; expressionIds: number[]; [key: string]: unknown }` and type the records array and the snapshot's `recognitions` and `arrivals` arrays with it, mirroring what scripts/color-polish-renderer-probe.mjs builds. Add no `any` and no eslint-disable comments.

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/arrival.md: "Round 1: the arrivals harness types its records (strict tsc reported a never-typed array)."

End with `## COMPLETION` naming the two files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-arrival/tests/color-polish-scenes/arrival.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-arrival/docs/runs/2026-09-11-tv-scenes/lanes/arrival.md
```
