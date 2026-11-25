# Plan 17 Lane 13 follow-up: the Live Recognitions cards use the rail's text size

Writer: Claude Opus 5. Worktree $HOME/.claude/worktrees/mothers-love-tv17-h-live-feed, branch tv17/h-live-feed, cut from tv17/pick 2a75745. No database, no Supabase tool, no deploy, no preview. database/014 was not run and not touched. No .env file was created or copied; every check used the synthetic public config in .tv17/verify-studio.sh. Fictional sample data only.

Anthony, watching the full screen on the church TV (scene slug live-feed, renderer id 12): "good but the text size should be the same as the original". "The original" is the recognition rail at the bottom of every other screen. Only that changed. The panel still fills y 118 to 1055, the QR block is still inside it, the rail is still hidden under this screen only, the scroll is still continuous, the dwell is still read from state, the screen is still last in the rotation, and the reduced motion paging, empty state and privacy states are unchanged.

## Changed files (all three inside the allowlist)

- $HOME/.claude/worktrees/mothers-love-tv17-h-live-feed/public/color-polish/scenes/live-feed.css
- $HOME/.claude/worktrees/mothers-love-tv17-h-live-feed/public/color-polish/scenes/live-feed.js
- $HOME/.claude/worktrees/mothers-love-tv17-h-live-feed/tests/color-polish-scenes/live-feed.spec.ts

Nothing else was edited. renderer.css, core/chrome.js, the header, the rail itself, the playlist and every other scene are untouched.

One local, untracked helper folder was created in the worktree so the mandated checks could run: .tv17/verify-studio.sh (the same script as $HOME/Projects/mothers-love-worktrees/tv17-base/.tv17/verify-studio.sh, read from there, retyped with port 3217 instead of 3181 so two writers can verify at once; it contains synthetic public config only, no secret) and .tv17/measure.mjs (the measuring and capture script). Neither is committed.

## Before and after (drawn at 1920; every value doubles at 3840)

All of these now come from renderer.css, the rail's own file. live-feed.css no longer sets any of them.

| Card part | Rail (the original) | Full screen before | Full screen now |
| --- | --- | --- | --- |
| .chat-name | 18 px, letter spacing -.3px | 27 px, -.4px | 18 px, -.3px |
| .chat-message | 18 px, line height 23.4 px, margin 5px 0 | 26 px, 1.32, margin 8px 0 10px | 18 px, 23.4 px, 5px 0 |
| .chat-time | 11 px | 15 px | 11 px |
| .chat-foot (chips, likes) | 11 px | 16 px | 11 px |
| .chat-foot img | 16 x 16 | 22 x 22 | 16 x 16 |
| .chat-like .thumb | 12 x 12 | 17 x 17 | 12 x 12 |
| .chat-avatar | 29 x 29, 24 px icon | 44 x 44, 36 px icon | 29 x 29, 24 px icon |
| .chat-item padding | 8px 10px 8px 5px | 14px 18px 13px 10px | 8px 10px 8px 5px |
| .chat-item radius | 15px 20px 20px 4px | 22px 28px 28px 6px | 15px 20px 20px 4px |
| .chat-item grid, gap | 30 px column, 8 px | 46 px column, 12 px | 30 px column, 8 px |
| .chat-head gap | 7 px | 10 px | 7 px |
| space between cards | 9 px | 14 px | 9 px |

The only rule live-feed.css still writes for a card is `.lf-panel .chat-name { min-width: 0; overflow-wrap: anywhere; }`. That is not a size: it keeps one very long word in a name wrapping inside its card instead of pushing the card wide. No message, name, chip or time is ever shortened, clipped or ellipsized anywhere on this screen.

A card drawn here and a card drawn on the rail now measure the same height for the same message: 88.98 px for a one line message, both.

## Column count and measured card widths

Two columns, down from three. Measured in the running renderer at 1920 (not estimated), with the same sample pool:

| | Column 1 | Column 2 |
| --- | --- | --- |
| Rail column width | 765.5 px | 765.5 px |
| Rail card width | 763.5 px | 746.5 px |
| Full screen column width | 744.5 px | 744.5 px |
| Full screen card width | 742.5 px | 725.5 px |

A card here is 21 px narrower than the matching card on the rail, about 2.7 per cent. Three columns would have drawn a 490 px card, 36 per cent narrower than the rail's, which is what would have left long sparse lines. The gap between the columns is the rail's own 19 px, and the divider rule between them is the rail's own.

Lane height 854 px each, so a column holds about nine one line cards and the panel stays full.

## Scroll speed

5.5 px per second in both columns, which is exactly the rail's speed (`lane.offset += dt*5.5` in tickFeeds, core/chrome.js). Before this change the three columns ran at 22, 25 and 23.5 px per second, tuned for cards that were half again as tall. With rail sized cards the rail's own speed is the pace the work order asks for, and the two screens now drift at the same rate, which is what a viewer sees when the screen changes. In 60 seconds of dwell a column moves 330 px, about three cards.

The loop is still seamless: cards are appended until the column is covered plus a 260 px buffer, and the card that leaves the top is removed in the same frame its height is subtracted from the offset, so there is no gap and no jump. Measured offsets at 1920 with 100 records: 0 px at 0 s, 33 px at 6 s, 77 px at 14 s, then 17.52 px at 21 s after a 115.5 px card recycled. A column whose cards all fit still does not scroll and repeats nothing (three records: two cards in the first column, one in the second, both still).

The JavaScript constant for the space between cards was moved from 14 to 9 to match the CSS, because the scroll arithmetic uses it. Reduced motion paging, the 90 px overlap for a card taller than a column, the 260 px buffer and the dwell read from state are unchanged.

## QR block and panel title, for Anthony to decide separately

Both were left exactly as he approved them. They are still larger than the rail's:

| | Rail | This screen |
| --- | --- | --- |
| QR image | 130 x 130 | 236 x 236 |
| "Recognize Someone" | 18 px | 32 px |
| "Who encouraged you today?" | 13 px | 22 px |
| Address line | 11 px | 17 px |
| "LIVE RECOGNITIONS" title | 12 px | 20 px |
| "LIVE CAMPAIGN" note | 10 px | 13 px |

## The new assertions, and the proof they can fail

tests/color-polish-scenes/live-feed.spec.ts no longer asserts a 24 px minimum for message text. Instead a new helper, `cardShape`, reads one card out of the running renderer and returns its four text sizes plus the proportions around the text (name letter spacing, message line height and margin, card padding, radius, grid and gap, head gap, avatar and its icon, chip icon, like thumb). A new test at 1920 and at 3840 reads that shape from `.lf-panel` on this screen, then leaves for Welcome, waits for the rail to be back, reads the same shape from `.footer`, and requires the two to be equal, so the test fails if either side drifts. It then asserts the rail's own numbers explicitly (name 18, message 18, time 11, foot 11) and the drawn floor for the width (18 at 1920, 36 at 3840). The screen filling test reads the rail on Welcome at the end of its own run and compares every card it measured against that reading.

Kept unchanged: never truncated (every card's text is compared with its source record and `clipped` must be false), no overflow (`fits`, and the message box inside the card box), fits inside the panel (panel box, lane boxes, card boxes), the seamless loop (offsets move and recycle, nothing repeats in a fixed column, all 100 records get a turn), and the privacy states (Neutral, Quiet, unavailable, stale and expiry all clear every name and message and leave no `data-feed-id`).

Fail then pass proof, both runs through `bash .tv17/verify-studio.sh` against a production build:

1. With `.lf-panel .chat-message { font-size: 26px; }` and `.lf-panel .chat-time { font-size: 15px; }` added back to live-feed.css, the five size tests failed: the two size equality tests (`expect(panel).toEqual(rail)`, 3 differing keys, and `expect(rail.name).toBe(18)` receiving 26 through the panel comparison), the two screen filling tests (`expect(card.fontSize).toBe(railSizes.message)`, expected 18, received 26) and the 500 grapheme test (`expect(card.fontSize).toBe(18)`, received 26). 5 failed.
2. Those three lines removed again, the same spec: 18 passed, 0 failed.

## Command results (run by the writer, real counts)

All from $HOME/.claude/worktrees/mothers-love-tv17-h-live-feed with npm_config_cache=/tmp/npm-cache.

- `npm run typecheck`: clean.
- `npm test`: 40 files, 255 tests passed, 0 failed (the same count as tv17/pick; this change adds no unit test).
- `npm run build` (synthetic public config, no DATABASE_URL): succeeded.
- `bash .tv17/verify-studio.sh tests/color-polish-scenes/live-feed.spec.ts`: 18 passed, 0 failed (16 before; the two new size equality tests are the additions).
- `bash .tv17/verify-studio.sh tests/color-polish-scenes`: FOLDER_RESULT.
- The machine carried other lanes throughout (load average above 300), so wall times were long; no test needed a longer limit than the spec already had.
- The server on port 3217 was stopped by the script each time; nothing is left running.

## Captures (fictional data only; the writer looked at them)

$HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L13/text-size/

- `<pool>/w<1920|3840>-ms<0|6000|14000|21000>/live-feed.png` for pools `empty`, `three` (3 records), `hundred` (100 records) and `long` (12 records, four of them 500 graphemes): 32 images, 0 page errors.
- `rail-on-welcome/welcome-rail-w1920.png`: the Welcome screen with its recognition rail at 1920, for the side by side against `hundred/w1920-ms0/live-feed.png`. Put the two on screen together and the cards are the same size.
- `result.json`: the measured panel box, lane and card widths, every font size on both the rail and the panel, the QR and title sizes, and the scroll offsets for each case.

## Limitations

- Not yet seen on the church TV. That is Anthony's check, and nothing is released.
- The two columns scroll in step with each other, because they share the rail's single speed. The three column version drifted apart on purpose. If Anthony wants them to separate, one column can be slowed by a fraction of a pixel per second; it was left matching the rail because that is what "the same as the original" reads as.
- With rail sized cards a 500 grapheme message takes about nine lines and roughly a quarter of a column, so long messages read as blocks of small text. Every word is whole and nothing is cut, but that is a readability judgement only the TV can settle.
- The panel title and the QR block are still the larger sizes Anthony approved before, so they now sit noticeably above the card text. Sizes for both are listed above for a separate decision.
- Three records still leave most of the panel empty, unchanged by this work.
- database/014 remains written but never run, exactly as the handoff describes.
