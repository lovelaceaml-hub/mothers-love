# Plan 19: World Prototype 01

Goal: Build World Prototype 01 in the real Mother's Love repository and get it onto a preview URL.

## Authority and boundary
Anthony requested this implementation on September 20, 2026, referring to the three-zone world conversation. Build one persistent Three.js world at `/display/world-preview`, with Recognition Garden, Heart Sanctuary, Nine Expressions Grove, automatic cinematic camera, fictional recognitions, readable HTML overlays, and debug controls. This request selects the already-discussed pearl, champagne, rose, and expression-color direction and authorizes a hosted prototype for visual evaluation. Production implementation and a redesign approval sequence are later work. No production alias, database, real recognition, existing display renderer, or admin setting changes. The sample-only route is explicitly authorized as a hosted prototype, superseding the historical development-only demo restriction for this route alone.

## Models, effort, agents, review
- Implementation: current Codex controller session, solo. No implementation agents or parallel lanes.
- Review: native Codex review, gpt-5.6-sol, high, read-only, before completion.
- Runtime note: historical Luna lane routing is not used because this request has no delegated lanes; the controller owns this isolated prototype and provider actions.

## Source and ownership
- Baseline: `8a10f8c16af2b8e490e8daa9b78cf7cccf50015e` from released `tv17/pick`.
- Branch: `feature/tv-3d-world-prototype-01`.
- Clean isolated Git worktree; original checkout and unrelated untracked evidence are untouched.
- Own new `src/components/display/world/`, `src/app/display/world-preview/`, `tests/world/`, dependencies, and scoped status docs.
- Use canonical `src/lib/catalog.ts` without editing it. No production feed adapter in this first slice.

## Implementation and acceptance
1. Construct three distinct 3D zones in one scene, connected terrain/pathways, distant landmarks, a sculpted heart with animated silk, and nine canonical expression monuments. All geometry is local procedural art.
2. Add a single clock and camera director with smooth travel, dwell shots, manual zone selection, pause, speed, quality, fullscreen and diagnostics. Respect reduced motion, hidden-tab suspension, context loss fallback, and disposal.
3. Add clear sample labeling and large DOM text. Verify desktop 1920x1080, 4K, phone, keyboard controls, no WebGL, reduced motion, context loss, repeated navigation, and a complete camera cycle. No live API requests from this route.
4. Run focused unit/browser tests, typecheck, build, native controller review. Deploy only a Vercel preview, verify deployed functionality, privately push source, and record URLs and exact remaining physical-TV limits.

## Visual acceptance target
The first prototype is the reviewable artifact, not an already-approved production replacement. Palette and forms follow the referenced world specification. Screenshots record this first visual target; Anthony's TV feedback will drive a later art pass. Existing `/display` source must remain identical to the baseline.

## Build log
- Created a clean real-repository worktree from the local tv17/pick release branch. Verified private GitHub repository and existing Vercel project. Main checkout is an older renderer baseline and was deliberately not used for the new branch.

- Implemented local procedural art, canonical expression text, independent DOM story panels, a persistent renderer and camera, pause/still/reduced-motion controls, visibility suspension, quality cap/adaptation, context-loss fallback, and disposal.
- Native TypeScript check, focused lint, four camera/layout determinism unit checks, production build, TV/4K screenshots and axe checks pass. Phone overlap was found and corrected with a shared flowing presentation container. Software WebGL requires explicit SwiftShader flags for repeatable tests on this host; camera timing uses a small renderer surface while full-size views are checked separately.
- First Vercel preview `dpl_HsGA3zAviMb1MsacZqQsMvEVTCEk` reached READY. Further corrected source and final verification are pending. No production alias changed. Remote private visibility verified.
