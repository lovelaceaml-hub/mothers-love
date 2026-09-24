# Anthony: nine corrections before the Section 12 promotion

Recorded: 2026-09-11T17:10Z by the coordinator (Fable 5.1). Source: Anthony's message opening the Section 12 chat, sent instead of the TV check approval that Section 12's gate expected. The gate is therefore unmet; a correction sitting runs on the scene branches first, tv/pick is rebuilt, and the TV check follows.

## Anthony's corrections, verbatim intent
1. Peace in Practice: the rotating heart is not fully dimensional; it must be completely 3D and dynamic.
2. Expression Orbit: it only ever shows the Greeting expression; it must rotate randomly through the different expressions, one per pass.
3. Milestone: the left copy ("Every kind word helped us get here", "Expressions of Mother's Love, recognized together", the month line, "Every expression matters") is removed.
4. Milestone: the growing campaign and weekly goal panel extends all the way to the left so that space is bigger.
5. Welcome (The Words of Mother's Love, a living campaign of appreciation): multiple recognition bubbles coming in, floating out and spinning, with very animated and dimensional effects.
6. Featured Recognition: it only ever shows Greeting; it must rotate through all nine expressions.
7. Featured Recognition: the expression panel (the greeting phrase section) must be very dynamic and dimensional, a high, complex design that stands out.
8. Recognition Calendar: some animation, design left to the coordinator.
9. We Are Peacemakers: multiple recognitions, dynamic, more effects.

## Root cause for 2 and 6
core/state.js sets S.featured from insights.goal.expressionId, the weekly goal, which is Greeting (id 1) this week. Both scenes read S.featured, so both show Greeting for the whole week by design of Plan 10. The fix is scene-local: each scene keeps its own shuffled bag of the nine expressions and never reads S.featured. No core change.

## Coordinator rulings inside Anthony's request
- Spinning bubbles: the plan's cross-cutting rule "circular bubbles at all times" is Anthony's own and the scene specs measure the bounding box, so no rotateX or rotateY is applied to any bubble. Spin is a Z rotation (the bubble rolls in and out like a ball, the ring and sheen spin in steady state), and dimensionality comes from depth layers, shadows, trails and parallax.
- Featured cadence: a new expression on every pass from a shuffle bag, plus a second expression at 15 s inside the 30 s pass with a 3D flip, so two expressions show per pass and all nine appear within five passes. Bubbles follow the panel in a staggered wave.
- Orbit cadence: one expression per pass, random from a shuffle bag, never the same twice in a row.
- Milestone: the rail grows to about 560 px wide from the left edge; the helix stream moves right and stays at least 14 nodes dense.
- Calendar animation: a continuous lantern wave across past days, a breathing Today ring, gold sparkles rising from days that have counts, a slow light sweep, and a cycling highlight through the nine expression rows.
- Writer stays Gemini 3.8 Flash (High) through agy per the plan; corrections run as rounds on the existing scene branches (welcome r3, featured r2, calendar r2, peacemakers r4, peace-in-practice r4, orbit r2, milestone r5). Sonnet 5 (high) reviews each diff; one Opus 5 confirmation pass on the rebuilt tv/pick; then the TV check, which stays Anthony's.
