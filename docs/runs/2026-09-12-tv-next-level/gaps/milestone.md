# Gap report: Section 9, Milestone and Weekly Goal (renderer id 11)

Coordinator (Opus 5 high), 2026-09-11, from tv/pick 463ce8d.

## Anthony's note (quoted)

"The expression goal of the week should actually be the most prominent one out of the text. The main focus should be to say what expression we should focus on. Also, the bubbles, instead of 'Thank you', should say the phrases for that expression such as 'how are you', 'please after you', 'it's okay, I understand', etc. Choose only one if there are multiple expressions for a recognition. They should still have the person's name on it with that phrase included. Also, all recognitions can be shown, not limited to recent ones."

Binding rulings: decision 10 (when a record has several expressions, use the weekly goal expression if the record includes it, otherwise the record's first expression), decision 1 (`chooseRandom`).

## What tv/pick 463ce8d does

- scenes/milestone.js line 5 `milestoneScene()`: the layout is `.progress-sculpture` holding `.progress-rail` (the milestone number in `.threshold` via `num('milestone')`, an h2 "Expressions of Mother's Love", current and next counts, a progress track) beside `.progress-goal` (a `THIS WEEK'S EXPRESSION GOAL` head, the week range, then `.goal-name` with `medallion(g.id)` and an h3 carrying the **expression name only, never the phrase**), then `.stream-world` with a 1162 by 622 canvas.
- **The milestone number is the largest text in the scene today.** `.threshold` carries `num('milestone')`. The goal expression's name sits in an h3 inside `.goal-name`. That is the inversion Anthony is asking for.
- `tributeContent(a,r)` line 51 writes `<div class="stream-pearl"><small>THANK YOU</small><b>name</b><div class="stream-tags">icons</div></div>`. Every pearl says THANK YOU.
- `contributorPool()` line 41: records that are milestone contributors **or** were created in the current week **and** include the goal expression; if that is fewer than 14 it backfills with the most recent records. So the stream is recency-biased and goal-biased, which is what "not limited to recent ones" rejects.
- `mountTributes()` line 13 creates `N = Math.min(26, pool.length)` nodes seeded from `randSeed(189391)`, plus 14 drifting icons. `tickTributes` recycles a node's content from the free pool when it rises off the top.
- `a.el.dataset.weekly` marks records that include the goal expression; the gold rim is driven from that attribute.

## Gaps and decisions

### G1. Make the goal expression the most prominent text.
**Decision.** The goal expression's **name and phrase together become the largest text on screen**, larger than `.threshold`. Concretely: `.goal-name`'s heading rises to the scene's largest computed font size and the phrase is rendered directly beneath it at the second largest, both above the milestone number's size. The milestone number, its h2 and the progress track move into a secondary rail: same content, smaller type, lower visual weight. Nothing is removed; only the hierarchy inverts. The `THIS WEEK'S EXPRESSION GOAL` eyebrow stays, since it is the sentence that says what to focus on.

### G2. The phrase on each pearl, and which phrase.
**Decision.** `tributeContent` replaces the literal `THANK YOU` with the catalog phrase of exactly one expression, chosen by decision 10: the weekly goal expression when `r.ids` includes it, otherwise `r.ids[0]` (the ids array is sorted ascending, so "first" is deterministic). The recipient name stays in the `<b>`, and the expression icons stay in `.stream-tags`. No pearl anywhere in the scene says THANK YOU afterward. The phrase must not be truncated; if a phrase does not fit the pearl, the pearl grows or the phrase wraps, and the 18 px floor applies.

### G3. "All recognitions can be shown."
**Decision.** `contributorPool()` returns the **whole eligible pool**, `records()`, with no week filter, no goal filter and no recency sort; the floor of 14 disappears because there is no longer a shortfall to fill. Node content is drawn through `chooseRandom` rather than by the free-pool index pick, so a record shown often is drawn less. The bound Anthony must know, already stated in decision 1: "all recognitions" can only mean every record in the seven-day display pool, because every personal copy expires 168 hours after creation. Nothing older than seven days exists to show.
The gold rim keeps its current meaning and keeps working: `dataset.weekly` still marks records that include the goal expression, so goal-supporting recognitions still stand out inside a now-unfiltered stream.

### G3b. Milestone contributors keep a guaranteed place. Lane 0 objection O13, accepted in part.
Lane 0 argued for restoring the week-and-goal filter. That is rejected: Anthony's brief says "all recognitions can be shown, not limited to recent ones", and reinstating the filter would undo his instruction. But its underlying point stands, that a milestone contributor should not be able to vanish from the milestone scene.
**Decision.** `contributorPool()` returns the whole eligible pool, as G3 says. `mountTributes` then **seeds `S.milestoneContributors` into the first nodes**, in order, before filling the remaining nodes through `chooseRandom`. Contributors are therefore guaranteed a place whenever they exist, and every other record can still appear. Recycled node content continues to come from `chooseRandom`, so a contributor that has cycled off is not privileged forever.

### G3c. The stream must count what it shows. Lane 0 objection O7.
`markShown` is called only from `addOrb`, and this scene's pearls are built by `tributeContent`, so its records would never be counted and `chooseRandom` would keep favouring them in every other scene.
**Decision.** Call `markShown(r.id)` at the top of `tributeContent`, once per content assignment, including on recycle.

### G4. Node count with a larger pool.
**Decision.** `N = Math.min(26, pool.length)` stays. The pool grows but the node count does not, so the frame cost is unchanged; a larger pool simply means more distinct records cycle through the same 26 nodes. Keep the `randSeed(189391)` seed so Plan 13's per-node seed and node-density assertions still pass.

### G5. Reduced motion.
**Decision.** The stream renders its 26 nodes statically with their phrases and names, no rise, no recycling, and the goal block renders at its new prominence.

## Testable acceptance

1. The common scene spec.
2. The goal expression's name or phrase is rendered at the largest computed font size in the scene, strictly larger than `.threshold`'s.
3. Every `.stream-pearl` shows a catalog phrase and a name; none shows `THANK YOU`; for a record carrying the goal expression the phrase is the goal expression's, and for one that does not it is `r.ids[0]`'s.
4. With the 48-record sample, at least 12 distinct record ids pass through the stream in 30 s, and at least one has a `createdAt` outside the current week.
4b. With a fixture that names three milestone contributors, all three are present in the stream at 0 s (G3b), and `markShown` has been called for every pearl rendered (G3c).
5. Records that include the goal expression still carry `data-weekly="true"` and the gold rim.
6. Plan 13's node density and per-node seed assertions still pass.
7. `noOverflow` holds; no phrase is truncated at any pearl size.

## Risk

- Phrase 2 ("Thank you. It's all thanks to you. You've worked hard.") and phrase 7 are far longer than "THANK YOU", and the pearl was sized for two short lines. This is the most likely visual break in the scene, and acceptance 7 is what catches it. If the pearl cannot hold the longest phrase at 18 px, the lane grows the pearl rather than shortening the phrase.
- Removing the week filter changes what the scene means, from "this week's goal supporters" to "everyone". That is exactly what Anthony asked for, and the gold rim is what preserves the old signal, so the change is safe but worth naming in his progress report.
