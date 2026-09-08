# Implementation retrospective

## Decisions that held
The approved Bubble Board references supplied the visual target, while production behavior came from the explicit contract. Independent submission, admin, display and backend writers worked in separate worktrees. A restricted campaign-only runtime connection avoided deploying a shared elevated credential. Backup exclusion shipped through its own independently reviewed lane before collection.

## Corrections discovered by evidence
Rendered screenshots exposed missing signature motion and garden clipping despite passing component tests. Independent admin review found expired responses could retain private content before state adoption. Transactional SQL assertions were hardened with IS DISTINCT FROM after nullable comparisons concealed a lifecycle defect. Display review added complete burst-consumption and pairing-race cases. Concurrent idempotency and revocation ordering were corrected and verified with actual two-connection lock waits. Dense multiline display content now paginates verbatim. Final provider checks exposed a missing explicit TLS setting; the official CA was verified before the scoped repair. Completion review added pause-safe timer shifting and retryable failed invitation delivery without extending invitation expiry.

The first real Owner attempt revealed that a working token flow still looked like ordinary sign-in. The account password had been saved, but the next authenticator step blocked use. Anthony removed that requirement for both roles. The correction uses an explicit password setup page, preserves verified email and role checks, and removes campaign MFA without changing other apps. Final review also found stale settings/bootstrap wording and two non-invoked Sign out callbacks; dedicated regressions now cover the intended copy and both exit actions.

## Follow-up boundaries
Keep real recognitions out of tests, artifacts and source backups. Reapply exact migrations with recorded hashes only, never synchronize the whole shared database. Future changes should rerun affected concurrency and privacy tests. Physical-TV commissioning remains a distinct owner action, not an automated claim. Final integration review passed; release evidence is recorded in HANDOFF.md and the run research records.

## Feedback
Anthony answered the workflow question: keep the parallel Luna workflow. Result satisfaction and process-change feedback are pending. The survey does not block technical release. No durable global rule or memory change was made from this project.
