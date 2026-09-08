# Backlog and dependency-ordered work

**Current authorization:** Planning only. Every implementation item below is NOT STARTED and requires later explicit permission. Deployment is not bundled with permission to code.

## 1. Planning tasks available now

| ID | Task | Deliverable | Completion condition |
|---|---|---|---|
| PLAN-01 | Intake the handoff and inspect references. | Concise approved-versus-proposed summary; source/asset gaps. | No repeated interview of already settled choices. |
| PLAN-02 | Resolve privacy/publication/counting bundle. | Recorded owner decisions for D01–D05, D15–D17, D19, D22. | No inferred approval or hidden production defaults. |
| PLAN-03 | Finalize admin screen workflows and role matrix. | Reviewed `09_PHASE_4_ADMIN.md`; flows for edit, hide, review, quiet and expiry. | D06/D20 and reviewer responsibilities addressed. |
| PLAN-04 | Finalize display behavior and readability treatment. | Reviewed `05` and `06`; values/approaches for D08–D14/D21. | Queue/paused/offline/long-message conflicts resolved. |
| PLAN-05 | Select candidate architecture and ownership. | Decision record for D18 and current official-documentation check. | Proposed versions/cost assumptions disclosed; no provisioning. |
| PLAN-06 | Freeze implementation-ready requirements and tests. | Traceability review linking A/D/P1/TV/AD/Test IDs. | Owner approves scope; outstanding items explicitly blocked. |

Package creation has supplied draft documentation for these tasks. It has not completed the owner's approvals or future test execution.

## 2. Proposed later implementation sequence

The phase numbering describes product areas, not permission to build backend before planning administration. Build safety and data invariants early; visual polish is layered on verified behavior.

| ID | Scoped task | Dependencies | Required evidence |
|---|---|---|---|
| BUILD-01 | Establish authorized local project structure, shared catalog and isolated fixtures. | PLAN-06; explicit coding permission. | Catalog integrity; no secrets/demo records in production paths; documented versions. |
| BUILD-02 | Schema, private identity separation, roles and read/write authorization. | BUILD-01; D02–D06/D18/D22. | Positive and negative permission tests, no sender in display projection. |
| BUILD-03 | Submission validation, logical retry key, moderation and lifecycle operations. | BUILD-02; D01/D16/D19. | Form receipt/hold/retry tests, shared Wi-Fi input controls. |
| BUILD-04 | Atomic publication contributions, edits/hides/invalidations/restores and historical aggregates. | BUILD-03; D03/D04. | T-D-01–T-D-07, concurrency/transaction failure tests. |
| BUILD-05 | Expiry exclusion, purge, audit/log minimization and cache/event lifetime. | BUILD-02–04; D02/D15/D22. | Original lifetime enforced; no soft-delete archive; purge races. |
| BUILD-06 | Finish Phase 1 UI against authoritative operations. | BUILD-03; approved form copy/refinements. | P1 cases; real saved-versus-unconfirmed states, accessible selections. |
| BUILD-07 | Minimum operational admin: login/review/edit/hide/restore/feature. | BUILD-02–05; approved admin workflow. | Concurrent edit and comprehensive removal tests. |
| BUILD-08 | Static readable TV layouts using controlled synthetic/current data. | BUILD-01/02; D08/D11/D12. | No overlap/clip; full phrases; proper empty/long-message treatment. |
| BUILD-09 | One presentation coordinator: queue/holds/pause/milestones. | BUILD-08; approved `06` policy. | Deterministic fake-clock tests; burst/interrupt/error cases. |
| BUILD-10 | Authenticated display sync, event deduplication, reconnect and revocation. | BUILD-02/04/05/09; D05/D13. | Snapshot/event-race tests; no old-content resurrection. |
| BUILD-11 | Organic motion, breathing, trails, constellations, atmosphere, clusters, QR invitation. | BUILD-08–10. | Independent transforms, safe bounds, all-engine reduced motion, bounded resources. |
| BUILD-12 | Full admin control room, acknowledgements, settings and aggregate insight. | BUILD-07/09/10. | D20-approved controls, offline honesty, safe previews/export. |
| BUILD-13 | Integration/security/visual/long-run review and release candidate. | All applicable build tasks. | Evidence for `10_PHASE_5_ACCEPTANCE_TESTS.md`; known limits explicit. |
| RELEASE-01 | Authorized staging/physical church test. | Owner permits environment/data scope; BUILD-13. | Real TV/QR/readability and operations results; no live private fixtures in dev. |
| RELEASE-02 | Production rollout. | Separate explicit deploy permission; release gates satisfied. | Ownership, rollback, moderation coverage, retention monitoring and safe launch. |

No task is authorized merely because it appears here. Existing prototype code may be reworked or replaced under later authorization; approved design features cannot be dropped without disclosure.

## 3. Workstream ownership

Recommended pairing: one active implementer and one independent reviewer per task. Either Codex or Claude can hold either role. The owner chooses; this is not a model-performance claim.

Schema/contribution/privacy work and presentation-coordinator work each need a single integration owner. Avoid agents concurrently changing the same contracts. Parallel work is reasonable only after interfaces are stable and files/tasks do not conflict. Reviewers should find deviations and regressions, not redesign approved campaign choices.

## 4. Definition of done for each future task

Record scope, input decisions, files changed, implementation status, actual tests/commands and outcomes, evidence paths, known limitations, and next dependency. A feature is not done because its button exists or its source parses. Never record a test as passing when it was only proposed, skipped or mocked outside its intended boundary.

For a planning task, done means an approved decision or reviewed document—not an unrequested prototype, application scaffold or deployment.

## 5. Scope not to add

Public member accounts/directories, photos, reactions, recipient rankings, sender histories, private-recipient messaging, AI runtime rewriting, permanent recognition archives, raw personal exports, multi-location administration, sound effects or elaborate analytics. These are not backlog shortcuts; they require new owner scope.

## 6. Suggested first practical milestone after future permission

A correctly authorized synthetic end-to-end recognition: public form → received/held/published → correct aggregate contribution → admin review/hide → sanitized TV with expiry. Complete that before making every decorative effect production-perfect. The approved visual features remain in the final scope; this sequence reduces the risk of a beautiful but unsafe demo becoming the deployed system.
