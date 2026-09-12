# Gap report: Section 6, Nine Expressions (renderer id 7)

Coordinator (Opus 5 high), 2026-09-11, from tv/pick 463ce8d.

## Anthony's note (quoted)

"This one is also kind of boring and plain to look at. It should be revamped to be more theatrical."

Binding ruling: decision 12 (a 3D stage; the nine cards sit on a gentle perspective arc, the focused card lifts forward and blooms with the phrase large, the others dim, all nine stay readable with no overflow).

## What tv/pick 463ce8d does

- scenes/expressions.js, 29 lines, the shortest scene file. `nineScene()` lays the nine `.edu-card` elements on a flat 3 by 3 grid at `left:(i%3)*611`, `top:91+floor(i/3)*176`, each 590 by 159. Each card holds an `.edu-front` (medallion, category name, number, phrase) and an `.edu-detail` (medallion, eyebrow, shimmered name, phrase, principle, the GUIDANCE paragraph, and a source note), plus five `.edu-petal` elements.
- `tickEducation()` drives the bloom by lerping each card's `left`, `top`, `width` and `height` between a grid start and an end: the focused card to `{x:8,y:90,w:950,h:530}` and the others to a compact rail at `{x:985+(k%2)*419, y:90+floor(k/2)*136, w:403, h:126}`. The progress is `ease((S.eduAge-6)/3)`, so the bloom begins at 6 s of scene age over 3 s.
- The focused card is `S.bloomIndex`, advanced in `requestScene` (`if(id===7){S.bloomIndex=S.bloomNext;S.bloomNext=S.bloomIndex%9+1}` in core/stage.js), so **one card blooms per visit, not a rotation through all nine during one dwell.** The plan's Section 6 text says "the bloom rotates through all nine over the dwell as today"; that is a misreading of the shipped code and this report corrects it.
- The animation is pure left/top/width/height lerping, which is layout thrash on every frame, and it is why the scene reads as flat.
- `registerScene(7,...)` declares `markup`, `archOpacity:'.13'`, a `mount` that collects `eduCards`, and `tickAge`.

## Gaps and decisions

### G1. The plan's "rotates through all nine over the dwell" contradicts the code.
**Decision.** Follow the code, not that sentence: one card blooms per visit, chosen by `S.bloomIndex`, exactly as today. Changing it to cycle nine cards in one 30 s dwell would give each card 3.3 s, which is less than the reading time of the GUIDANCE paragraph inside it, so the scene would become unreadable in pursuit of a line the plan got wrong. **Recorded as a plan correction for Section Z to resolve with Lane 0's findings.** The plan's acceptance line "over 30 s at least three different cards take focus" is therefore replaced by acceptance 5 below, which checks the same thing across three visits instead of inside one.

### G2. The arc, in real numbers.
**Decision.** `perspective: 1600px` on the scene root. The nine cards keep their 3 by 3 grid positions but gain a per-column `rotateY` of +7, 0 and -7 degrees (left, centre, right column) and a per-row `translateZ` of -40, 0 and -40 px (top, middle, bottom row), so the grid reads as a gentle concave arc facing the viewer. These are cards, not bubbles, so the 3D rotation is permitted by the Plan 13 ruling.

### G3. The bloom becomes a lift, not a resize.
**Decision.** Replace the per-frame `left/top/width/height` lerp with a `transform` of `translate3d` plus `scale`, animated on the compositor: the focused card lifts to `translateZ(90px)` with a scale that reaches its current 950 by 530 footprint, and the other eight move to their compact rail by transform as well. The final geometry stays what it is today, so nothing about the layout Anthony already accepted changes; only the mechanism does, which is what removes the flatness and the layout thrash together. The other eight dim to 70 percent opacity. A particle bloom plays behind the focused card, inside its bounds, for the 3 s of the bloom.

### G4. The phrase, large.
**Decision.** On the focused card, the phrase becomes the largest text, at least 1.6 times the phrase size on a grid card, with the principle beneath it and the GUIDANCE paragraph beneath that. Nothing is removed; the source note stays.

### G5. Overflow, at both widths.
**Decision.** Plan 13's fit rules stand: on the visible layer of all nine cards, `scrollWidth` and `scrollHeight` never exceed the client size, at 1920 and at 3840, in both the grid state and the bloomed state. A transform-based bloom does not change layout, so this is easier to hold than it is today, but the lane must check the compact rail cards specifically: 403 by 126 is the tightest box in the scene.

### G6. Reduced motion.
**Decision.** Under `S.still`: the bloom is already complete at `p = 1` (today's behavior), the arc rotations are applied statically, no particles, no dimming transition.

## Testable acceptance

1. The common scene spec.
2. The focused card's computed transform contains a positive `translateZ`, and its phrase is rendered at least 1.6 times the grid-card phrase size.
3. `scrollWidth` and `scrollHeight` never exceed the client size on the visible layer of all nine cards, in the grid state and the bloomed state, at 1920 and 3840.
4. The eight unfocused cards' computed opacity is about 0.7 while the focused card's is 1.
5. Across three separate visits to scene 7 driven through `loadRenderer`, three different cards take focus, and the sequence matches `S.bloomIndex` advancing by one each visit.
6. The three columns carry distinct `rotateY` values and the three rows distinct `translateZ` values.
7. No `.orb` exists in this scene, so no circular bubble carries a 3D rotation.
8. Reduced motion matches G6 exactly.

## Risk

- G1 is a real disagreement with the approved plan text. It is recorded here rather than acted on silently, and Section Z must carry the disposition into the Build log alongside Lane 0's objections. If Anthony wants the nine to cycle within one dwell, that is a dwell-duration change (scene 7's dwell is 30 s today) and a separate decision, not something this lane should assume.
