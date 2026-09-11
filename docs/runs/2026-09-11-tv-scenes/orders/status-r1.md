# Work order - Section 7 correction round 1: stronger spec - Mother's Love TV (Plan 13)

Dispatch ID: agy-status-20260911-r1
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-status
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The Sonnet review found the scene code correct and every motion inside the envelope, but two of your tests do not prove what they claim. Fix the tests only.

## Hard rules
1. Edit only tests/color-polish-scenes/status.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-status. Do not edit helpers.ts (shared, protected) or the scene files.

## Finding 1: circularity never measures this scene's medallions
The shared `circularity(frame)` helper selects `.orb-slot, .orb, .event-orb`; the status scene has none, so it returns count 0 and failures empty by vacuity. In the first test, keep the helper call but add a scene-specific check evaluated in the frame: every `.scene[data-scene="6"] .medallion` (there are nine in `.stat-expression` plus any in the top panel) has a bounding rect whose width equals its height within 1 px and a computed `border-radius` of 50 percent (or a pixel value equal to half the width within 1 px); assert the count is at least 9 and failures are empty. Check it at 6000 ms as well, mid-motion, since the transform rotates and scales the icon image inside the medallion.

## Finding 2: the waveform assertion passes on the old single-vocabulary code
The old tickStatus already produced positive and negative rotation deltas across icons through phase alone. Replace the delta-based block in "icon transforms differ pairwise and follow different waveforms" with vocabulary signatures, grouping icons by their medallion's `data-motion`: sample each icon's parsed translate x, translate y, rotate and scale at 6000, 7000 and 8000 ms (three fresh openStudioScene calls; match icons by index):
- `float` icons: translate y varies across the three samples (max minus min above 0.8 px) and absolute rotate never exceeds 3.5 degrees;
- `sway` icons: absolute rotate reaches at least 3 degrees in at least one sample and translate y stays within 0.5 px of zero except during a lift (there is none for sway, so exactly zero within 0.5 px);
- `breathe` icons: rotate is 0 within 0.2 degrees in every sample and scale varies across the samples (max minus min above 0.01) or a lift is in progress (translate y up to 6 px).
Assert each group is non-empty and every icon in it satisfies its signature. Keep the pairwise-different assertion at 6000 and the numbers-have-no-transform assertion.

## Record
Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/status.md: "Round 1: the spec now measures medallion circularity directly and checks per-vocabulary motion signatures instead of rotation deltas."

End with `## COMPLETION` naming the two files changed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-status/tests/color-polish-scenes/status.spec.ts
/Users/anthony/.claude/worktrees/mothers-love-tv-status/docs/runs/2026-09-11-tv-scenes/lanes/status.md
```
