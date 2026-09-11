# Work order - Section 8 correction round 1: focused-rotation test - Mother's Love TV (Plan 13)

Dispatch ID: agy-expressions-20260911-r1
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-expressions
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The coordinator ran your spec: 14 of 15 pass. "every expression can be the focused one" fails with seenIds.size 1 after 18 rounds. Cause: the Studio's Replay button re-sends the same scene; it does not advance the renderer's bloom index, so the same card focuses every round. The CSS is correct; the test's rotation mechanism is wrong. The work order's assumption was mine, not yours.

## Hard rules
1. Edit only tests/color-polish-scenes/expressions.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-expressions.

## The change
Rewrite the rotation loop to use the renderer runtime instead of the Replay button. Read public/color-polish/core/stage.js `requestScene`: every forced request of scene 7 sets `S.bloomIndex = S.bloomNext` and advances `S.bloomNext`, and `window.colorPolishRuntime.setScene(id)` calls requestScene with force. So each round: inside the frame, `evaluate(() => (window as any).colorPolishRuntime.setScene(7))`, then `waitForFunction` until `getState().scene === 7` and the scene root's `.edu-card.focused` (after stepping) has a different `data-expression-id` than the previous round (or simply step 14000 as before and read the focused card), then `step(14000)` and pause animations exactly as the helper does, then evaluate the focused card as you already do. Keep the 18 round cap and the final `expect(seenIds.size).toBe(9)`. Keep all four per-round assertions (detail fits, explanation bottom between 70 and 92 percent, source below explanation). Remove the Replay click and the frame re-discovery, since the frame does not change.

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/expressions.md: "Round 1: the rotation test drives window.colorPolishRuntime.setScene(7), which advances the bloom index; the Studio Replay button does not."

End with `## COMPLETION` naming the two files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-expressions/tests/color-polish-scenes/expressions.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-expressions/docs/runs/2026-09-11-tv-scenes/lanes/expressions.md
```
