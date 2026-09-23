---
lane: LK1
title: pearl
state: merged
model: opus-5.5
runner: coordinator
worktree: /Users/anthony/Projects/mothers-love-worktrees/world-kit-k1
review: "fable capture review (visual director, round 1 done), opus-5.5 landing review pending"
depends_on: LK0
updated: 2026-09-23T15:53Z
---

# LK1: pearl

## Work order

Plan 26 goal (quoted): "the design world (art=design) is dressed with the 3D Studio kit:
recognition pearls ringed by expression medallions, lotus, ribbon portal and Butterfly Gate
arrivals, rigged neighbors who speak the nine expressions and hand over hearts, and all
thirteen locations and their corridors laid out from the concept frames, within a living room
TV's budgets, with every standing privacy and wording rule intact."

Finish line (Anthony): "This is not for the TV View. It is for the 3d world".

Branch `world-kit/k1` from `2ef8c41` (K0 sockets merged). Owns `prototype/pearl-skin.ts` and
`tests/world/pearl-skin.test.ts`, plus one hunk in `world-recognitions.ts` so the skin reads
`scene.userData.studyKit` lazily on its first update (coordinator ruling). Design section 3:
the kit shell, rim band, orbit ring and the nine medallion bezels replace or enrich the
procedural parts; the face disc, `paintStudyPearl`, the occluder and the layers stay as they
are. Acceptance (design 8.2 K1 and common): text parity 0 differing pixels inside the disc
kit on versus off; layer and radius assertions; Garden 1080p and 4K beside target 01; the
detailed pearl main pass 15 to 23 draws; typecheck, `vitest tests/world`, build, the harness
in stills mode kit on and `DESIGN_REVIEW_KIT=off` with zero page errors, failed requests and
application API requests; classic and cinematic byte identical to the K0 baselines. Sample
data only, port 32744, the shared build lock around every build and harness run.

Round 2 (visual director's polish notes, 2026-09-23): pavilion pillar in front of the hero's
words (blocking); heart and globe fighting the pearl; one bead element, a visible rainbow
film, lit pearl and gold beads; pastel medallion glass (about 40 percent desaturation); keep
the arrival glow off the pearl's own symbols; the Expression Cosmos scribble; world colour
(not K1 owned); flower bed streaks; duplicate residents; larger small caps; close the evidence
gaps (this record, captures on the final head, the round 2 evidence script, an honest parity
statement).

## Result

Commits on `world-kit/k1` (base `2ef8c41`):

| Commit | What |
| --- | --- |
| `1a2a77b` | The pearl skin wears the kit: shell rim ring and bead band, orbit wire on both lanes, medallion orb, back and bezel as instanced draws, kit stars with the twinkle clip |
| `8344cb6` | Tests on the real kit files (Draco decoded in Node) |
| `bb02260` | Kit stars keep off the canonical symbols for one to nine expressions |
| `c68097d` | Comment accuracy for the star air |
| `0bc0d5e` | Round 2: one bead element (every other band bead, pearl and gold in turn, hairline wire without dots), polished gold and white pearl beads, a thin film outside .955 of the face, the pastel veil on the kit orb, `lanes` and `shield` frame flags, small caps a fifth larger |
| `c013f1c` | Round 2, `world-recognitions.ts` (design study only): Pavilion hero at outward 8, Heart and Globe heroes at side 10.5 and 11, residents never twice in one zone and spread evenly, lanes off in the Cosmos, shield while the arrival is read |
| `9b0ab32` | Round 2, `design-world.ts`: lawn beds lifted .01 off the terrace top (the streaks were a depth fight), three Cosmos rings instead of four |
| `4a54414` | Round 2, outside K1's files, own commit so it can be dropped: a first step toward lavender sky and turquoise sea (`study-palette.ts` sky and haze colour, sea colour, crown colours) |
| `3f837dd` | Veil tuned to .48 (measured 42 to 52 percent, as asked) |

Files changed outside K1's own two: `world-recognitions.ts` (the ruled lazy kit hunk plus the
director's placement, resident and frame flag hunks; K5 owns the file next), `design-world.ts`
(two lines), `study-palette.ts` (colours only). New test file `tests/world/study-slots.test.ts`.

Verification on head `3f837dd` (every capture opened and looked at):

- `npm run typecheck` clean; `npx vitest run tests/world` 14 files, 247 tests passed
  (pearl-skin 43, study-slots 8).
- `npm run build` under the lock, 04:40:01 to 04:40:07, clean.
- Harness, `next start -p 32744`, stills, Chrome channel: kit on 24 checks, 0 failed; kit off
  24 checks, 0 failed; both 0 page errors, 0 console messages, 0 failed requests, 0 API
  requests. Reports: `/private/tmp/mothers-love-k1/stills-kit-on-4/stills-report.json`,
  `/private/tmp/mothers-love-k1/stills-kit-off-4/stills-report.json` (sourceSha `3f837dd`).
- `classic-garden`, `classic-heart`, `cinematic-garden`, `cinematic-heart`: `cmp` identical to
  `/private/tmp/mothers-love-k0/baseline-stills/` in both runs.
- Text parity, Garden paused, kit off versus kit on: 0 differing pixels inside .955 of the
  face radius at 1080p and at 4K High; the first difference is at .958 radii (the thin film,
  which starts at .955). Between .955 and 1.0: 15,489 pixels at 1080p and 61,994 at 4K, all
  in the pale ground outside the engraved frame (.90) and the white arc (.93); the words end
  near .8. Honest statement: the disc's outer 4.5 percent now carries the film and, from
  about .985, the gold setting; nothing of the words or their frame changes.
- Draws: the detailed pearl main pass is 18, 20 or 22 for one to three medallions (test);
  Garden main pass with radiance off 335 kit on versus 340 kit off.
- Icon saturation through the veil, Garden 1080p: blue sleeves 42 percent lower, teal top 52
  percent lower than at `8344cb6`.

Captures: `/private/tmp/mothers-love-k1/stills-kit-on-4/`, `stills-kit-off-4/`,
`pearl-evidence-4/` (beside-target 1080p and 4K, 4K zooms), before and after sheets
`sheet-review-4a.png` and `sheet-review-4b.png`; round 3 (`4a54414`) captures and
`look-3/` beside them. The build and harness scripts are `with-lock.sh`, `run-evidence-3.sh`
and `run-evidence-4.sh` in the same folder. `run-evidence-2.sh` was superseded and never ran
to completion; round 3 and round 4 replace it.

Limitations, stated plainly:

- The face disc is frozen (design 3.1), so the words sit on an opaque pearl ground; target
  01's see-through soap bubble behind the words is not reachable without changing the face.
- Arrival bloom: the bottom medallion is partly covered by the lotus petals (K2 geometry),
  and the lotus and the constellation garland are faint. K2 owns both.
- The Expression Cosmos rings still sit beside, not around, the pearl; K3b owns the Cosmos
  dressing and could centre one kit orbit ring on the hero.
- The colour grade is a first step only: the top of each frame is lighter lavender, but the
  sun's glow keeps the centre warm. A fuller grade belongs with one owner of
  `study-palette.ts` and the radiance pass after K3a and K3b land.
- The better medallion fix (the kit's own 3D expression pieces inside the orb) is a
  coordinator or Anthony decision.

## Review

(coordinator appends)
