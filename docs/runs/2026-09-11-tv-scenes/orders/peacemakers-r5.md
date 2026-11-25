# Work order - peacemakers correction r5: landing review corrections - Mother's Love TV (Plan 13)

Dispatch ID: agy-peacemakers-20260911-r5
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-peacemakers
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 8 (data-scene="8"). Round: r5.

The Sonnet 5 landing review and the coordinator's Playwright run of your previous round (r4) found the items below. Your previous edits are still uncommitted in the worktree; build on them. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or the en dash. Keep every rule of the previous order (scene prefix on top-level const and let, scoped CSS, circular bubbles, still mode, shipped colors only).

## Corrections
1. Blocking: mount sets `a.retireAt = 8 + i * 4`, but core waits for `max(retireAt, born + minRead)` and every sample message floors minRead at 9 s, so actor 0 exits at 9 s until 12.8 s while actor 1 starts at 12 s: two exiting at once on every load. Use `a.retireAt = 9 + i * 4.6` for non-large actors (after the large branch).
2. Should-fix: Exit gate (scene-level, in the integrate hook, which core calls for every actor before its own physics): core starts an exit for the first steady actor whose clock is at or past max(retireAt, born + minRead) and an exit lasts 3.8 s, so independent retireAt values drift into overlapping exits over a long dwell. Keep a gate on V (for example `V.peacemakersLastExit`, set whenever an actor life becomes exiting, detected by comparing a.life against a per-actor `_peacemakersSeenLife` field): while any actor is exiting or absent, or while fewer than 4.6 s have passed since the last exit start, push every steady actor whose `retireAt` is at or below `V.clock` forward to `V.clock + 0.5`. This keeps "at most one exiting" durable without touching core. The large reader actor (`a.large`) is exempt from retirement entirely: give it `retireAt = Infinity` at mount and never shorten it.
3. Playwright: Overflow measure (spec): core floats a replacement in from off stage and drifts a retired bubble off stage, so the scene root scrollWidth legitimately exceeds 1812 while a bubble is entering or exiting (the coordinator measured 1995 at 14 s). Replace the shared `noOverflow(frame)` assertion in the "renders circular bubbles and no overflow" test with a scene-local measure: take every direct child of `#stage .scene[data-scene="8"]` except the `canvas.scene-fx`, skip `.orb-slot` elements whose record id maps (through `visualState().actors`, matching `id` to `data-record-id`) to an actor whose life is not steady, and assert each remaining element rect lies inside the scene rect with a 1 px tolerance. Keep the circularity assertion as it is.
4. Cosmetic: the bead tail draws 7 samples (k from 6 to 0); use 6 (k from 5 to 0). Remove the doubled blank line between tests in the spec.
5. Record note: in drift mode core fires no heart burst on exit, so the petals are the only departure effect; state that in the lane record line.

Append one line "Round r5: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/peacemakers.md. End with `## COMPLETION` listing every file changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-peacemakers/public/color-polish/scenes/peacemakers.js
$HOME/.claude/worktrees/mothers-love-tv-peacemakers/tests/color-polish-scenes/peacemakers.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-peacemakers/docs/runs/2026-09-11-tv-scenes/lanes/peacemakers.md
```
