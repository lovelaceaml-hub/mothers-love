# Work order - milestone correction r3: remove the inert CSS rule - Mother's Love TV (Plan 13)

Dispatch ID: agy-milestone-20260911-r3
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-milestone
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The Sonnet review found that the rule you added to public/color-polish/scenes/milestone.css (`#tv .scene[data-scene="11"] .stream-node { border-radius: 50% }`) is visually inert (the node container has no background or border; the visible circle is `.stream-pearl`, which already has border-radius 50 percent, overflow hidden and a circular clip-path, and the ring is on `.stream-node::before`) and outside the gap report's Decision ("No CSS beyond the header").

## Hard rules
1. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or en dash. Read and write only inside $HOME/.claude/worktrees/mothers-love-tv-milestone.

## The change
1. Restore public/color-polish/scenes/milestone.css to its single header comment line only.
2. In tests/color-polish-scenes/milestone.spec.ts, retarget the circularity assertion from `.stream-node` to `.stream-pearl`: every `.stream-pearl` has width equal to height within 1 px and a computed border-radius of 50 percent (or a pixel value equal to half its width within 1 px), with at least 14 measured.
3. Correct the record: in docs/runs/2026-09-11-tv-scenes/lanes/milestone.md, replace the line saying a scoped border-radius rule was added with a line saying the CSS file holds only its header comment and circularity is measured on .stream-pearl, and append one sentence to "## Result" naming this round.

End with `## COMPLETION` naming the files changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-milestone/public/color-polish/scenes/milestone.css
$HOME/.claude/worktrees/mothers-love-tv-milestone/tests/color-polish-scenes/milestone.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-milestone/docs/runs/2026-09-11-tv-scenes/lanes/milestone.md
```
