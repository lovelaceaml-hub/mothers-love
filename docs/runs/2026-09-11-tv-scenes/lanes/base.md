---
lane: base
title: Section 0, Foundation split, no visual change
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-base
review: "sonnet-5 high on landing"
depends_on: none
updated: 2026-09-11T02:10Z
---
## Files moved
| New file | Old renderer.js lines | Symbols |
| --- | --- | --- |
| public/color-polish/core/state.js | 1-29, 33-134, 203, 356-357, 599-619 | COLOR_POLISH_VERSION, ASSETS, catalog, $, esc, clamp, lerp, ease, fmt, ZONE, NAMES, ORDER, DWELL, GUIDANCE, THUMB, heartSVG, icon, art, medallion, shimmer, chips, heading, localDay, weekKey, submittedStamp, monthKey, monthLabel, fullDateLabel, daysInMonth, sum, EMPTY_AGGREGATE, blankState, S, active, transition, slots, sceneRoot, eduCards, numberNodes, numCache, feedLanes, particles, heartRenderer, hearts, tributes, lastFrame, frozen, parentPort, parentOrigin, expectedSequence, bootstrapNonce, initialized, reducedMotionPreferred, lastManualAdvanceAt, motionStill, qaLog, log, finiteNumber, safeText, safeEpoch, normalizedAggregate, normalizedRecord, calendarDay, normalizedDays, normalizedPlaylist, normalizedDurations, snapshotClock, selectedDayFor, thresholdFor, sceneNumber, usableSnapshot, safeQrDataUrl, setStateFromSnapshot, effectiveNow, eligible, records, totals, lowest, goal, hasReaction, reactionWord, reactionTotal, reactionMarkup, numberValue, num, bindNumbers, refreshNumbers, tickNumbers, choose, recordsChanged, captureMilestone, V, playbackRate, TAU, randSeed, hashText, mix, smooth, outCubic, curve, MOTION_ORDER, SCENE_NUMBERS |
| public/color-polish/core/orbs.js | 135-145, 157-165, 200, 276-277, 621-650 | completeOrb, addOrb, smallFits, emptyPanel, readerSlot, rightBubbles, safeScene, checkFullFits, fullReader, fitCircle, tickCirclePages |
| public/color-polish/core/motion.js | 309-310, 311-331, 337-342, 484-485, 651-738, 771-793 | swapSlot, tickSlots, emit, drawSpark, mountFloaters, forbidden, steerOutside, integrateFloaters, renderFloaters, replaceActor, installNext, burstAt, drawHeartParticle, drawSceneFX |
| public/color-polish/core/chrome.js | 385-392, 486-488, 510-537 | chatMarkup, initFeed, addFeed, tickFeeds, getScale, updateHeader, renderQueue, drawAtmosphere, SCENE_COUNTDOWN_RADIUS, SCENE_COUNTDOWN_CIRCUMFERENCE, sceneCountdownDwell, sceneCountdownHidden, updateSceneCountdown |
| public/color-polish/core/arrivals.js | 204, 393-483, 849-867, 913-918 | cancelActiveEvent, beginEvent, buildEvent, buildGroupPage, tickEvent, endChain, drawEventParticles, nextStyle, eventElement, positionEvent |
| public/color-polish/core/stage.js | 202, 245-275, 278-308, 551-582, 919-940 | SCENES, registerScene, sceneDescriptor, renderNow, postRender, requestScene, nextPlaylistEntry, manualAdvance, manualAdvanceKey, tickTransition, changeWeek, coordinator, updateNotes, applyStill, size, drawAccum, frame, changeRate, visualState, stepRuntime, runtimeState, window.colorPolishRuntime |
| public/color-polish/core/host.js | 205-244, 496-509, 538-550 | pruneRemovedIds, preserveRuntimeState, applySnapshotPayload, postReady, validEnvelope, receivePortMessage, receiveBootstrap, validBootstrap, clearPresentation, mandatoryPrune, window.addEventListener('message', receiveBootstrap) |
| public/color-polish/scenes/welcome.js | 166 | welcome, registerScene(1) |
| public/color-polish/scenes/garden.js | 146-156, 332-336, 739-770 | garden, mountGarden, gardenGlow, plant, drawGarden, gardenReplace, registerScene(2) |
| public/color-polish/scenes/arrival.js | 30-32, 197-199, 868-912 | SINGLE_STYLES, GROUP_STYLES, GROUP_TITLES, arrivalScene, singleTrajectory, groupTrajectory, registerScene(3) |
| public/color-polish/scenes/featured.js | 167-176 | featured, registerScene(4) |
| public/color-polish/scenes/calendar.js | 177-178, 201, 263 | calendarScene, selectDay, mount, registerScene(5) |
| public/color-polish/scenes/status.js | 179, 794-799 | statusScene, mountStatus, tickStatus, registerScene(6) |
| public/color-polish/scenes/expressions.js | 180, 265, 343-353 | nineScene, tickEducation, mount, tickAge, registerScene(7) |
| public/color-polish/scenes/peacemakers.js | 182 | peacemakers, registerScene(8) |
| public/color-polish/scenes/peace-in-practice.js | 181, 266, 489-495 | peaceScene, mountHearts, tickHearts, mountHeart, createHeart, mount, registerScene(9) |
| public/color-polish/scenes/orbit.js | 183-191, 267, 800-827 | orbitScene, mountOrbit, projectOrbit, tickOrbit, mount, registerScene(10) |
| public/color-polish/scenes/milestone.js | 192-196, 268, 354-355, 358-384, 828-848 | nextMilestone, milestoneScene, formatDayRange, updateGoalDOM, mountTributes, tickTributes, contributorPool, tributeContent, drawStream, mount, registerScene(11) |
| public/color-polish/boot.js | 583-598, 941 | init, init() call |
| public/color-polish/boot.js (round 2) | 243, 930-940 | window.addEventListener('message', receiveBootstrap), window.colorPolishRuntime (moved from host.js and stage.js so the runtime is exposed only after every script loads) |

## Branch conversions
| Old line | Old branch | Descriptor field | Scenes registering it |
| --- | --- | --- | --- |
| 248, 283 | `renderers[id]()` | `markup` | 1 Welcome, 2 Recognition Garden, 3 Recognition Arrival, 4 Featured Expressions, 5 Recognition Calendar, 6 Participation Status, 7 The Nine Expressions, 8 We Are Peacemakers, 9 Peace in Practice, 10 Expression Orbit, 11 Milestone and Weekly Goal |
| 255 | `next:S.s===2?14:12` | `replaceEvery` | 2 Recognition Garden (14; others default to 12) |
| 256 | `[5,6,7,10,11].includes(S.s)?'.13':'.52'` | `archOpacity` | 5 Recognition Calendar, 6 Participation Status, 7 The Nine Expressions, 10 Expression Orbit, 11 Milestone and Weekly Goal ('.13'; others default to '.52') |
| 261 | `if([1,2,3,4,8,9].includes(S.s))mountFloaters()` | `floaters` | 1 Welcome, 2 Recognition Garden, 3 Recognition Arrival, 4 Featured Expressions, 8 We Are Peacemakers, 9 Peace in Practice (true) |
| 262 | `if(S.s===2)mountGarden()` | `mount` | 2 Recognition Garden (mountGarden) |
| 263 | `if(S.s===5)...` (past day loop) | `mount` | 5 Recognition Calendar (past day styling and delegated data-day click) |
| 264 | `if(S.s===6)mountStatus()` | `mount` | 6 Participation Status (mountStatus) |
| 265 | `if(S.s===7){eduCards=...;tickEducation()}` | `mount` | 7 The Nine Expressions (eduCards binding and tickEducation) |
| 266 | `if(S.s===9){mountHeart();mountHearts()}` | `mount` | 9 Peace in Practice (mountHeart, mountHearts) |
| 267 | `if(S.s===10)mountOrbit()` | `mount` | 10 Expression Orbit (mountOrbit) |
| 268 | `if(S.s===11){mountTributes();updateGoalDOM()}` | `mount` | 11 Milestone and Weekly Goal (mountTributes, updateGoalDOM) |
| 270 | `if([1,2,3,4,8,9].includes(S.s))` (attach .scene-fx canvas) | `fxCanvas` | 1 Welcome, 2 Recognition Garden, 3 Recognition Arrival, 4 Featured Expressions, 8 We Are Peacemakers, 9 Peace in Practice (true) |
| 271 | `if(S.s===10)tickOrbit(0)` | `prime` | 10 Expression Orbit (tickOrbit) |
| 272 | `if(S.s===11)tickTributes(0)` | `prime` | 11 Milestone and Weekly Goal (tickTributes) |
| 309 | `if(S.s===2&&!smallFits(r))` (in swapSlot) | `entrance` | 2 Recognition Garden ('sprout') |
| 314 | `if(S.s===10){tickOrbit(dt);return}` | `tick` | 10 Expression Orbit (tickOrbit) |
| 315 | `if(S.s===6){tickStatus(dt);return}` | `tick` | 6 Participation Status (tickStatus) |
| 316 | `if(![1,2,3,4,8,9].includes(S.s))return` | `floaters` | 1 Welcome, 2 Recognition Garden, 3 Recognition Arrival, 4 Featured Expressions, 8 We Are Peacemakers, 9 Peace in Practice (true) |
| 324 | `const kind=S.s===2?'petals':'hearts'` | `burst` | 2 Recognition Garden ('petals'; others default to 'hearts') |
| 325 | `if(S.s===2){...}` (pending plant and return spark) | `onRetire` | 2 Recognition Garden |
| 332-336 | `if(S.s===2&&V.clock>=V.next){...}` | `replaceMode` | 2 Recognition Garden ('garden', invoking gardenReplace) |
| 337-340 | `else if([4,8,9].includes(S.s)){...}` | `replaceMode` | 4 Featured Expressions ('drift'), 8 We Are Peacemakers ('drift'), 9 Peace in Practice ('hearts'), 1 Welcome (null), 3 Recognition Arrival (null) |
| 341 | `if(S.s===2)drawGarden()` | `draw` | 2 Recognition Garden (drawGarden) |
| 561 | `if(S.s===7){S.eduAge+=dt;tickEducation()}` | `tickAge` | 7 The Nine Expressions (tickAge) |
| 655 | `if(S.s===3)a.pace=0` | `pace` | 3 Recognition Arrival (0) |
| 662-666 | `forbidden(a)` scene checks (4, 1, 8, 9, 2) | `keepOut` | 1 Welcome, 2 Recognition Garden, 4 Featured Expressions, 8 We Are Peacemakers, 9 Peace in Practice |
| 687 | `top=S.s===2||S.s===4?87:7` | `topMargin` | 2 Recognition Garden (87), 4 Featured Expressions (87; others default to 7) |
| 734 | `if(S.s===2){...sprout...}else{...entering...}` | `entrance` | 2 Recognition Garden ('sprout'; others default to 'entering') |

## Descriptor fields
- `markup`: Function returning the HTML string for the scene layout and initial content.
- `mount`: Optional callback (sceneRoot) => void run once when the scene mounts in postRender to initialize DOM bindings or listeners.
- `tick`: Optional callback (dt) => void called per frame from tickSlots(dt) that short-circuits the floater pipeline for custom animated scenes (status and orbit).
- `draw`: Optional callback (dt) => void called per frame at the end of tickSlots(dt) to draw per-frame canvas graphics (garden).
- `prime`: Optional callback (0) => void called once during postRender after canvas setup to render initial frame state before animation begins (orbit and milestone).
- `tickAge`: Optional callback (dt) => void called per frame from coordinator to advance scene-specific age timers (expressions).
- `floaters`: Boolean indicating whether the scene mounts and simulates floating bubbles in postRender and tickSlots.
- `fxCanvas`: Boolean indicating whether the scene creates and appends the .scene-fx canvas overlay.
- `archOpacity`: CSS opacity string set on #arch during postRender (defaults to '.52', '.13' for calendar, status, expressions, orbit, milestone).
- `topMargin`: Top collision ceiling coordinate in pixels for floating bubbles in integrateFloaters (defaults to 7, 87 for garden and featured).
- `pace`: Fixed speed scalar override in mountFloaters (defaults to null, 0 for arrival).
- `replaceEvery`: Initial clock delay in seconds before the first bubble replacement cycle in postRender (defaults to null, falling back to 12; 14 for garden).
- `replaceMode`: Replacement behavior strategy in tickSlots: 'garden' (flower planting cycle), 'drift' (exit drift), 'hearts' (swelling heart exit), or null (no replacement).
- `entrance`: Spawning entrance method in installNext and swapSlot: 'sprout' (rising from soil) or 'entering' (viewport boundary entrance).
- `burst`: Particle burst visual style upon bubble retirement in tickSlots: 'petals' or 'hearts'.
- `keepOut`: Function returning an array of {x,y,w,h} bounding boxes where floating bubbles may not navigate.
- `integrate`: Optional per-actor physics override hook in integrateFloaters(dt); returns boolean to skip default physics.
- `place`: Optional per-actor layout override hook in renderFloaters; returns boolean to skip default CSS transforms.
- `onRetire`: Optional callback invoked when a bubble bursts in tickSlots (used by garden to plant flowers and emit return sparks).

## Unassigned lines
none

## Coordinator verification (Fable 5.1)
- tv/base cut from 626ee3d (codex/color-polish-v6 HEAD, code identical to 1532068). Writer: Gemini 3.8 Flash (High) via agy in two dispatches (agy-base-20260911, then -r1 for this record and the CSS headers; the first ended on a headless-denied command after writing every file). renderer.js deleted by the coordinator after the record was written.
- Before-split probe baseline: two identical passes (logs/base/before/run1, run2), six configs plus arrivals each; every result.json state identical between passes; 37 of 70 PNGs byte-identical, 33 vary between identical runs (logs/base/before/determinism.txt).
- After-split (logs/base/after): result.json states identical to before for all 10 scenes in all six configs and in the arrivals run; arrival style sequence identical (singles 1,5,2,3,4,0; groups 2,4,3,1,0). Of the 37 deterministic PNGs, 27 byte-identical and 10 differ by at most 68 pixels of 2,073,600 (0.003 percent), every differing pixel inside the feed rail text region (y 829 to 1040 at 1920), so text antialiasing noise rather than scene change.
- Syntax: node --check clean on all 19 scripts. grep for S.s=== and includes(S.s) in core/*.js and boot.js: none left.
- typecheck: pass. test: pass (vitest). lint: 18 problems (14 errors, 4 warnings), identical count and files on the untouched main checkout at 626ee3d, so pre-existing (react-hooks rules in src/, not touched by this lane). build and test:e2e: first run failed only because Turbopack rejects a symlinked node_modules; rerun after npm ci in the worktree recorded below.
- build: pass after npm ci. test:e2e like-for-like (full suite, same env): baseline main checkout 70 failed, 88 passed, 4 skipped, 9 did not run; split worktree 72 failed, 86 passed. The 70 baseline failures are byte-identical sets (tests/color-polish 26, tests/display 26, tests/interview 12, tests/plan08 3, tests/submission 2, tests/mobile-recognition 1), all pre-existing; Plan 12 recorded only the three in the four folders it ran. The two extra failures were real: usable.spec.ts "click or tap on the display advances" and "scene countdown ring", both `ReferenceError: SINGLE_STYLES is not defined` inside visualState, a load-order race (window.colorPolishRuntime exposed by core/stage.js before scenes/arrival.js declared the style tables; the host polls getState between deferred scripts). Corrected in round 2 (orders/base-r2.md): the runtime exposure and the bootstrap message listener moved to boot.js after every script. Verification of round 2 recorded below.
- Round 2 verification (logs/base/after-r2, logs/base/r2-verify.txt): node --check clean; every result.json state identical to the baseline in all six configs and the arrivals run; arrival sequence identical; tests/color-polish-usable/usable.spec.ts 6 of 6 passed with the main checkout's env exported (the two journeys that failed before round 2 now pass).
- Review: Sonnet 5 (high) landing review, no material findings, three notes (replaceMode default null, carried into Section 0b; unused integrate/place hooks are pre-authorized; PNG noise). The review did not catch the load-order race; the coordinator's like-for-like e2e comparison did.
- Large PNG sets stay local under logs/base (550 MB); the repo keeps the text evidence and the after/w1920-ms14000 set.

## Result
Split the monolithic renderer.js into 7 core modules, 11 scene modules, and 1 boot script, replacing all hardcoded scene-number branches with a declarative scene descriptor registry.
Scoped header comments were added to all 11 scene CSS files, and the non-functional calendar inline click was converted to delegated data-day event handling.
All 941 lines of renderer.js are fully accounted for with identical runtime behavior and contracts preserved.
The coordinator still runs typecheck, lint, test, build, test:e2e, and the pixel probe.
Reviewers should first examine core/stage.js for the registry dispatch lifecycle (draw vs prime vs tick) and scenes/calendar.js for the delegated click binding.
