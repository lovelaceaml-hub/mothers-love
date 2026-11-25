# L6 review: Expression Orbit (single Fable 5.1 review, reviewer corrects)

Reviewed: branch tv17/orbit-goal, writer commit 421d6ee on 71bf3f8, worktree $HOME/.claude/worktrees/mothers-love-tv17-orbit-goal.
Final commit after review: 07bddcb.
Plan goal line checked against: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV ...". Nothing in this lane contradicts it.

## Verdict

Pass with one correction made by the reviewer (finding 1). No second round.

## Findings

1. Major, corrected. A 500 grapheme message drew a 501 px planet, wider than the 480 px gold centre, and with the writer's chooser any long message could be picked at random even with plenty of short ones in the pool (the old chooser put two long planets on screen at once with the mostly-long fixture). That defeats "smaller". Corrected per the coordinator's direction, see "What changed".
2. Minor, accepted. The medallion ring is nearly circular (tilt 0.94) around the rim. Its far half is tucked only about 14 px behind the top rim, so "behind" is mostly a layer change, not a long disappearance. This matches the order's "prefer a path around the rim" and keeps the medallions off the words. No change.
3. Minor, accepted. The back pass is drawn at 221 px against 214 px before (the 18 px floor sets it). All of the reduction is on the near pass: peak 394 px down to 287 px on the sample pool. Visible in the captures; no change.
4. Note. The writer's dwell test (30 and 60 seconds) also passes on 71bf3f8. It is a holding test, as the writer said. Legitimate.
5. Note. The writer's claim that every new size and medallion assertion fails on 71bf3f8 was not rerun by me; I read the assertions and each compares DOM readings against fixed numbers, so each can fail. My own two new tests were checked to fail against the writer's orbit.js (results below).

## Checks against the brief

- Bubbles clearly smaller, gold centre dominant: yes. I looked at before (L1/after3/w1920-ms6000/orbit.png) and after at 1920 and 3840 (ms 6000, 14000, 21000). Near planets are about 270 to 290 px against the 480 px centre, before about 390 px.
- Every message whole, 18 px drawn floor (36 at 3840), no truncation or ellipsis: holds, asserted at both widths by the existing mostly-long, long-only, medium and new tests.
- Medallions revolve around the bubble, in front on the near half, never over the name or message: holds. Ring radius is d/2 + 26 px plus the 21.5 px medallion radius, the bubble stays on layer 2 between medallion layers 1 and 4, including data-long bubbles. In the captures the medallions sit outside the rim.
- Lively for a full 60 second showing, dwell read from state: holds (writer test 5, plus my two tests run 60 and 90 seconds with far-side replacements).
- Reduced motion: existing test "reduced motion renders the orbit still" passes; a still medallion sits on the ring outside the rim.
- Opaque planets clear of the title: existing full-orbit test passes; the clamp now uses the medallion ring reach as well.
- Allowlist: only orbit.js, orbit.css, tests/color-polish-scenes/orbit.spec.ts changed across both commits. milestone.js, milestone.css, milestone.spec.ts identical to 71bf3f8 (git diff empty).
- Rewritten assertion "long-only fixture": legitimate. The old "reaches the 544 px room" no longer describes the scene; the new one asserts inside the room, above the soft cap, and drawn within 3 px of layout times the back-pass scale.
- Medallion test's trimmed fixture list: acceptable. The mostly-long fixture still puts a data-long bubble on screen (asserted by sawLongPlanet), which is the case that mattered. Short-only pools are covered for size by the sample snapshot test, not for medallion layering; the layering code does not branch on message length, so no coverage that matters was lost.
- Em dash and en dash: none in the three files (grep for U+2013 and U+2014).

## What changed (commit 07bddcb)

public/color-polish/scenes/orbit.js:
- ORBIT_SOFT_LAYOUT = floor(336 / 0.924) = 363 layout px, the largest planet that is drawn inside the 336 px soft cap all the way round.
- orbitFitsSoft(host, record): true when the whole message fits at the 19.5 px layout floor (18 px drawn) in a 363 px circle, or in a 334 px circle (the largest with the compact name and chip styling). Two probes per record, remembered, cleared when fonts reload.
- orbitChoose: draws through core's chooseRandom (rotation weights unchanged), order: fitting record with the focused expression, any fitting record, and only when allowed a longer record.
- Scene start: planets fill with fitting records first; a longer record fills a planet only when no fitting record is left.
- Far-side replacement: a planet holding a fitting record never trades it for a longer one; a planet holding a longer record may rotate to another longer one.
- A longer record, when shown, is still drawn at the smallest circle its words fit, never magnified (writer's rule kept).

tests/color-polish-scenes/orbit.spec.ts, two new tests:
- "with enough fitting messages in the pool ...": 9 long records (250, 400, 500 graphemes, three ids each) against 13 others, 60 seconds in 2 second steps: no long record ever on screen, every planet at or under 337 px drawn, every shown record independently fits the soft cap (text-fits.ts geometry), replacements happened, more than four records shown. On the writer's orbit.js it fails at 0 s ("mostly-250-copy-1 on screen").
- "with too few fitting messages ...": mostly-long fixture (3 fitting, 3 long), 90 seconds: exactly one long planet at every sample, never magnified, the other three inside the soft cap, no record twice, all text fits. On the writer's orbit.js it fails at 0 s (two long planets: mostly-250 and mostly-500).

## Numbers

- Soft cap 336 px drawn (70 percent of the 480 px centre); 363 px layout. Hard cap 544 px (room under the title).
- Fixtures: 123 character emoji message needs 294 layout px, fits. 250 graphemes needs 390, 400 needs 474, 500 needs 542 layout px (drawn 360, 438, 501 px): none fit, so none is chosen while fitting records remain. The writer's estimate that messages up to about 190 graphemes fit the soft cap was not measured again by me.
- Sample pool (48 records, 53 to 90 characters): every record fits; planets 221 to 287 px drawn. The reviewed captures show the same scene as the writer's.

## Commands (run in the worktree, synthetic public config only, next dev on 127.0.0.1:3461, stopped afterwards; .env.local never read or copied; no database; no deploy)

- npm run typecheck: pass.
- npm test: 39 files, 222 tests passed.
- npm run build: exit 0, compiled, 36 of 36 static pages.
- npx playwright test tests/color-polish-scenes/orbit.spec.ts --workers=1: 26 passed, 0 failed, 3.1 minutes (24 from the writer, 2 new).
- Probe captures, issues [] in all four: $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L6/reviewed/w1920-ms6000, w1920-ms14000, w3840-ms6000, w3840-ms14000.

## For the owner

- A long recognition (roughly over 190 characters) will now normally not appear on Expression Orbit; it still appears on the other screens. It appears on Orbit only when fewer than four shorter messages are available.
- In a degenerate pool (for example only long messages), more than one large planet can still appear, because the scene fills its four planets rather than leaving one empty. With three or more fitting messages there is at most one. Say so if an empty planet is preferred instead.
- Physical TV confirmation is still outstanding. Nothing was deployed.
