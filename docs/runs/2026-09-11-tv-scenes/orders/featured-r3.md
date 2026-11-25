# Work order - featured correction r3: landing review corrections - Mother's Love TV (Plan 13)

Dispatch ID: agy-featured-20260911-r3
Project root (your worktree): $HOME/.claude/worktrees/mothers-love-tv-featured
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none. Renderer id: 4 (data-scene="4"). Round: r3.

The Sonnet 5 landing review of your previous round (r2) found the items below. Your previous edits are still uncommitted in the worktree; build on them. Edit only the files in the allowlist. Run no shell commands. Never write the em dash or the en dash. Keep every rule of the previous order (scene prefix on top-level const and let, scoped CSS, circular bubbles, still mode, shipped colors only).

## Corrections
1. Blocking: a keepAge remount (core/host.js line 31 calls renderNow(S.s,{keepAge:true}) whenever recognitions change, and the Studio does it repeatedly) calls featured() again and draws a fresh id, and mountFeatured resets V.featuredAdvanced so a second flip fires at once when sceneAge is already past 15. requestScene zeroes S.sceneAge before markup while keepAge preserves it. In featured() replace `const id = featuredNextId();` with `const id = (S.sceneAge > 0.5 && FEATURED_PASS_ID) ? FEATURED_PASS_ID : featuredNextId();` and in mountFeatured set `V.featuredAdvanced = S.sceneAge >= 15;` instead of false.
2. Should-fix: a flip in flight when a remount happens leaves stale timers and animationend listeners that later write into the new pass's V. Add a top-level `let FEATURED_FLIP_CANCEL = null;`; inside featuredAdvance set it to a function that clears both timers and removes both listeners (and sets V.flipping false), and call `FEATURED_FLIP_CANCEL?.(); FEATURED_FLIP_CANCEL = null;` at the top of mountFeatured; clear it when the flip completes normally.
3. Should-fix: `.feature-panel` has `overflow: hidden` together with `transform-style: preserve-3d`; an element with overflow other than visible is forced to flat, which defeats the translateZ depth of the medallion, rings and orbit. Remove `overflow: hidden` from `.feature-panel` and clip the light sweep another way: give `.feature-sweep` its own wrapper `<div class="feature-sweep-clip">` positioned over the panel box with `overflow: hidden`, the same border-radius as the panel, `pointer-events: none`, and no 3D transform; keep the aurora's own `overflow: hidden` on `.feature-aurora`. Confirm the panel's rounded corners still clip nothing that should be visible.
4. Cleanup: remove the three `V.featuredId` writes (nothing reads them). Leave the shipped shadow colors copied from renderer.css as they are (they are shipped values, ruled compliant by the coordinator).

Append one line "Round r3: <what changed>" to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/featured.md. End with `## COMPLETION` listing every file changed.

```allowlist
$HOME/.claude/worktrees/mothers-love-tv-featured/public/color-polish/scenes/featured.js
$HOME/.claude/worktrees/mothers-love-tv-featured/public/color-polish/scenes/featured.css
$HOME/.claude/worktrees/mothers-love-tv-featured/tests/color-polish-scenes/featured.spec.ts
$HOME/.claude/worktrees/mothers-love-tv-featured/docs/runs/2026-09-11-tv-scenes/lanes/featured.md
```
