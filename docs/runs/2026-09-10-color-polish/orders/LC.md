# Lane LC: click or tap on the TV display advances to the next scene

Writer: Gemini 3.8 Flash (High) through the agy CLI, gate widened by Anthony today (bash, python3, psql added). Reviewer: Fable coordinator reads the diff; verification is re-run in the main checkout by the coordinator before release. Anthony's request, 2026-09-10: "if I click on the TV display it goes to the next one."

Worktree (the only place you may write): /Users/anthony/.claude/worktrees/mothers-love-click-advance
Branch: change/tv-click-advance, based on 2e05c75. Dependencies are linked at /Users/anthony/.claude/worktrees/mothers-love-click-advance/node_modules.

Read first, inside the worktree:
- AGENTS.md (product invariants; no real data anywhere)
- public/color-polish/renderer.js: sceneNumber() near line 79, the playlist normalization near line 74, requestScene(id, {force}) near line 277, the automatic rotation step near line 512 (it finds the current playlist index and moves to the next entry when sceneAge reaches the dwell), init() near line 535, and the window.colorPolishRuntime API near line 878 (setScene, setPlaying).
- src/components/display/color-polish-host/ColorPolishHost.tsx (the TV host; the renderer runs inside a sandboxed iframe with an opaque origin, so the click must be handled inside renderer.js, not in the host).
- tests/color-polish-usable/usable.spec.ts (existing browser journeys; the fixture and the /display route mocking pattern).

Rules
- Never read .env or .env.local. No real people or messages in tests or fixtures.
- No em dash and no en dash anywhere in code, comments, tests or your report.
- Keep every existing test passing. Change only the files named below unless a one-line change elsewhere is unavoidable, and say so.
- Do not commit and do not push; leave changes in the working tree. Only git status and git diff are allowed.

The feature
1. In public/color-polish/renderer.js add a manual advance: a click or tap anywhere on the display (pointerup or click on document; choose one that works for both mouse and touch without firing twice) moves to the next playlist scene. Also treat the ArrowRight and Space keys the same way, since TV remotes send keys. Behavior:
   - Only when S.mode is 'normal' and S.source is 'live' (the TV). In the Studio sample preview (S.source 'sample') do nothing, because the Studio has its own scene selector and its selection state must not drift.
   - Compute the next entry exactly the way the automatic rotation step near line 512 does (current index in S.playlist, then the next entry, wrapping to the first). Extract that into a small helper if it keeps both paths identical.
   - Call requestScene(nextId, {force: true}) so the change is immediate even during an arrival animation, and make sure sceneAge resets so the new scene gets its full dwell (check what requestScene already does).
   - Ignore a second click within 700 ms (debounce) and ignore clicks while a transition is in flight if requestScene would just queue it.
   - Do not add any visible control, hint or cursor change. No sound.
   - Register the listeners in init(), next to the existing visibilitychange listener.
2. Add one browser journey in tests/color-polish-usable/usable.spec.ts: load /display with the existing fixture (presentation enabled), wait for the renderer frame (page.frames().find(f => f.url().endsWith('/color-polish/renderer.html'))) and for window.colorPolishRuntime.getState().mode === 'normal', read the current scene, click the page center with page.mouse.click, then expect the frame's getState().scene to equal the next playlist id within 3 seconds. Add a second assertion that a click on the Studio preview (the existing signed-in Studio journey setup) does not change the preview's selected scene.
3. If the renderer keeps a QA log (qaLog / log(type, data)), log a 'manual_advance' entry with the from and to scene ids only.

Verification, from the worktree root, prefix npm and npx with npm_config_cache=/tmp/npm-cache
1. npm run typecheck
2. npm test
3. npx playwright test tests/color-polish-usable (if Playwright's dev server fails to start in the worktree because of the node_modules symlink and Turbopack, say so; the coordinator re-runs it in the main checkout)
4. node scripts/color-polish-renderer-probe.mjs /Users/anthony/.claude/worktrees/mothers-love-click-advance /Users/anthony/.claude/worktrees/mothers-love-click-advance/.lane/probe-1920 --width=1920 (must report issues: [] and all 10 scenes)
5. ./node_modules/.bin/eslint public/color-polish/renderer.js tests/color-polish-usable

Report (plain text, under 350 words): the exact listener and helper you added, files changed, each verification command with pass or fail and the key numbers, and anything not done and why.
