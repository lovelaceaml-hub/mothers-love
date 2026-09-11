# Gap report: Recognition Arrival (Section 3, renderer id 3, slug arrival)

Written by Fable 5.1 on September 10, 2026 (Plan 13, sitting four). Approval: Anthony's "continue until the end" ruling.

## Prompt asks
1. At least five substantially different single-arrival entrances (depth, trails, particles, bounce, forming from particles, spiral, camera overshoot), rotated so repeats do not feel the same.
2. At least five choreographed group reveals for ten queued recognitions (staggered, alternating sides, waves, cascading depth, spiral, bursts, clusters at depth), fast enough to feel exciting.
3. Strong 3D perspective, particles, lighting, glow, trails, coordinated motion; never a square; always resolving into the normal circular bubble.

## Prototype v6 2 does
- A single fade-and-scale arrival.

## Live does (read from scenes/arrival.js and core/arrivals.js; the probe's arrivals run confirms six single and five group styles cycle)
- Singles: 0 portal approach with overshoot and seven projected rings; 1 comet flight with a ribbon trail; 2 particle aggregation (115 converging glowing dots) with a scale-up; 3 pearl drop with two rebounds and floor rings; 4 corkscrew through depth with a ribbon; 5 bloom shell (seven petals open) with a rise. Perspective 1300 over 1300 minus z. Ask 1 is live.
- Groups: 0 cascading depth in a ranked order; 1 two tides from alternating sides with ribbons; 2 spiral constellation with ribbons; 3 petal fountains from three sources with ribbons and petal particles; 4 ripple of kindness with rings from three sources. Delays per rank keep each reveal under 4.7 s. Ask 2 is live.
- Every style resolves to the same circular `event-orb`; core positions them with translate and scale only. Ask 3's particles, trails, glow and perspective exist per style (core draws them keyed to the style index).
- The two weakest singles: 2 (its bubble only scales from .68 to 1 at a shallow z of minus 150 while the dots converge) and 5 (rises 160 px from a shallow z of minus 290). The two weakest groups: 0 (all ten follow the same depth curve, differing only by delay) and 4 (a straight approach from three sources with rings, little depth).

## Gap
Depth in the weakest two singles and two groups. Everything else the plan's Section 3 asks is live, including the counts and the particle vocabulary, which lives in core and stays as is.

## Decision (recommended)
Lane scope, scenes/arrival.js trajectories only (the style tables and counts unchanged; core particles untouched):
1. Single 2: start at z minus 900 (so the perspective makes the forming shell tiny and distant) and settle through a brief forward overshoot of plus 120 at p .8 before z 0; scale unchanged.
2. Single 5: start at z minus 760 and 210 px lower, with a gentle lateral sway, so the pearl rises out of depth rather than just upward.
3. Group 0: cascade depth per rank (z start minus 1450 minus rank times 90, so the last arrivals come from farther) with a small alternating x offset by rank (plus or minus 60) so the wave reads as a staggered column, not a line.
4. Group 4: give the three sources different depths (z start minus 900, minus 500, minus 700 by source) and a per-source vertical arc so the ripple has layers.
5. Every trajectory still returns to x equal to the slot target, z 0, k 1 and alpha 1 at p 1, so the resolve into the normal circle is unchanged.

## Testable acceptance
1. Common scene spec (an arrival needs the queue, so the spec drives the renderer the way scripts/color-polish-renderer-probe.mjs does: a probe page with the renderer in a sandboxed iframe, a MessageChannel bootstrap, and delta snapshots carrying `arrivals`; copy that harness into the spec, since the script itself is protected).
2. The single style sequence still cycles six distinct styles and the group sequence five, in the same order the probe's arrivals run records (singles 1,5,2,3,4,0 then groups 2,4,3,1,0).
3. For singles 2 and 5 and groups 0 and 4, the trajectory at p .15 has z below minus 600 (proves the added depth) and at p 1 has z 0 and k 1.
4. Every `.event-orb` has width equal to height within 1 px and border-radius 50 percent at p .5 of each of the eleven waves.
5. One screenshot per style at its entrance midpoint (p .5) into logs/arrival/, taken by the spec (test-results output copied by the coordinator).

## Risk
Low. Pure trajectory math in one file; the probe's arrivals assertions (6 and 5 styles) guard the counts.
