# V6 real TV migration

This branch turns the approved V6 standalone prototype into the real `/display` experience without replacing the existing display backend, recognition safety rules, queue semantics, snapshot polling, reactions, chimes, or coordinator.

## Source of truth

- Visual target: `Mothers_Love_TV_Prototype_v6.html` from the September 10 design review.
- Production data/runtime target: the existing `DisplayExperience`, `DisplaySnapshot`, and display coordinator.
- Production `/display` remains unchanged until the V6 staging route reaches parity.
- Staging route during migration: `/display-v6`.

## Required scene order and target dwell

1. Welcome — 30 seconds
2. Recognition Garden — 180 seconds
3. Featured Recognition — 30 seconds
4. Calendar — 30 seconds
5. We Are Peacemakers — 60 seconds
6. Status — 30 seconds
7. Nine Expressions — 30 seconds
8. Peace in Practice — 60 seconds
9. Expression Orbit — 30 seconds
10. Milestone & Weekly Goal — 30 seconds

Arrivals interrupt the ordinary rotation. Individual recognition arrivals use approximately 8 seconds of reading time after landing. Ten-recognition group releases use approximately 30 seconds after the entrance choreography settles.

## Migration rules

1. Keep the current API and coordinator as the authority for eligible recognition content.
2. Never resurrect expired, hidden, invalid, or unauthorized recognition text for a visual effect.
3. Preserve original submission/publication timestamps already supplied by the production snapshot.
4. Recognition display surfaces must remain circular through entrance, motion, resize, transition, and exit.
5. Long-message handling must preserve complete recognition text; do not solve fit by converting the recognition into a rectangular card.
6. Do not reset all recognitions simultaneously in the living scenes. Replacement is staggered and continuous.
7. Do not duplicate a real recognition merely to fill a visual density target.
8. The live feed and recognition QR remain persistent across ordinary scene changes and arrivals unless a safety/offline mode intentionally hides personal content.
9. Motion settings and `prefers-reduced-motion` remain respected.
10. The V6 visual migration must not add or change recognition counts simply because an animation replays.

## Scene implementation sequence

### Phase 1 — safe staging shell

- [x] Create `feature/v6-real-tv-integration` from `codex/mothers-love`.
- [x] Add `/display-v6` using the existing real `DisplayExperience`.
- [x] Begin the cream / rose / sage / violet / gold V6 visual skin.
- [x] Force existing recognition-card surfaces toward the V6 circular visual language on the staging route.
- [ ] Verify a branch preview build before touching `/display`.

### Phase 2 — shared V6 primitives

Create reusable production components rather than copying one-off prototype markup:

- `V6RecognitionBubble`
- `V6LiveFeed`
- `V6DisplayHeader`
- `V6SceneFrame`
- independent floating-bubble motion hook
- circular long-message pagination/fitting helper
- depth projection helper
- particle/petal layer

These components must consume real `Recognition` objects and existing reaction data.

### Phase 3 — living scenes

Port in this order because the motion system can be reused:

1. Welcome
2. Recognition Garden
3. Featured Recognition
4. We Are Peacemakers
5. Peace in Practice

Garden acceptance requirements:

- exactly 5 active recognition bubbles maximum
- ~7 seconds between replacement events after initial reading time
- independent movement state per bubble
- sprout/growth entrance connected visually to the garden
- burst to petals on exit
- a lasting plant/flower grows as a result of the recognition
- garden flora remains subtly animated

### Phase 4 — information scenes

- Calendar: recognition count centered and dominant, day number small in a corner, original submission-date grouping.
- Status: retain all existing production totals while introducing independently timed icon and environmental movement.
- Nine Expressions: preserve canonical phrases and principles and fit all text without overflow.

### Phase 5 — specialized 3D scenes

- Expression Orbit: featured expression is the sun; recognition bubbles are planets; expression icons are linked moons. Use coordinated perspective, occlusion, scale, blur, and z-depth rather than random drift.
- Milestone & Weekly Goal: new smaller-bubble upward helical/swarm current on the right with strong foreground/background depth. Compact milestone/goal information remains readable beside the stream.

### Phase 6 — arrivals

Individual: at least 5 substantially different 3D entrance systems.

Group of ten: at least 5 choreographed sequences. Ten bubbles must not simply appear at once.

Every entrance must resolve to the normal circular production recognition bubble.

### Phase 7 — production cutover

Only after staging QA:

- point `/display` to the V6 composition
- keep a temporary rollback route/component for the previous display
- run real branch-preview tests for queueing, reconnect, quiet/neutral mode, removal, resize, long messages, and scene timing
- deploy deliberately; do not merge solely because the visual branch exists

## Current branch status

The first commit deliberately does **not** fork the display data layer. `/display-v6` mounts the existing real `DisplayExperience`, so backend behavior is already shared. The next implementation step is to extract the recognition bubble and persistent footer into V6 production primitives, then replace the staging route's Garden and Welcome renderers first.
