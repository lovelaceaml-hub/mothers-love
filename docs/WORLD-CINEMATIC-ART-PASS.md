# Full-world cinematic art pass

This preview pass uses the supplied pastel, pearl, floating-island references as its visual direction. It changes the shared art layer across all thirteen existing destinations, not the public records, API, database, camera ownership, or reading policy.

Implemented: sculpted instanced blossom canopies in place of the known low-detail tree batches; layered flower beds; pearl arcades and differentiated destination framing; floating background gardens; falling-water curtains; a less noisy water surface; layered cloud atmosphere; soft contact shading; warmer pearl/champagne materials; bounded per-district detail activity; and reversible cleanup. No screenshot is used as a flat world background. The original scene is preserved byte-for-byte in world-scene-legacy.ts and available through `?art=classic` on this preview branch.

The current sanctuary heart and its existing animation are preserved in this pass. The original standalone sculpted-heart asset has been recovered separately, but no claim is made that the new art layer has already installed that separate mesh. The current recognition renderer also remains authoritative. Its recipient names, privacy clearing, full reading intervals, world-space faces, and arrival queue are not replaced with screen-fixed cards.

Architectural additions sit behind each destination and at the side planting areas. The visitor-facing forecourt is kept clear. This is a first whole-world art improvement, not a claim of pixel-identical reproduction of the concept illustrations. Custom hero architecture, higher-detail flower species, a faithful import of the separate heart asset, and selective reflection/lighting refinement remain artistic follow-ups after viewing this pass.

The code uses Three.js 0.180.0 already declared by the repository. No new runtime package, external asset fetch, purchase, model API, or secret is added. Exact rendering/performance depends on the target TV device. The scene decorator restores replaced materials and visibility before the legacy scene disposes its resources.

## Verification

Local TypeScript syntax transpilation is available. The isolated pull-request workflow is configured to run the real project typecheck and fictional browser captures. It never opens the live source and blocks application API requests in its sample browser. A configured workflow is not evidence that it passed; use its resulting report and build status.

No production deployment or merge is authorized by this commit. Compare the preview with `?source=sample` and with `?source=sample&art=classic`, then assess on the actual TV at normal viewing distance. Do not accept a successful typecheck as visual approval.
