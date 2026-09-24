# Work order - arrival correction r2: ES module harness - Mother's Love TV (Plan 13)

Dispatch ID: agy-arrival-20260911-r2
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-arrival
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

## Hard rules
1. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-arrival. Do not change scene behavior unless this order says so.

## The change
The spec fails to load: `ReferenceError: require is not defined in ES module scope`. The test files are ES modules; replace every `require(...)` (and any createRequire usage) with static `import` statements at the top of the file (for example `import { readFile } from 'node:fs/promises'` and `import { resolve, dirname } from 'node:path'` with `fileURLToPath(import.meta.url)` for the folder). Keep the harness logic otherwise unchanged.

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/arrival.md describing this round in one sentence.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-arrival/tests/color-polish-scenes/arrival.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-arrival/docs/runs/2026-09-11-tv-scenes/lanes/arrival.md

```
