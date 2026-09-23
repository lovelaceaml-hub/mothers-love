---
lane: LK2
title: arrivals
state: landed, polish round applied, review finding closed and re verified on the retry run (run 5), awaiting the coordinator's review
model: Claude Fable 5.1 (writer)
runner: coordinator chat, background lane
worktree: /Users/anthony/Projects/mothers-love-worktrees/world-kit-k2 (branch world-kit/k2, base 2ef8c41)
review: independent reviewer's style cycle finding fixed in 68bf836 and re verified in run 5; visual director round one applied (13 notes, see Result); coordinator review pending
depends_on: K0 sockets (merged at 2ef8c41)
updated: 2026-09-23T16:00Z
---

# LK2: arrivals

Plan 26 goal (quoted): "the design world (art=design) is dressed with the 3D Studio kit:
recognition pearls ringed by expression medallions, lotus, ribbon portal and Butterfly Gate
arrivals, rigged neighbors who speak the nine expressions and hand over hearts, and all
thirteen locations and their corridors laid out from the concept frames, within a living
room TV's budgets, with every standing privacy and wording rule intact."

## Work order

Own `prototype/arrival-stages.ts` (add `kit?: WorldKit` to `StageContext`),
`prototype/arrival-choreography.ts` only if a pose field is needed, the style cycle hunk in
`world-engine.ts` (one function), and `tests/world/arrival-choreography.test.ts` plus
`tests/world/arrival-stages.test.ts`. Design section 4: the lotus bloom clip scrubbed by
`arrivalPose.form` (0 through approach, `smoothstep(progress)` through reveal, 1 through
reading and settle), the ribbon portal and silk, the constellation sparkle, the Butterfly
Gate (K3b's landmark; the gate's hush read needs no plumbing here), style cycling for live.
Acceptance 8.2 K2 plus common. Sample data only; no em or en dash; commits on the lane
branch; no push, merge, deploy or pull request.

Second pass: the visual director's thirteen polish notes on the first captures (the
arrivals bleached under the veil, the lotus near invisible, the arch out of frame, the
string of lights too faint, purple butterflies clustered at the top, the beam and sprites
too heavy, the lane record unfilled).

## Result

### Commits (branch world-kit/k2)

- e84e616 Arrivals: bloom fraction and the live style cycle (Plan 26 K2)
- 13b4beb Arrivals: kit lotus, ribbon portal, butterflies, petal and sparkle (Plan 26 K2)
- 27f8f26 Arrivals: aim the kit butterflies along their orbit in world space (review fix)
- 68bf836 Arrivals: keep the style cycle to live feeds (review fix)
- d2ef5d6 Arrivals: the visual director's polish round (Plan 26 K2)

Files: `src/components/display/world/prototype/arrival-stages.ts`,
`src/components/display/world/prototype/arrival-choreography.ts`,
`src/components/display/world/world-engine.ts` (the admitted-arrival edge only),
`tests/world/arrival-stages.test.ts` (new), `tests/world/arrival-choreography.test.ts`,
this record.

### Review finding, closed

The independent reviewer found that `cycleStudyArrival` also cycled sample demonstrations,
so after a study button the next Preview grand entrance played the next style while that
button still reported `aria-pressed="true"` (WCAG 4.1.2), and the chosen style was replaced
after one arrival. 68bf836 limits the cycle to live feeds through the pure gate
`arrivalStyleCycles(study, entranceFixed, phase)`: `study && !entranceFixed && phase !==
"sample"`, which is the reviewer's prescribed condition; the pinned flag is gone and
`previewStudyArrival` and `finishStudyArrival` are their base text again. Of the other
feed phases only `live` and `reconnecting` can hold records, so they are the only ones the
cycle serves in practice. The retry run (run 5 below, on head 27d981f) re proves it: the
reviewer's exact journey, `?source=sample&art=design`, Petal bloom, then Preview grand
entrance, keeps Petal bloom pressed and on screen (`journey5/5-grand-entrance-after-bloom.png`).

### What the stages do now

- Bloom: `arrival.lotus-bloom` with its `bloom` clip scrubbed by `bloomFraction(pose)`
  (equal to `form`), petal materials remapped to the study's lit petal with a base to tip
  `uv` derived from the skin (the file carries no uv), the seed pod at its authored light,
  the drifting petals one draw of the single petal extracted from `arrival.petal-drift`,
  the drift starting three seconds into the approach.
- Ribbon: `arrival.ribbon-portal` framing the pearl (see placements), satin in the file's
  own tones through `COLOR_0` at an .85 ceiling, everything fading with presence and
  scaling from its base with gather; six `arrival.butterfly` clones on their `flap` loop,
  pale wings with the file's gold edge, each on its own mixer advanced by the world clock;
  the procedural silk loop at radius 8.4 with a fold highlight on its face.
- Constellation: 200 lights on a 1.25 turn helix from 30 units above the pearl, every
  third light the kit `recognition.constellation-sparkle` star, additive; the landing star
  on its `twinkle` loop holding at full strength through the reading; eight `core.pearl`
  instances forming on the ring as the pulse runs down the string.
- Style cycle for live feeds only (`arrivalStyleCycles`): sample keeps the `?entrance=`
  choice and the three study buttons, proven by the journey (7 of 7 buttons match).
- Every stage material of the kit ignores the scene fog, the halo and core sprites run at
  .12 and .18 (were .22 and .32), the beam at .12 (was .20), the ribbon glow sprite at .15
  (was .28).

### Placements decided by eye, then measured (`STAGE_PLACEMENT`)

All measured against the fixed arrival camera (`ARRIVAL_VIEW`, fov 43, 1920 by 1080) by
`pearlClearance` and `arrivalScreen` in `tests/world/arrival-stages.test.ts`; the reading
pearl is entry local (0, 11.4, 0), radius 5.4, clearance ring 6.6.

| Piece | Placement | Why |
| --- | --- | --- |
| Lotus | y .4, scale 3.7, leaned .2 rad toward the camera | open flower 11 across, petal tips at y 4.8 (over a unit under the disc's bottom edge), the core and open face read below the disc, lower petals clear the button row |
| Portal | 3.5 behind the pearl along the camera's line, facing the camera, scale 4.4 | measured on the file's decoded vertices: nearest point seen in front of the disc 8.6 units out; the opening's edges draw 71 and 95 px outside the disc; an arch on the entry's z axis drew its left pillar 70 px inside the disc and its right 120 px outside because the camera sits 24 degrees off that axis |
| Butterflies | orbit 11, height 12.8 minus 4.5 cos(azimuth to camera), scale 4.2 | every flyer keeps at least 6.6 from the pearl's centre wherever the camera sees it in front of the disc, and stays under the top 15 percent of the frame at reading, over a full orbit |
| String | helix from y 41.4, radius 12 to the landing (-5.534, 16.07, 1.525), 4 unit plateau from s .5 dropping from s .86 | the one crossing in front is high; the pass directly behind the pearl lies on the camera's line so only height keeps it out of the disc; nearest point anywhere 7.4 (the landing itself) |
| Ring pearls | 8 at radius 7.45 in the plane facing the camera, .3 in front, scale .5 | outside the clearance ring, on the ring the landing lies on |
| Sparkle | scale 3.2, .4 outward from the landing | its points stay clear of the clearance ring |

### Verification evidence

Run 5 (2026-09-23, the retry, head 27d981f, worktree clean, script
`/private/tmp/mothers-love-k2/scripts/acceptance5.sh`): `npm run typecheck` exit 0; `npx
vitest run tests/world` exit 0, 258 passed (14 files); `npm run build` exit 0 under the
build lock (lock taken 08:56:34, released 08:58:01, the lock was free on arrival); the
review harness against `next start -p 32745` in stills mode with
`DESIGN_REVIEW_CHANNEL=chrome`, kit on (`data-kit="ready"`, 0 missing) and
`DESIGN_REVIEW_KIT=off` (`data-kit="off"`): 24 checks each, none failed, page errors 0,
console errors 0, failed requests 0, API requests 0 in both `stills-report.json`, both
naming `sourceSha` 27d981f; `classic-garden`, `classic-heart`, `cinematic-garden` and
`cinematic-heart` byte identical (`cmp`) to `/private/tmp/mothers-love-k0/baseline-stills`
in both runs (8 of 8); the journey (`journey.mjs`) 7 of 7 style matches, no errors, no
failed requests, no API requests; twelve normal motion frames per style
(`motion-frames.mjs`, 36 frames): idle at .5 s, approach over frames 2 to 5, reveal over 6
to 9, reading from frame 10 (about 11.6 s) for every style, no errors. The server was
stopped at 08:59:40. The one minute load average during the captures was 71 to 92 (other
lanes and the generator); the stills are unaffected, every kit on arrival and phone still
of run 5 is byte identical to run 4's, and no timing was measured.

Run 4 (04:51 to 04:54) gave the same numbers, but its harness reports carry `sourceSha`
68bf836 because the polish commit d2ef5d6 landed after that run; run 5 is the evidence for
the committed head.

Captures (all under `/private/tmp/mothers-love-k2/`): `stills5-kit-on/` and
`stills5-kit-off/` (arrival-bloom, arrival-ribbon, arrival-constellation, phone-bloom,
phone-ribbon, phone-garden, the thirteen zone stills, classic and cinematic), `motion5/`
(36 frames), `journey5/` (7 stills and `journey-report.json`), contact sheets in
`sheets5/` (kit on and kit off zones, classic and cinematic, journey, motion per style),
logs `acceptance5.log`, `typecheck5.log`, `vitest5.log`, `build5.log`,
`stills5-kit-on.log`, `stills5-kit-off.log`, `journey5.log`, `motion5.log`, hashes in
`run5.sha256`. Earlier rounds stay in `stills3-*`, `stills4-*`, `motion3`, `motion4`,
`journey3`, `journey4`, `sheets3` and `sheets4`.

### Disc parity, stated plainly

The reading disc (centre 960, 537, radius 270 at 1080p) against the K0 baseline stills,
words untouched in every case (run 5 numbers, equal to run 4's):

- bloom, kit on 1485 px and kit off 1413 px, max delta 4 of 255, rows 267 to 281 and 732
  to 805 only: the disc's top and bottom caps, where the beam's text band gate fades in
  over the last half unit of the rim, now at .12 instead of .20. Restoring the beam to .20
  makes the disc identical again; the visual director asked for the halving, so it stays
  unless the coordinator rules otherwise.
- ribbon, kit on and kit off 427 px, max delta 24, all on the anti aliased rim (columns
  1163 to 1227 on the right, rows 736 to 804 at the lower rim): the thinner silk and the
  capped glow change what shows through the rim's edge pixels.
- constellation, kit on 3 px and kit off 1 px, max delta 1.

`kit=off` arrival stills are not byte identical to K0: the halo, core, beam and glow
sprite weights, the silk width and its fog flag are stage code shared by both modes
(kit off bloom 461,180 px, ribbon 769,427 px, constellation 398,151 px differ overall,
the constellation through the shared lights count and sizes). Classic and cinematic are
untouched.

### Limitations and inputs for K6

Not in this lane's files; the director's notes 1, 2 (framing), 5, 6, 7, 9 and 10 need:

1. `world-data.ts` `ARRIVAL_VIEW`: rotate the entry yaw or the view about 25 degrees so the
   sun sprite leaves the pearl's apex, and frame the lotus base by lowering the target y
   10 to about 8.5 or pulling the eye z 43 to about 47. `pearlClearance`, `arrivalScreen`
   and the arch's facing all derive from `ARRIVAL_VIEW`, so the arrival tests re measure
   every placement automatically after such a change; re run `npx vitest run tests/world`
   and re capture.
2. `world-engine.ts` mood and `study-palette.ts`: let hush release fully by the first
   reading frame and push the arrival haze near toward 60 (the stage materials already
   ignore fog, the scenery behind them does not).
3. Resident pearls within about 1.6 disc radii of the arrival disc fade to about .15 while
   presence is above .3, and any pearl whose disc crosses the frame edge hides (engine or
   pearl module); at `ARRIVAL_VIEW` a resident pearl sits behind the arrival disc and
   another is cut by the right frame edge in every arrival still.
4. K3a: the sphere cluster clouds at the lower right of the arrival frame; K1: one glyph
   set for the medallions; K3a and K3b: trees, arches, the Butterfly Gate at Welcome and
   the Fountain of Kindness behind the pearl's apex.

Also on the record: the satin tails carry the file's three authored tones (pale pink,
rose, lavender) rather than the two the director named; the lotus at phone width still
touches the left edge (the portrait lens is 63 degrees); the kit lotus bud is the file's
own tessellation, so its facets show at .15 scale in the first approach frames.
