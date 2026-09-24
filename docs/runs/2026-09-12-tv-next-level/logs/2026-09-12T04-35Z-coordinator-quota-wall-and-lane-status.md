# The Antigravity rolling bucket, and where every lane stands

2026-09-12T04:35Z, coordinator (Opus 5 high).

## The quota wall

Section B's round 3 died mid-run with `error: Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 2m32s.` That is Antigravity's **rolling five-hour** bucket, not the weekly one. Live status at 04:28Z: `gemini_bucket` 100 percent resetting in about one minute, `gemini_weekly_bucket` only 49 percent, so there is ample weekly headroom and the rolling window is the binding constraint for the rest of this run.

No spill was needed and none was taken. The spill rule's first step is Gemini, which is already the writer here; the next step is Sonnet 5, and spending Claude's scarce weekly (74 percent) on implementation to save a ninety-second wait would have been the wrong trade. Waiting was correct. Five other lanes running at the same moment all survived, so the wall hit one dispatch rather than the batch.

**Operational lesson for the rest of the run:** the rolling bucket refills every five hours and the run is now spending it faster than a single lane at a time would. Keep at most five or six concurrent agy dispatches, and when a dispatch reports this error, read `gemini_bucket`'s countdown and relaunch after it rather than reaching for another provider.

Section B's partial work survived the wall: finding 1 was already written to `core/stage.js` and is correct, so round 4 (orders/transitions-r3.md) explicitly tells the writer not to touch `renderNow` again and to finish only findings 2 and 3.

## A bug two lanes found independently

`S.idCounter` is declared in `blankState()` and carried across snapshots, and **nothing in this renderer ever increments it.** Any seed of the form `randSeed(k + S.idCounter * n)` is therefore a constant.

- `core/transitions.js` reseeded its style bag that way, so the four transition styles were locked into one fixed four-step cycle forever.
- `scenes/orbit.js` reseeded its expression bag that way, which is why six fresh opens of the orbit scene showed the same centre expression every time (its spec caught exactly that: 1 distinct name where 2 were required).
- `core/arrivals.js` `nextStyle` relies on the same constant, and that is **deliberate and must not change**: it is why the renderer probe can assert a fixed arrival style sequence (singles 1,5,2,3,4,0 then groups 2,4,3,1,0).

Both correction rounds fold `Math.floor(S.t)` or a module-local counter into their own reseed, neither touches `blankState()`, and neither touches arrivals.

## Lane status

- A base: committed, tv15/base 3e89529. Verified. Landing review waived by Anthony.
- B transitions: committed 6c522c1, reviewed. Round 4 in flight for findings 2 and 3; finding 1 already written.
- C arrivals: committed 3ae1716, reviewed. Round 3 landed and verified clean: the production runtime interceptor is gone, the name shimmer is transform-only, and the `markShown` coverage is asserted through a log entry instead of internal state. Needs a spec re-run and a commit.
- 4 peacemakers: committed 30a7098, reviewed, **four blocking findings**, round 3 in flight. The central defect is that the pieces were never cut from globe.png, so Anthony's actual request is not yet implemented.
- 7 peace-in-practice: committed 6c60ffc, reviewed, two real findings (still-mode long messages showing only page one, and the cap eviction's fade being dead code). Round 2 landed; needs a spec re-run.
- 1 welcome, 3 featured, 8 orbit, 9 milestone: written, verified on the four commands and the probe, but each has real spec failures. All four correction rounds are in flight. Real defects among them: horizontal overflow in welcome (1833 against 1812) and its three speech bubbles sitting on the title's serif couplet; vertical overflow in featured (648 against 636) and its reader collapse still reachable; vertical overflow in orbit (653 against 636) plus the idCounter bug and an under-sized centre; and in milestone an empty stream verification, no `data-weekly` nodes, no seeded contributors, and a 6 px rail overflow.
- 5 status, 6 expressions, 2 garden: orders written (orders/status.md, expressions.md, garden.md), branches not yet cut, waiting on rolling-bucket headroom.
- Z pick and release: not started.

## Preview

The LAN preview at http://192.168.0.86:3100/display serves tv15/preview, a merge of tv15/base, tv15/arrivals, tv15/scene-peacemakers and tv15/scene-peace-in-practice. See logs/preview/README.md for the stale-server trap that made it look broken, and for the only reliable way to verify it boots.
