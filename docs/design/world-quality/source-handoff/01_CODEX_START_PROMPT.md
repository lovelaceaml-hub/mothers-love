# Paste this into Codex with the extracted handoff folder attached

Continue the Mother's Love **whole-world visual-quality upgrade** in the actual `lovelaceaml-hub/mothers-love` repository. The user has supplied four pictures and wants the entire continuous 3D TV world to approach their quality, not just the bubble design. This is an implementation continuation, not a request for another general plan or another disconnected demo.

Read `00_START_HERE.md`, `10_CURRENT_REPO_STATE.md`, `11_DECISIONS_AND_CONFLICTS.md`, and the repository's current `AGENTS.md` before making changes. Inspect the four images under `references/approved/` visually. The complete build plan is `02_EXECUTION_PLAN.md`; use its phases as the execution ledger.

## Existing work to continue, not recreate

- Repository: `lovelaceaml-hub/mothers-love`.
- Current art branch at handoff: `feature/world-cinematic-art-pass`.
- Draft PR #8 targets `feature/tv-3d-world-prototype-01`.
- Observed art head: `b324b81cabe947592f6723425c58f14307b58083`.
- Observed base: `07cb3f63301150e2849a30531b4a441e4c0a3f39`.
- The app already contains 13 locations, an automatic camera, world-space recognition bubbles, full reading, public-feed handling, single/group arrivals, privacy clearing, and accessibility/fallback behavior.
- The new branch wraps an unchanged `world-scene-legacy.ts` with `world-cinematic-art.ts` and supports `?art=classic`. It already attempts richer scenery across all 13 locations. It has **not** installed the recovered original heart mesh or the new bubble-ateliers as production components.

Fetch and inspect actual current refs and local changes. Do not overwrite someone else's work, force-push, reset a dirty checkout, or assume this snapshot is still the tip. Continue the existing art branch when safe; otherwise make a clearly named continuation worktree from its current head and explain the relationship to PR #8. Do not create a competing app or new rendering stack.

## First task: resolve the blocked runtime review

The latest workflow at handoff, run `35648481429`, failed while waiting for the world to become ready. Its TypeScript step passed. Vercel has a READY preview at the same head, but there is no completed browser visual verification of this art revision.

Open `github_state/ci_failure_run_35648481429/report.json`, `failure.png`, `scene-review.html`, and `world-review-runtime.js`. The report records a 60-second readiness timeout and repeated Next dev HMR WebSocket errors. It does **not** identify a root cause. Its filtered `errors` array being empty is not evidence that the application initialized or that the browser had no errors.

Reproduce at the pinned/current head using explicit sample mode. Compare the classic and cinematic paths under the same runtime and device settings. Run the no-data scene harness separately to distinguish geometry/shader startup from React/Next hydration. Prefer an optimized local build as a controlled comparison to the failing dev-server harness. Do not merely lengthen timeouts, suppress errors, or replace the readiness assertion with a screenshot of an uninitialized shell. Save a real fixed-head render and updated report before declaring P0 complete.

## Design target

Keep the world's pink, coral, lavender, blue, fresh green, pearl and champagne identity. The references show dimensional blossom canopies, curved ivory architecture, thin metallic trim, layered islands, waterfalls, warm reflections, atmospheric distance, selective sparkle, fine silk, and highly detailed recognition pearls. Their depth comes from coherent shape, lighting and composition, not indiscriminate bloom or more repeated spheres.

The entire existing world is the scope. First establish a convincing shared material/environment treatment and one connected Garden-to-Sanctuary-to-Expressions sequence. Then apply the same standard to every remaining destination and the travel corridors. Do not remove or hide the other locations to meet performance goals. Inspect paused frames as well as motion.

## Heart and bubbles

Use the original sculpted heart supplied at `assets/original_heart/Original_Sculpted_Heart.glb`. Its geometry and normals are the reference. Do not recreate another flat outline extrusion. Match the rose material, side shading and broad highlights separately; the GLB's basic material is not the finished shader. The original independent silk motion is in the reference HTML and the recovered heart source package.

Preserve the detailed recognition hierarchy: name, entire message, thank-you treatment, real public reaction metadata when available, and clear continuation. Selected expression symbols revolve **outside** the pearl. Use the app's canonical icons and phrases; do not import the generated image's invented Love/Joy/Growth taxonomy or fictional attribution into real records. The submitted name is private under the current contract. Do not add a public "From" field.

Port the atelier's appearance into the existing depth-tested world-space recognition system. Do not replace it with a screen-fixed DOM card or an iframe. Keep complete-message paging and timing authoritative in the app, not any of the conflicting prototype 16/18/24-second examples. Current normal-mode camera touring and gentle reading motion must continue unless an explicit hold, owner pause, or configured reduced/still behavior calls for otherwise.

Integrate the Bloom, Ribbon Portal and Constellation arrival treatments through the existing director. Each new recognition gets a focused reveal and its full reading time before the next item. Queue bursts; do not duplicate a record in the active arrival and resident pools. Reaction refreshes and reconnects are not new arrivals. Privacy cancellation outranks animation completion and clears personal pixels/references immediately.

## Blender and rendering

Use Blender or a reproducible mesh-authoring workflow where it improves close-up flowers, blossom branches, sanctuary architecture, floating islands, bridges or hero arrival forms. Retain usable procedural fallbacks. Export runtime-ready GLBs with deliberately supported materials, LODs, UVs and provenance. Do not pretend that an image prompt, a render, or an unavailable Blender asset has produced a usable model. Do not block all progress on a broad asset-pipeline rewrite.

Preserve Three.js and the existing master renderer/clock. Audit the color pipeline, material response and batching before adding expensive effects. `static-batch.ts` and the art decorator's batcher strip UVs, so textured/lightmapped/tangent-dependent assets need a compatible path. Use selective shadows/reflection approximations and measured quality tiers. Do not reduce readability or flatten the color palette to disguise performance issues.

## Work and reporting discipline

Proceed without another broad interview; the art direction and preview scope are already provided. Ask only about a genuine unresolved destructive, paid, privacy, or external-access decision. Keep a small task ledger with actual statuses. Parallelize only independent files/assets in separate worktrees; one controller owns shared engine contracts, integration and the branch. Record actual model/tool use rather than inventing agent names or review claims.

Test proportionally and directly inspect what you built. Before requesting visual approval, provide the exact source SHA, a preview/sample URL and same-build classic comparison, reference-to-runtime captures, a short genuine connected-world tour, actual test results, remaining visual gaps, and untested device limits. Keep PR #8 or its explained continuation in draft until the review criteria are satisfied. Do not merge or promote production without explicit authorization.

Start now with P0: repo reconciliation and the failed readiness check. After the runtime baseline is proven, execute the scoped phases in `02_EXECUTION_PLAN.md` through a reviewable high-quality preview.
