# Work order - featured correction r1: unique top-level identifiers - Mother's Love TV (Plan 13)

Dispatch ID: agy-featured-20260911-r1
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-featured
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The Sonnet review found a blocking cross-lane defect. Every scene file loads as a separate classic script sharing one global lexical scope, so a top-level `const LAYERS` in your scene file collides with the same identifier in another scene file once the branches merge: the second script to load throws SyntaxError "Identifier 'LAYERS' has already been declared" at parse time and none of it runs, so that scene disappears. Four lanes declared `const LAYERS` (featured, peacemakers, garden, peace-in-practice).

## Hard rules
1. Edit only public/color-polish/scenes/featured.js and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-featured.
2. Do not wrap the file in an IIFE: core code calls some scene functions by global name (for example gardenReplace) and the registry call must stay at top level. Rename instead.

## The change
1. Rename every top-level `const` or `let` you added in scenes/featured.js to a file-unique name with the prefix `FEATURED_` (for example `LAYERS` becomes `FEATURED_LAYERS`), and update every reference. Top-level `function` declarations may stay (function redeclaration across scripts is safe) but give any new helper function you added a name that starts with `featured` if it is generic (for example `place` becomes `placeFEATURED` in camel case); leave pre-existing functions untouched.
2. Blur cap: in your place override, the far-layer blur can exceed the readability ceiling during the entering phase because core shrinks screenScale first. Change the filter computation to cap the total at 0.9 px: `const blur=Math.min(.9, Math.max(baseBlur, L.blur))`.
3. Also rename `DRIFT_TO` to `FEATURED_DRIFT_TO`.
Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/featured.md: "Round r1: top-level identifiers renamed with the FEATURED_ prefix to avoid cross-scene collisions in the shared global scope; blur capped at 0.9 px."

End with `## COMPLETION` naming the two files changed and listing every identifier you renamed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-featured/public/color-polish/scenes/featured.js
/Users/anthony/.claude/worktrees/mothers-love-tv-featured/docs/runs/2026-09-11-tv-scenes/lanes/featured.md
```
