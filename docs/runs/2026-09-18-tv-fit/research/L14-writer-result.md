# Lane 14 writer result: the entrance composition fills the whole screen

Writer: Claude Fable 5.1 (no separate review, owner's ruling; self verified, screenshots looked at).
Plan goal line checked first: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV." This lane is Anthony's named change to the entrance and does not work against that line. Nothing was deployed.

Worktree $HOME/.claude/worktrees/mothers-love-tv17-arrival, branch tv17/arrival, tv17/pick (592a405) merged in first, no package file changed so npm ci was not needed.

## Changed files (allowlist only)
- $HOME/.claude/worktrees/mothers-love-tv17-arrival/public/color-polish/scenes/arrival.css
- $HOME/.claude/worktrees/mothers-love-tv17-arrival/public/color-polish/scenes/arrival.js
- $HOME/.claude/worktrees/mothers-love-tv17-arrival/public/color-polish/core/arrivals.js
- $HOME/.claude/worktrees/mothers-love-tv17-arrival/tests/color-polish-scenes/arrival.spec.ts
- renderer.css was NOT touched. The old box rule stays there; arrival.css outranks it with `#tv .event-stage`.

## Geometry before and after (TV units, 1920 by 1080)
| Item | Before | After |
| --- | --- | --- |
| Arrival frame and panel | x 54 to 1866, y 148 to 763 (1812 by 615) | x 54 to 1866, y 54 to 1026 (1812 by 972), 54 px margin on all four sides, centre y 540 |
| Single orb | 540 wide, centre TV 1124,458 | 760 wide, centre TV 1354,540 |
| Group orbs (5 by 2) | 258 wide, rows at TV y 332 and 618 | 300 wide, rows at TV y 350 and 738, orbs span TV y 200 to 888 |
| Long message pairs | 518 wide | 720 wide, centre TV y 544 |
| Single headline | 53 px, paragraph 23, eyebrow 15, kicker 14, caption 15 | 74, 32, 21, 20, 20; headline block centred top to bottom |
| Group title and caption | 29 px, caption 13 top right | 42 px, caption 18 moved to bottom left |
| Orb words | message up to 28, name 49 (group 18.5 and 25) | same layout, drawn 1.41 times larger single (about 39 and 69), 1.16 group (about 21.5 and 29), 1.39 pairs. Floor 18 px layout becomes 25 px drawn single, 20.9 group |
| Waiting pill | TV y 108 to 144, right 52 (above the old box) | top right corner inside the frame, TV y 72 to 108, right 78, clear of every orb and ring |
| Sparkle canvas | 1812 by 615 | 1812 by 972 |

How: orbs are still laid out at their old sizes (540, 258, 518), so circular fitting and paging in core/orbs.js behave exactly as before, and are drawn larger through a scale factor in the orb's transform. Every entrance path, particle ring, frame style decoration (beam, petals, aurora stars, constellation) was moved to the new box and its centre. Timing, waves, shimmer and ring are unchanged in code. The exit flight still computes its target from the rail's real position; the ring now shrinks with its orb on the way out so it never sweeps past a screen edge. A flight toward the viewer now swells the large orb only a little (30 percent of the old swell).

## Command results (run from the worktree, npm_config_cache=/tmp/npm-cache)
- npm run typecheck: exit 0.
- npm test: 40 files passed, 255 tests passed.
- npm run build: exit 0.
- npx playwright test arrival.spec.ts transitions.spec.ts stage-edges.spec.ts --workers=1: 46 passed, 0 failed (8.2 min): 29 arrival, 7 transitions, 10 stage-edges. Earlier runs during the work: 41 passed 5 failed (old assumptions in three existing tests plus my own pair layout 15 px off centre, all fixed), then 46 passed twice.
- No server was started: these specs serve public/color-polish from disk through Playwright routing; PLAYWRIGHT_BASE_URL pointed at unused port 3214 only to skip the config's own web server. Nothing left listening. .env.local never read or copied, no database touched.

## Tests added or changed in arrival.spec.ts
- New, at 1920 and 3840: all 11 waves with every frame style for single and group. Frame margins 54 on all sides, centre y 540, orbs larger than before by at least 15 percent, orbs plus rings inside the frame, orbs centred within 12 px and spanning at least 680 px of height, whole composition reaching within 60 px of both margins and centred within 12 px, headline centred, every word size at or above the old size, message drawn at 18 px or more (36 at 3840), words clear of orbs, pill in the top right corner, readable, clear of orbs, rings and words.
- New, at 1920 and 3840: 500 grapheme message, single and group pairs, same checks, pages verbatim.
- New: exit flight lands within 24 px of the rail target, ring never passes a screen edge.
- Changed: "resolve flat" now expects the fixed drawn over layout factor instead of 1. The header and rail test now hides the header and footer and compares screenshots (0 to 50 stray pixels allowed, more than 5000 required once uncovered), because the arrival's own orbs and caption now legitimately sit over the rail band. Frame style capture test runs at both widths with the new panel clip. Lane 11's quiet and unavailable clearing tests pass unchanged.
- Mutation checks (files restored after): old box in arrival.css fails "top margin, expected 54, received 148"; backdrop z-index lowered to 31 fails the hide and compare with 394917 pixels; ring shrink removed fails with 211 px overflow.

## Captures
$HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L14/after (36 PNGs): for w1920 and w3840, single and group at arrival-start, arrival-mid-flight, arrival-exit-flight, arrival-cleared; all four frame styles (frame-0-light-beam, frame-1-petal-curtain, frame-2-aurora, frame-3-constellation-gather) for single and group; single-long-500 and group-pair-long-500. Looked at: single and group in several frame styles, mid flight, exit flight, 3840 single, both 500 grapheme frames.

## Limitations
- The four moments (start, mid flight, exit, cleared) were captured in one frame style per kind; the four frame styles were captured at the reading moment. Not every moment times every style.
- During a flight (for example Comet sweep) the large orb still crosses the top or right screen edge for a moment as it swoops in from off screen, as flights did before. The resting composition and the exit are fully on screen (tested).
- A 500 grapheme message is shown in pages, as before this lane; the small page indicator under the chips is not visible in the long message captures. That lives in core/orbs.js, outside this lane's allowlist, and is unchanged behaviour.
- The group orbs grew from 258 to 300 only, because five across is limited by the screen width.
- The old tracked screenshots under docs/runs/2026-09-12-tv-next-level/logs/arrival are rewritten by an existing test on every run; they were restored, not committed.
- Headless Chromium at 1920 and 3840 only. The church TV has not been looked at; Anthony's look remains the real check.
