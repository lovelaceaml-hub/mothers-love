# L12 writer result: preview only link that holds one screen

Writer: fresh Claude Opus 5. Worktree `/Users/anthony/.claude/worktrees/mothers-love-tv17-scene-link`, branch `tv17/scene-link`, cut from `tv17/pick` 3d4b459. Facts only, no verdict.

Plan goal line this lane was checked against: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV."

## Changed files

- `/Users/anthony/.claude/worktrees/mothers-love-tv17-scene-link/src/components/display/color-polish-host/ColorPolishHost.tsx` (+176 / -3)
- `/Users/anthony/.claude/worktrees/mothers-love-tv17-scene-link/src/components/display/color-polish/renderer.tsx` (+17 / -2)
- `/Users/anthony/.claude/worktrees/mothers-love-tv17-scene-link/tests/display/scene-link.test.ts` (new, the one new test file)

`src/app/display/page.tsx` was in the allowlist but needed no change: the page still renders `ColorPolishHost` and the query string is read in the browser, so `/display` stays a static route. Nothing under `public/color-polish/**` was touched, no database, no admin route, no new route, no auth change. `git status` in the worktree lists exactly these three files.

## The links

On a preview build only:

| Link | What it does |
| --- | --- |
| `/display?scene=welcome` and the other nine slugs (`garden`, `featured`, `calendar`, `peacemakers`, `status`, `expressions`, `peace-in-practice`, `orbit`, `milestone`) | Holds the TV on that one screen and restarts it when its dwell ends |
| `/display?scene=arrival` | Holds the first enabled playlist screen and replays the single entrance about every 20 seconds |
| `/display?scene=arrival-group` | Same, but replays the group entrance (the wave of ten) |
| `/display?scene=<anything else>` and `/display` | Plain `/display`, unchanged |

Live data throughout. Each link reads the same `/api/display/color-polish` snapshot on the same 5 second poll as `/display`, with the same stale, quiet, neutral and unavailable handling. No new data leaves the server, nothing is written anywhere, no record is invented.

## How the hold works

Three layers, all in the host, none of them inside the renderer document:

1. **Pin.** The host passes `scene` to `ColorPolishRenderer` on every control update. In `public/color-polish/core/state.js` that sets `sceneControlled`, which is the condition `core/stage.js` line 125 checks before auto advancing at the end of a dwell. With it set, the playlist never advances. Because the scene is re-sent on every update, anything that did manage to change the scene would be pulled back on the next control message.
2. **Restart instead of advance.** The host also passes `replayKey`, an integer that increments once per dwell. `core/host.js` line 14 computes `replayed` from a changed `replayKey`, and line 30 then calls `renderNow(S.s)`, which resets `sceneAge` and `eduAge` and rebuilds the scene. So the screen plays its full dwell, then starts over on the same screen.
3. **Input.** The click, tap, ArrowRight and Space handlers live inside the renderer document (`public/color-polish/boot.js` lines 10 and 11, calling `manualAdvance` in `core/stage.js`), which this lane may not edit, and `manualAdvance` has no `sceneControlled` check of its own. So the host stops the events reaching that document instead: while a link is held, the iframe gets `pointer-events: none` and `tabIndex={-1}`. Pointer events never enter the frame, the frame cannot take focus by click or by Tab, so its keydown listener never fires and ArrowRight and Space go to the outer page, which has no advance handler.

The dwell is read from the live snapshot's own `presentation.playlist` entry for that screen, clamped to the contract's 12 to 180 seconds, falling back to `COLOR_POLISH_DURATIONS` when the screen is not in the playlist.

The hold cadence runs on `performance.now()` in the browser, not on the host's `nowMs`. `nowMs` follows the server time in the snapshot, so it only moves when the server's clock moves. This was found during verification: a harness whose fixture returned a fixed `serverTime` froze `nowMs` after about 2 seconds, and nothing ever restarted or replayed. With the monotonic clock the cadence is independent of the server clock.

## How the entrance replay works

`beginEvent` in `public/color-polish/core/arrivals.js` builds a group entrance only when ten arrivals are queued at once (`S.queue.length>=10 ? 10 : 1`). There is no separate prop or control that forces a group, so the host produces the condition rather than a flag: `/display?scene=arrival` supplies one arrival per cycle, `/display?scene=arrival-group` supplies ten. Both go through the existing `snapshot.arrivals` path that the server already uses, so no renderer hook was missing and nothing under `public/color-polish/**` was edited.

Each cycle the host replaces `snapshot.arrivals` (in the copy it passes to the renderer, never the fetched object) with entries built only from records the verified public snapshot already carries, filtered to `status === 'published'`, a non empty `firstPublishedAt`, and an `expiresAt` later than the snapshot's own `serverTime`. `recognitionId` and `publishedAt` come from the record. Only `eventId` is synthesised, as digits (base 9000000000), matching the shape the public snapshot uses and high enough that it cannot collide with a real event id.

Cadence in practice: a fresh wave is offered every 20 seconds, but `core/host.js` only queues an arrival whose record is not already in the queue, so a wave that is still playing is not doubled. A single entrance runs about 13 to 15 seconds and comfortably fits the 20 second cycle; a group entrance holds at least 30 seconds, so in practice the next group starts shortly after the previous one finishes rather than exactly on the 20 second mark.

The coordinator addendum mentions `data-arrival-kind="group"`. That attribute does not exist in this repository. A group entrance is identified by `#event .event-stage` carrying `data-style="group-<n>"` plus the `.group-title` and `.group-kind` elements (`core/arrivals.js` `buildEvent`), and by `colorPolishRuntime.getState().active.kind === 'group'`, which is what the verification below asserts.

## The production ignores it proof

The gate is the existing `process.env.COLOR_POLISH_PREVIEW_BUILD === 'true'` in `renderer.tsx`, now exported as `COLOR_POLISH_PREVIEW_BUILD` so the host reads the same value rather than testing the environment variable twice. `next.config.ts` sets it to `'true'` only when `VERCEL_ENV === 'preview'`.

Two independent stops on a production build:

1. `parseScenePreviewRequest(search, previewBuild)` returns `{ kind: 'none' }` immediately when the gate is false, before it looks at the query string at all. `planScenePreview` then returns `{ arrivals: null, holdInput: false }` with no `scene` and no `replayKey`, so the renderer receives exactly the props it received before this lane and the snapshot's own `arrivals` are passed through untouched.
2. `renderer.tsx` computes `inputHeld = PREVIEW_BUILD && holdInput === true`, so even if a caller passed `holdInput`, a production build would not apply `pointer-events: none` or `tabIndex`.

Proved three ways:

- **Unit test**, `tests/display/scene-link.test.ts`, three cases under "one screen preview links on a production build": every slug including both arrival slugs parses to `{ kind: 'none' }`; the plan for every slug equals `{ arrivals: null, holdInput: false }` with `scene` and `replayKey` both `undefined`; and the snapshot's `arrivals` array is left as `[]`.
- **Running app**, throwaway harness against a dev server started without `VERCEL_ENV=preview`: `/display?scene=peacemakers` starts on `welcome` (the playlist order, not the requested screen), the iframe's computed `pointer-events` is not `none`, the screen rotates away on its own, and `/display?scene=arrival` produces no entrance in 30 seconds.
- **Production build**, `npm run build` with `VERCEL_ENV` unset, compiles and emits `/display` as before.

## Exact command results

All run in `/Users/anthony/.claude/worktrees/mothers-love-tv17-scene-link` with `npm_config_cache=/tmp/npm-cache`, after its own `npm ci` (no symlinked `node_modules`).

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0, no diagnostics |
| `npm test` | 40 test files passed, 234 tests passed, 0 failed |
| `npm run build` | compiled successfully in 7.0s, TypeScript passed, `/display` still listed as a static route |
| `npx vitest run tests/display/scene-link.test.ts` (new test) | 1 file passed, 12 tests passed |
| `npx playwright test tests/color-polish-scenes/transitions.spec.ts --workers=1` | 7 passed in 1.4m, 0 failed |
| `npx playwright test tests/color-polish-usable/usable.spec.ts --workers=1 -g "advances to the next scene\|countdown ring counts down"` | 1 passed, 1 failed |

Notes on the two Playwright figures, with the parent commit measured the same way for comparison:

- `transitions.spec.ts` covers both items the order named: "a click during a transition does not double-advance, and a requested scene queues instead" and "hides the countdown during transition and shows it after completion". All 7 pass on this branch.
- In `usable.spec.ts`, "scene countdown ring counts down and resets on manual advance" passes on this branch (19.9s). "click or tap on the display advances to the next scene" fails on this branch, in `signInAs` at line 98, because it signs in to `/admin/login` and no database is configured in this local worktree. **The same test fails the same way on the untouched parent commit** (`/Users/anthony/Projects/mothers-love-worktrees/tv17-base`, `tv17/pick` 3d4b459, clean tree). On that parent, the countdown ring test also failed, with `Expected: 180, Received: 30`. So of these two, one is an environment limitation present before this lane and the other is a pre-existing intermittent failure on `tv17/pick`; neither was introduced here.
- Both spec files were first run in parallel under heavy load (other lanes' dev servers on ports 3012, 3171, 3187, 3188, 3191, 3421, 8990 at the time). That run gave 4 passed / 9 failed on this branch and 2 passed / 11 failed on the untouched parent. Running them with `--workers=1` removed the contention. The figures in the table are the serial ones.
- One earlier cold cache `npm test` run reported 2 failures in `tests/color-polish-data/query.test.ts`. That file passes in isolation on this branch and on the untouched parent, the parent's full suite passed 39 files / 222 tests, and every warm `npm test` run on this branch passed 40 files / 234 tests. It is a load sensitive flake in that file, unrelated to this lane's files.

## Behaviour verified in the running app

A throwaway Playwright harness (`tests/display/scene-link-harness.spec.ts`, deleted before the commit, not part of the branch) drove the real `/display` page against a local dev server with a synthetic snapshot fulfilled by route interception. No live snapshot, no real recognition data, no `.env.local`, nothing written. Port 3189 was chosen after checking which ports other writers were holding, and the server was stopped afterwards.

Preview build (`VERCEL_ENV=preview`), 5 passed in 2.8m:

1. `/display?scene=peacemakers` shows scene 8 immediately; a click, an ArrowRight and a Space leave it on scene 8; it is still on scene 8 after 20 seconds with a 12 second dwell, where plain `/display` would have advanced. The iframe's computed `pointer-events` is `none` and its `tabIndex` is `-1`.
2. `/display?scene=welcome` with a 12 second dwell: `sceneAge` resets at least once inside 30 seconds, never exceeds 20, and the screen is still `welcome` at the end.
3. `/display?scene=arrival` reaches `active.kind === 'single'`.
4. `/display?scene=arrival-group` reaches `active.kind === 'group'` with exactly 10 records in the wave.
5. `/display?scene=not-a-real-screen` keeps normal pointer events and rotates away on its own.

Production build (same harness, `VERCEL_ENV` unset), 3 passed and 2 skipped in 2.1m. The two skipped are the restart and group cases, which have no production meaning. The three that ran are the production half of the proof above: the held screen assertion inverted (starts on `welcome`, rotates away on its own, pointer events normal), no entrance in 30 seconds on `/display?scene=arrival`, and the unknown slug case which is identical on both builds.

## Limitations Anthony or the reviewer should know

1. **Preview builds only.** These links do nothing on the live site. They work on a Vercel preview deployment, which is where the TV review happens.
2. **A screen that is disabled in the live playlist cannot be held.** `core/state.js` line 90 falls back to the first enabled playlist entry when the requested screen is not in the playlist, so `/display?scene=<disabled screen>` shows that first screen instead. Nothing warns that this happened.
3. **The arrival links need enough live records.** The group link needs at least 10 published, unexpired recognitions in the snapshot; the single link needs at least 1. Below that the host sends no arrivals and the link behaves as a plain hold on the base screen, silently.
4. **The arrival links also need `pauseArrivals` to be false** in the live display settings, because `core/host.js` drops queued arrivals when the owner has paused them.
5. **The countdown ring is hidden while a link is held.** `core/chrome.js` `sceneCountdownHidden` hides the ring whenever `sceneControlled` is true on a non sample source. That is existing renderer behaviour in a file this lane may not edit. It is arguably right for a held screen, but it is a visible difference from plain `/display` and Anthony should expect it.
6. **The arrival links hold the first enabled playlist screen underneath.** The entrance dims and covers the stage, so the screen behind it is mostly incidental, but it is not a free choice today.
7. **Not seen on the physical church TV.** Everything above was measured in headless Chromium at 1280 x 720 against synthetic data. Commissioning on the real TV remains an unexecuted check.
8. **No screenshots of the held screens were captured**, because that would have meant either real recognition data or fixture art that does not represent what Anthony will actually rule on.

## Commit

One commit on `tv17/scene-link`: `fa75352`, "Plan 17 Lane 12: preview only link that holds one screen", 3 files changed, 424 insertions, 5 deletions. `next-env.d.ts`, which `next dev` rewrites, was restored before committing so the branch carries only the three files listed above. The worktree is clean, both dev servers were stopped, and `/Users/anthony/Projects/mothers-love-worktrees/tv17-base`, which was used only as an untouched baseline for the Playwright comparison, is back to a clean tree at 3d4b459.
