# 2026-09-18T19:50Z L3 review round 1 findings sent back

# L3 landing review, round 1 (Claude Opus 5 high, read-only), 2026-09-18 about 19:52Z

Findings (full text in the coordinator transcript; summary here):
1. Major: Peacemakers (scene 8) never sets replaceMode, so bubbles never drift out and rotate; production retires them (renderer.js 337-339). Reproduced with the probe at 21 s.
2. Major: core rightBubbles always draws four bubbles and reorders by slot size; production shows a single 586 px reader bubble when any chosen record fails smallFits (renderer.js 159-164). Affects real messages over 160 characters on scenes 8 and 9.
3. Minor: different message sets across captures come from shared core history, not this lane; bubble-over-globe overlap is within production's keep-out rules and persisted only because of finding 1.
4. Minor: click-does-not-advance test cannot fail under sample source; no specs cover drift replacement, hearts replacement, keep-out or long-message layout.
Checked and matching: markup strings, 14 ambient hearts and heart timing, keep-out boxes, burst kind, arch opacity, mount order, renderer.css byte-identical to production, no dashes, fictional fixtures.

Disposition: all four accepted; sent to the L3 writer as correction round 1 at about 19:53Z.
