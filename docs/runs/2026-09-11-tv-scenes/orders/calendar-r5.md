# Work order - calendar correction r5: keep the Today ring visible in still mode - Mother's Love TV (Plan 13)

Dispatch ID: agy-calendar-20260911-r5
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-calendar
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 5 (data-scene="5"). Round: r5.

The Sonnet 5 confirmation review found one should-fix: the Today ring (`.day.today::after`, z-index -1) only paints above the cell's own background while the calendarWave animation keeps a transform on `.day.today` (which makes the cell a stacking context); under `#tv.still` and reduced motion that animation is none, so the ring can disappear behind the cell background. Your previous edits are still uncommitted; build on them. Edit only the file in the allowlist. Run no shell commands. Never write the em dash or the en dash.

## Correction
1. Add `isolation: isolate;` to the `#tv .scene[data-scene="5"] .day.today` rule (create that rule in calendar.css, outside any media query, if it does not exist yet). Nothing else changes.

Append one line "Round r5: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/calendar.md. End with `## COMPLETION` listing every file changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-calendar/public/color-polish/scenes/calendar.css
$HOME/.claude/worktrees/mothers-love-tv-calendar/docs/runs/2026-09-11-tv-scenes/lanes/calendar.md
```
