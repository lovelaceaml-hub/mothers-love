---
lane: featured
title: "Section 4, Featured Recognition depth layers"
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: /Users/anthony/.claude/worktrees/mothers-love-tv-featured
review: "sonnet-5 high on landing"
depends_on: base-b
updated: 2026-09-11T09:14Z
---

## Files
- public/color-polish/scenes/featured.js: Implemented depth layers recipe (far, mid, near), descriptor hooks (mount, integrate, place), 2 second drift nearer after 12 seconds steady, layer persistence across arrivals, and data-depth synchronization.
- public/color-polish/scenes/featured.css: Kept scoped header comment; no additional CSS rules required.
- tests/color-polish-scenes/featured.spec.ts: Five automated behavioral tests covering circularity, no overflow, click advance immunity in Studio preview, continuous population with staggered single exit replacement, multi-layer depth assignment with blur and sharp layers, exit circularity, and reduced motion still mode.
- docs/runs/2026-09-11-tv-scenes/lanes/featured.md: Lane execution record.

## Gap report items closed
1. Three-layer depth treatment: Implemented layers far (scale 0.86, blur 0.8 px, pace 0.75, z 40), mid (scale 0.94, blur 0.3 px, pace 0.9, z 60), and near (scale 1.0, blur 0 px, pace 1.1, z 80).
2. Initial layer assignment in mount: Set initial actors by index modulo 3 (with any fourth actor assigned near), scaled pace factors, and assigned dataset.depth attributes; large reader orbs stay near.
3. Post-arrival and steady drift: In integrate, actors steady for at least 12 seconds without shifting begin a 2 second smooth drift one layer nearer (far to mid, mid to near, near stays).
4. Interpolated layout and filter: In place, interpolated scale and blur across layer transitions using smooth, preserved slot coordinate and phase synchronization, and applied layer z-index.
5. Arrival layer inheritance: When installNext assigns a new record, the actor object persists its layer, and shifted status resets in place upon entering so each arrival can drift once.
6. Dataset depth synchronization: Synchronized data-depth on orb slot elements whenever layer changes.

## Deferred
- Long-message reader orb whole-scene reset: As documented in gaps/featured.md, replacing the reader orb full-scene reset with a single-orb swap inside core/motion.js swapSlot affects all floater scenes and is deferred to a shared tv/base lane.

## Result
Featured Recognition (scene 4) depth layers and behavioral spec landed.
All bubbles maintain perfect circularity, staggered exit cadence, and 520 px keep-out column bounds.
No shell commands were run by this lane per the headless permission gate rule; the coordinator runs typecheck, lint, test, build, featured.spec.ts, and probe verification.
Round r1: top-level identifiers renamed with the FEATURED_ prefix to avoid cross-scene collisions in the shared global scope; blur capped at 0.9 px.
Round r2: rotation through all nine expressions via shuffled bag without reading S.featured, in-pass flip advance at 15 s, dimensional layered expression panel with idle sway, aurora blobs, concentric counter-rotating rings, orbiting icons, staggered word rise, and diagonal light sweep.
Round r3: keepAge remount preserves current expression id and sets V.featuredAdvanced to avoid duplicate flips; FEATURED_FLIP_CANCEL clears in-flight timers and listeners on remount; removed overflow:hidden from .feature-panel and added .feature-sweep-clip wrapper to preserve 3D depth; removed unread V.featuredId assignments.
Round r4: replaced unexposed window.V read in keepAge remount test with 900 ms behavioral check verifying panel classes and preserved expression name.

## Coordinator verification (Fable 5.1)
- typecheck, vitest, build pass; lint at the pre-existing 18; probe clean across six configs plus arrivals; Playwright on the dev server 13 of 13 before the rename, and 12 of 13 on the production runner after it, the one failure being the usable spec's legacy fallback journey that fails identically on untouched tv/base under that runner.
- Hygiene sweep clean. Review round 1 (Sonnet 5 high): blocking cross-lane defect, a top-level const LAYERS shared with three sibling lanes in the global scope, plus a should-fix blur overshoot during entrance; round 1 correction renamed the identifiers FEATURED_LAYERS and FEATURED_DRIFT_TO and capped blur at 0.9 px. Review round 2: both confirmed fixed, no material findings; one note that z-index snaps to the target layer while scale and blur interpolate over the 2 s drift.
