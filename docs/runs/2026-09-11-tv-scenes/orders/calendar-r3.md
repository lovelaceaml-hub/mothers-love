# Work order - calendar correction r3: landing review corrections - Mother's Love TV (Plan 13)

Dispatch ID: agy-calendar-20260911-r3
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-calendar
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 5 (data-scene="5"). Round: r3.

The Sonnet 5 landing review of your previous round (r2) found the items below. Your previous edits are still uncommitted in the worktree; build on them. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or the en dash. Keep every rule of the previous order (scene prefix on top-level const and let, scoped CSS, circular bubbles, still mode, shipped colors only).

## Corrections
1. Should-fix: the infinite calendarWave overrides the one-shot entry pulse on `transform` as soon as it starts, cutting the pulse off for the first days. Give the wave a fixed base offset so it always starts after the pulse: `animation-delay: calc(0.8s + var(--day-index, 0) * 0.35s)` for the wave on `.day.past` and `.day.today` (the entry pulse keeps its own delay in the same list), and the same base offset on the `b` calendarWaveCount delay so they stay in sync.
2. Should-fix: calendarCacheCells reads counts from the animated number text, which is 0 at mount, so the fallback caches every day and never re-caches. Read the real value instead: build the day key exactly as calendarScene does (`${monthKey(S.month)}-${String(day).padStart(2,'0')}` from the cell's data-day) and use `numberValue('d:' + key + ':rec')` for the count. Keep the fallback to all cells only when no day has a count.
3. Should-fix: in the new Studio click test assert the selection through the runtime state rather than a substring of the date label: after the click read `document.querySelector('.day.today')?.dataset.day` (the re-rendered scene marks the selected day with the today class) and expect it to equal the clicked data-day; drop the `toContain(targetDay)` assertion.
4. Should-fix: `#c9758b` in calendarRowGlowB is a new hue. Use the shipped `#b4677b` at that stop and let the text-shadow carry the highlight.
5. Note, no change required: on `.day.today` the always-active calendarTodayRing owns box-shadow, so the wave's glow never shows there; acceptable.
6. Playwright: the pre-existing "corner date and centered count" test now fails because the wave's `scale(1.08)` on the count `b` adds one pixel of scrollable overflow to the cell (165 against 164). Remove the scale from calendarWaveCount and carry the count's crest with `text-shadow` and `filter: brightness(1.12)` only, so no transform on `b`.
7. Playwright: the pre-existing "past days pulse once on entry and settle" test counts calendar-entry-pulse animations and expects exactly one per `.day.past`; your `.day.today` rule added the entry pulse to today as well (9 against 8). Remove calendar-entry-pulse from the `.day.today` animation list (keep calendarWave and calendarTodayRing there).

Append one line "Round r3: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/calendar.md. End with `## COMPLETION` listing every file changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-calendar/public/color-polish/scenes/calendar.js
$HOME/.claude/worktrees/mothers-love-tv-calendar/public/color-polish/scenes/calendar.css
$HOME/.claude/worktrees/mothers-love-tv-calendar/tests/color-polish-scenes/calendar.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-calendar/docs/runs/2026-09-11-tv-scenes/lanes/calendar.md
```
