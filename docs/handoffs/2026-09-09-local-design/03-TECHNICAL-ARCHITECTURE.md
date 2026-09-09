# Technical architecture and source map

## 1. Runtime and isolation

The application uses Next.js 16.3.4, React 19.2, and TypeScript. The preview is a development route at `/design-preview`. Its server page returns not-found when NODE_ENV is production. It uses a client component to create synthetic display data and render the actual DisplayExperience component.

The development server runs with webpack because this isolated worktree uses a node_modules symlink to the primary checkout. Turbopack rejected that symlink for pointing outside its configured filesystem root. No environment files were copied into the preview worktree.

The original `/display` behavior remains available in the source. Preview snapshot injection is optional. The local preview bypasses snapshot API fetching and supplies an empty reaction-ID list so reaction requests are not sent. Browser checks observed zero `/api/` requests on the demo path. Local compilation and browser assets still generate localhost requests.

## 2. Snapshot and simulation flow

The synthetic snapshot includes recognitions, aggregate counts, display settings, cursor, and publication events. Initial records have dates relative to the current time so they are eligible when the preview starts. Refreshes renew serverTime and preserve current preview settings, including pause, so periodic refresh does not undo operator interaction.

A new sample recognition receives a random UUID, fresh publication time, message, and expression IDs. The aggregate recognition count and expression totals are incremented. The event enters the existing snapshot reconciliation and arrival queue. PREVIEW_SHOW_ARRIVAL starts the queue for the demonstration while respecting pause, quiet, neutral, and offline safeguards in the coordinator.

MANUAL_SCREEN handles direct selection and manual advance. It resolves the target against the scheduled playlist and resets reading timing. When leaving an active arrival, completeArrival clears the introduced event from the queue. Ordinary production ADVANCE behavior remains separate.

## 3. Motion architecture

The design uses layered DOM elements and CSS geometry: perspective, rotateX/rotateY/rotateZ, transform-style, gradients, inset lighting, opacity, and shadows. It does not contain a downloaded 3D asset, mesh model, Three.js, WebGL canvas, or physically based renderer. This distinction matters if future work calls for true volumetric geometry.

ExpressiveMotion is a finite decorative overlay. Its event key combines screen identity and screen start time. Remounting starts a bounded group of particles near the heading for a scene change or near the arrival message for a new recognition. Four scene particles or nine arrival particles fade after approximately three to four seconds. They do not intercept input or appear in the accessibility tree.

Narrative phases use the existing presentation clock. Ambient motion stays CSS-driven. Do not add ambient breathing or light-sweep animation names to the clock synchronization regex; the 500-millisecond presentation tick would make them visibly stutter.

## 4. Changed source files

| Source path relative to the working copy | Responsibility |
| --- | --- |
| src/app/design-preview/page.tsx | Development-only route guard. |
| src/app/design-preview/preview.tsx | Synthetic data and new-recognition callback. |
| src/components/display/DisplayExperience.tsx | Optional snapshot injection, controls, event effects, feature geometry, pointer depth, and demo arrival dispatch. |
| src/components/display/DisplayExperience.module.css | Toolbar and prominent arrival button, Featured layers/rings, and perspective response. |
| src/components/display/expressive/ExpressiveMotion.tsx | Event-linked decorative particles. |
| src/components/display/expressive/ExpressiveMotion.module.css | Finite particle motion, shimmer, distinct headings, pause/still/reduced-motion support. |
| src/components/display/garden/Garden.module.css | Garden shell lighting, rim, depth motion, glint, and motion controls. |
| src/components/display/insights/DisplayInsights.tsx | Decorative card/circle layers and adaptive message size. |
| src/components/display/insights/DisplayInsights.module.css | Round shared bubbles, centered connected layout, dimensional nine-card treatment. |
| src/components/display/teaching/TeachingScreens.module.css | Kinetic spotlight flower, orbit rings, light, and reading-plane treatment. |
| src/lib/display/coordinator.ts | Manual selection and preview arrival actions. |

All paths above are rooted at `/Users/anthony/Projects/mothers-love-worktrees/local-3d-preview` on Anthony's Mac. The same relative paths are in the ZIP's source directory.

## 5. Ownership and implementation provenance

Root owns integration and the canonical saved worktree. The separate local-3d-circles worktree supplied initial Garden CSS. Root fixed rim masking and the orbit radius. The local-3d-atmosphere worktree contains unfinished/delegated material and is not the saved source of truth. Its partial insights markup was integrated, while root wrote the completed styling. Do not merge those lane branches wholesale after restoring this checkpoint.

The source snapshot in the package is authoritative for sharing this checkpoint. The baseline-relative patch is useful when applying changes to a known compatible checkout. Do not apply it blindly to a newer branch with overlapping changes.

## 6. Production boundary

Some CSS changes affect shared components in the isolated source, even though the demo route is development-only. The production guard is not permission to merge or deploy those shared changes. Shipping would still alter actual display appearance. Keep this checkpoint local until Anthony authorizes a release and the relevant regression checks are completed.
