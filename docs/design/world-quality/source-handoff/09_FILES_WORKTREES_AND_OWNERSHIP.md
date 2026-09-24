# Exact integration areas and bounded work ownership

## Existing files to inspect at the actual branch head

| Path under repo root | Ownership / planned change |
| --- | --- |
| `AGENTS.md`, `docs/PLAN-23-recognitions-in-the-world.md` | Read current authority and later amendments first; preserve public-data/privacy and world-space corrections |
| `src/components/display/world/world-scene.ts` | Integration wrapper; keep classic comparison and one owned art lifecycle |
| `src/components/display/world/world-scene-legacy.ts` | Existing scene baseline; preserve until scoped replacement is deliberately reviewed |
| `src/components/display/world/world-cinematic-art.ts` | Existing full-world decorator; audit P0 initialization, replace fragile heuristics, refine composition and materials |
| `src/components/display/world/world-engine.ts` | Shared renderer/clock, output, quality, pause/visibility, feed and disposal; controller-owned |
| `src/components/display/world/world-districts.ts` | Existing extra-location geometry and effects; coordinate with new art to avoid duplication |
| `src/components/display/world/static-batch.ts` | UV/attribute compatibility and disposal boundaries before new textured assets |
| `src/components/display/world/world-recognitions.ts` | Detailed shell and exterior satellites, world-space text, safe invalidation/hit targets; no new record authority |
| `src/components/display/world/arrival-director.ts` | Existing phase, queue and reading state; adapt visuals to it rather than duplicate timing |
| `src/components/display/world/recognition-director.ts`, `reading.ts`, `world-feed.ts`, `use-world-feed.ts` | Preserve selection, timing, exact content and validated public lifecycle |
| `src/components/display/world/camera-director.ts`, `world-data.ts` | Authored shots and valid connectors while preserving IDs, holds, enabled scenes and return state |
| `src/components/display/world/world-neighbors.ts` | Keep fictional illustrative role; selective asset refinement without portraying actual users |
| `src/components/display/world/WorldExperience.tsx`, `WorldExperience.module.css`, `WorldContent.tsx` | Preserve controls/accessibility/full-text reader; don't reintroduce screen-fixed recognition visuals |
| `src/lib/catalog.ts`, current public contracts | Read-only content source for this art task; no new expression taxonomy or private fields |
| `scripts/review-cinematic-world.mjs` | Fix and extend the blocked sample/browser review without weakening assertions |
| `.github/workflows/cinematic-world-review.yml` | Keep artifact collection on failure, exact test SHA and meaningful runtime evidence |
| `docs/WORLD-CINEMATIC-ART-PASS.md`, current handoff/run records | Update actual changes, results and remaining limitations after each delivered preview |

Not every file needs modification. Discover exact changed filenames with Git before assigning work. Refactor only where necessary to provide clear asset/material/camera boundaries, not as a prerequisite ceremony.

## Worktrees

One controller owns the branch, renderer/clock contract, source reconciliation, PR and release evidence. A bounded asset worker may own new non-personal asset files and its manifest; a bubble worker may own its visual module and focused tests after agreeing on interfaces; a camera worker may own route/shot data and tests after layouts are stable. None should independently rewrite the shared engine or private-data lifecycle.

Use separate worktrees/branches only when tasks are truly disjoint. Keep a file ownership list in the run record. Different model configurations are different agent runs if the user's AI operating system tracks them; do not invent a promotion hierarchy or claim reviews by agents that were not actually run.

Before integrating an asset or worker patch, review its diff, confirm source/rights, inspect runtime rendering, and run the affected tests. One agent's passing standalone page does not pass another's app integration.

## Safe checkout approach

From the real repository, read `git status --short`, `git remote -v`, `git worktree list`, and `git branch --show-current`. Fetch current refs through the already-authorized Git setup. Compare the expected art head to `origin/feature/world-cinematic-art-pass`. If it advanced, reconcile; do not force the old head back into place.

Do not execute `reset --hard`, `clean -fd`, force-push, migration reset or a production promote command as part of this plan. Do not use credentials from old links. Keep environment values out of screenshots and copied logs.

`tools/export_repo_snapshot.py` only reads a selected local Git commit and writes an allowlisted reference copy outside the repository. It does not checkout, fetch, commit, push, deploy or run application code. Use it for an auditable current source snapshot, not to overwrite a working tree.
