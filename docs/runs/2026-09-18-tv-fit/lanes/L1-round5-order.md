# Work order: Plan 17 Lane 1 round 5, Welcome reserved long bubble (writer: fresh Claude Opus 5)

Plan goal line (outranks this order): "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."

Worktree (only place you write): /Users/anthony/.claude/worktrees/mothers-love-tv17-fit, branch tv17/fit, HEAD 71bf3f8 (round 4).
Read first: /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/decisions/2026-09-19T05-45Z-anthony-tv-watch-feedback.md, /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/lanes/L1.md (base order, hard rules, verify steps), /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/L1-review-round3.md (history of what failed).

## Allowlist
public/color-polish/scenes/welcome.js, welcome.css, tests/color-polish-scenes/welcome.spec.ts, tests/color-polish-scenes/text-fits.ts (only if Welcome needs it). Orbit and Goal files: do not touch; Anthony watched them on the TV and asked for no change. Anything else needed: stop and report, do not edit.

## What Anthony asked for after watching round 4 on the church TV
1. Welcome has exactly ONE reserved large bubble, and it is the only place a long message ever appears. The other bubbles only ever take messages that fit them whole. A long message never occupies, shrinks, displaces or pages any other bubble.
2. Every bubble holds its whole message: the bubble grows and the text steps smaller according to the message's grapheme count (Intl.Segmenter). Text never goes below 18 px drawn at 1920 (36 px at 3840). No truncation, clipping or ellipsis, ever.
3. "Long" means: does not fit whole in a regular bubble at the floor size. The reserved bubble is sized so a 500 grapheme message fits whole at the floor if the layout can hold that diameter without covering the hero art, title or other bubbles. Paging is the last resort, only inside the reserved bubble, with as few pages as possible, and only when all pages finish in the time left in the scene (dwell comes from S.dwell[1], default 40).
4. When no long message is in the pool, the reserved bubble shows a regular message at its larger size (never empty, never a gap).
5. Keep the approved look: circular bubbles, drift, sparkle, entrance and exit motion, six bubbles on screen whenever six fit whole.
6. Delete the round 3 and 4 cascade that defers, shrinks or pages regular bubbles to make room for long records (welcomeChooseSet shrink fallback and the room-for-<id> deferral). Simpler is the point of this round.

## Hard rules
All hard rules in L1.md stay. Fictional sample data only. Never copy /Users/anthony/Projects/mothers-love/.env.local into any worktree; tests use synthetic public config only. No em dash or en dash anywhere. Do not commit .tv17 scratch output.

## Verify (from the worktree root, npm_config_cache=/tmp/npm-cache)
npm run typecheck; npm test; npm run build; npx playwright test tests/color-polish-scenes/welcome.spec.ts tests/color-polish-scenes/orbit.spec.ts tests/color-polish-scenes/milestone.spec.ts; probe at --width=1920 and --width=3840 at --ms=0, 6000, 14000, 21000 into /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L1/after5. Spec must cover pools: all short; mixed with one 250, one 400, one 500 grapheme message; three long messages at once (they take turns in the reserved bubble, others unaffected). Assertions must be able to fail.

## Completion output
Commit on tv17/fit (message ends with "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"). Write /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/L1-writer-result-round5.md: changed files, how the reserved bubble and the size steps work (grapheme thresholds, diameters, font sizes), exact command results with counts, capture paths, limitations. Report facts, not a verdict.
