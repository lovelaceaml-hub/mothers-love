# L9 review: Peacemakers, one reserved long bubble

Reviewer: Claude Fable 5.1 (single review, corrections made by the reviewer, no second round).
Worktree `/Users/anthony/.claude/worktrees/mothers-love-tv17-peacemakers`, branch `tv17/peacemakers`.
Reviewed commit 4ab5d71 (on tv17/pick 3d4b459). Corrections commit: bffea2b.

Plan goal line checked against: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."

## Findings

1. HIGH, corrected. The globe artwork was covered. The writer kept four bubbles by placing the third regular bubble at 528, 320 (295 px), directly on the globe and the children holding hands. A 60 second simulation showed it got worse over time: the 572 px reserved bubble pushes the drifting bubbles left, and by 45 seconds two bubbles sat on the artwork and the globe was almost fully hidden. The writer's capture at `L9/after/w1920-ms6000/peacemakers.png` already shows the two middle children covered. This breaks "everything else stays as the live TV shows it" and the order's focal area rule. The writer's geometry spec only checked the reserved bubble against the art box, so it passed.
2. MEDIUM, corrected. Reserved bubble turnover left its place empty. For another very long message the writer used the live drift replacement: the 572 px bubble flew off the stage and the next one flew in, about 7.6 seconds with a hole where the biggest bubble belongs, and the incoming bubble could cross the heading and the globe on its way in.
3. MEDIUM, corrected. No check of the time left in the scene. In the simulation a 320 grapheme message (22.9 seconds to read) settled in the reserved bubble at 44.5 seconds of a 60 second showing, so the scene ended before it could be read.
4. MEDIUM, corrected (the judgement call). The reserved bubble never refreshed when no very long message was waiting, so the biggest bubble on the screen showed one short message for the full 60 seconds. With a single very long message in the pool it would also have held that one message for the whole showing, every showing. Ruling: this does not serve the owner; it now refreshes.
5. LOW, no change needed. Fit measurement (`peacemakersFitsWhole`) mirrors `core/orbs.js fitCircle()` correctly; verified by the whole-message, one-page and no-overflow assertions with 250, 400 and 500 grapheme messages. The coupling to the core's constants is a real maintenance risk (writer's limitation 3 stands).
6. Verified as claimed: exactly one reserved bubble; a very long recognition only ever appears in it; regular bubbles only take messages that fit whole; 500 graphemes whole on one page at 23 px (46 px at 3840), floor never reached; nothing truncated, clipped or ellipsized; dwell read from state (45 second fixture reports 45); reserved bubble inside the stage, clear of header, feed rail, heading and countdown ring; only the three allowlisted files changed; no em dash or en dash in the diff or commit messages; fictional data only; the writer's two mutation claims were plausible and the assertions can fail.

## What I changed (all inside the allowlist)

- `public/color-polish/scenes/peacemakers.js`
  - Two regular bubbles (860, 14, 312 and 860, 326, 304) instead of three. With a 572 px reserved bubble there is no room for a third production-size bubble anywhere except on the globe. The screen now shows three bubbles: one reserved, two regular.
  - A second keep-out box over the globe's focal area (x 346, y 213, w 415, h 423), steered with production's own keep-out mechanism. The title keep-out box is unchanged.
  - The reserved bubble changes its message where it stands: the words fade out (0.6 s), the core's `installNext()` installs and fits the next message, the words fade in (0.9 s). The bubble never leaves, so it is never empty. The core's drift replacement can no longer take it (`retireAt = Infinity`).
  - Turn order: another very long recognition first; if none is waiting, a regular message takes a turn. A message stays at least 18 seconds, or its whole reading time if longer. At the next showing a very long recognition gets the first turn again.
  - Time left rule: a message is only taken if its reading time fits in what is left of the scene's dwell, read from state (`S.dwell`, `S.sceneAge`). When the scene is held (rotation paused or operator pinned) there is no limit.
  - The `peacemakers_reserved` log line now also fires on every turn, with `when` and `sceneAge`.
- `public/color-polish/scenes/peacemakers.css`: the two fade rules, scoped to scene 8, off in still mode and under reduced motion.
- `tests/color-polish-scenes/peacemakers.spec.ts`: 19 cases (was 17). Geometry updated to two regular bubbles. New or replaced cases: reserved bubble refreshes in place and is never empty or moved across 56 seconds; on the live playlist every message in the reserved bubble arrives with time to be read (`sceneAge + readSeconds <= dwell`); across 60 seconds no steady drifting bubble sits more than 24 px over the globe focal area or the reserved bubble (measured worst case: 6 px and 7 px); reduced motion keeps every bubble and message unchanged over 40 seconds with the very long message whole; keep-out expects both boxes.
- Mutation checks on my new assertions, all reverted: removing the time left rule failed the live playlist case; removing the globe keep-out failed the 60 second drift case; removing the regular-message turn failed the refresh case.

## Command results (after corrections, run in the worktree, npm_config_cache=/tmp/npm-cache)

- `npm run typecheck`: exit 0, no diagnostics.
- `npm test`: 39 files passed, 222 tests passed, 0 failed.
- `npm run build`: exit 0.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3197 npx playwright test tests/color-polish-scenes/peacemakers.spec.ts --workers=3`: 19 passed, 0 failed (1.3 min). The unused port only stops Playwright from starting a dev server; the spec serves `public/color-polish` from disk, so no server was started or left running.
- Probe, 8 runs (1920 and 3840 at ms 0, 6000, 14000, 21000): every run `"issues":[]`, all ten scenes rendered.
- Captures: `/Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L9/reviewed/w<width>-ms<ms>/peacemakers.png`. At ms 21000 the reserved bubble already shows its second message, with the globe fully visible.

Measured in a 60 second simulation: all-short pool, the reserved bubble showed three messages (turns at about 18 and 37 seconds); 500 grapheme message first, it stayed 35.7 seconds, then a 320 grapheme message took over at scene age 36.3 with 22.9 seconds of reading and 23.7 seconds left.

## For the owner

1. The screen now shows three bubbles (one big, two regular), not four. Live shows either four small bubbles or one big bubble alone. Four bubbles plus a 572 px reserved bubble cannot fit without covering the globe. If four is wanted, the reserved bubble has to shrink, which lowers the font for 500 grapheme messages toward the 18 px floor.
2. The drifting bubbles now also avoid the globe, which is a small motion change from live, forced by the reserved bubble taking the right side. A bubble flying in from the left can still cross the artwork for a few seconds, as on live.
3. The probe's sample pool has no very long message, so the captures show the regular-message case; the very long cases are proven by the spec, not by captures.
4. A message with an extreme shape (80 grapheme name, many expressions, 500 wide characters) may still not fit whole at 18 px; the core's paging inside the reserved bubble remains the last resort. Not observed with ordinary messages.
5. Nothing was deployed, no database was touched, no physical TV check was run.
