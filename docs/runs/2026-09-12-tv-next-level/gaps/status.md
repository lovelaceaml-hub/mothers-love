# Gap report: Section 5, Status (renderer id 6)

Coordinator (Opus 5 high), 2026-09-11, from tv/pick 463ce8d.

## Anthony's note (quoted)

"It's good but it's kind of boring. I'm not sure how to improve it though. The expression phrases should be included instead of just writing 'Greeting'."

Binding ruling: decision 11 (medallions become 3D coins that flip between the icon face and the phrase face on a staggered cadence; the phrase is the primary label with the expression name as a small eyebrow; the two counts count up on mount; the light sweep is no longer clipped). Anthony explicitly delegated the rest of this scene to the planner.

## What tv/pick 463ce8d does

- scenes/status.js, 59 lines. `statusScene()` is one template: a heading, a `.stat-top` panel (the month expression total, the month recognition count, the puzzle art), then `.expression-stats` mapping all nine catalog entries to `<div class="stat-expression panel">${medallion(e.id)}<div><h3>name</h3><b>count</b></div></div>`, then `.periods` with the Today and Overall pairs, then a body note.
- **Only the expression name appears. No phrase is in the DOM anywhere in this scene.** That is Anthony's specific complaint.
- `mountStatus()` collects the nine `.stat-expression .medallion img` elements and assigns each one of three motion kinds (`float`, `sway`, `breathe`) with a per-card phase, rate and amplitude.
- `tickStatus(dt)` writes a `translate/rotate/scale` transform and a `boxShadow` to each medallion every frame. The lift in `breathe` runs every 9 seconds or so.
- The counts come from `num('today:rec')`, `num('today:expr')`, `num('all:rec')`, `num('all:expr')`. `bindNumbers` already animates every `[data-number]` from 0 to its target over 1.45 s on mount unless `S.still`, so **the count-up decision 11 asks for already exists**; what is missing is that it is 1.45 s and the decision says 1.2 s, and that it must then stay still.
- Plan 13's completion review left a finding that the light sweep is clipped by the grid.
- `registerScene(6,...)` declares only `markup`, `mount`, `tick` and `archOpacity:'.13'`. There is no `.orb` in this scene at all.

## Gaps and decisions

### G1. The coin, and what is on each face. Revised after Lane 0's objection O9.
The first version of this decision put the phrase on the coin's reverse face **and** made the phrase the card's primary label. Lane 0 was right that this is both unreadable and redundant: the medallion is a roughly 50 px circular badge, and phrase 7 is 52 characters. A 52 character phrase inside a 50 px coin is illegible on a TV from across a room, which is the one thing this display must never be.
**Decision.** The coin's two faces carry **no phrase**. Front is the existing `medallion(e.id)` icon; reverse is the expression's two-digit number in large type with the tint ring, a deliberate visual beat rather than a second place to read words. The wrapper carries `transform-style: preserve-3d` and a `rotateY` alternating between 0 and 180 degrees, both faces `backface-visibility: hidden`, the flip running 0.8 s with an ease.
**The phrase lives in the card's text block**, where there is real room: it becomes the card's primary label at the card's largest size, with the expression name directly above it as a small eyebrow, and the count unchanged. All nine phrases are in the DOM at all times, in the nine card text blocks, independent of any coin's flip state. That satisfies Anthony's sentence ("the expression phrases should be included instead of just writing 'Greeting'") in the only place it can be read.

### G2. The cadence, so the nine do not flip together.
**Decision.** Card i flips at `2.5 + i * 1.4` seconds and then every 9 seconds, so the nine are spread across a 12.6 s window and at any sampled moment some show the icon and some the phrase. Keep the existing three motion kinds and their per-card phases; the coin flip is added on top of that motion, not instead of it. No bouncing, and the numbers never move.

### G3. Counts.
**Decision.** Retune the two Today and Overall counters to a 1.2 s count-up on mount, per decision 11, then hold. Do this by passing a duration through the existing `numCache` entry rather than by adding a second animation system; `bindNumbers` already writes `duration:1.45` and that is the single value to change for these keys. Do not change the duration for the month totals at the top; they are not what decision 11 names.

### G4. The clipped light sweep.
**Decision.** The sweep is clipped because it lives inside a grid cell with its own overflow. Move the sweep to a single element spanning the whole `.expression-stats` grid, beneath the cards, so it crosses all nine without being cut at a cell boundary. One ambient particle layer sits behind the grid, also spanning it.

### G5. Reduced motion.
**Decision.** Under `S.still`: every coin shows its phrase face, statically; no flip, no float, no sway, no breathe; the counts render at their final values immediately.

## Testable acceptance

1. The common scene spec.
2. All nine catalog phrases are present in the DOM, verbatim, at 0 s.
3. At 6 s and at 14 s, at least three coins differ in flip state from the others (read the computed `rotateY` per coin wrapper). The reverse face shows the expression's two-digit number, not its phrase.
4. Both the Today and Overall counts equal the fixture totals after 2 s and do not change afterward.
5. The phrase's computed font size on a card is larger than the expression name's on the same card, and no phrase text is rendered inside any coin face.
6. The sweep element's rect spans at least the full width of `.expression-stats`, and no card's computed `overflow` clips it.
7. No card overflows; no `.orb` exists in this scene; no coin carries a 3D rotation on anything that is also a circular bubble (there are none here, so this holds trivially and the spec records that).
8. Reduced motion matches G5 exactly.

## Risk

- Phrase 2 and phrase 7 are long. On a card sized for the single word "Gratitude", the phrase as the primary label is the likely break. The lane must let the phrase wrap to two or three lines and shrink to the 18 px floor rather than clipping it, and acceptance 7's no-overflow check is what catches a clip.
- Nine `preserve-3d` wrappers plus the existing per-frame transform writes is more work per frame than today, but this scene has no canvas and no bubbles, so it starts from the cheapest budget in the playlist.
