# Work order - status correction r2: deterministic waveform samples - Mother's Love TV (Plan 13)

Dispatch ID: agy-status-20260911-r2
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-status
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

In the integrated run, "icon transforms differ pairwise and follow different waveforms" failed once: a float icon's y delta across the 6000, 7000 and 8000 ms samples was 0.37 px (bar 0.8). The samples are taken on three fresh pages, and in the Studio the renderer plays live for a variable real-time interval before each page is paused and stepped, so the three samples are not exactly one second apart and can straddle a peak of the float motion.

## Hard rules
1. Edit only tests/color-polish-scenes/status.spec.ts and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside $HOME/.claude/worktrees/mothers-love-tv-status.

## The change
Rewrite the vocabulary-signature block to sample on one page: openStudioScene(page, 'status', 6000) once, read the nine icon transforms, then four more times call `frame.evaluate(() => window.colorPolishRuntime.step(1000))` followed by the same animation pause the helper applies, reading the transforms after each step, giving five samples exactly one virtual second apart. Then apply the signatures over the five samples: float icons have max minus min of translate y above 0.8 px and absolute rotate never above 3.5 degrees; sway icons reach absolute rotate at least 3 degrees in some sample and translate y within 0.5 px of zero in every sample; breathe icons have rotate within 0.2 degrees of zero in every sample and either scale max minus min above 0.01 or a lift (translate y up to 6 px) in some sample. Keep the pairwise-different assertion at the first sample and the numbers-have-no-transform assertion.

Append one sentence to "## Result" in docs/runs/2026-09-11-tv-scenes/lanes/status.md naming this round.

End with `## COMPLETION` naming the files changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-status/tests/color-polish-scenes/status.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-status/docs/runs/2026-09-11-tv-scenes/lanes/status.md
```
