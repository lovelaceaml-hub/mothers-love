# Work order: Plan 17 Lane 1 round 6, Welcome text at the original size (writer: fresh Claude Opus 5; one Fable 5.1 review follows)

Read first, fully: /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/handoffs/welcome.md (state, rulings, envelope, allowlist, verify pattern), then /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/L1-review-round5.md.

Anthony watched Welcome on the church TV (2026-09-19): "good but the text size should be the same as the original."

Worktree (only place you write): /Users/anthony/.claude/worktrees/mothers-love-tv17-h-welcome, branch tv17/h-welcome, cut from tv17/pick 2a75745. Run npm ci there (npm_config_cache=/tmp/npm-cache).

## Work
1. Establish the original sizes by measurement, not memory: the Welcome bubble text (the "THANK YOU," label, recipient name, message, expression chips, likes) as drawn at 1920 on the original Welcome, meaning the Plan 15 base commit 5a24f0b (git show 5a24f0b:public/color-polish/scenes/welcome.js and core/orbs.js) and, as a cross check, production b7d92a0 (public/color-polish/renderer.js). The earlier capture /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L3-after2/w1920-ms6000/welcome.png shows that original look. Record the numbers (layout px and drawn px, near, mid and far bubbles).
2. Make every Welcome bubble whose message is an ordinary length draw its text at those original sizes again, in the regular bubbles and in the reserved bubble alike. The bubble grows to hold the words at the original size (within each home's free area) before any text is made smaller. Text steps below the original size only for a message that cannot fit its bubble at the original size even with the bubble at its maximum, and then only as far as needed, never below 18 px drawn at 1920 (36 at 3840). State the grapheme count at which stepping begins for a regular bubble and for the reserved bubble.
3. Keep everything else Anthony approved: one reserved bubble plus three regular, fixed homes and free areas, no overlap of words, the bubble right of the title, drift, sparkle, entrance and exit, paging only as a last resort in the reserved bubble, dwell from S.dwell[1], reduced motion.

## Allowlist
/Users/anthony/.claude/worktrees/mothers-love-tv17-h-welcome/public/color-polish/scenes/welcome.js
/Users/anthony/.claude/worktrees/mothers-love-tv17-h-welcome/public/color-polish/scenes/welcome.css
/Users/anthony/.claude/worktrees/mothers-love-tv17-h-welcome/tests/color-polish-scenes/welcome.spec.ts

## Hard rules
As in the handoff. Never copy /Users/anthony/Projects/mothers-love/.env.local anywhere, synthetic public config only, never touch a database, never deploy, fictional data only, no em dash or en dash, assertions must be able to fail, do not commit scratch output.

## Verify
npm run typecheck; npm test; npm run build; welcome.spec.ts and helpers.spec.ts against a production build with synthetic config (copy the pattern from /Users/anthony/Projects/mothers-love-worktrees/tv17-base/.tv17/verify-studio.sh, use a free port other than 3181); captures of welcome at 1920 and 3840 (0, 6000, 14000, 21000 ms, plus the long pool) into /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/logs/captures/L1/round6. Add a spec assertion that ordinary messages draw at the original size (numeric, both widths). Look at your captures beside the original capture.

## Completion output
Commit on tv17/h-welcome (message ends with "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"). Write /Users/anthony/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/research/L1-writer-result-round6.md: original sizes measured, new sizes, where stepping begins, command results with counts, capture paths, limitations. Facts, not a verdict.
