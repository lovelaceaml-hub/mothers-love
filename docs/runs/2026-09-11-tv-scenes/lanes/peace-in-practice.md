---
lane: peace-in-practice
title: Section 9, Peace in Practice richer pop and depth
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-peace-in-practice
review: "sonnet-5 high on landing"
depends_on: base-b
updated: 2026-09-11T09:19Z
---
## Files
- public/color-polish/scenes/peace-in-practice.js: Implemented depth layering recipe (far, mid, near layers with scale, blur, pace, z-index), richer pop onRetire hook pushing 12 peace and 8 glow particles, canvas dataset synchronization, and custom canvas draw method.
- public/color-polish/scenes/peace-in-practice.css: Preserved existing header comment only; no extra CSS rules required.
- tests/color-polish-scenes/peace-in-practice.spec.ts: Playwright test suite verifying circularity, overflow, studio click handling, bubble burst into peace signs and glow, depth layering spread, circularity through swell and burst, and reduced motion still mode.
- docs/runs/2026-09-11-tv-scenes/lanes/peace-in-practice.md: Lane execution and verification record.

## Gap report items closed
1. Depth layering:
   - Added LAYERS constants with far (scale 0.85, blur 0.8px, pace 0.75, z 40), mid (scale 0.93, blur 0.3px, pace 0.9, z 60), and near (scale 1.0, blur 0, pace 1.1, z 80).
   - In mount(root), assigned layers to actors: actor 0 is far, actor 1 is mid, actor 2 is near, and actor 3 is near (fourth actor near rule). Scaled actor pace accordingly and set data-depth on slot elements.
   - Implemented place(a) reproducing default write with layer scale, opacity, z-index, and blur filter, while synchronizing slot position and phase.
   - Implemented integrate(a, dt) returning false to let default physics execute.
2. Richer pop:
   - Registered onRetire(a) hook called by core motion at the burst moment after the hearts burst.
   - Pushes 12 peace particles (radius 7 to 11, colors #E8C777 and #EABB89, speed 30 to 110 px/s, vy biased by -40) and 8 glow particles (radius 9 to 16, color #FFF4BA, radial gradient 55 percent alpha to transparent) into scene-owned V.peaceFx array, capped at 80 particles.
3. Custom scene canvas draw:
   - Registered draw(dt) hook running on the .scene-fx canvas after drawSceneFX.
   - Drops expired particles where age exceeds life.
   - Sets canvas.dataset.peaceFx to current V.peaceFx length each frame for inspection and testing.
   - Draws peace symbols as radius r circles with 3 inner lines (center to bottom vertical, and two lower lines angled 60 degrees from vertical) rotating slowly with age, and glow particles as radial gradient dots.
   - Handled prime(dt) to initialize canvas.dataset.peaceFx to 0 immediately upon scene mount.
4. Preserved invariants:
   - Four bubbles, replaceMode hearts, 14 floating background hearts, and the central sculpted rotating heart preserved exactly.

## Draw order
1. tickSlots orchestrates rendering in order: renderFloaters(), drawSceneFX(dt), and then descriptor draw(dt).
2. Core drawSceneFX clears V.canvas, purges expired core particles, and draws the expanding gold ring and 44 hearts particles from burstAt.
3. The scene draw(dt) method executes immediately afterward on the same canvas context without clearing, layering peace symbols and glow dots directly over the core hearts burst.
4. Calling draw(0) is idempotent because particle positions, rotations, and opacities are derived directly from elapsed age (V.clock - p.start) without state advancement.

## Result
All Section 9 requirements and tests implemented:
- Circular bubbles and no overflow verified at 14s.
- Bubble burst sequence verified within 60s: bubble_burst log observed, .scene-fx canvas data-peace-fx count above 0, visualState fx above 0, and subsequent particle expiration confirmed two samples later.
- Two depth layers confirmed with distinct data-depth attributes, one actor blurred above 0.3px and one sharp.
- Circularity confirmed across 300, 6000, 14000, 17500, and 20000 ms checkpoints through swell and burst.
- Reduced motion still mode verified.
- The coordinator executes typecheck, lint, test, build, and the probe verification suite.
- Round r1: top-level identifiers renamed with the PIP_ prefix to avoid cross-scene collisions in the shared global scope; blur capped at 0.9 px.
- Round 2: the spec types the visualState actors (strict tsc had two implicit any errors).
- Round r3: updated the depth-layer test sharp condition to blur below 0.15 px to accommodate screenScale breathing, and adjusted the overflow assertion to exclude the pre-existing background heart field overhang.
- Round r4: replaced the flat heart image with a real lit 3D heart mesh on canvas, featuring Lambert and Blinn specular shading, 12 orbiting 3D glints, elliptical contact shadow, and updated scene spec tests.
- Round r5: phase-independent full-canvas shading test requiring shadow, base, and highlight each above 200 px with at least 40 percent non-highlight, precomputed 32-bucket color and blend table, removed unused vertex rotation arrays, 1.5 to 3 px spark sizes, and 2 s step interval for the burst test.

## Coordinator verification (Fable 5.1)
- Three corrections: PIP_ prefix on the top-level const plus a 0.9 px blur cap (cross-scene collision found by the featured review); spec typing for strict tsc; sharp threshold below 0.15 px and the overflow measure excluding the pre-existing heart field (its lowest heart reaches about 646 px and predates this lane). typecheck, vitest, build pass; lint at the pre-existing 18; probe clean; Playwright on the production runner 12 of 13, the one failure being the usable spec's legacy fallback journey that fails identically on untouched tv/base under that runner.
- Hygiene sweep clean. Review: Sonnet 5 (high): no code findings; the evidence should-fix is closed by this run; notes: the shared recipe skips the far tier when a large reader orb occupies index 0 or 1 (cosmetic, shared by the sibling lanes), and an unused hex-to-rgba helper.
