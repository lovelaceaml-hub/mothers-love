# Work order - garden correction r7: restore the committed spec and use the real sample in the direct harness - Mother's Love TV (Plan 13)

Dispatch ID: agy-garden-20260911-r7
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-garden
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

Round 6 regressed three things: strict tsc reports `Property 'id' does not exist on type 'never'` at line 58 (an untyped array literal in the copied harness); "garden renders circular bubbles and no overflow at 14 s" now reads scrollHeight 654 (it passed at 636 before, so the shared setup or sample time changed); and the direct-harness petal test read 0 petals because it posted the small helpers fixture, which has too few eligible records for a garden replacement, whereas the probe posts the 48-record sample built by src/components/display/color-polish/sample.ts.

## Hard rules
1. Edit only tests/color-polish-scenes/garden.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-garden.

## The change
1. Start from the committed spec, copied for you at docs/runs/2026-09-11-tv-scenes/orders/garden-spec-committed-reference.ts.txt: restore every test except "petals are carried, not dropped" to exactly that text (tests 1, 2, 4, 5 and 6 and the imports they use).
2. Rewrite only "petals are carried, not dropped" on the direct renderer harness, with these specifics: import the sample builder with `import { buildColorPolishSampleSnapshot } from '../../src/components/display/color-polish/sample';` (Playwright transpiles TypeScript imports from src) and post `buildColorPolishSampleSnapshot()` as the snapshot in the first update, with a `control` envelope like the probe's (`nowMs: Date.parse(snapshot.serverTime)`, status 'ready', source 'sample', playing true, scene 'garden', `reactionCounts: {}`, `qrDataUrl: ''`, `submissionUrl: snapshot.submissionUrl`); type any harness arrays explicitly (for example `const records: Array<Record<string, unknown>> = []` or a local type) so nothing collapses to never; use `resolve(process.cwd(), 'public')` for static files and no import.meta; route `/probe` to a page holding `<iframe title="Probe" sandbox="allow-scripts" referrerpolicy="no-referrer" src="/color-polish/renderer.html" style="width:100vw;height:100vh;border:0">` and bootstrap the MessageChannel exactly as docs/runs/2026-09-11-tv-scenes/orders/arrival-harness-reference.ts.txt does; wait for `getState().scene === 2`; step to 15000, 17000, 20500 and 23000 reading `document.getElementById('living-garden').dataset.petals` after each step; assert above 0, above 0, exactly 0, above 0.

Append one sentence to "## Result" in docs/runs/2026-09-11-tv-scenes/lanes/garden.md naming this round.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-garden/tests/color-polish-scenes/garden.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-garden/docs/runs/2026-09-11-tv-scenes/lanes/garden.md
```
