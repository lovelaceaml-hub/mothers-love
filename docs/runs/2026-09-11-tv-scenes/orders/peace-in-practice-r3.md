# Work order - peace-in-practice correction r3: sharp threshold and overflow measure - Mother's Love TV (Plan 13)

Dispatch ID: agy-peace-in-practice-20260911-r3
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

## Hard rules
1. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice. Do not change scene behavior unless this order says so.

## The change
The coordinator measured that the core default path already writes tiny blurs (0.02 to 0.09 px) on near actors because screenScale breathes between .9 and 1.0, so "sharp" must mean blur below 0.15 px, not none. In the depth-layer test, change the sharp condition to `parseBlur(a.blur) < 0.15` (treat none or empty as 0). Keep the "blurred above 0.3 px" condition.

Also, the first test fails on scrollHeight 651 versus clientHeight 636 on the scene root. The coordinator traced it to the pre-existing background heart field (#heart-field, fourteen floating hearts driven by tickHearts) whose lowest heart reaches about 646 px; the stage clips it and it predates this lane. Change the overflow assertion to measure the scene root's overflow with the heart field excluded: in the frame, compute the maximum bottom edge among the scene root's children except the #heart-field element and its descendants, and assert it is at most clientHeight, and keep the scrollWidth assertion as is. Say in the record that the heart field overhang is pre-existing.

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/peace-in-practice.md describing this round in one sentence.

End with `## COMPLETION` naming the files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice/tests/color-polish-scenes/peace-in-practice.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-peace-in-practice/docs/runs/2026-09-11-tv-scenes/lanes/peace-in-practice.md

```
