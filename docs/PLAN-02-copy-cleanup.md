# Plan 02: Simple app instructions

## Request and scope
Anthony requested simple, clean text that explains only how to use the app, with no distinction for children and no explanation of how long information is saved. This supersedes earlier explanatory copy, including the long privacy page. Preserve exact campaign title, tagline, nine expressions, descriptions and longer examples. Preserve approved Bubble Board styling and all data, access, review, expiry and counting behavior. Helpful error recovery, name formatting, private/public field labels and destructive-action consequences remain concise and visible. No clarification is needed for this bounded copy edit.

## Model and agent choices
Model: gpt-5.6-luna. Effort: xhigh. Agents: two parallel writers in separate worktrees. Runner: current coordinator. Reviewer: controller with native Codex Sol max review of isolated source snapshots, plus real rendered synthetic journeys. No separate high-risk provider review is required for this copy-only change. Integration and deployment: root. Current request and standing deployment authority apply.

## Lanes
P owns public form, privacy guide, expressions-page surrounding guidance and TV connection instructions, plus relevant public/display tests. Catalog campaign wording is immutable.
A owns admin components, admin route surrounding text, and admin tests. Keep controls, permission checks, confirmations and states functional. Strip implementation narration and routine retention explanations.
I reviews cumulative edits, integrates sequentially, checks production build and affected synthetic journeys, inspects phone/desktop app surfaces, updates docs, pushes and deploys existing app. No shared database writes or configuration changes.

## Acceptance
Short task-oriented guidance throughout public/admin/TV screens. No user-facing age-specific or personal-data retention explanations. Campaign catalog unchanged. Existing actions and protections unchanged. Current copy selectors updated only when wording changes. Runtime source, final diff, production build, focused browser journeys and rendered phone/desktop views verified. Existing private Git backup and source deployment completed.

## Frozen target
ML-BUBBLE-APPROVED-V3. Existing design references remain unchanged. Removing explanatory paragraphs is the requested deviation; no new visual design or campaign wording.

## Build log
- Baseline: 6c7f3ddc65023f831a6213015c770942bfeda7aa; clean working tree. Ignored runtime credentials are out of scope. Started two independent source-only Luna lanes. Historical source handoff and technical data policy stay intact.
- Public lane integrated at 7c22dde. Removed age-specific and retention explanations, shortened form guidance and replaced the long privacy page with practical sharing instructions. Display connection/status text is concise; catalog and behavior are unchanged. Controller corrected redundant instructions and inaccurate neutral-mode wording before integration.
- Public and display synthetic browser checks passed: 25 journeys, with one optional screenshot-only test skipped. Form accessibility, preview privacy, retries, complete expression content, TV pairing and text bounds remain correct.
- Admin lane integrated at ff18e1b. All 23 admin browser journeys passed on the production build; all 71 unit tests, lint and build passed. Visual scans identified existing generic badge contrast at 4.13:1. Luna corrected only the generic badge foreground at 3454d0c; specialized colors and layout are unchanged. This narrowly scoped readability correction is the sole CSS deviation from the protected baseline.
- Native Sol max review found five copy regressions: missing moderator identifiers, restore text for never-published messages, collection versus display-arrival wording, browser status versus physical-TV wording, and neutral-mode scope. All findings are accepted. Two Luna correction lanes retain short text while restoring those distinctions. The focused native recheck uses Sol high effort, explicitly scoped to the corrective delta; this is the CLI reviewer, not the planner_sol role. The full initial review and the separate one-color contrast review retain their recorded max effort. No required gate is waived.
- Corrective runtime 6bdab79 passed lint, 72 unit tests, the production build and all 24 admin journeys. The existing 25 public/display journeys remain applicable. Deployed moderator-targeting and display-status checks passed, as did ten strict phone/desktop axe/bounds views and the neutral-display distinction check. Native Sol high corrective review returned no remaining finding; the controller accepted the combined review and source hashes. Copy cleanup is complete, with private backups and final publication records recorded in the run tree.

## Follow-up: Expression submission cards
Anthony requested a clean card header with the two-digit number, quoted campaign expression and a Select button. Show every full explanation and longer example permanently below that header in smaller, readable text. Remove both disclosure controls. This is an explicitly requested adjustment to ML-BUBBLE-APPROVED-V3, not a replacement design. Catalog words, card colors and submission behavior remain unchanged.

Model: gpt-5.6-luna. Effort: xhigh. Agent: one isolated card writer, working in parallel with controller verification preparation. Reviewer: native Codex Sol high controller review. Root owns integration, documentation, Git and production release. No independent high-risk review is required for this bounded UI follow-up. No new plan interview is needed.

### Lane C: Expression cards
Own SubmissionForm.tsx, SubmissionForm.module.css and the existing submission browser suite. Full explanations must be visible without interaction. Select/Selected controls must support pointer and keyboard toggling with a clear accessible name and aria-pressed. Verify all nine cards, narrow phone and desktop bounds, text contrast, keyboard selection and existing submission flows.

### Follow-up Build log
- Baseline 56080714e738b47439d5e19d2fe3f87d85f2bb72, clean root. Source-only worktree; ignored credentials and production data remain untouched. One Luna writer and controller verification preparation run concurrently.
- Integrated initial card implementation ef150e5. Lint, all 72 unit tests and production build passed; 11 of 12 browser journeys passed. Newly exposed example text revealed insufficient contrast on some existing card colors. Controller screenshots also showed narrow desktop cards squeezing long headings. The same Luna writer is correcting foreground contrast and wrapping by card width; no campaign wording or colors change.
- Corrective source 6dd7578 uses readable solid foregrounds and card-width wrapping. Production build, all 12 affected synthetic browser journeys and three strict rendered checks at 320px, 390px and 1440px passed. Controller inspected short and long cards at phone and desktop sizes. Native controller review and publication are the remaining gates.
- Native Sol high review passed with no material finding. All 12 affected journeys and strict three-viewport checks also passed on deployment dpl_7SYXK1sAN3gyw6npZ7g1wC6S2c3i. Real anonymous smoke confirmed collection open and protected data endpoints closed. Private evidence archive and mounted SHA-256 verified. Follow-up is complete after final records/static-board publication; no new implementation remains.
