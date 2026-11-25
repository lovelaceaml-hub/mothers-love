# Two launch failure classes, and what changed

2026-09-11T23:45Z, coordinator (Opus 5 high).

## Failure 1: transport, both lanes at once

The first launch of Lane 0 and Section A, fired in the same minute, both died within about ten minutes with no files written and no usage limit involved:

- Section A: `error: There was a network issue connecting to the server, please try again.`
- Lane 0: `Post "https://daily-cloudcode-pa.googleapis.com/v1internal:streamGenerateContent?alt=sse": read tcp 192.168.4.25:51939->172.217.115.4:443: read: can't assign requested address`

`can't assign requested address` is a local socket failure, not a provider refusal. A curl to the same host answered in 0.16 s straight afterward, so the network itself was fine. Two agy processes opening streaming connections in the same instant is the only difference from the working Plan 13 pattern, which launched lanes one at a time.

**Change:** stagger every agy launch. Start one lane, confirm it is still alive after two minutes (past the connection phase), then start the next. This costs two minutes per lane and removes the whole failure class.

## Failure 2: the headless permission gate

Both lanes then hit `jetski: no output produced, a tool required the "command" permission that headless mode cannot prompt for, so it was auto-denied`. The gate at $HOME/.gemini/antigravity-cli/settings.json allows exactly these commands: ls, cat, pwd, find, grep, node, npm, git status, git diff, bash, python3, psql. Anything else ends the run with no printed output, even when file edits already succeeded.

The gate was **not** widened. Two order changes handled it instead:

- Lane 0 is a plan critic and needs no shell at all. Its order now forbids every shell command and tells it to use its file reading tool only.
- Section A's round 2 order names the four commands it may run, verbatim, and lists the common ones it must not reach for (mkdir, rm, sed, head, wc, npx, tsc, git, playwright). The previous round almost certainly died on `mkdir`, which this order's own acceptance item 6 had invited by asking for a temporary directory.

Widening the gate stays available as Anthony's call if a later lane genuinely needs a command outside that list; no lane in this sitting does.

## What survived

Section A attempt 2's file edits are intact in the worktree even though the process printed nothing: core/state.js, core/orbs.js, core/motion.js, core/stage.js, renderer.html, plus the new core/speech.js, core/speech.css and scripts/color-polish-globals-check.mjs. Items 1 to 5 of Section A are done. Round 2 (orders/base-r1.md) finishes item 6, runs verification, writes the record file, and fixes one defect the coordinator found reading the diff.

## Defect found in the diff, before any reviewer saw it

`drawSlots` in core/orbs.js grows a long record's slot toward `readerBounds` without checking the other slots in the same pass, so grown slots overlap. With the real `rightBubbles` positions, the slot at [1301,26,320] grows to 400 px (x 1301 to 1701, y 26 to 426) and crosses the slot at [1454,330,295] (x 1454 to 1749, y 330 to 625) by about 247 by 96 pixels; [885,23,312] and [824,323,304] collide the same way by about 243 by 100. Before this plan a long record triggered the reader collapse, so no overlap could occur; removing the collapse is what exposed it. Round 2's task 1 caps each slot's growth by the geometry of every other slot in the pass and adds a DOM no-overlap test.
