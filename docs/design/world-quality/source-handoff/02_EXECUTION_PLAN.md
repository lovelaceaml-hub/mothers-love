# Execution plan: from draft environment pass to a reference-quality world

## Outcome and order

Deliver a visibly improved, reviewable **continuous 13-location world** on an isolated preview. Keep the original production TV untouched. The accepted pictures are the quality target for scenery, materials, atmosphere, bubbles and arrival moments. Completion is a working, measured and visually inspected preview, not more locations, a typecheck, or a static concept image.

The plan is intentionally sequential at shared integration points. Blender modeling and bounded bubble work can overlap after P0/P1 agree on interfaces, but do not open a dozen independent renderer rewrites. Keep progress in `tracking/TASK_LEDGER.json` and use `tracking/RUN_RECORD_TEMPLATE.md` at each evidence checkpoint.

## P0. Reconcile the repository and establish a working baseline

**Priority: immediate blocker.**

Read the current branch, PR, `AGENTS.md`, Plan 23 and the latest authorized amendments. Check `git status`, worktrees, remotes, and whether PR #8 advanced. Save a non-sensitive diff/status record. Do not copy the handoff's source snapshot over local changes.

Reproduce the readiness failure with explicit fictional mode. Confirm which exact condition is not becoming true, rather than treating "Opening your world..." as an artistic failure. Capture first-error information, response failures, request routes, import state, renderer creation, and the returned fallback state. Review the current test's HMR failures without assuming they are the cause.

Use three controlled comparisons: (1) current app with `?source=sample&art=classic`; (2) same build with cinematic art; (3) the generated no-data scene harness. Make the comparisons under identical viewports, driver and reduced-motion settings. Run a production-build local server as a control for the failing Next dev server. The current script creates a harness but does not prove it was rendered before the app readiness timeout.

Fix only the demonstrated issue. If a test harness is wrong, fix the harness without weakening runtime assertions. If scene initialization is slow or broken, fix the measured allocation/compile/error path without hiding the new art. If the current exact branch cannot be run because of a genuine environment limitation, document that honestly and obtain a working equivalent preview before marking the art verified.

**Deliverable:** exact source SHA, bounded root-cause note, classic/cinematic sample screenshots, actual runtime readiness, a corrected CI result, and no unhandled relevant errors. Record missing device testing separately. Do not set status to passed on a timeout or CSS fallback alone.

## P1. Lock the art target and measure the renderer

Create a small visual comparison sheet: each supplied target beside a same-aspect runtime frame, with a list of gaps in silhouette, material separation, foreground/midground/background, detail, reflection and framing. Keep source screenshots and comparison crops separate; never claim an image is a browser capture if it is generated artwork.

Measure the existing sample world at front and travel views. Log counts, frame-time distribution after warmup, render scale, DPR, shadow/reflection settings, device/GPU/browser, startup time and asset size. A software renderer is useful for deterministic checks, not TV speed claims.

Audit color output, lighting, tone mapping, environment reflections and current materials. Three.js 0.180.0 is already installed at the snapshot; keep that version unless a specific compatibility change is justified. Do not migrate to WebGPU, R3F, a new engine, or a newer Three.js release merely to perform the art pass.

Inspect known batching limitations before adding textures. The legacy batcher and new decorator batcher discard UVs. Decide which materials remain texture-free/batched and which imported assets retain UV, normals, tangents and AO channels. Do not let new visually rich assets quietly lose their surface data during a merge.

**Deliverable:** a compact material/lighting library, device baseline and asset budget proposal, preservation tests for new mesh attributes, and a documented comparison frame. Starting budgets are hypotheses to calibrate, not measured success.

## P2. Build a reusable environmental asset family

Author or refine a coherent family: curved ivory arcade and balcony modules, rounded terrace/step edges, thin champagne inlay, blossom branches and flower species, sculpted floating-island profiles, water-edge details, waterfall veils, small butterfly forms, and restrained ambient light.

Use Blender for forms that benefit from deliberate modeling; use procedural geometry for repeated/runtime-driven forms. This is a hybrid workflow, not a requirement to model the entire world as one monolithic GLB. Produce source `.blend` files only when actually authored; preserve existing procedural fallbacks and record export versions.

Place new modules within each zone's coordinate system. Define a foreground reading/interaction forecourt, a hero volume, surrounding framing, and distant silhouettes. Replace known placeholders where appropriate rather than piling duplicate architecture over them. Retain reversible ownership and `?art=classic` behavior.

**Deliverable:** a reviewed asset family that holds up in close-up and medium-distance runtime views, documented source/GLB/texture manifests, LOD behavior, and no lost material detail after batching. Review with the actual web renderer, not only Blender's preview light.

## P3. Restore the signature heart and deliver one compelling connected sequence

Import the original heart mesh. Validate its lobes, indentation, taper, thickness, normals and proportions against the included original HTML. Use a parent for uniform scale/placement. The GLB's simple material is not the approved full appearance. Match rose-pink surface response and the original fine, independent silk ribbon behavior separately.

Stage the sanctuary with intentional scale, a clear center, thin framing, controlled highlights, reflected/contact cues and restrained foreground effects. Do not enclose the name or heart in a gold wire cage. Keep every recognition in the approved world coordinate/depth system.

Join the Garden, Sanctuary and Expressions shots with an authored route. Keep the complete world resident and functional; this is a polished proof sequence within it. Use an existing safe sample recognition to demonstrate a bloom, full reading, heart reveal and expression feature without switching to a second runtime.

**Deliverable:** a genuine connected 60-90-second visual excerpt or longer when the full reading policy requires it, plus front/three-quarter stills of the imported heart. The clip must not omit failed travel or accelerate message timing to make it appear correct. This checkpoint establishes quality; it does not claim the other ten areas are finished.

## P4. Integrate detailed world-space bubbles and three focused arrivals

Port the latest atelier's recognizable structure and surface detail into `world-recognitions.ts` or a scoped owned submodule. Preserve name, complete words, thank-you treatment, canonical expressions, safe public metadata and immediate personal-data clearing. Use the public reaction contract where available; no new field exposure.

Add a parented external-symbol orbit for the active record's selected expression IDs. Keep icons camera-facing while their world anchors move. Protect the reading silhouette at the actual camera angles and sizes. Front-edge highlights may move; they may not blanket the words. Inspect all nine and single-symbol cases, long names and actual maximum allowed message length.

Integrate Bloom, Ribbon Portal and Constellation Gather with the existing arrival director. Formation ends before reading time is consumed. Queue new arrivals behind a current complete reading interval. Preserve existing wave/group behavior; improve shared visuals without assuming a ten-sample standalone queue overrides the app. The same record joins the resident system once; reaction updates and reconnection do not re-arrive it.

**Deliverable:** all three entrance styles in the real preview, preserved complete messages, clear symbols, privacy-safe cancellation, existing camera-return behavior, and actual browser evidence. Do not replace Plan 23's world-space bubbles with screen-fixed DOM panels.

## P5. Apply the art quality across all remaining destinations

Use the zone matrix in `07_WORLD_ZONES_AND_CAMERA.md`. Upgrade Welcome, Featured, Calendar, Peace Globe, Status/Impact, Orbit, Milestone, River, Daily Practice and Peace Promise with the same asset/material system and distinct landmark silhouettes. Preserve all registry IDs, scene mappings, content roles and enabled/disabled playlist behavior.

For travel, replace blank transitions with legible silhouettes, bridges, layered foregrounds, cloud openings, restrained guided particles, and distant landmarks. Keep the camera's path intentional; do not add speed or endless orbiting to disguise sparse areas.

For metrics and calendar, improve framing without changing the scope of counts or covering the environment with a wall-sized opaque panel. Preserve date and aggregate semantics in the actual app. Do not invent a map of member locations or derive private identity relationships to populate the globe.

**Deliverable:** a same-build coverage sheet and at least one near/medium/travel capture for each of the 13 locations. Every location has a clear hero, meaningful depth and readable active content; no old area is silently excluded from the tour.

## P6. Integrate quality control, accessibility and durability

Measure the enriched world on actual available hardware, then tune caps and LODs. Keep glass transmission, soft reflections, shadows and bloom selective. Preserve full text even when render scale changes. Geometry complexity, transparent overdraw and texture memory all need measurement, not just frame counts in an idle screenshot.

Verify route reentry, held recognition, owner pause, reduced/still cuts, sample/live switching, stale/quiet clearing, active/queued withdrawal, effect toggles, enabled playlist changes, resize/orientation, renderer retry and disposal. Inspect steady-state resource counts during repeated loops. Perform the staged duration tests in `08_VERIFICATION_AND_ACCEPTANCE.md`; list real physical tests that remain unavailable.

**Deliverable:** measured quality profiles with exact conditions, passing targeted regressions, resource-stability evidence, and no loss of privacy or readability. A source-only check cannot substitute for the actual browser.

## P7. Reviewable preview delivery, not automatic production promotion

Keep the branch/draft PR relationship clear. Publish or refresh only the already authorized isolated preview through the existing project. Preserve the default/live data behavior, but use `source=sample` for all saved review captures. Record the exact deployment ID and commit; supply the same-build `art=classic` comparison.

Deliver the concise change summary, reference-to-runtime contact sheets, genuine motion, test report, asset provenance, known gaps, device limitations, and rollback instructions. Update the repo's actual handoff/plan and use the local run template. Do not mark the visual-fidelity gate approved without the user's viewing decision.

**Stop boundary:** no merge/promote into production, no database/API/schema changes, no purchases and no auth/security changes without explicit approval. A draft preview can be delivered with clearly named remaining visual refinements; it must not be described as picture-identical or fully TV-certified without evidence.
