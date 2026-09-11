# Sonnet 5 (high) landing review of Section 2 (commit 4898a40, capture.mjs and fixtures.mjs)

Verdict: CHANGES_REQUIRED, one actionable finding.

1. Dev server child cleanup (moderate): capture.mjs spawns `npm run dev` and kills only that npm process with SIGTERM in the finally block; the real `next dev` process is a grandchild, so a server the script started can be left bound to the port. Confirmed by the coordinator: the first re-capture on port 3101 left next-server pid 89127 listening after exit. Fix: spawn detached and kill the process group.
2. Informational: a uniform post-hold top-up pause pads every clip to target plus 2.6 s; every beat still lands inside the required window.
3. Informational: the TV beat's advance wait throws (exit 1) if the single click does not change the scene within 3 s; this is what the order specified.

Checked and found correct: catch-all 503 route registered first; reaction like request is PUT /api/reactions/<id> and the mock reply satisfies the decoder; recognitions, config and feed mocks pass the live decoders; the display fixture satisfies validateColorPolishSnapshot field by field (ascending deduped expressionIds, aggregate sums, goal formula); David K. is the first feed item and the like button name is stable; forced scale factor only on the phone browser; video path taken in the right order; no hardcoded project paths; no dashes; no new dependencies; writes only under docs/private/video/clips; admin and Studio never visited; fictional first name plus initial names only. No path found by which real data could reach a frame.
