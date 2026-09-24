# Mother's Love: Codex whole-world handoff
## Make the actual 3D world approach the supplied artwork

**Prepared September 21, 2026. This is a planning and reference package, not a new app deployment.**

The user wants the **entire continuous TV world** to look and feel more like the four supplied pictures: richly layered pearl architecture, warm pastel lighting, dimensional flowering trees, reflective water, silk, detailed recognition bubbles, and expression symbols outside the bubbles. Do not respond with another proposal-only answer or build only another isolated HTML study when executing this handoff.

### Give this to Codex

Extract the full ZIP. Open the real `lovelaceaml-hub/mothers-love` checkout in Codex, make this extracted folder available alongside it, and paste `01_CODEX_START_PROMPT.md`. Open `OPEN_HANDOFF.html` to browse the reference pictures, prototypes, source packages, and current failure evidence.

**Immediate blocker:** the second cinematic-art browser workflow failed. The page never reached its `data-ready="true"` state within the 60-second wait. TypeScript passed and Vercel reports a READY preview, but neither establishes a working or visually approved 3D runtime. Start with P0 in `02_EXECUTION_PLAN.md`.

### Current repo checkpoint

| Item | Refreshed state when this handoff was prepared |
| --- | --- |
| Repository | `lovelaceaml-hub/mothers-love` |
| Working preview branch | `feature/world-cinematic-art-pass` |
| Draft pull request | [PR #8](https://github.com/lovelaceaml-hub/mothers-love/pull/8), open, not merged |
| PR head | `b324b81cabe947592f6723425c58f14307b58083` |
| PR base | `feature/tv-3d-world-prototype-01` at `07cb3f63301150e2849a30531b4a441e4c0a3f39` |
| Latest observed preview | `https://mothers-love-m541447l6-lvzion.vercel.app/display/world-preview?source=sample` |
| Latest deployment | `dpl_DxW3vDesTgtrHKmtDoDQzJSRefP3`, READY, preview target |
| Latest browser workflow | [Run 35648481429](https://github.com/lovelaceaml-hub/mothers-love/actions/runs/35648481429), failed |
| Comparison switch | Append `&art=classic` to the same sample preview |

These are historical snapshots, not immutable claims about the branch's future state. Fetch and compare the real checkout before editing. The earlier preview `mothers-love-e0bnx5sae-lvzion.vercel.app` corresponds to the first art commit, not the latest observed head. A PR `merge_commit_sha` is a synthetic test merge here; PR #8 is not merged.

### Read in this order

1. `01_CODEX_START_PROMPT.md` and `10_CURRENT_REPO_STATE.md`.
2. `references/approved/` and `03_ART_DIRECTION_AND_REFERENCE_GUIDE.md`.
3. The repository's current `AGENTS.md`, current plans, and PR diff. `11_DECISIONS_AND_CONFLICTS.md` prevents older prototype instructions from overriding the actual app.
4. `02_EXECUTION_PLAN.md`, then the renderer, Blender, bubbles, camera, and verification documents as each work package begins.

### Most important assets

- Exact supplied design targets: `references/approved/`.
- Latest recovered bubble atelier: `prototypes/01_bubbles_latest/Mothers_Love_Bubble_Atelier/Bubble_Arrival_Studio.html`.
- Sanctuary/Garden/Expressions art studies: `prototypes/03_world_02/Mothers_Love_World_02/World_02_Studio.html`.
- Original sculpted heart: `assets/original_heart/Original_Sculpted_Heart.glb` and `Original_Heart_and_Ribbons.html`.
- Actual latest CI failure: `github_state/ci_failure_run_35648481429/report.json`, `failure.png`, and the generated no-data scene harness.

### Authority boundaries

The new plan gives Codex a concrete path to continue the already requested **isolated preview** upgrade. It does not authorize production promotion, merging into production/default branches, database/API/schema changes, purchases, new runtime AI services, new personal-data collection, or changes to the public contract.

Preserve Plan 23's world-space recognition objects, hands-free camera touring, full reading time, current live-data behavior, canonical expressions, privacy clearing, accessibility and fallback. Prototype DOM overlays, frozen cameras, fictional attribution, and simplified timers are visual demonstrations, not replacement policy.

### What is in this folder

Ten recovered source packages are included with their internal paths preserved. Six are primary reference packages in `prototypes/`; four older variants are in `historical/`. They include their source, HTML, video, screenshots and old handoffs. The original archive hashes are recorded in `SOURCE_PACKAGES.json`; source ZIP files are not duplicated in addition to the extracted files.

This is **not a full Git checkout**. The current application code remains authoritative in GitHub. `tools/export_repo_snapshot.py` can create a read-only, commit-pinned source reference from Codex's real checkout without switching branches or changing files. Do not copy old prototype folders wholesale into the application.
