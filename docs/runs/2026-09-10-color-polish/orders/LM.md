# Lane LM: dominant home action and compact recent recognitions on phones

Writer: Claude Sonnet 5 (Gemini through agy failed twice today; routing decision recorded). Reviewer: Fable coordinator reads the diff; verification is re-run in the main checkout before release. Anthony's request, 2026-09-10, quoted: "The share recognition button needs to be even more prominent in your face, even in front of the floating icons, and then it should even get your attention. With something, and then the recent recognitions on that page, they need to be less vertical, not taking as much space."

Worktree (the only place you may write): /Users/anthony/.claude/worktrees/mothers-love-home-cta
Branch: change/home-cta-compact, based on 81592a9. Dependencies linked at /Users/anthony/.claude/worktrees/mothers-love-home-cta/node_modules.

Read first, inside the worktree: AGENTS.md, src/components/feed/FeedHome.tsx and src/components/feed/HomeExperience.module.css (the home page; the single Share a recognition link now sits in welcomeCopy under the title with a shimmer; below it a row of floating expression medallions, then the Recent recognitions feed), src/components/feed/PublicFeedProvider.tsx (feed cards), and tests/feed plus tests/mobile-recognition (existing journeys, some take phone screenshots).

Rules
- Never read .env or .env.local. No real people or messages in tests or fixtures.
- No em dash and no en dash anywhere in code, copy, tests or your report.
- Keep the exact campaign wording, the feed data rules and every server access rule unchanged. Messages in feed cards stay complete, never truncated. Keep every existing test passing; update tests whose expectations you deliberately changed and say which.
- Respect prefers-reduced-motion through the existing page rule that disables animation; nothing you add may move under reduced motion.
- Do not commit and do not push. Only git status and git diff are allowed.

Tasks
M1 Dominant action. On phone widths the Share a recognition action becomes the first thing the eye lands on: full content width, at least 58 px tall, larger bold text, the coral, peach and gold surface with the existing shimmer, and it sits in front of the floating expression medallions: either move the action so the order is title, action, medallions, feed with the action overlapping the top of the medallion row on a higher layer, or keep the order and raise its z-index and size so the medallions visibly pass behind it. Add a second attention cue on top of the shimmer: a gentle periodic pulse every 5 to 7 seconds (scale to about 1.04 and back with a brief glow bloom, about 900 ms), nothing that flashes or strobes. Keep it one accessible Link to /recognize with a visible focus ring. Desktop may keep the current size; do not break the desktop layout.
M2 Compact recent recognitions on phones. Reduce the vertical space each feed card takes at phone widths by about a third without truncating any message: tighter card padding and margins, a single compact header line for name, time and heart, smaller line height on the message, smaller expression phrase chips (they may wrap but not stack with large gaps), and less gap between cards. Measure it: in a test at 390 by 844 with synthetic items, assert the first card's height is at most 70 percent of what it is today (record today's height first with the same fixture, put both numbers in the report).
M3 Tests. Update or add journeys in tests/feed or tests/mobile-recognition covering the order (action before medallions and feed), the pulse animation name present on the action, reduced motion producing no animation, and the compact card measurement. Keep the axe accessibility checks green.

Verification, from the worktree root, prefix npm and npx with npm_config_cache=/tmp/npm-cache
1. npm run typecheck
2. npm test
3. npx playwright test tests/feed tests/mobile-recognition (if the dev server refuses to start because node_modules is a symlink, say so; the coordinator re-runs in the main checkout)
4. ./node_modules/.bin/eslint src/components/feed tests/feed tests/mobile-recognition

Report (plain text, under 350 words): files changed per task, the before and after card heights, each verification command with pass or fail and key numbers, anything not done and why.
