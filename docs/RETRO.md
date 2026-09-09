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

## Readiness follow-up
Anthony requested everything pushed, deployed and ready to use. Three Luna readiness lanes found one remaining validation inconsistency, corrected it through a shared browser/server predicate, and preserved the existing approved valid names. Root opened collection only after the updated release, direct invalid-request check, healthy cleanup and independent review passed. The site now accepts recognitions; physical TV pairing remains explicit. The parallel Luna workflow preference remains unchanged.


## Presentation and hearts follow-up
The user authorized warmer typography, distinct TV animation/layouts, heart counts and shared public feeds. Four Luna xhigh worktrees separated typography, TV presentation, reaction backend, and public feed work. Root integrated and verified. Anthony added an explicit fallback: after three failed Luna task attempts, Terra; after two failed Terra attempts, Sol. The runner and TV correction lanes used the Terra fallback.

Rendered evidence caught overlapping TV panels, QR collision, small colored-card text contrast and duplicate count labels. Real concurrency checks found fixture and connection-option mistakes that static parsing missed. A lane reused the integration server port, producing invalid browser results; root separated final verification onto port3199 and reran affected checks. Future lane capsules should name separate ports and forbid shared-server replacement. This is a project recommendation, not a new global rule or memory update.

Security review narrowed the browser cookie and origin boundary and required the complete production transaction in the sealed payload. The additive release preserved existing shared-database function metadata. Anonymous browser hearts remain a convenience, not verified-person voting. Physical TV and phone commissioning remains distinct from synthetic browser evidence. Anthony's workflow preference and fallback instruction are recorded; visual satisfaction feedback is pending and does not block technical release.

Final local capture-inclusive verification exposed an intermittent pauseAt(Date.now()) fixture race after two Terra attempts, while all74 deployed journeys passed. Sol owns the deterministic test-only correction under the user fallback. No additional app or database scope was introduced.

Sol resolved the two timing fixtures without changing app code. Both fixtures passed16 stress cases and the full74-test normal suite passed. Fallback model choices matched the explicit user instruction; visual feedback remains pending.

Anthony then requested smaller top-right heart controls. A final bounded Luna lane changed markup and CSS only. The follow-up passed16 affected deployed journeys and12 measured/accessibility views. It is included in the final cumulative review.
