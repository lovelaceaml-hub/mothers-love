---
lane: arrival
title: Section 3, Recognition Arrival depth in the weakest entrances
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-arrival
review: "sonnet-5 high on landing"
depends_on: base-b
updated: 2026-09-11T09:45Z
---
## Files
- public/color-polish/scenes/arrival.js: updated singleTrajectory cases 2 and 5, and groupTrajectory cases 0 and 4 with depth trajectories, camera overshoot, lateral sway, and per-source vertical arcs.
- public/color-polish/scenes/arrival.css: retained initial header comment; no CSS changes required for trajectory math.
- tests/color-polish-scenes/arrival.spec.ts: new Playwright behavior spec driving the sandboxed renderer through the probe harness across 11 waves, verifying entrance cycling order, depth progression, circularity, and capturing midpoint screenshots.
- docs/runs/2026-09-11-tv-scenes/lanes/arrival.md: lane execution record for Section 3.

## Gap report items closed
1. Single 2 (particle aggregation): starts at z = -900 * (1 - q) instead of -150, adds a forward overshoot of +120 * Math.sin(Math.PI * clamp((p - .6) / .4, 0, 1)) before settling to z 0 at p 1; scale and alpha remain unchanged.
2. Single 5 (bloom shell): starts at z = -760 * (1 - q) and 210 px lower (y = ty + 210 * (1 - q)) with lateral sway x = tx + Math.sin(p * Math.PI * 2) * 40 * (1 - q), resolving cleanly to x tx, y ty, and z 0 at p 1.
3. Group 0 (cascading constellation): depth per rank z = (-1450 - rank * 90) * Math.pow(1 - u, 2.5) + Math.sin(Math.PI * u) * 70, with alternating rank-based x offset x = mix(906 + (index % 3 - 1) * 150 + (rank % 2 ? 60 : -60), tx, q), resolving to x tx and z 0 at u 1.
4. Group 4 (ripple of kindness): per-source depth zStart = [-900, -500, -700][index % 3] evaluated as z = zStart * (1 - q) + Math.sin(Math.PI * u) * 190, with per-source vertical arc y = mix(300, ty, q) + Math.sin(Math.PI * u) * (index < 5 ? -65 : 65) * (1 + (index % 3) * .35), resolving to y ty and z 0 at u 1.
5. All trajectories return x target, z 0, k 1, and alpha 1 at p 1 or u 1. Style tables (SINGLE_STYLES, GROUP_STYLES, GROUP_TITLES) and all other styles remain byte-identical.

## Harness
- Spec tests/color-polish-scenes/arrival.spec.ts drives the renderer without requiring backend services:
- Sets up an intercepted route for /probe returning a minimal HTML document hosting a sandboxed iframe with /color-polish/renderer.html.
- Serves all /color-polish/* assets directly from the worktree's public directory via fs.readFile.
- Seeds Math.random with 7301 and sets window.requestAnimationFrame = () => 0 via page.addInitScript for deterministic virtual-clock stepping.
- Bootstraps the renderer MessageChannel protocol using color-polish:bootstrap and posts the baseline snapshot from buildActiveDisplayFixture().
- Pushes eleven arrival waves (one record for the first six, ten for the last five) as delta sync updates with generated event IDs.
- Advances virtual time via window.colorPolishRuntime.step(ms) and verifies:
  1. The eleven waves cycle styles in recorded order: singles 1, 5, 2, 3, 4, 0 followed by groups 2, 4, 3, 1, 0.
  2. The four reworked entrances start deep (minimum z below -450 at 1200 ms) and resolve flat (z 0 within 2, scale 1 within .02, opacity 1 at entrance end plus 100 ms).
  3. Every arriving orb stays circular mid-entrance (width equals height within 1 px, border-radius 50 percent).
  4. Midpoint screenshots (1800 ms singles, 2350 ms groups) are captured to test output for each of the eleven styles.

## Result
All four reworked entrance trajectories are implemented in arrival.js.
The Playwright spec arrival.spec.ts verifies behavior across the full 11-wave sequence.
Ready for coordinator verification and Sonnet 5 landing review.
Round 1: the arrivals harness types its records (strict tsc reported a never-typed array).
Round 2: the arrivals harness uses static Node imports and fileURLToPath for ES module test execution.
Round 3: arrival.spec.ts aligns timing with the 650 ms queue gap, samples resolved flat geometry at entrance completion plus 100 ms, and replaces DOM depth checks with discriminating trajectory evaluations.
Round 4: arrival.spec.ts resolves the public folder via process.cwd() and removes import.meta and fileURLToPath for CommonJS spec execution under Playwright.

## Coordinator verification (Fable 5.1)
- Four spec-only corrections: harness records typed for strict tsc; require replaced by imports; the 650 ms queue gap and the real entrance durations folded into the sample timing and the depth checks moved to direct calls of the trajectory functions (core clamps z at minus 500, so DOM z cannot discriminate); import.meta removed because Playwright transpiles specs to CommonJS. typecheck, vitest, build pass; lint at the pre-existing 18; probe clean with the arrivals sequence unchanged (singles 1,5,2,3,4,0; groups 2,4,3,1,0); Playwright on the production runner 11 of 12, the one failure being the usable spec's legacy fallback journey that fails identically on untouched tv/base under that runner.
- Hygiene sweep clean. Review: Sonnet 5 (high): the four reworked trajectories resolve to the target at p 1 and only those cases changed; two should-fix findings on the spec (timing, discrimination) corrected in round 3; a note that the added depth reaches about minus 553 and minus 467 at p .15 rather than the report's minus 600 figure.
