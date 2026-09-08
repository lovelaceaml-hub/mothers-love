# Lane RP: public readiness audit

Date: 2026-09-08
Scope: read-only audit of submission, expressions, privacy, and public API validation in the ready-public worktree.

## Verdict

CORRECTED in this worktree. Root integration and release verification remain pending, so this lane makes no public activation claim.

## Correction implemented

- Added `src/lib/name-validation.ts` as the browser/server-neutral source for the exact existing grapheme counter and first-name plus last-initial predicate.
- Refactored `src/components/submission/SubmissionForm.tsx` to use that helper while retaining its existing exports for current tests.
- Applied the same Unicode-safe, 80-grapheme name-shape validation to public submissions and supplied admin edit fields in `src/lib/server/validation.ts`. Surrounding whitespace is trimmed and internal wording is preserved.
- Added public and admin route tests proving malformed submitted names and recipients return 400 before `databaseAction` is called. Added decomposed Unicode, non-Latin, and 80 versus 81 grapheme boundary coverage.
- No public wording, design, SQL, migration, provider, or Auth files changed.

## Finding resolved

### P1: Server accepts names that bypass the approved first-name plus last-initial rule

Before this correction, `src/components/submission/SubmissionForm.tsx:67-76` applied `isFirstNameLastInitial` in the browser, while `src/lib/server/validation.ts:16-38` checked only presence and the 80-grapheme cap for `submittedName` and `recipient`. The same gap existed for admin edits in `src/lib/server/validation.ts:68-89`.

That allowed a direct public `POST /api/recognitions` to reach `src/app/api/recognitions/route.ts:16-19` with arbitrary non-empty names such as `Maya Rodriguez` or `hello`. The correction now rejects those shapes at the server boundary while retaining the approved Unicode, accents, apostrophes, hyphens, and multiword first names. This closes the documented server-side validation gap in `docs/source-handoff/04_PHASE_1_SUBMISSION.md:32-36`.

The original public wording and design remain unchanged.

## Verified clear

- `src/lib/catalog.ts` contains the exact nine approved phrases, principles, IDs 1 through 9, colors, and the approved campaign title and tagline. `src/app/expressions/page.tsx` renders all nine with the expanded everyday examples and the official guidance link.
- `src/app/privacy/page.tsx` states the seven-day, 168-hour personal lifetime, aggregate retention, display projection boundary, provider recovery-copy limitation, 60-second neutral fallback, child rules, and no raw exports or public search.
- `src/components/submission/SubmissionForm.tsx` keeps the submitter name out of the public preview, preserves the draft for unconfirmed retries, resets fields only after a receipt, and renders all user content as text.
- `src/lib/server/validation.ts` enforces required fields, 500-grapheme messages, 80-grapheme names, canonical allowed expression IDs, request-key shape, and the 16 KiB payload cap. `src/app/api/recognitions/route.ts` applies trusted-origin, configuration, server validation, filter holding, rate-key, and database-result handling.
- Existing lane and release evidence reports the approved source at `ccf272e`, 64 focused tests, 48 deployed synthetic browser journeys, nine anonymous production page scans with zero axe violations and no horizontal overflow, and final independent review PASS. Those results do not cover the missing direct-request name-shape assertion.

## Verification for this correction

- Focused backend, route, and submission tests: 22 passed.
- Full Vitest suite: 71 passed across 12 files.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `git diff --check`: passed.
- Production build verification is pending root integration. With the permitted dependency symlink, Turbopack stops at its external-symlink boundary. The webpack retry reaches the existing unrelated selector error at `src/components/display/DisplayExperience.module.css:1142`, which this lane does not own and did not change.

## Follow-up gate

Root should integrate this bounded correction, rerun the production build on the integration worktree, and then update the activation gate. No other material blocker was found in this bounded public audit.
