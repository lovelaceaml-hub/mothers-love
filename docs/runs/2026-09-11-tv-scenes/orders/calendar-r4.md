# Work order - calendar correction r4: the Today halo must not overflow the cell - Mother's Love TV (Plan 13)

Dispatch ID: agy-calendar-20260911-r4
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-calendar
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 5 (data-scene="5"). Round: r4.

The coordinator's Playwright run of round r3 still fails the pre-existing "corner date and centered count" test (and its 3840 twin): a day cell's scrollWidth is 167 against a clientWidth of 164. The cause is the `.day.today::after` halo with `inset: -3px`, which extends 3 px outside the cell on every side (scrollable overflow counts absolutely positioned descendants even when clipped), and its `rotate(360deg)` animation would also sweep the rounded rectangle's corners outside the cell. Your previous edits are still uncommitted in the worktree; build on them. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or the en dash. Keep every rule of the previous orders.

## Correction
1. Rebuild the Today halo as an inset ring that never leaves the cell and never rotates the element: `#tv .scene[data-scene="5"] .day.today::after { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 3px; background: conic-gradient(from 0deg, transparent, #ffffff99, #D8B45280, transparent) border-box; -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); mask-composite: exclude; pointer-events: none; z-index: -1; }`. Animate the sweep without transforming the element: replace `calendarTodayHalo` with a keyframe that animates `background-position` of a `repeating-linear-gradient(115deg, transparent 0 40%, #ffffff99 50%, #D8B45280 55%, transparent 65% 100%)` with `background-size: 300% 100%` from `200% 0` to `-100% 0` over 6 s linear infinite (drop the conic gradient in that case; use the linear one so the highlight travels around the ring edge). Keep still-mode and reduced-motion overrides.
2. Confirm nothing else in `.day.past` or `.day.today` adds scrollable overflow: no transform on `b` (already removed), no pseudo element beyond the cell box, no box-shadow spread beyond (box-shadow does not count, it is fine).

Append one line "Round r4: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/calendar.md. End with `## COMPLETION` listing every file changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-calendar/public/color-polish/scenes/calendar.css
$HOME/.claude/worktrees/mothers-love-tv-calendar/tests/color-polish-scenes/calendar.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-calendar/docs/runs/2026-09-11-tv-scenes/lanes/calendar.md
```
