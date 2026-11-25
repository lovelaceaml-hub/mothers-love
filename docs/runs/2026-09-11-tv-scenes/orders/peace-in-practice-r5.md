# Work order - peace-in-practice correction r5: landing review corrections - Mother's Love TV (Plan 13)

Dispatch ID: agy-peace-in-practice-20260911-r5
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-peace-in-practice
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 9 (data-scene="9"). Round: r5.

The Sonnet 5 landing review of your previous round (r4) found the items below. Your previous edits are still uncommitted in the worktree; build on them. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or the en dash. Keep every rule of the previous order (scene prefix on top-level const and let, scoped CSS, circular bubbles, still mode, shipped colors only).

## Corrections
1. Blocking (spec): the coordinator calls heartRenderer.draw(V.clock * .55 + 6), so a Studio checkpoint of 2000 ms renders the heart at t = 7.1, a phase where the centre 200 by 200 region holds no shadow-band pixels, and the luminance test fails every run. Make the test phase-independent: sample the whole heart, not the centre. Compute the bands over the full canvas (skip pixels with alpha under 50) and require shadow, base and highlight each above 200 pixels; additionally assert that at least 40 percent of opaque pixels are not in the highlight band. Keep the toDataURL inequality test.
2. Should-fix (performance): cache the per-quad fill strings. Quantize `intensity` to 32 buckets and precompute at init a lookup of 'rgb(r,g,b)' strings for the base ramp; rim and specular still modify the colour, so apply them by choosing among a small set of precomputed rim and specular blend tables (for example 8 rim levels and 8 specular levels per intensity bucket, computed once at init into a flat array of strings indexed by bucket * 64 + rimLevel * 8 + specLevel). Per frame only integer math and array lookups remain. Keep one fill per quad and the far-first order.
3. Should-fix: remove the unused `rx`, `ry`, `rz` typed arrays and their per-vertex writes; keep only the projected px and py.
4. Cosmetic: spark sizes span 1.5 to 3 px (`1.5 + (i % 4) * 0.5`).
5. Playwright: the pre-existing burst test steps the runtime 6 s at a time, wider than a peace particle's life (2.4 to 3.6 s), so the first sample after a burst can already read zero particles (it did on the coordinator's run). Step 2 s at a time over the same 60 s window (ms from 2000 to 62000 in steps of 2000) so the first sample after a burst always falls inside the particle life; keep every assertion, and change "two samples later the count is lower" to "three samples later" so the comparison spans at least 6 s.

Append one line "Round r5: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/peace-in-practice.md. End with `## COMPLETION` listing every file changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-peace-in-practice/public/color-polish/scenes/peace-in-practice.js
$HOME/.claude/worktrees/mothers-love-tv-peace-in-practice/tests/color-polish-scenes/peace-in-practice.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-peace-in-practice/docs/runs/2026-09-11-tv-scenes/lanes/peace-in-practice.md
```
