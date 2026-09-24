---
lane: follow-ups
title: "Follow-ups deferred from the Plan 13 correction sitting (Opus confirmation, tv/pick 463ce8d)"
state: planned
updated: 2026-09-11T19:45Z
---

Named follow-ups, none blocking, recorded so nothing is dropped silently. Each is a later lane on its scene branch.

1. featured (should-fix): the flip's 460 ms timeout is cleared only when scene 4 is re-entered, never on leaving it; if the display leaves scene 4 inside that window the timer relabels the next scene's eyebrow with "Featured Recognition". Fix: in both flip finishers return early when `!panel.isConnected || S.s !== 4` (cancelling the flip), and resolve the eyebrow from `panel.closest('.scene')`, not `sceneRoot`. A general `onLeave` hook in the scene descriptor would serve every scene.
2. featured and orbit (note): the remount guard reads `S.sceneAge`, which renderNow resets only after markup, so a non-keepAge re-render (safe-state recovery, clear) reuses the previous expression once. Fix: key the guard on a pass token set in mount.
3. featured and orbit (note): the shuffle bags use `Math.random`, so probe runs are no longer reproducible for scenes 4 and 10 (specs stub it). Option: seed from `randSeed(hashText(...))` plus a clock salt.
4. welcome, peacemakers, featured (note): one non-fitting record collapses the pass to a single reader bubble, as the baseline `rightBubbles()` did. Fix: draw the six from records that fit and reserve the reader for a mostly-long pool.
5. peace-in-practice (note): the heart is about 560 fills plus a sort per frame; if the TV stutters, halve `PIP_HEART_M` first.
6. peace-in-practice and peacemakers (note): four dead one-line wrappers (`peace_in_practice_hexToRgba`, `peacemakersMount`, `peacemakersIntegrate`, `peacemakersPlace`) only widen the shared global scope; delete them and add a CI grep for duplicate top-level names.
7. welcome (note): the stage clamp uses the rotated-square extent although a circle's bounding box does not grow under rotation, so entering and exiting bubbles sit up to 41 percent of a radius further inside than needed; use `a.d / 2 * scale`.
8. peacemakers (note): the integrate shorten-life rule lacks welcome's `a.born > 0` guard, so the first-wave stagger for actors 4 to 6 is rewritten to 14 to 20 s at once.
9. welcome (note): the ring's positive `animation-delay` leaves later rings frozen for up to 7.5 s; a negative delay gives the staggered spin at once.
10. calendar (pre-existing, Plan 13 coordinator ruling on Lane 0 objection 6): on the live display a day click both selects the day and advances the scene, so the selection is never seen; Anthony may overturn the ruling.
