# Mother’s Love: visual refinement 02

[Open the refined prototype](https://mothers-love-o6rtntg3y-lvzion.vercel.app/display/world-preview?source=sample&art=design) | [Previous prototype](https://mothers-love-4dyumji0r-lvzion.vercel.app/display/world-preview?source=sample&art=design) | [Same-build classic](https://mothers-love-o6rtntg3y-lvzion.vercel.app/display/world-preview?source=sample&art=classic) | Connected tour (`2026-09-21-world-refinement-80586a2/connected-tour.mp4` in Drive)

The current wording layout is preserved, with **Thank you at the top**. Astra refined the sample prototype only. Fable and Opus remain held for Anthony’s visual approval. No build-polished-apps or Stitch workflow was used.

Source: `80586a20b2aaee166bbd48d26ac8bd3f0c5daa29`. All current images, the 69.2-second real tour and the READY preview use this application source. The tour uses the real app controls, renderer and clock at normal speed; it covers Garden, Sanctuary, Expressions and the travel between them.

## Before and after

| Previous source 9dc7e45 | Refined source 80586a2 |
| --- | --- |
| Previous Garden (`2026-09-21-world-refinement-80586a2/previous-garden.png` in Drive) | Refined Garden (`2026-09-21-world-refinement-80586a2/design-garden.png` in Drive) |

Open full 3840 by 2160 capture (`2026-09-21-world-refinement-80586a2/high-4k-garden.png` in Drive). The interactive study starts in High definition. Automatic and Low remain available in Settings.

## Pearl and connected world

The pearl gains fine side engraving, prismatic edge layers, broad edge reflections, small glints and gold/pearl orbital beads. The existing words, font sizes and coordinates are unchanged. Primary recognition textures are 2048 square, secondary textures 1024 square, with an increased circular silhouette resolution. The app still owns full reading, paging, privacy clearing and canonical symbols.

Refined ribbon arrival and pearl (`2026-09-21-world-refinement-80586a2/arrival-ribbon.png` in Drive)

Supplied Atelier pearl detail, appearance reference (`2026-09-21-world-refinement-80586a2/atelier-pearl-reference.png` in Drive)

Sanctuary (`2026-09-21-world-refinement-80586a2/design-heart.png` in Drive)

Expressions (`2026-09-21-world-refinement-80586a2/design-expressions.png` in Drive)

Phone (`2026-09-21-world-refinement-80586a2/phone-garden.png` in Drive)

## What changed in the world

Rounded terrace profiles and higher-resolution arches give the ivory architecture softer edges. New rounded, cupped petals carry smooth normals, UVs and base-to-tip tint. Three geometry levels preserve canopies at distance. Small flower centers use economical meshes. Figure bodies, arms and hands are more rounded. The outdoor radiance environment replaces the generic room environment for this study; ivory, metal, petals, silk and water respond differently. Water uses environment reflections and animated wave normals. These are environment approximations, not reflected live geometry or ray tracing.

All 13 destinations remain accessible, with shared material/model changes throughout. The first connected sequence is still the primary design proof. Geometry was authored reproducibly in Three.js source; no new Blender export, purchased asset, generated image or external rendering stack was used. The original heart GLB remains byte-identical.

## Verified and remaining

- Optimized Next build and TypeScript passed. All 52 focused unit tests passed, including the sample-only boundary and quality/geometry checks.
- Final browser checks: 23 still/destination/arrival/comparison checks, 6 resolution/motion checks and 3 tour checks passed. No page errors, error-console entries, failed requests or application API requests were recorded in these fictional sample checks.
- Actual High drawing buffers were 1920 by 1080 and 3840 by 2160 at DPR 1. Low remained within its 1,050,000-pixel cap. No supersampled screenshot is presented as proof of physical-TV rendering.
- The paused Garden reported 429 calls and 3,444,348 triangles, compared with 411 calls and 3,392,308 triangles in the prior source. Canopy detail levels and inexpensive flower centers keep this close to the earlier geometry budget.
- The normal tour recorded 559 app-rendered frames during the first 8 seconds after readiness. This is one local macOS/Chromium run. The quality script’s short RAF sample begins during the reduced-motion transition and is diagnostic, not a steady frame-rate benchmark. Physical-TV, Safari, phone GPU and sustained 4K motion remain untested.
- Finer branch/flower variety, more convincing silk/heart shading, softer atmospheric depth and final authored destination detail remain below the supplied reference images. Horizontal bands remain visible on the heart in paused views; its supplied geometry and normals were preserved. Exterior ornaments and incidental particles still need final framing review during all camera paths and message lengths.
- The current footage uses real camera travel and sample UI destination choices. It does not prove the live arrival queue or physical-device commissioning. P0 CI diagnosis and production acceptance remain open. PR #8 stays draft.

[Raw receipt](D1-RECEIPT.json), [stills](D1-STILLS-REPORT.json), [resolution/motion](D1-QUALITY-REPORT.json), [tour](D1-TOUR-REPORT.json).
