---
lane: LK4
title: neighbors
state: merged
model: Claude Opus 5.5 (writer, assigned by the coordinator's workflow)
runner: coordinator workflow, background lane
worktree: /Users/anthony/Projects/mothers-love-worktrees/world-kit-k4 (branch world-kit/k4, base 2ef8c41)
review: visual director polish round applied (notes 1 to 6); coordinator review pending
depends_on: LK0 (sockets, merged at 2ef8c41)
updated: 2026-09-23T15:53Z
---

# LK4: neighbors

## Work order

Plan 26 goal (quoted): "the design world (art=design) is dressed with the 3D Studio kit: recognition pearls ringed by expression medallions, lotus, ribbon portal and Butterfly Gate arrivals, rigged neighbors who speak the nine expressions and hand over hearts, and all thirteen locations and their corridors laid out from the concept frames, within a living room TV's budgets, with every standing privacy and wording rule intact."

Finish line (Anthony, verbatim): "This is not for the TV View. It is for the 3d world". Only `/display/world-preview` changes; the TV View and anything it renders stay untouched.

Scope received: design section 5 of `/Users/anthony/Projects/3d-studio/docs/design/WORLD-INTEGRATION.md` and coordinator ruling 2. Owned files: `src/components/display/world/kit/kit-neighbors.ts` (K0 stub, final signature), `src/components/display/world/neighbor-dialogue.ts` (add `neighborSchedule`, rewire `neighborDialogue`), the accessible sentence hunk in `src/components/display/world/WorldExperience.tsx`, `tests/world/neighbor-schedule.test.ts` (and the lane's own `tests/world/kit-neighbors.test.ts`). Rigged `neighbor.*` cast (13 clips each), active pair's speech cards only, every card printing "FICTIONAL NEIGHBORS", one clock driving clips, cards and the accessible text, a hero slot per actor (`neighbor-hero.<name>` with the same skeleton and clips, falling back to the toy), one AnimationMixer per actor updated only when visible, SkeletonUtils clone, tier cadence (design 5.3), skinned draws at Garden High at most 10. Sample data only, build lock around every build and harness run, port 32748, no push, merge or deploy.

## Result

### Commits (branch world-kit/k4)

- `d3d465f` Neighbors: one schedule for the actors, their cards and the accessible sentence
- `792e579` Neighbors: rigged pairs in all thirteen zones of the design world
- `72133da` Neighbors: the Grove's card stands beside the pair, clear of the icon discs
- `03fd476` Neighbors: polish from the visual review

### What the lane delivers

- `neighbor-dialogue.ts`: `neighborSchedule(time, index, handoffAt, selected?)`, a pure beat table on `neighborMotion`'s 52.36 s cycle (approach 12.42 s, meet 27.52 s, part 12.42 s); the heart changes hands at 15.5 + handoffAt (1.8 s) and floats after the receiver takes it to heart (2.933 s). `neighborDialogue` reads the same schedule, so the accessible sentence equals the card on screen. `legacyNeighborDialogue` keeps classic and cinematic on their own rule.
- `kit/kit-neighbors.ts`: 26 actors (two per zone, cast per design 5.1), each rig merged at load into one skinned draw with one shared material; a hero slot per actor; one mixer per rig, posed from the clock at a zero delta; at most four pairs shown (Low: the active pair), Auto poses the others on alternate frames, only the active pair casts a shadow; contact shadows, the floating heart and its sparkles as instanced draws; two ivory speech cards with a gold hairline and plum type, each printing FICTIONAL NEIGHBORS, never covering the pearl being read.
- `WorldExperience.tsx`: the design study's accessible sentence reads `neighborDialogue`, with the Grove's selected expression.

### Polish round (visual director notes, 2026-09-23)

1. Phone portrait: stages gain a `portrait` step taken when the camera aspect is under 0.8. Garden and Pearl Pavilion step (+1.5, -1.5) in the layout frame, Expression Cosmos (+1.5, -2.5), since its camera sets the pair lower on a phone. Phone Garden: the pair moved from the left frame edge to x 68 to 130 px with its feet at y 540, clear of the "01 / A WORLD OF KINDNESS" caption at 560. Desktop frames are unchanged.
2. Fountain of Kindness: the pair moved from z 7.6 to 6.2 with a 1.3 unit walk (was 1.4), not the suggested 5.5: on this branch the five procedural tiers (base radius 6.3) still stand until K3b's kit fountain replaces them, and at 5.5 the right hand actor would stand inside the lowest basin. 6.2 clears both fountains through the whole walk (tested). Once K3b is merged the integration lane may take it to 5.5; the kit fountain is only 3.5 in radius.
3. Floating heart: rest height is now 0.6 of the pair's mean height (1.62 world units for a mother and child, with the .45 lift), floating 0.6 in front of the pair, so it sits between the two rather than on the taller one's hair.
4. Grove: the pair speaks and gestures the expression its panel shows (`scene.userData.studyExpression`, the host's `expressionId`), cards repaint on a change, and the accessible sentence follows; the other twelve zones keep the modulo cast.
5. Colour: the grandfather's cardigan bakes in sage (#a3c6a1) at merge time (`NEIGHBOR_GARMENTS`, kit-neighbors.ts); the kit file is unchanged.
6. No change needed.
7. Outside K4, passed to the integration lane (see Open issues).

### Verification (round 3, 2026-09-23)

- `npm run typecheck` clean; `npx vitest run tests/world` 15 files, 248 tests pass.
- `npm run build` exit 0 under the build lock.
- Review harness (stills, installed Chrome, `next start -p 32748`): kit on 24 of 24 checks, kit off 24 of 24; zero page errors, zero console errors, zero failed requests, zero application API requests in both.
- classic-garden, classic-heart, cinematic-garden, cinematic-heart byte identical (cmp) to the K0 baselines, kit on and kit off. Every kit-off design still byte identical to K0's final kit-off.
- Motion (Garden, High, 239 frames): skinned draws peak at 8 (6 main, 2 shadow), under the 10 budget; the three seconds into the meet frame shows the talk and listen pose with the "How Are You?" card and the sentence "Fictional neighbors illustrate words of kindness. How Are You?".
- Captures: /private/tmp/mothers-love-k4/stills-r3-kit-on, stills-r3-kit-off, motion-r3, extra-r3 (phone Garden, Pavilion, Cosmos; Grove with expressions 1, 5 and 9).

### Open issues

- Seated neighbors at the Daily Practice Terrace wait for LW5's `sit` and `sit_talk` clips; the pair stands beside the benches.
- On a phone the speech card usually steps aside for the centred pearl (the pearl guard, design 5.3), so the accessible sentence can name words that are not drawn at that moment (phone Pavilion frame). A portrait card placement is a follow up if wanted.
- The shared heart now floats between each pair, in front of them, as note 3 asked (Garden: between the mother's chin and the child's head). Where the taller actor is an adult beside a partner of similar height or a grandparent beside a child, the same rule lands it in front of the taller one's face: in design-practice it covers the grandmother's mouth, in design-promise the grandfather's cheek (crops in /private/tmp/mothers-love-k4/crops-r3). The toy heads leave no free 0.85 unit gap at that height; a smaller heart or chest height for those pairs is the follow up if the director prefers.
- No sculpted `neighbor-hero.*` asset exists yet; every shot plays the toy rigs (the hero slot is built and tested).
- Seen in the same frames, outside K4: the Pearl Pavilion arch column crosses the reading pearl's text in design-featured (identical kit off); the Butterfly Gate zone shows three plain arches and no gate; plain box benches at the Daily Practice Terrace and the Garden of Days; the Peace Globe's circle of twelve static people is absent; the kit-off Garden statics stand inside the left rose bed.

## Review

(coordinator appends)
