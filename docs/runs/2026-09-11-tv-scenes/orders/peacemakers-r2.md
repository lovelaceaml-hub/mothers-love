# Work order - peacemakers correction r2: unique top-level identifiers - Mother's Love TV (Plan 13)

Dispatch ID: agy-peacemakers-20260911-r2
Project root (your worktree): /Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers
Lane: Antigravity, Gemini 3.8 Flash (High). Effort: high. Agents: none.

The Sonnet review found a blocking cross-lane defect. Every scene file loads as a separate classic script sharing one global lexical scope, so a top-level `const LAYERS` in your scene file collides with the same identifier in another scene file once the branches merge: the second script to load throws SyntaxError "Identifier 'LAYERS' has already been declared" at parse time and none of it runs, so that scene disappears. Four lanes declared `const LAYERS` (featured, peacemakers, garden, peace-in-practice).

## Hard rules
1. Edit only public/color-polish/scenes/peacemakers.js and your record file. Run no shell commands. Never write the em dash or en dash. Read and write only inside /Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers.
2. Do not wrap the file in an IIFE: core code calls some scene functions by global name (for example gardenReplace) and the registry call must stay at top level. Rename instead.

## The change
1. Rename every top-level `const` or `let` you added in scenes/peacemakers.js to a file-unique name with the prefix `PEACEMAKERS_` (for example `LAYERS` becomes `PEACEMAKERS_LAYERS`), and update every reference. Top-level `function` declarations may stay (function redeclaration across scripts is safe) but give any new helper function you added a name that starts with `peacemakers` if it is generic (for example `place` becomes `placePEACEMAKERS` in camel case); leave pre-existing functions untouched.
2. Blur cap: in your place override, the far-layer blur can exceed the readability ceiling during the entering phase because core shrinks screenScale first. Change the filter computation to cap the total at 0.9 px: `const blur=Math.min(.9, Math.max(baseBlur, L.blur))`.

Append one line to the "## Result" section of docs/runs/2026-09-11-tv-scenes/lanes/peacemakers.md: "Round r2: top-level identifiers renamed with the PEACEMAKERS_ prefix to avoid cross-scene collisions in the shared global scope; blur capped at 0.9 px."

End with `## COMPLETION` naming the two files changed and listing every identifier you renamed.

```allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers/public/color-polish/scenes/peacemakers.js
/Users/anthony/.claude/worktrees/mothers-love-tv-peacemakers/docs/runs/2026-09-11-tv-scenes/lanes/peacemakers.md
```
