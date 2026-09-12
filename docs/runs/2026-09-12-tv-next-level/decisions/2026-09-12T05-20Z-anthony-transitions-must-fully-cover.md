# Anthony's correction: the sweeping transition must fully cover the screen

Recorded 2026-09-12T05:20Z by the coordinator (Opus 5 high), from Anthony's message after watching the LAN preview: "Honestly, almost every single thing is not even close to how I want it to be. First, the transition that's sweeping should cover the whole screen to the point where I cannot even see the background, and in that way, it smoothly transitions to the next scene."

## The specific ruling

During the cover phase the transition must **completely occlude the stage**. Not a scatter of bubbles crossing a visible background: at the moment the scene swaps, nothing of either scene may be visible. The next scene is then revealed as the cover clears. This is what he described in his original brief ("As they cover the screen, the scene will change to the next one, and be revealed as the sweeping flood is completing off the screen") and the implementation did not achieve it.

## The coordinator caused part of this, and says so

Lane 0's objection O11 argued that 40 animated elements at 3840 was a frame-cost risk on TV hardware, and the coordinator accepted it and fixed the decorative element count at **24, down from the plan's 24 to 40**, reasoning that the cheapest configuration should ship first. That was a defensible performance call and a bad design call: 24 bubbles cannot cover an 1812 by 636 stage, so the cover phase was always going to look like a thin scatter over a visible background rather than a flood. Anthony is describing exactly the consequence of that decision.

**Reversed.** Full occlusion is now a requirement, not a budget target. The performance concern is handled by occluding with a cheap opaque wash that the compositor can handle (a single element's opacity and transform) and using the bubbles as texture on top of it, rather than by asking many bubbles to tile the screen.

## What the correction round requires

1. Full occlusion at the swap. Measurable: at the swap moment the stage is not visible through the layer at any sample point.
2. The occlusion is reached by a sweep, not a fade-to-black: the wash enters from the sweep's direction, so the motion still reads as a flood crossing the screen.
3. The reveal uncovers the new scene as the flood completes off screen, which is Anthony's own phrasing.
4. Frame cost stays inside the budget by construction: one full-bleed element carrying the wash, animated on transform and opacity only, with the bubble count free to rise again now that it is texture rather than coverage.
5. Reduced motion keeps its instant swap with no layer.

## Context for the rest of his message

"Almost every single thing is not even close" is partly a preview artifact and partly real, and the two should not be confused. The preview he watched (tv15/preview) contains only four sections: shared primitives, transitions, arrivals, Peacemakers and Peace in Practice. Welcome, Featured, Orbit, Milestone, Status, Expressions and Garden were not in it, and Peacemakers in that build was the version whose pieces were never cut from the globe art. So a large part of what he was looking at is either absent or already known to be wrong. The coordinator asked him to name the remaining items rather than guessing at them.
