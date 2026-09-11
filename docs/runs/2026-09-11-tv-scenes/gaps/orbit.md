# Gap report: Expression Orbit (Section 10, renderer id 10, slug orbit)

Written by Fable 5.1 on September 10, 2026 (Plan 13, sitting four). Approval: Anthony's "continue until the end" ruling.

## Prompt asks
1. Solar system: expression is the sun, recognitions are planets on coordinated 3D orbits (in front, around, behind, back to front), expression icons are moons linked to their planet.
2. Real depth: scale, opacity, blur, z-depth, slight speed change by orbit position; objects visibly pass behind others; shadows and lighting.
3. Coordinated motion only, no independent drift. Slow the whole system slightly. About 30 seconds.

## Prototype v6 2 does
- A flat 2D orbit of fixed bubbles around the sun with no depth and no moons.

## Live does (measured over 30 seconds)
- Four planets, phases a quarter turn apart, `projectOrbit`: z is plus or minus 395, perspective k from 0.78 (behind) to 1.38 (in front); z-index 10000 plus z against the sun's 10000, so planets pass behind the sun (occlusion is live and visible: the far planet is drawn under the sun). Opacity .78 at the back. Two moons per planet orbit it with their own perspective (k from 600 over 600 minus z) and flip z-index in front of and behind the planet. Two elliptical guide rings on a canvas. Asks 1 and 3 are live.
- Blur behind is `(minus z minus 120) over 1000`, so at most 0.27 px: invisible. No shadow. Speed .102 rad per second (a full orbit in 62 s), so a 30 second dwell shows half an orbit. Slight speed change by position is absent (constant angular rate, though perspective makes the front pass look faster).
- A planet swaps its recognition at the back of the orbit (`lastSwap` 24 s, z below minus 330).

## Gap
Ask 2's blur, shadow and lighting; the "slow down slightly" ask. The plan's Section 10 "occlusion by z-index" and "moons already orbit" are already live.

## Decision (recommended)
Lane scope, scenes/orbit.js and scenes/orbit.css:
1. Speed: angular rate .102 to .082 (a full orbit in 77 s; the front pass still completes inside a 30 second dwell). Moons keep their relative rates.
2. Depth: blur behind becomes `(minus z minus 100) over 160` capped at 1.8 px (invisible in front, clearly soft at the back); opacity at the back .72; a drop shadow that grows with k (`drop-shadow(0 ${6*k}px ${10*k}px #5C659240)`) so the front planet sits above the scene; the far planet's scale floor stays .78. A sun glow stays as shipped.
3. Lighting: in orbit.css, scoped `#tv .scene[data-scene="10"]`, a soft radial highlight on `.planet-system .orb` pseudo-element keyed to the sun's side (a fixed 30 percent left, 20 percent top highlight, white at 35 percent alpha) so planets read as lit by the sun; no new hue.
4. Coordinated motion only; the moons keep their planet link; the swap at the back stays.

## Testable acceptance
1. Common scene spec.
2. Over 30 seconds (samples every 5 s) visualState `orbit` z values span both signs, at least one planet's z-index is below the sun's (10000) at some sample and above it at another (passes behind), and the angular advance between samples matches .082 rad per second within 5 percent.
3. At the sample where a planet is farthest back its computed filter has blur at least 1.2 px and its opacity at most .75; at the sample where a planet is nearest, blur is none and its drop-shadow is present.
4. Every `.planet-system .orb-slot` stays circular at 300, 6000 and 14000 ms.
5. Screenshots at 1920 and 3840 at 0, 6000 and 14000 ms into logs/orbit/.

## Risk
Low. All numbers live in the scene's own tick; the shadow and blur are per-element filters, which on a 4K TV cost some GPU but only four planets carry them.
