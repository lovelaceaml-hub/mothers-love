# Plan 02: Simple app instructions

## Request and scope
Anthony requested simple, clean text that explains only how to use the app, with no distinction for children and no explanation of how long information is saved. This supersedes earlier explanatory copy, including the long privacy page. Preserve exact campaign title, tagline, nine expressions, descriptions and longer examples. Preserve approved Bubble Board styling and all data, access, review, expiry and counting behavior. Helpful error recovery, name formatting, private/public field labels and destructive-action consequences remain concise and visible. No clarification is needed for this bounded copy edit.

## Model and agent choices
Model: gpt-5.6-luna. Effort: xhigh. Agents: two parallel writers in separate worktrees. Runner: current coordinator. Reviewer: controller, proportionate combined diff and real rendered synthetic journeys; no new independent high-risk review required for copy-only changes. Integration and deployment: root. Current request and standing deployment authority apply.

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
