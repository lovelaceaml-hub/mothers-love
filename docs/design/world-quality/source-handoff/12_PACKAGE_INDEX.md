# Package index and launch guide

Open [OPEN_HANDOFF.html](OPEN_HANDOFF.html) after extracting the whole ZIP. The main gallery uses relative media links. Individual self-contained HTML prototypes also work independently in a supported browser.

## Current handoff documents

| Document | Purpose |
| --- | --- |
| [00_START_HERE.md](00_START_HERE.md) | Read order, immediate blocker and package scope. |
| [01_CODEX_START_PROMPT.md](01_CODEX_START_PROMPT.md) | Paste into Codex with the folder and real checkout available. |
| [02_EXECUTION_PLAN.md](02_EXECUTION_PLAN.md) | P0-P7 implementation sequence and gates. |
| [03_ART_DIRECTION_AND_REFERENCE_GUIDE.md](03_ART_DIRECTION_AND_REFERENCE_GUIDE.md) | How to translate the four pictures into the whole world. |
| [04_RENDERING_AND_ARCHITECTURE.md](04_RENDERING_AND_ARCHITECTURE.md) | Host renderer, materials, batching, resources and quality. |
| [05_BLENDER_AND_ASSET_PIPELINE.md](05_BLENDER_AND_ASSET_PIPELINE.md) | What to author, preserve, export and verify. |
| [06_BUBBLES_AND_ARRIVAL_CONTRACT.md](06_BUBBLES_AND_ARRIVAL_CONTRACT.md) | Selected exterior symbols, full reading, queue and privacy. |
| [07_WORLD_ZONES_AND_CAMERA.md](07_WORLD_ZONES_AND_CAMERA.md) | All thirteen destinations and connected shot direction. |
| [08_VERIFICATION_AND_ACCEPTANCE.md](08_VERIFICATION_AND_ACCEPTANCE.md) | Runtime, visual, privacy, performance and device evidence. |
| [09_FILES_WORKTREES_AND_OWNERSHIP.md](09_FILES_WORKTREES_AND_OWNERSHIP.md) | Concrete touch points and bounded implementation ownership. |
| [10_CURRENT_REPO_STATE.md](10_CURRENT_REPO_STATE.md) | Refreshed head, draft PR, READY deployment and failed runtime check. |
| [11_DECISIONS_AND_CONFLICTS.md](11_DECISIONS_AND_CONFLICTS.md) | Resolve older prototype assumptions without regressing the app. |
| [13_SOURCE_REGISTER.md](13_SOURCE_REGISTER.md) | Commit-pinned source pointers, technical docs and evidence provenance. |

## Primary prototype launchers

### Detailed bubbles and arrivals
[prototypes/01_bubbles_latest/Mothers_Love_Bubble_Atelier/Bubble_Arrival_Studio.html](prototypes/01_bubbles_latest/Mothers_Love_Bubble_Atelier/Bubble_Arrival_Studio.html)

Pearl detail, selected symbols outside the bubble, Bloom, Ribbon Portal and Constellation Gather. Appearance and choreography reference; not the app runtime.

[Existing motion excerpt](prototypes/01_bubbles_latest/Mothers_Love_Bubble_Atelier/previews/Bubble_Arrivals_Overview.mp4)

### World 02 art studies
[prototypes/03_world_02/Mothers_Love_World_02/World_02_Studio.html](prototypes/03_world_02/Mothers_Love_World_02/World_02_Studio.html)

Sanctuary, Garden and Nine Expressions. Local scene studies with the preserved heart mesh and layered environmental details.

[Existing motion excerpt](prototypes/03_world_02/Mothers_Love_World_02/previews/World_02_Overview.mp4)

### Original heart and ribbons
[assets/original_heart/Original_Heart_and_Ribbons.html](assets/original_heart/Original_Heart_and_Ribbons.html)

Use this heart silhouette, volume and independent ribbon language. The GLB is included separately; its basic material is not the complete shader treatment.

[Existing motion excerpt](prototypes/05_original_heart_ribbons/Mothers_Love_3D_Ribbons/previews/Heavenly_Ribbons_3D_Motion.mp4)

### Orbit, Vortex and Garden
[prototypes/04_orbit_vortex_garden/ML_3D_Studio/Mothers_Love_3D_Studio.html](prototypes/04_orbit_vortex_garden/ML_3D_Studio/Mothers_Love_3D_Studio.html)

Depth and motion examples for the expression cosmos, milestone sculpture and garden. Earlier demonstrations, not implemented app changes.

[Existing motion excerpt](prototypes/04_orbit_vortex_garden/ML_3D_Studio/previews/All_Three_3D_Prototypes.mp4)

### Alternative bubble atelier
[prototypes/02_bubbles_alternative/Mothers_Love_Bubble_Atelier/Bubble_Arrival_Studio.html](prototypes/02_bubbles_alternative/Mothers_Love_Bubble_Atelier/Bubble_Arrival_Studio.html)

Pearl Formation, Silk Unveiling and Petal Constellation. Useful alternate effects, source and fitting work. Kept separate to avoid overwriting the latest package.

[Existing motion excerpt](prototypes/02_bubbles_alternative/Mothers_Love_Bubble_Atelier/previews/Three_Recognition_Entrances.mp4)

### Colorful TV design language
[prototypes/06_colorful_tv/Mothers_Love_Colorful_TV_Depth/Mothers_Love_Colorful_TV_Depth.html](prototypes/06_colorful_tv/Mothers_Love_Colorful_TV_Depth/Mothers_Love_Colorful_TV_Depth.html)

The existing bright campaign palette and selective-depth treatment. A visual reference, not a reason to revert the continuous world to fixed pages.

[Existing motion excerpt](prototypes/06_colorful_tv/Mothers_Love_Colorful_TV_Depth/previews/Colorful_TV_Selective_Depth_Motion.mp4)

## Exact supplied images and original heart

[Approved direction overview](references/Approved_Direction_Overview.jpg). These are the user-selected look targets, not photographs of the runtime.

- [Recognition pearl](references/approved/01_Recognition_Pearl_Target.jpeg)
- [Arrival bloom](references/approved/02_Arrival_Bloom_Target.jpeg)
- [Ribbon portal](references/approved/03_Ribbon_Portal_Target.jpeg)
- [Constellation gather](references/approved/04_Constellation_Gather_Target.jpeg)

- [Original heart GLB](assets/original_heart/Original_Sculpted_Heart.glb).
- [Original heart and ribbons HTML](assets/original_heart/Original_Heart_and_Ribbons.html).
- [Heart geometry provenance](assets/original_heart/HEART_PROVENANCE.json).
- [Image provenance and baseline redactions](references/REFERENCE_PROVENANCE.json).

## Repository state and failure evidence

- [Status snapshot](github_state/STATUS_SNAPSHOT.json).
- [Source pointers](github_state/SOURCE_REGISTER.json).
- [Failed CI report](github_state/ci_failure_run_35648481429/report.json).
- [Failed startup screenshot](github_state/ci_failure_run_35648481429/failure.png).
- [No-data scene harness](github_state/ci_failure_run_35648481429/scene-review.html). Its execution is not established by the failure report; serve locally to investigate.

## Extracted packages and historical variants

Every entry below contains the recovered source package with its internal filenames preserved. Old notes, relative links and machine-specific instructions remain historical. The new root documents and the real current repository resolve authority conflicts. This packet does not claim every earlier experiment was installed in the app.

| Original source ZIP | Extracted under | Role |
| --- | --- |
| `Mothers_Love_Bubble_and_Arrival_Prototypes.zip` | `prototypes/01_bubbles_latest/` | Latest recovered four-study bubble package; primary appearance/choreography reference, not a production runtime |
| `Mothers_Love_Detailed_Bubbles_and_Arrivals.zip` | `prototypes/02_bubbles_alternative/` | Earlier three-entrance bubble study; supplementary effects and fitting examples |
| `Mothers_Love_World_02_Prototypes_and_Spec.zip` | `prototypes/03_world_02/` | Primary recovered local Sanctuary/Garden/Expressions art studies |
| `Mothers_Love_Three_3D_Prototypes.zip` | `prototypes/04_orbit_vortex_garden/` | Earlier Orbit/Milestone/Garden studies for later destination art pass |
| `Mothers_Love_3D_Ribbons_Preview.zip` | `prototypes/05_original_heart_ribbons/` | Original sculpted-heart geometry and independently moving ribbon reference |
| `Mothers_Love_Colorful_TV_Depth.zip` | `prototypes/06_colorful_tv/` | Colorful legacy TV visual-language reference; do not replace continuous world with its fixed scene model |
| `Mothers_Love_World_Preview_02.zip` | `historical/01_earlier_world_02/` | Older World 02 variant; keep separate from primary World 02 |
| `Mothers_Love_Claude_Heart_Handoff.zip` | `historical/02_claude_heart_handoff/` | Historical heart handoff and references, not current authority |
| `Mothers_Love_Heavenly_Ribbon_Concepts.zip` | `historical/03_ribbon_concept_board/` | Early artistic ribbon options |
| `Mothers_Love_Heavenly_Ribbons_Handoff.zip` | `historical/04_early_ribbon_handoff/` | Early planning evidence and concept gallery, not current authority |

## Execution aids

- [Task ledger](tracking/TASK_LEDGER.json), [asset register](tracking/ASSET_REGISTER.json) and [prototype launcher registry](tracking/PROTOTYPE_LAUNCHERS.json).
- [Daily checkpoint](tracking/DAILY_CHECKPOINT_TEMPLATE.md) and [visual review](tracking/VISUAL_REVIEW_TEMPLATE.md) templates.
- [Release evidence template](deliverables/RELEASE_EVIDENCE_TEMPLATE.md).
- [Read-only source exporter](tools/export_repo_snapshot.py). It needs your real local Git checkout; it never checks out or changes it.
- [Packet integrity checker](tools/verify_bundle.py). This checks SHA-256 files, not app behavior.

## Scope and deliberate exclusions

No full repository checkout, node_modules, build cache, dependency font files, live feed dump, raw private submissions, secret credentials or protected-preview bypass token is included. The ten input ZIPs are represented by extracted contents and hashes rather than duplicated ZIPs. New handoff scripts do not run or modify the app. Prior package sources are retained for reference; executing them is a separate development action.
