# L12 review: preview only per-screen TV links

Reviewer: Claude Fable 5.1, the single review round for this Opus-written lane. The reviewer corrected what it found; there is no second round.

Worktree `/Users/anthony/.claude/worktrees/mothers-love-tv17-scene-link`, branch `tv17/scene-link`. Writer commit `fa75352`, reviewer commit `da18111`, both on top of `tv17/pick` `3d4b459`.

Plan goal line checked against: "every word on the approved Plan 15 TV scenes fits inside its bubble, box or panel on the church TV, Peacemakers and Peace in Practice show exactly what the live TV shows today, and the result goes live only after Anthony approves it on the TV." This lane only adds preview-build links for judging screens; it changes no scene and nothing on the production TV.

## Verdict

Pass after corrections. No blocking finding remains. The production TV page ignores the query string completely, proven on the real production bundle.

## Findings

| # | Severity | Finding | Outcome |
| --- | --- | --- | --- |
| 1 | Medium (production hygiene) | On a production build the host still read `window.location.search` into React state after mount (one extra render), and the wrapper always carried a new `data-scene-hold=""` attribute and a `holdInput={false}` prop. No behavioural effect, but the order says "no effect at all". | Fixed. The read is behind the build time constant, the attribute and prop exist only while a link is held. |
| 2 | Medium (owner need) | A screen disabled in the saved playlist could not be held; the link silently showed the first enabled screen. The owner will use these links to judge every screen. | Fixed. New `scenePreviewSnapshot` switches the held screen on (or adds it) in the copy handed to the renderer only. Verified in the browser with `orbit` disabled. No risk: every screen draws from the same verified public snapshot, preview builds only, the fetched object is never mutated. |
| 3 | Low | The arrival links replaced `snapshot.arrivals`, so real entrances were dropped while a link was open, including when there were too few records to replay anything. | Fixed. Replays are appended after the server's arrivals; with nothing to replay the fetched snapshot passes through as the same object. |
| 4 | Low (defence in depth) | `pauseArrivals` and quiet or neutral were enforced only downstream (renderer and host phase), not where the replay is built. | Fixed. `buildPreviewArrivals` returns nothing when arrivals are paused or the mode is not normal. Browser check: 45 seconds on `?scene=arrival` with arrivals paused, no entrance. |
| 5 | Low (test strength) | The writer's production tests covered the pure functions only, not the rendered iframe or snapshot identity. | Fixed. 10 tests added (22 total). Mutation check: removing the parse gate, the renderer gate and the snapshot gate fails 5 tests. |
| 6 | Info | `live-feed` (renderer id 12): slugs are read from `COLOR_POLISH_SCENES`, so the link works as soon as that lane lists the scene; nothing here depends on that lane's code. A test pins this. Note for that lane: `validateColorPolishSnapshot` requires the playlist to hold exactly the listed scenes, and `bridgePresentation` and the renderer's `sceneNumber` must know the new id. |
| 7 | Info | The first replayed entrance appears about 20 seconds after the link opens, not at once: the renderer treats the first snapshot's arrival ids as already seen. Confirmed in the browser (ids 9000000000 to 9000000009 taken as baseline, 9000000010 onward played). After that the single entrance repeats about every 20 seconds and the group replays back to back (a group holds longer than 20 seconds). Left as is; it cannot be changed without editing `public/color-polish`. |
| 8 | Info | `core/stage.js` line 126 can still request the milestone screen when a milestone is crossed during a hold; the host re-sends the held scene every 250 ms, so it is pulled straight back. Existing renderer behaviour, outside the allowlist. |
| 9 | Info | The countdown ring is hidden on a held screen (existing `sceneControlled` rule in `core/chrome.js`). Anthony should expect that difference from plain `/display`. |

Checked and found correct as written: the hold restarts the screen through `replayKey` without remounting (the iframe `key` is `source`, the wrapper key is `active-<frameGeneration>`, neither depends on preview state); Neutral and Quiet unmount the renderer and show the safe screen; the 60 second stale rule and `markUnsafe` are untouched; expired records are dropped by the renderer's own `eligible` check against `nowMs`; replayed arrivals use only `id` and `firstPublishedAt` from published, unexpired records already in the snapshot, with only a numeric `eventId` synthesised; nothing is fetched, posted or stored; the only timer is one 500 ms interval that exists only while a link is held and is cleared on unmount and on phase change; unknown slug parses to `none`; no new route, no server change; allowlist respected (two host files and one test file, nothing under `public/color-polish`); no em dash or en dash in any changed file (grep count 0).

## Production ignores it: the proof

1. **Build time gate.** `next.config.ts` `env` sets `COLOR_POLISH_PREVIEW_BUILD` to `"true"` only when `VERCEL_ENV === "preview"`; Next inlines it at build. `renderer.tsx` computes `PREVIEW_BUILD` from it once and exports the same constant; the host imports that export, so there is one gate, evaluated the same way as the existing sandbox gate.
2. **The real bundle.** After `npm run build` with `VERCEL_ENV` unset, the display chunk (`.next/static/chunks/3nsc_c6yp8njo.js`) exports the constant as the literal `!1` (`"COLOR_POLISH_PREVIEW_BUILD",0,!1`), contains `sandbox:"allow-scripts"`, zero occurrences of `pointerEvents`, zero of `tabIndex`, zero of `process.env`, and the only `location.search` read sits behind `COLOR_POLISH_PREVIEW_BUILD&&`. An ES module constant cannot be changed from the URL or the page.
3. **Code path.** Gate false: the search is never read, `parseScenePreviewRequest` returns `none`, the interval never starts, the plan is `{ arrivals: null, holdInput: false }`, `scenePreviewSnapshot` returns the fetched object itself, and no `scene`, `replayKey`, `holdInput` or `data-scene-hold` is passed. The renderer additionally requires `PREVIEW_BUILD` before applying the input hold.
4. **Unit tests** (`tests/display/scene-link.test.ts`): every slug parses to `none`; plan has no scene, replayKey, arrivals or hold; snapshot identity preserved; the rendered iframe markup with `holdInput`, `scene` and `replayKey` passed is byte identical to the plain markup, with no `pointer-events` and no `tabindex`; the gate is true only for the exact string `true`.
5. **Browser, against `next start` on that production build** (throwaway Playwright harness, synthetic contract-valid snapshot by route interception, 12 eligible records): `/display?scene=orbit` opens on Welcome, iframe `pointer-events` is not `none`, no `tabindex`, `sandbox="allow-scripts"`, no `data-scene-hold`, and a click advances to the next screen as on the live TV. `/display?scene=arrival-group` for 40 seconds: no entrance, the renderer's arrival id set stays empty, and the playlist rotates on its own. 2 of 2 passed.

## Preview behaviour verified in the browser

Same harness, dev server with `VERCEL_ENV=preview`, 4 of 4 passed: `?scene=orbit` with Orbit disabled in the playlist holds Orbit; click, ArrowRight and Space leave it there; the screen restarts within its 12 second dwell and never exceeds 20 seconds of age across 30 seconds; the iframe DOM node is the same node throughout (no remount); `?scene=arrival-group` plays a group of exactly 10 records, all from the snapshot; `pauseArrivals` suppresses the replay; switching the snapshot to quiet replaces the held screen with the safe screen, no iframe and no personal text left.

## Command results

All in the worktree with `npm_config_cache=/tmp/npm-cache`.

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm test` | 40 files passed, 244 tests passed, 0 failed |
| `npx vitest run tests/display/scene-link.test.ts` | 1 file, 22 tests passed |
| Mutation check (gates removed, then restored) | 5 of 22 failed, as intended |
| `npm run build` (`VERCEL_ENV` unset) | compiled, `/display` still static |
| Harness on production bundle, 1 worker | 2 passed |
| Harness on preview dev server, 1 worker | 4 passed |
| `npx playwright test tests/color-polish-scenes/transitions.spec.ts --workers=1` | 7 passed (click during transition and countdown cases included) |

Not run: the `usable.spec.ts` click-advance test, which the writer showed fails at admin sign in on the untouched parent too because no database is configured locally; click-advance on production was instead proven in the harness above.

Port 3197 was used and every server was stopped. The harness file was deleted before the commit. No `.env.local` was read or copied, no database touched, nothing deployed. The physical church TV check remains unexecuted.

## What changed in the reviewer commit

`da18111`, 2 files: `src/components/display/color-polish-host/ColorPolishHost.tsx` (new `scenePreviewSnapshot`, gated search read, pause and mode stop in `buildPreviewArrivals`, null arrivals when nothing to replay, conditional attribute and prop) and `tests/display/scene-link.test.ts` (10 new tests, one expectation updated from `[]` to `null`).
