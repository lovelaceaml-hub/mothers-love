# Lane S: submission and privacy journey

## Setup

- Implementation runtime: Codex, gpt-5.6-luna, xhigh.
- Worktree: `/Users/anthony/Projects/mothers-love-worktrees/submission`.
- Frozen target: `TargetML-BUBBLE-APPROVED-V3`, mobile390x844 and desktop1440x1000.
- Protected ownership: all files outside `src/app/page.tsx`, `src/app/privacy/`, `src/components/submission/`, `tests/submission/`, and this lane record.
- Protected data: no real recognition content, credentials, provider operations, Git operations, or production writes.

## Implemented

- Semantic public form with self-reported private submitter name, recipient, nine full exact expression phrases, optional principles, and 500 grapheme message counter.
- Client validation for first name plus last initial, Unicode names, distinct expression IDs, and 500 grapheme message limit. Values remain in memory only.
- Public preview with recipient, selected phrases, and message. Submitted name is absent from preview output.
- Same request key for retries, truthful sending, unconfirmed, published, held, and closed states, plus a full reset action.
- Config-aware closed state for unconfigured or paused collection, with no fabricated success.
- Privacy page covering 168-hour personal lifetime, aggregate retention, self-reported administrator-private names, child rules, 60-second display fallback, backup limits, and no raw exports or leaderboards.
- Organic circles, daisies, leaves, warm campaign colors, responsive phone and desktop layout, reduced-motion treatment, visible focus, keyboard controls, and screen-reader labels.

## Acceptance coverage

- T-P1-01 normal publish and expression selection: browser spec passed with intercepted synthetic API.
- T-P1-02 field errors and over-limit validation: Vitest validation suite passed.
- T-P1-03 grapheme counting including combining marks and emoji: Vitest validation suite passed.
- T-P1-04 Unicode, apostrophe, hyphen, and multiword name shapes: Vitest validation suite passed.
- T-P1-05 keyboard and accessibility: browser spec and axe scan passed.
- T-P1-06 lost response and same-key retry: browser spec passed with intercepted synthetic API.
- T-P1-07 preview privacy and reset: browser spec passed.
- T-P1-08 paused collection and held receipt: browser specs passed.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 13 tests including foundation and submission validation.
- `npm run build`: passed, Next 16.3.4 static routes `/` and `/privacy` compiled.
- `npx playwright test --config=playwright.submission.config.ts`: passed, 7 browser checks. The temporary config was removed after the run. Root should include `tests/submission/**/*.spec.ts` in the shared Playwright test discovery when integrating.
- No deployment, provider access, real data, physical TV, phone scan, or production smoke test was run in this lane.

## Review notes

The axe run found and the lane corrected two contrast issues in the coral expression and privacy reminder. The final accessibility scan passed with no violations. Root integration should rerun the full application suite after backend routes and shared Playwright discovery are merged.
