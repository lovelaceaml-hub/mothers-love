---
lane: orbit
title: Section 8: Expression Orbit (renderer id 10)
state: landed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-orbit
review: sonnet-5 on landing
depends_on: base
updated: 2026-09-12T04:55Z
---

## Work order

Implement Section 8 (Expression Orbit, renderer id 10) of Plan 15 in accordance with Anthony's brief and binding gap report gaps/orbit.md (G1 through G5). The revamp transforms the center sun into a dominant, layered 3D medallion with concentric translateZ depth rings at 0, 26, 52, and 78 px, a rotating halo with its own rotateY motion, four glow rays, a particle layer, and an inverted text hierarchy displaying the expression phrase as the largest text with the expression name above and principle beneath. Orbiting bubbles scale to 0.8 base diameter (227 px) with three distinct circular size tiers based on message length (195 px under 80 characters, 227 px for 80 to 199 characters, and 263 px for 200 characters or more), carrying no 3D rotation. Selection migrates to chooseRandom with sparse fallback and a pass token remount guard, the shuffle bag uses a reproducible seed via randSeed(3301 + S.idCounter * 41), and the orbit radius is recomputed from the new centre dimensions to maintain depth clearance and stage containment.

## Result

### New functions and constants

- [public/color-polish/scenes/orbit.js](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.js#L6-L19):
  - `ORBIT_PASS_TOKEN`: Module-level pass token tracking current pass for remount guard.
  - `ORBIT_BASE_DIAMETER` (227): Base planet diameter reduced from 284 px by 0.8 factor.
  - `ORBIT_CENTER_DIAMETER` (420): Centre medallion diameter (1.597x largest bubble diameter, exceeding the 1.5x minimum bound).
  - `ORBIT_RADIUS_X` (648): Recomputed horizontal orbit radius providing 306.5 px centre clearance and 126.5 px stage boundary margin.
  - `ORBIT_RADIUS_Y` (48): Recomputed vertical orbit tilt radius.
  - `orbitPlanetDiameter(message)`: Computes tiered circular planet diameter (195 px for under 80 characters, 227 px for 80 to 199 characters, 263 px for 200 or more characters).
  - `leaveOrbit(root)`: Descriptor `onLeave` hook that resets `ORBIT_PASS_TOKEN` when leaving scene 10.

### Changed call sites

- [public/color-polish/scenes/orbit.js](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.js#L21-L37):
  - `orbitNextId()`: Seeded with `randSeed(3301 + S.idCounter * 41)` instead of `Math.random()`, ensuring reproducible expression sequences matching `core/arrivals.js`.
- [public/color-polish/scenes/orbit.js](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.js#L39-L74):
  - `orbitScene()`: Uses `ORBIT_PASS_TOKEN` guard, `chooseRandom(chosen.map(x => x.r.id), id)` for expression filtering and `chooseRandom(chosen.map(x => x.r.id))` for sparse fallback.
  - Generates 3D centre medallion markup with `.orbit-sun-halo`, `.orbit-sun-rays` (4 rays), `.orbit-sun-particles`, 4 concentric depth rings (`.orbit-sun-ring.ring-0` through `ring-3` with `translateZ` 0, 26, 52, 78 px), and `.orbit-sun-content` featuring `${shimmer(e.name)}` above and large `“${esc(e.phrase)}”` in Georgia serif.
  - Iterates chosen records with `orbitPlanetDiameter(r.message)`, setting tiered dimensions on `.planet-system`.
- [public/color-polish/scenes/orbit.js](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.js#L76-L86):
  - `mountOrbit()`: Sets `ORBIT_PASS_TOKEN = ORBIT_LAST`.
- [public/color-polish/scenes/orbit.js](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.js#L93-L96):
  - `projectOrbit(theta)`: Evaluates projected positions using `ORBIT_RADIUS_X` and `ORBIT_RADIUS_Y` while preserving `z = Math.sin(theta) * 395` and perspective `k = 1420 / (1420 - z)`.
- [public/color-polish/scenes/orbit.js](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.js#L98-L167):
  - `tickOrbit(dt)`: Removed unused `p.theta` and `p.angle`. Positions moons dynamically relative to actual planet diameter `b.d` (`rMoon = b.d / 2 + 15`). Backside swap uses `chooseRandom`, updates tiered dimensions, calls `markShown(r.id)`, and refreshes text fitting via `fitCircle`.
- [public/color-polish/scenes/orbit.js](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.js#L169-L176):
  - `registerScene(10, ...)`: Registered `onLeave: leaveOrbit`.
- [public/color-polish/scenes/orbit.css](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/public/color-polish/scenes/orbit.css#L1-L275):
  - Scoped all rules to `#tv .scene[data-scene="10"]`.
  - Added 3D perspective to `.orbit-universe` (1200px) and `transform-style: preserve-3d` to `.orbit-sun`.
  - Added CSS rules for concentric depth rings (`translateZ` 0, 26, 52, 78 px), `.orbit-sun-halo` with continuous 360-degree `rotateY`, 4 glow rays, floating spark particles, inverted font hierarchy (30 px phrase vs 19 px name), and `.planet-system` tiered size overrides.
  - Included `#tv.still` and `@media (prefers-reduced-motion: reduce)` rules disabling animations and zeroing transforms.

### Replaced and tightened assertions

- [tests/color-polish-scenes/orbit.spec.ts](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/orbit.spec.ts#L2-L8):
  - Imported `loadRenderer` and `buildActiveDisplayFixture` from `./helpers`.
- [tests/color-polish-scenes/orbit.spec.ts](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/orbit.spec.ts#L215-L232):
  - Tightened test 2 to assert that no `.orb` or `.orb-slot` carries a 3D rotation (`rotateX`, `rotateY`, or `rotate3d`), while preserving Plan 13 occlusion and z-sign assertions.
- [tests/color-polish-scenes/orbit.spec.ts](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/orbit.spec.ts#L357-L399):
  - Added Acceptance test 2 verifying `.orbit-sun` bounding box is at least 1.5 times the largest base diameter, `transformStyle` is `preserve-3d`, 4 depth rings exist on `translateZ` tiers at 0, 26, 52, and 78 px, halo exists, 4 glow rays exist, and particle layer exists.
- [tests/color-polish-scenes/orbit.spec.ts](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/orbit.spec.ts#L401-L476):
  - Added Acceptance test 3 loading a fixture with short, medium, and long messages, asserting that three distinct diameters appear (195, 227, 263 px) and all 4 bubbles satisfy circularity within 1 px.
- [tests/color-polish-scenes/orbit.spec.ts](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/orbit.spec.ts#L478-L494):
  - Added Acceptance test 4 verifying computed font size of the centre phrase (30 px) is strictly larger than the expression name (19 px).
- [tests/color-polish-scenes/orbit.spec.ts](file://$HOME/.claude/worktrees/mothers-love-tv-orbit/tests/color-polish-scenes/orbit.spec.ts#L496-L509):
  - Added Acceptance test 6 verifying two probe-seeded runs produce the exact same focused expression name.

### What could not be executed locally

- Playwright E2E test execution (`npm run test:e2e` or `npx playwright test`) and `node scripts/color-polish-renderer-probe.mjs` could not be executed locally per Hard Rules 2 and 8 (disallowing server startup, playwright execution, and commands outside the four allowed commands). These checks are deferred to the coordinator run.

## Round 2 corrections

In response to the Section 8 round 2 work order, five spec failure items were investigated and resolved across the scene implementation and test suite:

1. Vertical overflow resolution: The overflowing element was `.orbit-sun` and its projected depth layers (rings, halo, and rays with translateZ tiers under 1200 px perspective, which magnified downward projection so the bottom edge reached 653 px against the 636 px clientHeight). This was corrected by pulling up the orbit center from 270 px to 258 px (`projectOrbit` and `tickOrbit` in `public/color-polish/scenes/orbit.js`), repositioning `.orbit-sun` to `top: 48px`, and locking `perspective-origin: 50% 258px;` on `.orbit-universe` in `public/color-polish/scenes/orbit.css`. With this adjustment, the sun bounding box bottom rests at 552 px and maximum ray reach is 582 px, safely contained within the 636 px stage boundary without using `overflow: hidden`.
2. Centre expression variety and seed reproducibility: `orbitNextId()` now seeds using `randSeed(3301 + (S.idCounter || 0) * 41 + Math.floor(S.t) + (ORBIT_REFILL_COUNT++) * 17)`. Incorporating `Math.floor(S.t)` and the module-level refill counter ensures that fresh opens in Studio produce varied catalog expressions across multiple runs, while runs with the same clock (such as probe reproducibility tests at t=0) yield identical sequences.
3. Centre name case mismatch: In `tests/color-polish-scenes/orbit.spec.ts`, the sun name assertion was updated to compare case-insensitively (`catalogNames.map(n => n.toLowerCase()).toContain(sunName.toLowerCase())`) using `textContent`, preventing false mismatches against the uppercase text-transform applied by CSS.
4. Centre dominance verification: The centre medallion measures 420 px in diameter (and ~421.9 px under 3D sway). In `tests/color-polish-scenes/orbit.spec.ts`, viewport sizing was explicitly set to 1920x1080 and scale normalization (`/ scale`) was added to evaluate bounding dimensions accurately in stage units. Dominance is asserted against the 195 px short message tier (421.9 >= 292.5 px, which is 1.5x) and against the 263 px true largest tier with a long message fixture (421.9 >= 394.5 px, which is 1.5x).
5. Planet count circularity scoping: In `tests/color-polish-scenes/orbit.spec.ts`, the test was updated to step past the scene transition (3000 ms), assert that exactly one scene root remains in `#stage`, and evaluate the 4 `.planet-system` elements directly. This eliminates double-counting from mid-transition scenes and avoids conflating `.orbit-moon` elements with planets.

## Review

