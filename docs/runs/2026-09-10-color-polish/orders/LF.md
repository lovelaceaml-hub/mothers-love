# Lane LF: Color Polish completion fixes

Writer: Gemini 3.8 Flash (High) through the agy CLI. Reviewer: Fable coordinator reads the diff; the plan's single consolidated Opus review already ran (PASS) and is not repeated. Codex is out of usage until 2026-09-16, so this lane is the plan's pre-authorized spill.

Worktree (the only place you may write): $HOME/.claude/worktrees/mothers-love-color-polish-fixes
Branch: fix/color-polish-completion, based on a7dca27. Dependencies are already linked at $HOME/.claude/worktrees/mothers-love-color-polish-fixes/node_modules.

Read first, all inside the worktree:
- $HOME/.claude/worktrees/mothers-love-color-polish-fixes/AGENTS.md
- $HOME/.claude/worktrees/mothers-love-color-polish-fixes/docs/PLAN-10-color-polish.md
- $HOME/.claude/worktrees/mothers-love-color-polish-fixes/docs/runs/2026-09-10-color-polish/research/opus-review.md

Rules
- Never read any file named .env, .env.local, or anything under node_modules except through npm and node commands.
- No em dash and no en dash anywhere in anything you write, including code comments, commit messages and this report. Use a hyphen, comma, colon or a new sentence.
- No real people, names or messages in fixtures, tests or logs. Existing synthetic fixtures are fine.
- Keep every existing test passing. Do not change unrelated files. Do not touch Home or submission pages.
- Do not commit and do not push: leave your changes in the working tree. The coordinator reviews the diff and commits. The only git commands you may run are git status and git diff.

Tasks, in this order

F1 Milestone scene week and goal state (visual defect, must fix)
File: $HOME/.claude/worktrees/mothers-love-color-polish-fixes/public/color-polish/renderer.js
The port builds next.goal (near line 106) with week taken from snapshot.insights.goal.weekStart, but never assigns S.week or S.goalExpression. The milestone template (near line 194, formatDayRange(S.week)), contributorPool() and tributeContent() (near line 771) still read S.week and S.goalExpression, exactly as the approved design did after its own weekly computation (see docs/design/color-polish-v6/approved.html near line 653: S.goalExpression=lowest(vector); S.week=w). Result today: the Milestone scene prints "INVALID DATE NaN-NaN" and the replay panel is empty.
Fix: when the goal is built from the snapshot, also set next.week to the same YYYY-MM-DD week start and next.goalExpression to the goal expression id, and make sure both reach S when the pending state is applied. Keep formatDayRange output using a plain hyphen. contributorPool() should then return this week's recognitions that include the goal expression, bounded as it already is (max 26). Do not reintroduce the design prototype's event replay in captureMilestone.

F2 Host fallback to the legacy renderer on repeated failures (review MAJOR)
File: $HOME/.claude/worktrees/mothers-love-color-polish-fixes/src/components/display/color-polish-host/ColorPolishHost.tsx
Today a failing /api/display/color-polish leaves the TV on the static unavailable panel forever; the legacy V6 fallback renders only when a successful snapshot says presentation.enabled is false. Fix: when the phase becomes unavailable (no usable snapshot after failures or after the 60 second stale threshold), render V6DisplayExperience instead of the unavailable panel; it verifies independently through the legacy display endpoint and has its own unavailable state. Quiet and neutral must remain authoritative: if the last successful settings mode was quiet or neutral, stay cleared. Keep data-testid="color-polish-display" and the data-display-phase attribute so the browser test still works. Add or extend a focused test if a host unit test file exists under tests/; otherwise extend tests/color-polish-usable/usable.spec.ts with a case where the color-polish route returns 503 and the page shows the legacy display container rather than the unavailable text.

F3 Weekly focus read path (review MAJOR)
New file: $HOME/.claude/worktrees/mothers-love-color-polish-fixes/database/012_color_polish_read_path.sql
In 011 (near line 305) every public read takes pg_advisory_xact_lock and runs INSERT ... ON CONFLICT DO NOTHING for the weekly focus row. Write 012 as an additive migration that replaces only the function containing that logic so it first SELECTs the existing color_polish_weekly_focus row for the current week and takes the lock and INSERT only when that row is missing, then re-reads. Outputs must be identical. Keep SECURITY DEFINER, SET search_path = '', the same REVOKE and GRANT statements and the same ledger insert style as 011 (look at how 011 records itself in mothers_love.schema_migrations and copy that pattern with the new version name). Update $HOME/.claude/worktrees/mothers-love-color-polish-fixes/scripts/color-polish-local-database.sql only if it needs the new file to run, and update tests/color-polish-data/sql-contract.test.ts if it enumerates migration files. Do not edit 011.

F4 Frame ancestors header (review MINOR)
File: $HOME/.claude/worktrees/mothers-love-color-polish-fixes/next.config.ts
Add a headers() entry for /color-polish/:path* with Content-Security-Policy "frame-ancestors 'self'". Keep any existing headers.

F5 Reduced motion in the renderer (review MINOR)
File: renderer.js. JS-driven motion (feed lanes, canvas atmosphere, the rAF coordinator) ignores prefers-reduced-motion. Set S.still from matchMedia('(prefers-reduced-motion: reduce)') at init and on change, but keep the owner's authority from Plan 08: when the snapshot settings.motion is 'lively', the owner's choice wins and motion stays on. Only 'standard' or lower honors the browser preference.

F6 Public poll credentials (review MINOR)
File: ColorPolishHost.tsx near line 75. Change credentials: 'include' to credentials: 'omit'.

F7 Message listener cleanup (review MINOR)
File: $HOME/.claude/worktrees/mothers-love-color-polish-fixes/src/components/display/color-polish/renderer.tsx near line 372. The window message listener from handleLoad is removed only by a 10 second timer never cleared on unmount. Clear the timer and remove the listener in the frameKey cleanup effect.

Verification, run from the worktree root with npm_config_cache=/tmp/npm-cache
1. npm run typecheck
2. npm test
3. npm run build
4. npm run test:e2e -- tests/color-polish-usable
5. node scripts/color-polish-renderer-probe.mjs $HOME/.claude/worktrees/mothers-love-color-polish-fixes $HOME/.claude/worktrees/mothers-love-color-polish-fixes/.lane/probe-1920 --width=1920
   Then confirm the milestone scene no longer contains "INVALID DATE": grep the probe output result.json and, if the probe writes milestone.png, note that it exists. The coordinator will view the image.
6. npm run lint -- public/color-polish/renderer.js src/components/display/color-polish-host src/components/display/color-polish next.config.ts (10 pre-existing lint errors in the preserved V6 renderer are known; do not fix them)
The coordinator runs the isolated PostgreSQL check for 012 separately; you cannot run psql under this gate. Say so in the report instead of claiming it.

Report format (plain text, under 500 words): files changed per task; exact verification commands with pass or fail and the key numbers (test counts, build result, probe issues array); anything not done and why.
