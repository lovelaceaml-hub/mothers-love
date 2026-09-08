# Plan 01: The Words of Mother's Love, full app and deployment

## Outcome and authority
Build the approved public form, Bubble Board TV, secured admin, real data lifecycle and aggregate reporting, then deploy this new app. Latest user explicitly authorizes full implementation and deployment. The source package's old planning-only state remains historical, not the current instruction. Preserve all exact words and approved effects. See CONTRACT.md for complete product/API behavior and source-handoff for original A/D/test IDs.

## Execution choices
Runner: coordinator. Root owns plan, shared interfaces, integration, Git, provider operations, board and completion. Implementation model: gpt-5.6-luna. Effort: xhigh. Agents: independent lanes in separate worktrees, no concurrent ownership of schema or presentation coordinator. Installed executor_luna pins max, so invoke an explicit Luna xhigh worker rather than silently using it. Architecture critic: planner_sol (gpt-5.6-sol, max, read-only). Review: controller plus fresh independent security/privacy reviewer at integration, with facts-only isolated payload; no self-grading by writers. No automatic provider fallback or spend. User already selected parallel workflow, do not ask Parallel/Steps/Full again.

## Privacy and storage
New code repository is backup-safe, private GitHub under lovelaceaml-hub. Only synthetic development data; runtime recognition content and all secrets excluded. Download handoff unchanged. Source contracts/approved design copies in Git. Non-sensitive generated deliverables use configured Drive when required. Run tree has no real recognition data, so board may be published under the isolated app's public documentation surface with no security-sensitive details. Existing apps/databases protected. A paid resource or shared-database target still requires exact authority.

## Frozen design targets
Target ML-BUBBLE-APPROVED-V3. Owner approval is the handoff's documented Bubble Board selection, reaffirmed in this conversation; no invented historical date. Source: docs/source-handoff/references/prototypes/mothers_love_submission_prototype.html and mothers_love_phase_2_living_wall_v3.html, original hashes in references/README.md verified9/9. Canonical catalog in source-handoff/03_CONTENT_AND_DESIGN.md. Phone390x844, desktop1440x1000, TV1920x1080 and3840x2160. Preserve artwork, hierarchy and signature motion. Allowed changes: removed public location, truthful receipts, safe rendering, readable text, unique clusters, coherent timing, accessible static modes. Admin is restrained campaign-themed task UI. Original HTML never modified to conceal mismatch. Full production fidelity and state coverage recorded in UI-QUALITY-REPORT.md; missing physicalTV evidence remains explicit. New visual direction exercise is superseded by explicit instruction to preserve this chosen direction.

## Lanes and dependencies
### Lane F: Foundation and shared contract
Setup: Luna xhigh; Codex; one writer main project; review controller. Depends on none. Own package/config, root shell/styles, shared catalog/contracts/client helpers and placeholder routes only. Install pinned current packages and dev test tools; create a working skeleton safe when unconfigured, build and hand off. Then freeze shared types before worktrees. Early production skeleton can deploy with collection closed and no fabricated data.

### Lane 0: Architecture/security plan critic
Setup: planner_sol, Sol max, read-only, review none. Runs alongsideF, recommends concrete corrections to CONTRACT.md, cannot change files or launch agents. Root resolves findings before integration. Record research/critic.md.

### Lane B: Data, authorization and API
Setup: Luna xhigh; Codex; worktree /Users/anthony/Projects/mothers-love-worktrees/backend; review controller and independent integration security. Depends onF and frozen interfaces; provider activation may run later. Own src/app/api/, src/lib/server/, database/, scripts/database/, tests/backend/. Sole writer of SQL schema, atomic lifecycle/counts, rate limits, pairing and API permissions. Production credentials/provider mutations root-only. All failclosed and synthetic tested.

### Lane S: Submission and privacy journey
Setup: Luna xhigh; Codex; worktree /Users/anthony/Projects/mothers-love-worktrees/submission; review controller. Depends onF. Own src/app/page.tsx, src/app/privacy/, src/components/submission/, tests/submission/. Implement approved form/preview and exact receipt states, validation, retry/reset, mobile accessibility. No backend/shared contract writes.

### Lane A: Administrative workspace
Setup: Luna xhigh; Codex; worktree /Users/anthony/Projects/mothers-love-worktrees/admin; review controller and integration security. Depends onF. Own src/app/admin/, src/components/admin/, tests/admin/. Full auth/MFA, navigation, review/editor/conflicts/hide/invalidate/restore/feature/delete, insights CSV, access/devices and operational controls. Use exact stable endpoints, no direct DB access except provider auth SDK through frozen client. Private name separately labeled, no permanent personal history.

### Lane D: Living Wall and presentation coordinator
Setup: Luna xhigh; Codex; worktree /Users/anthony/Projects/mothers-love-worktrees/display; review controller and independent integration. Depends onF. Own src/app/display/, src/components/display/, src/lib/display/, tests/display/. Sole presentation-state writer. Full retained signature features, data-snapshot safety, device pairing, queue/scheduler, full expressions/details, milestones and QR. No new public browsing or demo data in production.

### Lane I: Integration, evidence and production
Setup: Luna xhigh for integration code in main project after previous writers stop; root controller handles Git/deploy; fresh independent privacy/security review. Depends on B/S/A/D. Root merges disjoint commits sequentially, resolves contract changes centrally, authorizes bounded Luna integration repairs. Execute npm run typecheck, npm test, npm run build, npm run test:e2e, local/data authorization and deployed negative tests. Deploy working skeleton first, then completed increments to this app; do narrowly scoped privacy preflight before collecting personal data. Completion after required functional/accessibility/performance/privacy evidence, docs, backup and review, without arbitrary soak time. PhysicalTV/phone commissioning and human usability not fabricated; report exact remaining owner-only checks.

## Every lane capsule
Read first the absolute plan, run INDEX and CONTRACT in its own worktree, then approved reference and phase/tests. State exclusive absolute file ownership, protected other files, frozen targetML-BUBBLE-APPROVED-V3, relevant acceptance IDs, exact verification commands, completion report with files/behavior/test results/remaining limitations. No agent directly deploys, accesses credentials or real records. Each lane writes only its own lane record and timestamped log in its worktree; root integrates board events.

## Hosting and rollout
Selected architecture candidate Next.js App Router, provider authentication, authoritative transactional database and server-only routes, Vercel isolated project mothers-love in lvzion. Supabase creation attempted in chosen organization and refused at two-free-project quota; do not touch existing databases or upgrade without authority. Provider resolution may adjust database adapter and auth client beforeB begins, whileF/UI shell proceeds. Use free provider hostname; no domain purchase. User supplied Owner email only used in protected provisioning, not source docs. Owner MFA enrollment is a user identity step. No invitations to other people sent by agents. Collection opens only with provider configured, purge healthy, Owner setup and immediate privacy preflight. Public site can ship earlier with truthful availability state. Source private backup verified before completion.

## Build log
- Intake: read seven required handoff documents and related phases, two read-only Luna xhigh audits, verified9/9 reference hashes, no changes to Downloads source.
- User selected admin/counting/lifetime/reporting/privacy/TV rules in CONTRACT.md.
- Latest request authorizes planning entire app and deployment; parallel Luna xhigh retained.
- Environment: new project absent; parent Projects repository has unrelated dirty files, preserve them and append only a narrow index entry later. New project baseline is empty, initial documentation commit will be recorded.
- Provider discovery: Vercel lvzion Hobby and GitHub lovelaceaml-hub authenticated. Supabase organization selected; quoted0/month but creation refused at free-project quota. No database created or existing project mutated. Cost/provider decision requested while independent work continues.
