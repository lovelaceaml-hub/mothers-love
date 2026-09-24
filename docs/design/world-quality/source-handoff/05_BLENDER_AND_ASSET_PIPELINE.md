# Blender and authored assets

## Role

Use Blender where authored shapes will materially improve the image match. It supplies sculpted forms, supported material maps, animation clips where appropriate, and optional world/shot layout studies. The app supplies live recognitions, text, privacy decisions, expression selection, event scheduling and autonomous camera decisions.

**Included now:** original heart HTML, original heart GLB, prototype meshes/code, campaign icon references, and supplied concept images. **Not included now:** newly authored Blender source scenes, finished high-quality environmental GLBs for every district, a licensed third-party asset kit, or verified optical materials. Do not report these assets as delivered merely because their tasks are listed here.

## Prioritized asset list

| Priority / asset | Deliverable | Runtime purpose |
| --- | --- | --- |
| P0 original heart import | Preserve provided geometry and normals; source hash recorded; front/side fidelity check | Signature heart, not another modeled approximation |
| P1 sanctuary/portal modules | Curved arcade, terrace edge, balcony/step, fine inlay; separate pivots/material slots | Repeatable architecture family with designed silhouettes |
| P1 blossom tree family | Two or three distinct branch/crown silhouettes; clear near and distant versions | Replace repeated ball clusters while keeping mass/color |
| P1 flower/arrival bloom | Several petal silhouettes, a hero opening blossom, stem/leaf variants | Close-up garden quality and new-recognition choreography |
| P1 floating island/cliff family | Rounded terrace plus distinct underside profiles, planting sockets and waterfall anchors | Vertical world layers and distant landmarks |
| P2 butterfly/guiding detail | Small readable wings, optional simple animation | Restrained guide/transition, not a swarm covering text |
| P2 expression landmarks | Cohesive but different supports with canonical icon placement | Distinct destination identities |
| P2 water/river/observatory detail | Authored edges, basin, fountain and landmark forms | Better reflection/contact cues and content framing |

Use this as a finite kit, not a mandate for every flower to be unique. Procedural duplication and variation are appropriate after the source forms are deliberate.

## Export workflow

Work from the actual world units and the original heart's proportions. Blender's native modeling convention is Z-up; glTF exports use +Y-up. Verify the exporter transform once and avoid a second compensating rotation in Three.js. Establish a reference cube or measured landmark for scale before importing all assets.

Name root objects and pivots meaningfully, for example `ML_Sanctuary_Arch_A`, `ML_BlossomTree_A`, `ML_ArrivalBloom`, `ML_WaterfallAnchor`. Do not rely on arbitrary `Cube.017` names in camera or animation code. Apply appropriate transforms, inspect normal orientation, and handle negative-scale mirrored objects deliberately.

Export selected runtime collections as `.glb`. Preserve `.blend` sources separately. Resolve modifiers or procedural geometry that the exporter cannot express; native Blender curve/physics/material-node behavior does not automatically become equivalent glTF behavior. Object transforms, supported morphs and skeletal clips may transfer, but the runtime needs verified playback. Sampled camera rails can be exported as a separate neutral JSON contract instead of assuming a Blender constraint rig will survive.

Use supported PBR maps with proper color/non-color interpretation. Bake ambient/contact detail for static props where suitable. Start with only textures/LODs the current app can actually load. Add Meshopt/Draco/KTX2 only with compatible self-hosted decoders and a measured benefit; do not introduce a package/asset pipeline merely by naming a compression format.

## Runtime verification per asset

Inspect front, three-quarter, side and travel-distance silhouettes. Check petal thickness, shadow acne, transparent sorting, normals, UV seams, color space, material separation and light response. Render the exported file with the actual Three.js version, exposure and environment. A beautiful Blender render is not acceptance evidence for the web asset.

Store asset ID, source file hash, export hash, Blender/exporter version, rights/source, dimensions, triangle/vertex counts, texture sizes, required extensions, LODs, load size, animation clips and runtime test notes in `tracking/ASSET_REGISTER.json`.

The provided original-heart GLB has 18,828 vertices and 37,652 triangles according to its included provenance. Its simple PBR material is only an import-preview material; custom heart shading, silk, lighting and bloom must be matched in the app. Avoid normal recomputation or remeshing that silently changes the original unless specifically reviewed.

## Cost, security and capability boundaries

No purchase is authorized. Do not send app records or private screenshots to an external asset-generation service. Use only permitted local/reference material and obtain a specific approval before a paid or externally hosted asset workflow. Do not bundle font files, credentials or arbitrary downloader scripts with the assets.

If Blender is not actually available, keep a working procedural improvement and record the exact missing artifact. Do not label a Python script, an image-generation result or a placeholder mesh as a completed Blender art pass. Asset creation and runtime integration are independently verifiable deliverables.

Official exporter reference: https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html . Verify the installed/exporter version before selecting options.
