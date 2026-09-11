# Work order - arrival correction r4: no import.meta in the spec - Mother's Love TV (Plan 13)

Dispatch ID: agy-arrival-20260911-r4
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-arrival
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The spec still fails to load with "ReferenceError: require is not defined in ES module scope" reported at line 1. The project is not an ES module package, and Playwright transpiles spec files to CommonJS; `fileURLToPath(import.meta.url)` forces the file into ES-module handling where Playwright's injected require does not exist. No other spec in tests/ uses import.meta.

## Hard rules
1. Edit only tests/color-polish-scenes/arrival.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-arrival.

## The change
Remove the `import { fileURLToPath } from 'node:url'` line and every use of `import.meta`. Resolve the public folder as `resolve(process.cwd(), 'public')` (Playwright runs with the worktree root as the working directory; playwright.config.ts sets testDir to ./tests relative to that root). Keep `readFile`, `stat`, `dirname` and `resolve` imports only if still used (drop `dirname` if unused so lint stays clean). Nothing else changes.

Append one sentence to "## Result" in docs/runs/2026-09-11-tv-scenes/lanes/arrival.md naming this round.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-arrival/tests/color-polish-scenes/arrival.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-arrival/docs/runs/2026-09-11-tv-scenes/lanes/arrival.md
```
