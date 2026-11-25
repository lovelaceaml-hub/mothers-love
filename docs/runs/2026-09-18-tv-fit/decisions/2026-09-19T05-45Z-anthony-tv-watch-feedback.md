# Anthony's church TV watch of preview a7ca45d (2026-09-19 about 05:40Z)

Preview watched: https://mothers-love-ea1g20zjs-lvzion.vercel.app/display (tv17/preview-all a7ca45d).

Anthony's words, condensed:
1. Welcome: "just have one bubble and reserve it only for the long expressions", so long messages do not take the other spaces and do not need many pages. Bubbles hold their whole phrase: a bubble gets bigger and its text gets smaller depending on how many characters the recognition has.
2. Featured recognition is good, but the far left side is cut off. Common on every screen: the recognition area's margin should run end to end.
3. Recognition calendar is good.
4. Entrances (the new recognition arrival): he does not like the darkened background. It should be bright and heavenly, and it should cover the whole screen, including over the live recognition scrolling, not just the recognition area.

Coordinator reading and effect:
- Item 1 replaces rulings "Pages, long only" and "Fewer, whole" for Welcome's layout: one reserved large bubble is the only place a long message appears; the other bubbles only ever take messages that fit whole. Per-bubble sizing: diameter grows and font size steps down with grapheme count, never below the 18 px floor at 1920 (36 px at 3840). Paging remains only as the last resort inside the reserved bubble. Goes to Lane 1 round 5.
- Item 2 cause found: renderer.css `.stage { overflow:hidden }` on a stage inset 54 px from the screen edges clips glows and cards with a hard vertical edge (visible at x=54 in logs/captures/L3-after2/w1920-ms6000/featured.png). New Lane 5.
- Item 4: scenes/arrival.css paints a near-black backdrop (rgba(14,18,17,0.9)) confined to .event-stage. New Lane 5 (same lane, since both touch renderer.css). This overrides Plan 17's "header, feed rail untouched" line for the arrival overlay only; the feed rail itself is not changed.
- Items "Featured good" and "Calendar good" recorded; Orbit, Goal, Garden, Status, Words that bring peace, Peacemakers, Peace in Practice drew no comment.

## Second message from Anthony (about 06:00Z), same TV watch
5. Peacemakers: one big bubble reserved for the very long recognitions, so they fit in the bubble.
6. Words that bring peace (nine expressions): the change between views "is not smooth and just cuts out"; the cards should smoothly move and switch places when one is enlarging.
7. Peace in Practice: also one reserved large bubble for the long recognitions.
8. Expression Orbit: the orbiting bubbles need to be smaller. The expression symbols and images need to revolve around the recognition; right now they go behind it (seen in logs/captures/L1/after3/w1920-ms6000/orbit.png: the small symbol medallions slide behind the bubble text).
9. Goal page: the swirling recognitions need to be fuller, with more bubbles.

Effect: items 5 and 7 are Anthony-named changes on top of Plan 17 decision 9 (everything else on those two scenes stays as live). Item 6 is an Anthony-named change to the view switch only; Lane 2's tilt and drift constants and edge insets stay. Items 8 and 9 go to a new Lane 6 on Lane 1's Orbit and Goal files (separate worktree, since the Lane 1 round 5 writer holds the fit worktree for Welcome). Items 5 to 7 go to a new Lane 7.

## Third message from Anthony (about 06:55Z)
10. Peace in Practice: "The big rotating heart ... needs to actually be a 3D heart. When it spins around it shows as a flat heart. It needs to be fully 3D." Sent to the running Lane 10 writer as work item 5 (true volume at every spin angle, same size, place, colours and spin; local techniques only, no network loads; reduced motion shows a still shaded heart; frames at 0, 45, 90, 135, 180 degrees filed under logs/captures/L10/heart).

## Fourth message from Anthony (about 07:15Z): a new scene
11. "I want to create another scene. It's the live recognition scrolling but it fills the screen up to the header title."
Coordinator finding: this is an eleventh playlist screen. The saved playlist is validated in the shared production database by mothers_love.ml_color_polish_valid_playlist, which requires exactly 10 entries (database/011_color_polish.sql line 78), and the scene list is fixed in src/lib/color-polish/contracts.ts, the admin Studio and the renderer. Plan 17's envelope says no database change in this plan. Not started; asked Anthony whether it rides this release or becomes the next plan.
Anthony answer (about 07:25Z): "2", build the new screen in this release. Lane 13 opened (Fable 5.1 writer, no review, worktree $HOME/.claude/worktrees/mothers-love-tv17-live-feed). The database change is written to files only; Anthony is asked again before anything runs against the live database. He also asked for the group entrance on its own link (sent to Lane 12 and Lane 11).
