# L1 landing review, round 1 (Claude Opus 5 high), 2026-09-18 about 20:45Z: failed

1. Blocking: Welcome pages messages base showed whole and bubbles shrank (fixture-0 84 chars: base 224 px 2 pages, after 210 px 16 pages). Causes: fixed tiers 250/210 with growMax = d for smallFits records; welcomeGrowMax neighbour test caps growth wrongly (should be x<ox+od && y<oy+od); long records not sorted by need; welcome.css max-width 58% wraps .thanks and page indicator; new corner position [1592,26,210].
2. Blocking: pagination does not meet decisions 2 and 10; Orbit planets never grow. The blocking rule .planet-system .orb-slot{width:100%!important} is orbit.css:271 (inside the lane allowlist); sizes set in orbit.js 88-89 and 187-195; spec pins [195,227,263]. A 500 grapheme message needs about a 420 to 460 px circle; layout rule needed (asked Anthony).
3. Major: textFits cannot fail on paging or the 18 px floor, checks the viewport not the .scene box, pearls not checked against the panel; Orbit centre test lacks a margin threshold and covers 5 of 9 ids.
4. Major: garden.spec.ts:176 failure is caused by this lane (writer's baseline kept the lane's welcome.css).
5. Major: Goal tribute fade leaves pearls translucent most of the time (ghosted overlapping text) and still crosses the bottom edge (224 samples above 0.1 opacity past the panel).
Confirmed fine: font-ready re-measure present and tested; Orbit centre fixed (margin at least 20 px for all nine ids); scoped CSS; no dashes; header, rail, QR untouched.

Anthony ruling on long messages (about 20:47Z): "Pages, long only": short and normal messages always show whole in a bubble grown to fit; only a message too long to fit even the largest bubble the layout allows may flip pages, with as few pages as possible.
Disposition: all findings accepted; per Anthony's escalation rule, L1 corrections go to a fresh Claude Opus 5 writer.
