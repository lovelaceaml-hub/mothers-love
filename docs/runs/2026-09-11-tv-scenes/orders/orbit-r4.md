# Work order - orbit correction r4: measure the rate on the direct renderer harness - Mother's Love TV (Plan 13)

Dispatch ID: agy-orbit-20260911-r4
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-orbit
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 10 (data-scene="10"). Round: r4.

The coordinator's Playwright run of round r3 still fails the pre-existing "planets orbit in 3D at the slower rate" test: measured 0.0996 against 0.082 (it read 0.0894 on r2 and passed in the original sitting). The orbit code's rate is unchanged (`p.phase + V.clock * .082`). The cause is the harness: the test steps a 25 s timeline through the Studio page, and the Studio host keeps polling and re-sending snapshots during a long timeline, which re-mounts the scene (renderNow with keepAge), resets V.clock to 0 and rebuilds the planets, so consecutive samples of "the same planet" do not share a phase and the asin-derived rate is corrupted. This is the same fragility the Build log recorded for garden: any multi-sample timeline longer than a few seconds must drive renderer.html directly through the probe-style harness, which never re-sends a snapshot. Your previous edits are still uncommitted in the worktree; build on them. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or the en dash.

## Correction
1. The direct renderer harness lives on other scene branches, so the coordinator copied them into your worktree as read-only reference files (do not edit or delete them, they are untracked): $HOME/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/harness-reference-arrival.txt and $HOME/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/harness-reference-garden.txt. See how they load /color-polish/renderer.html, post the bootstrap and a sample snapshot with control.scene, and step the runtime (loading /color-polish/renderer.html, posting the bootstrap and a sample snapshot with control.scene, then stepping the runtime). Port the "planets orbit in 3D at the slower rate" test onto that harness with `control.scene` set to the orbit scene (renderer id 10 or slug 'orbit', whichever the harness accepts), keeping the same checkpoints (1000 to 26000 ms in 5 s steps), the same three assertions (z signs, a planet crossing the sun, the measured rate) and restoring the original tolerance of 0.082 times 0.92 to 1.08 with a comment that the harness is deterministic.
2. Leave every other test on the Studio harness as it is.

Append one line "Round r4: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/orbit.md. End with `## COMPLETION` listing every file changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/orbit.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-orbit/docs/runs/2026-09-11-tv-scenes/lanes/orbit.md
```
