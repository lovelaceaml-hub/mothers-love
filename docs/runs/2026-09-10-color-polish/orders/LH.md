# Lane LH: home call to action, form-only recognize page, titled name examples

Writer: Gemini 3.8 Flash (High) through the agy CLI. Reviewer: Fable coordinator reads the diff; verification is re-run in the main checkout by the coordinator before release. Anthony's requests, 2026-09-10, quoted: "on the mobile app, put the share recognition button above the recent recognitions section. Make it stand out so that eyes divert to it. Make it shiny and shimmer." "Share a recognition page doesn't need the live from campaign. just the form to fill out." "For the examples in the name section include titles like B. S. or D."

Worktree (the only place you may write): $HOME/.claude/worktrees/mothers-love-home-polish
Branch: change/home-polish, based on 2e05c75. Dependencies are linked at $HOME/.claude/worktrees/mothers-love-home-polish/node_modules.

Read first, inside the worktree: AGENTS.md (copy style and invariants), src/components/feed/FeedHome.tsx with its CSS module (the home page; the "Share a recognition" links are near lines 100, 170 and 202), src/components/submission/SubmissionForm.tsx with its CSS module (the /recognize page is just this component), src/components/feed/PublicFeedProvider.tsx (the compact feed whose heading reads "Live from the campaign" near lines 680 and 705), and the existing tests under tests/ that cover the home page and the submission form (grep for FeedHome, SubmissionForm, "Share a recognition", "Live from the campaign").

Rules
- Never read .env or .env.local. No real people or messages in tests or fixtures.
- No em dash and no en dash anywhere in code, copy, tests or your report.
- Keep the exact campaign catalog wording, the expression cards and every form rule unchanged. Keep every existing test passing; update tests whose expectations you deliberately changed and say which.
- Respect prefers-reduced-motion: the shimmer must stop under reduced motion, matching how the app already handles its other decorative animation.
- Do not commit and do not push; leave changes in the working tree. Only git status and git diff are allowed.

Tasks
H1 Home call to action. On phone widths the "Share a recognition" primary action must sit above the recent recognitions list (directly under the page title and intro, before the feed). Keep the desktop layout sensible (the action may sit above the feed at every width if that is simpler). Make it the most eye-catching element on the page: the existing coral, orange and gold campaign palette, a soft glow, and a continuous gentle shimmer sweep across the button (a light band moving over the surface every few seconds, subtle, not strobing). Keep it a single Link to /recognize with the same text. Keep an accessible focus ring and at least 44 px tap height. Remove or demote any duplicate "Share a recognition" link that now sits below the feed only if the page still reads naturally; leaving the bottom one as a quiet secondary link is fine.
H2 Recognize page is the form only. On /recognize, remove the compact "Live from the campaign" feed and its heading so the page shows the form (title, intro, expression cards, fields, submit) with nothing about the live campaign feed. Do not remove the feed from the home page or the TV. If the compact feed component is only used by the form, leave the component in place but stop rendering it there; do not delete shared code.
H3 Titled name examples. In the form's name guidance (the recipient name and, if it has one, the sender name), extend the examples so they include names with church title abbreviations in the style B. S. and D., for example "B. Daniel", "S. Grace L." and "D. Kim", alongside the existing single-name, full-name and nickname examples. Do not add a legend explaining the abbreviations. Keep the flexible-name rules exactly as they are (any nonblank name up to 80 graphemes); this is copy only. Update any test that asserts the old example text.

Verification, from the worktree root, prefix npm and npx with npm_config_cache=/tmp/npm-cache
1. npm run typecheck
2. npm test
3. npx playwright test tests/feed tests/submission tests/recognize 2>/dev/null or whichever existing spec folders cover the home page and the form (list them with ls tests first). If Playwright's dev server fails to start in the worktree because of the node_modules symlink and Turbopack, say so; the coordinator re-runs it in the main checkout.
4. ./node_modules/.bin/eslint src/components/feed src/components/submission
5. Capture phone-width screenshots for the coordinator with a small Playwright script if the dev server runs: $HOME/.claude/worktrees/mothers-love-home-polish/.lane/home-375.png and recognize-375.png at 375 by 812, with every /api/** request intercepted to return { items: [] } so no real data is used. If the server cannot run, skip and say so.

Report (plain text, under 350 words): files changed per task, the exact new example copy, each verification command with pass or fail and key numbers, screenshots produced or not, anything not done and why.
