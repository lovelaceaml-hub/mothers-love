# Plan 24: Mother's Love whole-world visual upgrade

Approved by Anthony on September 21, 2026: "I approve plan. Continue".

Latest correction, September 21: "i want to see the designs and protos before implementing with fable & opus". Astra will first produce a reviewable integrated visual prototype. Fable and Opus implementation is held until Anthony approves that prototype. This design checkpoint precedes the remaining P0 implementation gate; the six baseline comparisons already provide a working local surface. P0's unresolved CI diagnosis remains open for the later implementation handoff. Do not resume the stopped Claude session on authentication alone.

Design checkpoint setup: Astra, high; one writer; no subagents; prototype and appearance validation only. Use the existing renderer, camera, directors, sample records, and world-space reading system. Gate the study behind an explicit sample-only preview selection, preserve classic/cinematic behavior, and show Garden, Sanctuary, Expressions, the pearl, and the three arrival treatments before requesting visual approval. All 13 destinations remain accessible. No production release or Claude implementation is authorized before that approval.

## Goal and authority

Refinement D1, approved September 21: Anthony authorized smoother models, richer lighting/materials, higher-definition rendering and extravagant Atelier pearl detailing. His explicit exception is authoritative: retain the current wording layout, with "Thank you" at the top. Do not move it below the message or replace the current wording hierarchy with the Atelier's hierarchy. Do not use build-polished-apps or Stitch. Astra owns this sample-only refinement; Fable/Opus implementation stays held. D1 may raise the design study's quality caps with measured comparison; ordinary classic/cinematic caps remain unchanged.

Goal: Upgrade all 13 connected locations and their travel corridors toward the supplied artwork, reproducing the selected preview's pearl and entrance appearance while preserving the app's reading, camera, arrival, and privacy behavior.

The exact appearance and motion target is the supplied `/Users/anthony/Downloads/preview.html`. The approved environmental direction is `/Users/anthony/Downloads/Mothers_Love_Codex_World_Handoff/references/Approved_Direction_Overview.jpg` and its four images under `/Users/anthony/Downloads/Mothers_Love_Codex_World_Handoff/references/approved/`. Immutable, byte-preserved copies and hashes are in `docs/design/world-quality/reference/` and `docs/design/world-quality/REFERENCE-MANIFEST.json`. Source copies are faithfully reproduced evidence, including their original text; they are not application policy.

This approved plan retains P0 through P7 from the supplied `02_EXECUTION_PLAN.md`. Read the supplied `00_START_HERE.md`, `10_CURRENT_REPO_STATE.md`, `11_DECISIONS_AND_CONFLICTS.md`, and this worktree's `AGENTS.md` before implementation. Preserve Plan 23's world-space recognition contract. The current approved model choices supersede historical Luna/Sonnet routing in older project instructions.

## Confirmed baseline

- Repository: private `https://github.com/lovelaceaml-hub/mothers-love`.
- Existing draft PR: `https://github.com/lovelaceaml-hub/mothers-love/pull/8`.
- Art branch: `feature/world-cinematic-art-pass`, baseline `b324b81cabe947592f6723425c58f14307b58083`.
- PR base: `feature/tv-3d-world-prototype-01`, `07cb3f63301150e2849a30531b4a441e4c0a3f39`.
- Integration worktree: `/Users/anthony/Projects/mothers-love-worktrees/world-quality-continuation`.
- Cinematic sample: `https://mothers-love-m541447l6-lvzion.vercel.app/display/world-preview?source=sample`.
- Same-build classic: `https://mothers-love-m541447l6-lvzion.vercel.app/display/world-preview?source=sample&art=classic`.
- The planning browser spot-check reached readiness and rendered both paths. Paused Sanctuary views shared camera coordinates `[-13,12,19]`. This is not a formal deterministic regression or a CI pass.
- CI run `35648481429` failed its readiness wait. Its filtered empty errors list does not establish a clean browser. The no-data harness was generated but not independently exercised by the failed script.
- The supplied heart GLB has 18,828 vertices, 37,652 triangles, and SHA-256 `6e8a43b05db30e56fe40ad78e7f83a5bdfc9012be9eaa27346e96f87ac4862c0`. Preserve its normals and geometry. Blender 5.2.2 LTS is installed.
- Exact HTML SHA-256: `03513f0fdae029914a788e63d676d6e965b31d52320180f267d3130d66b99922`. Source was inspected in planning; local browser rendering was blocked by browser policy and remains unverified. Do not circumvent that boundary.

## Models, effort, agents, review

| Responsibility | Model and effort | Ownership |
| --- | --- | --- |
| Initial visual specification and integrated prototype | Astra, high | Reference comparisons, pearl appearance, materials, composition, connected proof sequence |
| Controller and shared runtime implementation | Claude Opus, high | P0, renderer, directors, lifecycle, integration, Git, preview delivery |
| Visual and asset implementation | Claude Fable, high | Authored assets, environment treatment, pearl/effect modules, destination refinement |
| Completion review | Fresh nonauthor Claude Opus, high | Complete diff, visual evidence, privacy, behavior, acceptance report |

Execution default: one Opus-controlled full-project task with sequential ownership handoffs. Agents: no automatic fan-out. Record exact model identifiers and actual tools. No silent model substitution. A different implementation role must be resolved at a phase boundary.

The Codex/Astra session may prepare the approved plan, reference package, worktree, and handoff, perform validation, and author the explicitly requested sample-only design study before Claude implementation. It does not silently take Opus/Fable's implementation ownership. Every receiving runtime first checks its work against the Goal line above.

One writer owns each worktree at a time. If later explicitly authorized parallel work is used, only disjoint asset files or isolated visual modules may overlap, in separate worktrees. Shared engine contracts, integration, Git state, and release stay with the controller. Preserve unrelated work; never reset a dirty checkout, force-push, or copy an old snapshot over the app.

## Phase P0: Resolve the failed readiness check

Setup: Claude Opus, high. Review: fresh nonauthor Opus at P7. Agents: none. Depends on: none.

Run six controlled cases: classic and cinematic in Next development mode; classic and cinematic in an optimized local build; classic and cinematic in the independent no-data harness. Begin with CI's 1920 x 1080, reduced-motion, software-renderer configuration. Keep sample mode explicit and personal data out of artifacts.

Instrument React mount, dynamic import, scene construction, renderer creation, first successful render, and failure cleanup. The current host catches startup errors without preserving their cause and sets readiness before proving a rendered frame. Inspect scene construction in class field initialization as well as renderer construction.

Execute each review case independently even if another fails. Capture sanitized errors, failed requests, server logs, stage timings, source SHA, browser/GPU configuration, and fallback state. Keep original failure evidence unchanged. HMR errors alone are not a root-cause diagnosis.

Fix the demonstrated cause. Do not increase timeouts or suppress errors as the solution. P0 closes only with a fixed-head render, passing readiness assertions, an updated report, and successful CI. Typecheck, a fallback shell, and a READY deployment are insufficient.

## Phase P1: Freeze the target and establish rendering rules

Setup: Astra high for appearance; Claude Opus high for shared renderer contracts. Sequential ownership. Review: P7. Agents: none. Depends on: P0.

Freeze supplied HTML, four images, and original heart sources with hashes. The HTML's Pearl Formation, Silk Unveiling, and Petal Constellation are the latest appearance authority. Map these respectively to Constellation Gather, Ribbon Portal, and Bloom. Older ateliers support the chosen target rather than replacing it.

Establish warm highlights, cool fill, contact shading, atmospheric distance, and distinct pearl, champagne, rose, silk, foliage, and water response. Preserve pink, coral, lavender, blue, fresh green, pearl, and champagne. Inspect stationary frames and motion.

Measure startup, median/p95/p99 frame time, geometry, draw calls, texture memory, GPU/browser/device, and actual render resolution. Keep Three.js 0.180.0, the existing renderer/master clock, and quality controls. Do not introduce WebGPU, R3F, or another rendering stack. Start with the existing high/low pixel caps; calibrate detail from measured results.

Keep imported textured assets outside both UV-stripping batchers. Batch only compatible attributes, materials, and ownership; retain UV channels, normals, tangents, LOD pivots, and animations where required. Audit color management before adding postprocessing; avoid double output transforms and indiscriminate bloom.

## Phase P2: Build the reusable environmental family

Setup: Claude Fable, high. Opus owns integration. Review: P7. Agents: none. Depends on: P1.

Author a finite kit of curved ivory architecture, beveled terraces, thin metallic inlays, branching blossom trees, cupped flowers, sculpted island undersides, bridges, waterfall veils, and restrained butterflies. Use Blender or reproducible mesh generation where close-up forms benefit.

Export runtime-ready GLBs with supported materials, preserved normals/UVs, named pivots, near/far variants, provenance, and procedural fallbacks. Record actual source/export versions, hashes, dimensions, geometry/texture sizes, rights, and runtime checks. A script or generated image is not a delivered model.

Attach replacements through explicit named ownership. Replace fragile decorator color/count heuristics where needed; prevent duplicate scenery and unintended hiding. Inspect exports under actual app lighting, not only Blender rendering.

## Phase P3: Restore the heart and prove the connected world

Setup: Claude Fable high for appearance; Claude Opus high for integration/camera. Astra may perform initial integrated look development. Sequential ownership. Review: P7. Depends on: P2.

Load the supplied heart with the existing Three.js GLTF loader. Preserve geometry/normals/proportions and use a parent transform for placement. Match rose surface, dark sides, and broad highlights separately from the simple import material. Restore four independently varying silk paths, including folds, phases, widths, and sheen.

Build a continuous Garden to Sanctuary to Expressions passage: foreground planting, readable recognition forecourt, heart reveal, distant landmarks, and composed travel. Keep all 13 destinations available. Show a real reference/runtime comparison and genuine connected tour before broadening the treatment. Full reading duration wins if the recording exceeds 90 seconds.

## Phase P4: Integrate the pearl and three arrivals

Setup: Claude Fable high for visuals; Claude Opus high for behavior. Sequential ownership. Review: P7. Depends on: P3.

Port the selected HTML's layered pearl, broad reflections, delicate iridescence, typography hierarchy, thank-you treatment, exterior medallions, and reveal motion into existing world-space recognition groups. Do not import its raw WebGL engine, DOM reading card, sample timers, or private/fabricated attribution.

Keep exact names, complete paged messages, canonical artwork, and continuation indicators. Symbols remain depth-tested and parented to the recognition. Measure clearance for complete medallion bounds throughout camera movement. Zero expressions never fabricate a default expression.

Drive Bloom, Ribbon Portal, and Constellation Gather through the existing director phases. Formation finishes before reading starts. Preserve five-record waves, bounded queues, one active appearance, resident handoff, and camera return. Cycle styles over newly admitted arrivals and lock each for its lifetime. Add sample-only style selection for repeatable review. Reaction refreshes, reconnects, and resident visits do not advance the style cycle or create arrivals.

Read real reaction counts through the existing public endpoint in batches of at most 30, using the existing validated client helper. Use a separate count map, periodic refresh for unchanged IDs, cancellation on safety changes, and last-known-good safe counts on transient failure. Unknown values stay absent. Counts never reset reading or arrival identity; sample counts remain fictional.

## Phase P5: Extend quality to every destination

Setup: Claude Fable, high. Opus integrates shared changes. Review: P7. Agents: none. Depends on: P4.

Preserve all existing IDs, scene mappings, playlist behavior, and content meanings. Upgrade Welcome/Featured/Promise with butterfly gateway, pearl pavilion, and quiet overlook; Calendar/Status/Milestone with dimensional date garden, framed observatory, and rising fountain; Peacemakers/Orbit with defined globe and celestial expression field; Live Feed/Practice with a layered recognition river and intimate kindness terrace.

Upgrade every route with foregrounds, bridges, openings, visible destination silhouettes, clear reading spaces, and collision-free camera corridors. Capture near, medium, and travel views for all 13 locations. No location may be removed, omitted from coverage, or left as a placeholder to meet performance targets.

## Phase P6: Verify behavior, accessibility, performance

Setup: Claude Opus, high. Review: P7. Agents: none. Depends on: P5.

Tune instancing, compatible batching, LOD, transparency, and selective lighting before simplifying visual richness. Preserve readable text and owner effects. Exercise complete tours, reentry, bursts, cancellation, resize, context recovery, and disposal. Compare resource counts after equivalent repeatable scenarios for growth.

Target sustained 30 FPS or better on identified playback hardware; report distributions, quality, and render dimensions honestly. Software-browser results do not certify a physical TV. Functional/resource evidence is the gate: the source handoff's 30-minute, two-hour, and overnight suggestions are not mandatory delays.

## Phase P7: Deliver the reviewable preview

Setup: Claude Opus, high. Reviewer: fresh nonauthor Claude Opus, high. Agents: only the declared read-only reviewer. Depends on: P6.

Publish only the isolated preview through the existing project. Deliver exact source SHA, deployment ID, sample URL, same-build classic URL, all-location comparisons, a genuine connected tour, three full arrival/reading recordings, actual tests, provenance, visual gaps, device limitations, and rollback instructions.

Correct review findings, rerun affected checks, and rebuild a neutral review payload when required. Update plan/ledger/handoff/links and privately back up reviewed source. Keep PR #8 or its explained continuation draft until review criteria pass. Anthony's visual approval is separate from code review. No production promotion or merge without explicit authorization.

## Interfaces and acceptance

Public contracts remain unchanged. No submitted-name exposure, new taxonomy, database/API schema changes, authentication changes, runtime AI, paid assets, reaction mutations, or new public fields. Existing canonical icons/phrases and fictional neighbors remain authoritative.

Internal changes are limited to startup diagnostics/first-frame readiness, an arrival visual style, a separate reaction map, and scoped visual modules using existing update/disposal contracts. Distinguish fallback assets from fully loaded cinematic art. Camera movement stays gentle during normal reading; explicit holds, owner pauses, and configured reduced/still cuts retain their behavior.

- Run typecheck, optimized build, focused world unit tests, the world browser suite, and corrected cinematic review script.
- Test 80-grapheme names, 500-grapheme messages, paragraphs, RTL, combining characters, emoji, long unbroken strings, and zero/one/nine expression cases.
- Verify full page intervals; holds, pauses, touring, still/reduced cuts, arrival return, burst deduplication, reaction-only refresh, and reconnect behavior.
- Active/queued withdrawal, expiry, quiet/neutral, stale data, source switching, and disposal immediately clear personal pixels, textures, accessible text, hit targets, and references, without waiting for animation.
- Inspect paused/moving frames at 1920 x 1080, 3840 x 2160, 390 x 844, phone landscape, and resizing. Formal comparisons match sample, camera, time, settings, and source.

Visual acceptance requires the recognizable original heart, detailed planting/architecture, distinct materials, layered depth, unobstructed full text, canonical exterior symbols, and convincing whole-world travel. Automated passes are not Anthony's visual approval.

## Build log

- 2026-09-21: Anthony approved the plan and continuation. Remote refs rechecked: art and base are unchanged. The existing repository is private.
- 2026-09-21: Codex/Astra prepared a clean new worktree on the existing art branch at b324b81cabe947592f6723425c58f14307b58083. The original checkout and its unrelated untracked work remain untouched. This clean SHA is the completion-review baseline; no dirty files were imported.
- 2026-09-21: The plan, reference copies, ledger, and fresh-session P0 handoff are being prepared. No P0 fix or CI pass is claimed. Exact model IDs must be recorded when each runtime starts.
- 2026-09-21: Preparation committed as 9a6bbf8. Native Opus 5 high session launched but could not infer because its login expired. Elevated authentication check also returned loggedIn false. Sign-in is awaiting Anthony; P0 is blocked before application edits, and the preserved session can resume after authentication.
- 2026-09-21: With Claude authentication pending, Codex/Astra completed baseline-only validation: locked dependencies, typecheck, optimized build, 40 world unit tests, and six local headless macOS render cases passed. Actual source remains unchanged from b324b81. Reports and inspected captures are recorded in docs/runs/2026-09-21-world-quality/BASELINE-CHECKPOINT.md. Historical Linux CI failure remains unexplained; P0 is not complete.

- September 21 design checkpoint: Anthony requested designs and prototypes before Fable/Opus implementation. Astra authored an opt-in sample study on the existing world engine. The original heart loads, canonical symbols orbit world-space pearls, and the three arrival appearances use the existing director. Typecheck, optimized build and 40 world tests pass. Visual approval and final evidence are pending; P0 remains open. See [the design record](runs/2026-09-21-world-quality/DESIGN-STUDY.md).

- September 21 D0 delivery: [Astra prototype](https://mothers-love-4dyumji0r-lvzion.vercel.app/display/world-preview?source=sample&art=design) at `9dc7e455047f7eebb8ebfcc1affd125f3b591d3c` is ready for visual review, with reference comparisons, all-location sample captures and a real connected tour. The final optimized build/TypeScript, 47 world unit tests and 23 still/browser checks pass. No Fable/Opus implementation started. P0 remains open, PR #8 draft, production unchanged. See [the evidence receipt](runs/2026-09-21-world-quality/DESIGN-RECEIPT.json).

- September 21 D1: Anthony approved the four refinements while preserving the existing wording and Thank you at top. [Refined sample](https://mothers-love-o6rtntg3y-lvzion.vercel.app/display/world-preview?source=sample&art=design) at `80586a20b2aaee166bbd48d26ac8bd3f0c5daa29` adds smoother procedural models, outdoor radiance/materials, ornate pearl finishing and native-4K High output. Build/TypeScript, 52 unit tests and 32 browser checks pass. [Evidence and remaining gaps](runs/2026-09-21-world-quality/D1-VISUAL-REVIEW.md). No build-polished-apps, Stitch, Claude implementation or production promotion. Visual approval and P0 remain open.
