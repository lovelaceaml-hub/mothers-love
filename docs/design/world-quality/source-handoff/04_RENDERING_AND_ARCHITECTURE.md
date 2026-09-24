# Rendering and architecture changes

## Preserve the existing ownership model

Keep one `WorldEngine`, one Three.js renderer, one host clock and the current camera/arrival/recognition directors. React owns controls and accessible equivalents, not per-frame geometry reconstruction. `world-scene.ts` is currently a wrapper over a byte-preserved legacy scene plus the cinematic decorator. Preserve this comparison boundary while bringing scoped art modules into the current scene.

Reconcile runtime source before designing new abstractions. Suggested small modules are a material library, hero-heart loader/renderer, shared environment asset kit, bubble shell/orbit layer, and camera-shot data. These are suggestions, not an instruction to generate dozens of files before rendering something useful.

## Color and light audit first

At the observed head, `world-engine.ts` uses ACES tone mapping at exposure 0.82, a PMREM RoomEnvironment, and environment intensity 0.55. The art decorator adds custom water and sky shaders with tone/color output chunks. Treat these as a measured starting point, not an artistic prescription.

Trace the actual texture and material color path before changing it. Color textures and numeric material parameters are not interchangeable. Avoid applying a gamma/output transform twice. Verify any new postprocessing chain includes the correct final output transformation for the pinned renderer version. Current online docs can contain APIs added after the repository's 0.180.0; inspect the installed version before coding against them.

Use a small number of light/material changes with before/after samples. A high-key world still needs contacts and local form shading. Consider one controlled shadow caster for near hero views or baked AO/lightmap/contact treatments for static architecture. Do not enable expensive shadow-casting point lights throughout all 13 districts. Reflections and bloom should be selective and must not wash out the message.

## Materials by purpose

| Family | Purpose and implementation rule |
| --- | --- |
| Pearl architecture | Rounded profiles, broad reflections, moderate roughness; highlight edges with geometry rather than emissive outlines everywhere. |
| Champagne gold | Restrained metallic trim with readable light/dark response; never use an unlit yellow surface as a universal shortcut. |
| Rose heart | Preserve the original shape; match its broad curved highlights and darker sides; keep sheen/glass choices controlled. |
| Bubble film | A detailed outer shell with iridescent edge and clear inner text surface. Preserve clean coverage and world depth. |
| Silk | Fine width/twist/fold changes and moving sheen; avoid rigid identical loops and backface sorting artifacts. |
| Petals/foliage | Deliberate cupping/thickness or a well-tested double-sided treatment; material variation instead of identical smooth blob crowns. |
| Water | Slower readable ripple bands, depth/distance cues, believable edge contacts and selected reflected light. Label approximations honestly. |

Three.js physical material options such as clearcoat, iridescence, transmission and sheen add per-pixel cost. Restrict rich variants to surfaces where the viewer can see the difference. A view-dependent color shift is not a physically exact refraction simulation. If a planar reflection is used, clip and update it deliberately, and measure the extra render cost.

## Geometry and batching hazard

The observed legacy `static-batch.ts` and the decorator's `batchOpaque()` clone geometry and delete its `uv` attribute before merging. That is acceptable for some untextured materials, not for newly imported textured assets. Tangent-space normals, baked AO/lightmaps, independent LODs, dynamic pivots, alpha materials and multiple material slots also require explicit treatment.

Before using the new asset kit, update batching rules or opt those assets out. Group only compatible attributes/materials. Preserve supported UV channels, normals, tangents, morphs/skins and dynamic ownership. Verify the merged result in the runtime; do not assume a successful merge means visual equivalence. Shared base geometry must not be disposed twice while instances still use it.

The decorator currently locates legacy materials by color and some instanced batches by geometry type/count. These are fragile integration hooks. Where new permanent assets need replacement, prefer explicit named registry/ownership boundaries. Do not keep broad heuristics that might later hide unrelated instanced props.

## Rendering complexity and resource discipline

Keep nearby detail high enough to satisfy the references, but use deliberate LOD and zone activity for distant areas. Stable far silhouettes matter more than invisible polygon density. Screen-sized transparent layers can cost more than dense opaque meshes; measure overdraw and postprocessing buffers, not only triangle totals.

Retain the existing high/low/auto interface until new tiers have evidence. Record render scale and actual viewport; 4K screen output does not imply a 4K 3D buffer. Text remains readable at the selected device setting. Do not silently delete effects the owner explicitly enabled; reconcile quality behavior with current settings and document degradation choices.

Dispose geometries, materials, textures, instance resources, render targets, image bitmaps, subscriptions and animation handles at their actual ownership boundary. Restore replaced legacy materials/visibility before legacy disposal. Context-loss recovery must not create a second live render loop.

## Authoritative references

Use these for general rendering concepts, then check the installed version:

- https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- https://threejs.org/docs/pages/Color.html
- https://threejs.org/manual/pages/shadows.html
- Repository `package.json`, `world-engine.ts`, `world-cinematic-art.ts`, and `static-batch.ts` at the actual current commit.

No new renderer version, plugin purchase, model API or remote runtime art service is required by this plan.
