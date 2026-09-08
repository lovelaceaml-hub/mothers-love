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
