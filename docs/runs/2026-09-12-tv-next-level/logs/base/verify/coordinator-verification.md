# Coordinator verification of Section A, tv15/base

Run by the coordinator (Opus 5 high) 2026-09-12, on the worktree /Users/anthony/.claude/worktrees/mothers-love-tv-base at tv15/base with rounds 1 and 2 applied. Not taken from the writer's report: every command was run here.

| Check | Result | Log |
|---|---|---|
| `npm run typecheck` | pass, exit 0 | verify/typecheck.out |
| `npm test` (vitest) | 39 files, 222 tests, all pass | verify/test.out |
| `npm run lint` | 18 problems (14 errors, 4 warnings) | verify/lint.out |
| lint baseline on tv/pick 463ce8d | 18 problems, identical | run in the mothers-love-tv-pick worktree |
| `node scripts/color-polish-globals-check.mjs` | pass, 20 files scanned, 181 declarations, no duplicates | verify/globals.out |
| `npm run build` | pass, exit 0 | verify/build.out |
| probe, 1920 and 3840, ms 0, 6000, 14000 | all six clean, `issues: []`, scenes `[1,2,4,5,8,6,7,9,10,11]` | verify/probe-w*-ms*.out |
| probe `--arrivals` | clean, singles 1,5,2,3,4,0 then groups 2,4,3,1,0, exactly the 463ce8d baseline | verify/probe-arrivals.out |
| scene, helpers and usable specs on an env-loaded production server (127.0.0.1:3140) | 83 passed, 2 failed | verify/e2e.out |

The `.env.local` file was copied into the worktree from the main checkout so the production server starts with real configuration; it is git-ignored and never committed.

## The two spec failures

**usable.spec.ts:409, "falls back after the color-polish API stays down for more than 60 seconds".** The single allowed failure, the runner's legacy-fallback artifact, recorded as such in Plan 13's run (docs/runs/2026-09-11-tv-scenes/INDEX.md: "63 of 64 on a production server (the one failure is the runner's legacy-fallback artifact)"). Not caused by this lane.

**helpers.spec.ts:77, "no two .orb-slot rectangles in scene 1 or scene 9 intersect".** A defect in the test the writer added, not in the code. The test queried `.orb-slot` document-wide. `requestScene` appends the new scene root and removes the old one only when the 1.15 s crossfade ends, so `#stage` briefly holds two `.scene` roots and a document-wide query returns both scenes' slots over the same stage.

The coordinator measured the geometry directly through a throwaway spec against the running server, then deleted it:

- Scene 9 returned five `.orb-slot` elements. Four are its own: widths 312, 320, 304 and 295 px, each with `data-grow-max` equal to its own width. The fifth, `slot-1`, is 586 px with no `data-grow-max` and a transform of `translate(1030.5px, 37px)`, which is precisely `readerSlot(r, 861, 37, 925, 586)` since 861 plus (925 minus 586) over 2 is 1030.5. That is welcome's reader bubble from the previous `loadRenderer` call, still in the DOM mid-transition.
- Within scene 9 alone, nothing crosses. slot-2 spans x 626 to 834, y 99 to 307 and slot-4 spans x 585 to 788, y 299 to 502: an overlap of 162 by 8, and 8 is inside the 20 px margin. slot-3 spans x 903 to 1116, y 101 to 314 and slot-5 spans x 1015 to 1192, y 314 to 491: zero vertical overlap.

Round 3 (orders/base-r2.md) scopes the query to `#stage .scene[data-scene="N"] .orb-slot`, steps past the crossfade, and asserts `#stage` holds exactly one `.scene` before measuring.

## One substantive finding from the measurement, for the record

Every `data-grow-max` in the `rightBubbles` grid equals its slot's original diameter, so **no slot in that grid can grow at all**: each is hemmed in by a neighbour, and the cap correctly refuses to let it cross. Decision 8's order of preference is intact (grow, then shrink, then paginate), but in this particular grid the first step yields nothing and the one-page fit depends entirely on the lowered 18 px font floor. Rough capacity at 312 px with an 18 px floor is on the order of 160 to 200 characters, so a 320 character message in that grid will still paginate. Garden is unaffected and is where the plan's 320 character bar actually lives: its long-record layout already opens a 508 px slot, which holds well over 320 characters at 18 px, and that slot can grow to 579 px before touching a neighbour. Welcome's grid grants its top-left slot 300 to 323 px, a real but small gain.

Nothing here contradicts the approved plan: decision 8 explicitly keeps pagination "when a message still overflows at the floor". It does mean the visible improvement Anthony will see on the tightly packed grids comes from smaller text, not bigger bubbles.
