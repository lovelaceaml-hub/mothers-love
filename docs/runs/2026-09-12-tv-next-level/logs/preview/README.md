# The LAN preview server

Address: http://192.168.0.86:3100/display (the Mac's en0 address; it follows the network)
Branch served: tv15/preview in $HOME/.claude/worktrees/mothers-love-tv-pick
Pid file: lan.pid. Stop with `kill $(cat .../logs/preview/lan.pid)`.

## The stale-server trap, 2026-09-12T04:20Z

Anthony opened the address and saw the offline safe panel, "Connection not verified". The cause was not the code. A `next start` from the Plan 13 run (pid 5895, `npm exec next start -p 3100 -H 0.0.0.0`, uptime 1 day 10 hours) still held port 3100, so this run's `next start` died with EADDRINUSE and its log said so while the old process kept answering. That old server's data connection had long since gone stale, which is exactly what the offline panel reports.

Fix: `lsof -iTCP:3100 -sTCP:LISTEN -n -P` to find the real listener, kill it and its npm parent, then start fresh. **Check that listener before handing out the address**, because a 200 from `/display` proves only that something is answering, not that it is this run's build.

## Verifying the preview actually boots

The in-app browser cannot complete this app's host-to-renderer handshake: the renderer runs in an `iframe sandbox="allow-scripts"`, so it is cross-origin to the parent, and the pane returns a blank cream page even when the app is healthy. Do not read that as a failure.

Faithful check, run against the live server with the real API rather than mocked routes:

    npx playwright test tests/tmp-live --workers=1   # a throwaway spec, deleted afterward

It loads /display, waits for the host, finds the renderer frame and reads `colorPolishRuntime.getState()`. On the merged preview at 2026-09-12T04:25Z it reported `phase=active`, `{"mode":"normal","scene":1,"still":false,"initialized":true,"slots":1,"tvVisibility":"visible"}` and zero page or console errors. The renderer probe on the same merge was also clean: 10 scenes, no issues, and the globals check passed at 21 files and 228 declarations, which is the first evidence that the four merged branches do not collide.

`slots:1` there is expected on this merge: welcome still collapses a long record to one reader bubble, because Section 1's lane was not merged into the preview.

## Privacy note

This server reads the live campaign, so /display shows real recipients' names and messages. Do not save screenshots of it into the repository, and do not attach them to a report. The run's own evidence uses the synthetic fixtures instead.
