# Plan 07: Flexible name input

## User decision
Anthony explicitly says not to block names that do not fit first name and last initial. This supersedes that required shape across public form, API, admin edits and public feed/TV validation. Accept single names, full names, nicknames and Unicode without truncation or rewriting. Required nonblank and80grapheme limits remain, as do moderation, safe text rendering and private submitted names. No database change is needed.

## Model and lane choices
Root coordinates two disjoint isolated worktrees. U Luna xhigh owns form/copy/submission tests and one admin search placeholder. S Luna xhigh owns shared helper/server validation/feed+TV projections/backend tests. Native Sol high cumulative controller review. Existing fallback after3Luna or2Terra failures remains. Root owns integration, deployment, private Git/evidence, records and cleanup. No real participant content or production fixture writes.

## Acceptance and Build log
- Clean baselinea6c5c33. Repository search found shape checks in browser submission, public/admin server validation and both feed/TV projection. SQL only enforces nonempty size bounds, so no migration or service configuration required.
- Verify browser submission acceptance, public/API/admin parity, full/single recipient projection, required/overlong rejection, unchanged moderation, full tests/build and deployed synthetic journey. Preserve approved design, selected gold expressions and Garden live recovery.

- S ed185a0and U e21d08e integrated.113unit tests, typecheck, lint and production build pass. Source has no remaining required name shape. U13browser checks and S73backend checks passed. No migration or dependency change. Root deploys and verifies while the cumulative native review runs.

- Native Sol first review found invisible-only characters bypass trim-based required checks. V Luna xhigh corrects visible-nonblank parity without imposing a name format or rewriting Unicode names. Focused regression and cumulative review retry required; no gate waived.

- V integrated as 1952c1c. 117 unit tests, typecheck, lint, build and 82 deployed synthetic browser journeys pass. Corrected production alias and safe API checks verified. Native Sol review retry running.

PLAN-07 is complete: flexible names are accepted across form, API, admin, feed and TV. 117 unit tests, typecheck, lint, build and 82 deployed browser journeys pass, with 3 optional capture skips. Native Sol high final review passed. Production and private backup receipts are in docs/runs/2026-09-08-flexible-names/research/. No physical TV or real phone commissioning claim is added.
