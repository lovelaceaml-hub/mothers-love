# 2026-09-18T20:19Z L2 review round 1 findings sent back

# L2 landing review, round 1 (Claude Opus 5 high), 2026-09-18 about 20:25Z

Key fact: the TV cuts at the .scene box (overflow hidden; at 1920 x 54 to 1866, y 126 to 762), not the viewport; base grid was cut by 18.6 px each side, focus panel by up to 45.5 px left. After the lane: grid 12.7 px inside the scene, title 17.3 px clear, footnote clear, no text clipped, motion constants byte-identical, reduced motion shares the fix.
1. Major: card 6 (Respect) still cut up to 7.5 px at 1920 for about 1.2 s moving to the right compact column (compact X 985/1404, width 403).
2. Major: edge spec measures the viewport not the scene box, omits box-shadow, samples 16 of 30 s and one visit.
3. Minor: focused panel glow hard-cut at the scene left edge by up to 30.7 px at 1920.
Writer process note: the writer used git stash in its worktree to compare with base, against hard rule 2; coordinator confirmed the stash list is empty and the lane changes intact.
Disposition: all three accepted and sent back as correction round 1.
