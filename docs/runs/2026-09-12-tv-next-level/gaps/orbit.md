# Gap report: Section 8, Expression Orbit (renderer id 10)

Coordinator (Opus 5 high), 2026-09-11, from tv/pick 463ce8d.

## Anthony's note (quoted)

"The expression that's in the middle, that design needs to be more dominant and designed in a more detailed and 3D way. It needs to be impressive to look at. The orbiting recognitions should be slightly smaller. They can also be different sizes based on the length of the recognition."

Binding ruling: decision 13 (a layered 3D medallion with concentric depth rings, a rotating halo, glow rays, particles and the phrase large; planets at 0.8 scale, three size tiers by message length).

## What tv/pick 463ce8d does

- scenes/orbit.js, 84 lines. `ORBIT_BAG` and `ORBIT_LAST` are prefixed module-level `let`s (lines 4 and 5). `orbitNextId()` is the nine-expression bag, but it seeds from `Math.random()`, not from `randSeed`, so it is not reproducible under the probe's fixed seed.
- `orbitScene()` (line 25) picks four records through `choose(exclude, id)` for the focused expression, then backfills with unfiltered `choose()` when fewer than four carry it. That sparse fallback already exists and must be preserved.
- The centre is `.orbit-sun`: `medallion(id)`, an h2 with the expression name, a p with the phrase in quotes, and `.sun-principle`. The phrase is currently smaller than the name.
- Each orbiting record is `<div class="planet-system" data-planet="i">` wrapping `addOrb(r, 0, 0, 284, {expression, motion:false})` plus one `.orbit-moon` per expression id.
- There is an `#orbit-lines` canvas at 1812 by 552. Plan 13 noted `p.theta` and `p.angle` are computed and never used.

## Gaps and decisions

### G1. "Dominant" needed a number, and it must match Section 3.
**Decision.** The centre's rendered bounding box is at least 1.5 times the diameter of the largest orbiting bubble, the same test Section 3's panel uses. Build it as a layered 3D medallion: `transform-style: preserve-3d` on the centre, concentric depth rings on `translateZ` tiers at 0, 26, 52 and 78 px, a halo element with its own slow `rotateY`, four glow rays, and one particle layer. **The phrase becomes the largest text in the centre**, with the expression name above it as a smaller line and the principle beneath, inverting today's hierarchy.

### G2. Planet sizes and tiers.
**Decision.** Base diameter drops from 284 to 227 (284 times 0.8). Three tiers by message length: under 80 characters renders at 0.86 of the base (195 px), 80 to 199 at 1.0 (227 px), 200 and over at 1.16 (263 px). Every tier stays perfectly circular and carries no 3D rotation; only the centre and its rings do.

### G3. The bag is not reproducible.
**Decision.** Replace `Math.random()` in `orbitNextId()` with `randSeed(3301 + S.idCounter * 41)`, matching the pattern `nextStyle` uses in core/arrivals.js, so the probe's fixed seed gives the same expression sequence twice. This is a Plan 15 correctness fix, not scope creep: acceptance for the whole run depends on reproducible probe output.

### G4. Records.
**Decision.** `chooseRandom(exclude, id)` for the filtered picks and `chooseRandom(exclude)` for the backfill, keeping the existing sparse-fallback shape. Remove the unused `p.theta` and `p.angle`. Keep Plan 13's shuffle bag behavior and its remount guard, using the pass token from follow-up 2.

## Testable acceptance

1. The common scene spec.
2. The centre element's bounding box is at least 1.5 times the largest orbiting bubble's diameter.
3. Three distinct orbiting bubble diameters appear with a fixture holding a short, a medium and a long message, and every one is circular within one pixel.
4. The phrase's computed font size in the centre is larger than the expression name's.
5. Plan 13's occlusion and z-sign assertions still pass; no `.orb` carries a 3D rotation.
6. Two probe runs with the same seed produce the same focused expression.

## Risk

- Raising the centre's size while shrinking the planets could push a 263 px large-tier bubble into the centre's box. The lane must recompute the orbit radius from the new centre size rather than keeping today's radius, and the occlusion assertion is what catches it if it does not.
