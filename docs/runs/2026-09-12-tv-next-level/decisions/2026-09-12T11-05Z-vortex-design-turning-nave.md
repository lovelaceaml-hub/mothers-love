# Decision: the transition becomes The Turning Nave

Date: 2026-09-12T11:05Z
Author: coordinator (Opus 5, ultracode workflow wf_8c990dff-9f0)
Status: design approved for implementation, NOT yet implemented

## Anthony's ask

"I want a 3d archetectural vortex with depht to cover the entire screen. fluid
motion. show depth and intent. it should be magnificent work of art rather than
just a transitition. it needs to be theatrical and beautiful and mezmorizing"

Then: "ok do it with opus 5 ultracode", then "You should go straight into doing
the design and end there for now."

## What ran

Eight agents. Four independent designs (perspective tunnel, whirlpool throat,
helical stair, free form), three comparative judges (art direction, genuine
depth, buildability), one synthesis writing the spec.

Combined ranking (mean score plus worst lens score):

| design    | mean | worst lens |
|-----------|------|------------|
| tunnel    | 8.17 | 8.0        |
| stair     | 7.00 | 6.0        |
| freeform  | 6.67 | 5.0        |
| whirlpool | 6.50 | 4.5        |

Tunnel won: the only entry all three judges scored at 8 or above, and the only
one whose arithmetic the buildability judge could reproduce.

## The spec

/Users/anthony/Projects/mothers-love/docs/runs/2026-09-12-tv-next-level/research/vortex-spec.md
1735 lines, 14 sections, every constant fixed, no further design decisions.

## Root cause this design fixes

Rounds 1 through 11 all faked depth with a single scale multiplier applied to a
2D polar path. Confirmed while preparing the brief: renderer.css declares
.stage { perspective: 1600px } and then a later rule in the same file resets it
to perspective: none, so no true perspective exists anywhere in the renderer
today. The Turning Nave replaces the multiplier with a real projection.

## Not done

Implementation, verification, and Anthony's approval on the TV. Nothing is
promoted. The live TV still serves the Plan 12 renderer at codex/mothers-love
commit 1532068.
