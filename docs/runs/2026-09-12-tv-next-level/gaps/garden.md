# Gap report: Section 2, Recognition Garden (renderer id 2)

Coordinator (Opus 5 high), 2026-09-11, from tv/pick 463ce8d.

## Anthony's note (quoted)

"It seems good to me, but if possible, instead of there being multiple pages of a longer message, if it can fit, either the text being smaller or the bubble being bigger, whichever works best for viewing, should take place for those types of bubbles."

Binding ruling: decision 8 (grow the slot first, then shrink text to an 18 px floor at 1920, 36 px at 3840; pagination remains only when a message still overflows at the floor; messages are never truncated).

## What tv/pick 463ce8d does

- scenes/garden.js, 291 lines. This is the scene Anthony said is already good, so the visual design does not change.
- Its five bubbles and `gardenReplace` currently draw through `choose()`.
- garden.spec.ts carries its own copy of the direct-renderer harness (around lines 90 to 159), duplicated from arrival.spec.ts. Section A moved that harness into `loadRenderer` in helpers.ts; this lane is the one that switches garden.spec.ts over to it.
- Scene 2's dwell is 180 seconds, the longest in the playlist, so this is the scene where a paginated message is most visible and most annoying.

## Gaps and decisions

### G1. "Whichever works best for viewing" was the delegation; decision 8 answered it.
**Decision.** Grow the slot first, shrink the text second, paginate only as a last resort. Nothing else in the scene changes. Route the five bubbles and `gardenReplace` through Section A's `drawSlots` with this scene's own positions and a `readerBounds` that keeps every grown slot inside the scene and clear of the other slots (Section A's round 2 caps growth by the other positions' geometry, so this lane passes the bounds and inherits the no-overlap guarantee rather than reimplementing it).

### G2. How far "no pagination" must reach.
**Decision.** The testable bar is **no page indicator for any message up to 320 characters at 1920**, which the plan already names. Beyond 320 characters, pagination is allowed and correct; the 500-character server limit means the worst case is two pages, and the `verbatim` log assertion proves nothing was lost.

### G3. Records.
**Decision.** `chooseRandom` for the five bubbles and for `gardenReplace`, per decision 1. Everything else stays as Plan 13 shipped: the petals, the flowers, the drift and the replacement cadence are all untouched.

### G4. The spec switch.
**Decision.** garden.spec.ts drops its local harness and imports `loadRenderer` from helpers.ts. The assertions themselves do not change, so a diff that alters any existing garden assertion is out of scope for this lane.

## Testable acceptance

1. The common scene spec.
2. With the mostly-long fixture, no `.orb-page-indicator` is visible for any message up to 320 characters at 1920.
3. Every grown slot stays circular within one pixel, stays inside the scene root, and does not intersect another slot's rect.
4. Plan 13's petal and flower assertions still pass, unchanged.
5. garden.spec.ts runs through `loadRenderer` and its existing assertions all pass.
6. A 500-character message paginates at most twice and the `circular_pagination` log reports `verbatim: true`.

## Risk

- This is the lowest-risk scene lane in the plan and the right one to run last. Its only real hazard is a writer "improving" the garden visuals Anthony already approved; the order must say plainly that any visual change here is a defect.
