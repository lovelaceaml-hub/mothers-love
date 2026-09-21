# Source and evidence register

## Current application source
Exact references below were observed in the connected repository. Several unchanged baseline modules were inspected in the preceding work, while the current PR, latest workflow/job/artifact, deployment, art-pass doc, and review script were refreshed for this handoff. Read current repository instructions before editing. This folder intentionally does not pretend to contain a complete application checkout.

| File | Observed blob | Purpose |
| --- | --- | --- |
| [AGENTS.md](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/AGENTS.md) | `d17ae09f808ac3501e09882839b86639ec154f2f` | Project rules and current source-of-truth boundaries |
| [docs/PLAN-23-recognitions-in-the-world.md](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/docs/PLAN-23-recognitions-in-the-world.md) | `bb6bc93138ac5f7f83222c335c1925a6f2cc9997` | World-space recognition and hands-free camera direction |
| [docs/WORLD-CINEMATIC-ART-PASS.md](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/docs/WORLD-CINEMATIC-ART-PASS.md) | `6cb9f0c4166b10b52ae37347b5570d2d40631c75` | Decorator implementation scope and unverified follow-ups |
| [src/components/display/world/world-scene.ts](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/src/components/display/world/world-scene.ts) | `30e9d9b504c158c6a4d4eb41bab7a354dee7a9b2` | Reversible scene wrapper and art=classic comparison |
| [src/components/display/world/world-scene-legacy.ts](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/src/components/display/world/world-scene-legacy.ts) | `b1f32487dec25cfb934c57af867665df02f17924` | Preserved original scene reference; verify identity in local git |
| [src/components/display/world/world-engine.ts](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/src/components/display/world/world-engine.ts) | `119d4edefc58628f6799f875eeae21c49dadb892` | Renderer, clock, camera and runtime ownership |
| [src/components/display/world/world-recognitions.ts](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/src/components/display/world/world-recognitions.ts) | `14150e1735a76a4eed6c7833f1d812dda6c7dd1a` | World-space text objects and personal-data clearing |
| [src/components/display/world/camera-director.ts](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/src/components/display/world/camera-director.ts) | `b139078df5867f98b760430473d530a8da19df41` | Travel, reading and arrival return logic |
| [src/components/display/world/world-data.ts](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/src/components/display/world/world-data.ts) | `c49a00de6fa987d60afe366d3846ed2da7742d10` | Thirteen destination registry and tour order |
| [src/components/display/world/static-batch.ts](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/src/components/display/world/static-batch.ts) | `9e1ba117365630e7adb40d5ae0e348f2df2d2cf0` | UV deletion/merge behavior to account for when adding textured assets |
| [src/components/display/world/world-districts.ts](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/src/components/display/world/world-districts.ts) | `9da6ad619489a17537680cdd2772c22c0650904d` | Original shared district environment |
| [src/components/display/world/world-neighbors.ts](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/src/components/display/world/world-neighbors.ts) | `4528477021c78b8065a9b36ca0d12a3fad533df3` | Fictional neighbors and gestures |
| [src/lib/catalog.ts](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/src/lib/catalog.ts) | `03b6044e985af87fec4f45dc449efb529c5e9cac` | Canonical expression phrases/colors; refresh before integration |
| [package.json](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/package.json) | `5c58333f6608de3248b768edf8decb7faaeed949` | Pinned runtime, scripts and dependency versions |
| [scripts/review-cinematic-world.mjs](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/scripts/review-cinematic-world.mjs) | `65f77a08e107487c98cd0b87641e0aaa6cf0b64e` | Current browser check and scene harness generator |
| [.github/workflows/cinematic-world-review.yml](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/.github/workflows/cinematic-world-review.yml) | `3725722cfa76a0ab09c256d6c1f31fc0495c2528` | Latest failing virtual-display workflow |
| [src/components/display/world/world-cinematic-art.ts](https://github.com/lovelaceaml-hub/mothers-love/blob/b324b81cabe947592f6723425c58f14307b58083/src/components/display/world/world-cinematic-art.ts) | `refresh complete file` | New art implementation; first 220 lines reviewed, use current complete source |

## Direct status evidence

- [Draft PR #8](https://github.com/lovelaceaml-hub/mothers-love/pull/8). Refreshed head `b324b81cabe947592f6723425c58f14307b58083`; open and unmerged.
- [Failed second workflow](https://github.com/lovelaceaml-hub/mothers-love/actions/runs/35648481429). TypeScript passed; the browser readiness wait failed.
- [Bundled original report](github_state/ci_failure_run_35648481429/report.json) and [failure screenshot](github_state/ci_failure_run_35648481429/failure.png).
- [Structured status snapshot](github_state/STATUS_SNAPSHOT.json) records the latest deployment-specific sample URL and state.

## Prior artifact provenance

[SOURCE_PACKAGES.json](SOURCE_PACKAGES.json) records the ten input ZIPs, their hashes, exact extracted locations, and intended roles. [REFERENCE_PROVENANCE.json](references/REFERENCE_PROVENANCE.json) records the supplied images, original concept renders, and redactions in earlier baseline screenshots. The old package test files remain historical evidence only.

## Technical references for the implementation

- [Three.js physical materials](https://threejs.org/docs/pages/MeshPhysicalMaterial.html): available material features and per-pixel cost. The app is pinned to 0.180.0; confirm API compatibility instead of copying future-version docs blindly.
- [Three.js shadow guidance](https://threejs.org/manual/en/shadows.html): tradeoffs of shadow maps and alternative baked/contact treatments.
- [Three.js color management](https://threejs.org/manual/en/color-management.html): color-space ownership and consistent rendering.
- [Blender glTF export](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html): supported materials/animation and coordinate conversion. Custom node trees or simulations are not automatically equivalent in a web renderer.

## Not gathered

No fresh live recognition dataset, private submission author list, elevated API key, database dump, temporary share token, or protected-preview bypass credential is part of this packet. The supplied artwork contains illustrative text; do not turn those props into fixtures or production catalog entries.
