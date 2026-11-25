---
lane: peacemakers
title: "Section 6, We Are Peacemakers depth layers"
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-peacemakers
review: "sonnet-5 high on landing"
depends_on: base-b
updated: 2026-09-11T09:15Z
---
## Files
- public/color-polish/scenes/peacemakers.js: Added depth layers configuration (far, mid, near), mount hook to assign layer distribution and pace scaling, integrate hook returning false to continue default physics, and place hook applying depth scale, blur, z-index, and data-depth attributes.
- public/color-polish/scenes/peacemakers.css: Preserved existing header comment only; no scene-specific CSS needed.
- tests/color-polish-scenes/peacemakers.spec.ts: Five Playwright behavior tests verifying circularity, overflow absence, staggered replacement population, depth layer distribution and blur, circularity across replacement intervals, and reduced motion still mode.
- docs/runs/2026-09-11-tv-scenes/lanes/peacemakers.md: Execution record for this lane.

## Gap report items closed
- Item 3 (Depth): Added three depth layers (far at scale 0.84 with 0.9px blur, mid at scale 0.93 with 0.35px blur, and near sharp at scale 1.0 with 0px blur). Paces scaled by layer factors (0.75, 0.9, 1.1). Dataset depth attribute maintained on slot elements. Newest arrival inherits predecessor layer.

## Result
We Are Peacemakers scene (renderer id 8) implements three depth layers through mount, integrate, and place hooks without altering layout positions, keep-out boxes, replacement cadence, or circular geometry. All 5 test specifications are defined in peacemakers.spec.ts.
Round 1: the spec types the visualState actors (strict tsc had three implicit any errors).
Round r2: top-level identifiers renamed with the PEACEMAKERS_ prefix to avoid cross-scene collisions in the shared global scope; blur capped at 0.9 px.
Round r3: updated the depth-layer test sharp condition to parseBlur(a.blur) < 0.15 to accommodate default breathing blur on near actors.
Round r4: six-bubble layout with staggered replacement, globe float and light sweep, kindness threads and light beads on fx canvas, departure petals, and thread-hit glow.
Round r5: staggered retireAt to 9 + i * 4.6 s, added integrate exit gate and large-actor retirement exemption to prevent overlapping exits, localized overflow test to steady elements, reduced bead tail to 6 samples, and noted that in drift mode core fires no heart burst on exit, so the petals are the only departure effect.

## Coordinator verification (Fable 5.1)
- Three corrections: spec typing for strict tsc; PEACEMAKERS_ prefix on the top-level const after the featured review found the cross-scene collision, plus a 0.9 px blur cap; sharp threshold below 0.15 px because the core path already writes sub-0.1 px blurs on near actors. typecheck, vitest, build pass; lint at the pre-existing 18; probe clean; Playwright on the production runner 12 of 13, the one failure being the usable spec's legacy fallback journey that fails identically on untouched tv/base under that runner.
- Hygiene sweep clean. Review: Sonnet 5 (high), no material findings; one note (three unused wrapper functions).
