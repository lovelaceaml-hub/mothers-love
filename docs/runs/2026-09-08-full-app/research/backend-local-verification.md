# Backend local verification

Candidate SHA-256 f213b423a4e36ec45d1958b7a1c93a282debd1d84cd6d761d3dcaa95fd753a10. PostgreSQL16.15, fresh disposable database through a local Unix socket with no network listener. No real data or provider services.

Migration compilation passed. Fixture003 accounting/edit/hide/invalid/restore/delete/expiry assertions passed and rolled back. Fixture004 forced RLS, direct privilege denials, Owner MFA, Moderator limits, membership revocation, one-use pairing, revoked snapshot/ack, original idempotent receipt, payload mismatch, cleanup health closure and recovery assertions passed and rolled back. Assertions use IS DISTINCT FROM so missing values fail.

A separate root-operated two-connection harness observed a waiting advisory lock for concurrent same-key different-payload submissions. After the winning transaction committed, the losing request returned IDEMPOTENCY_CONFLICT and only one recognition existed. A second interleaving held the device revocation transaction open while snapshot waited on its device lock; after revoke committed, snapshot and acknowledgement returned UNAUTHENTICATED. This harness populated only its disposable synthetic database, never shared production.

Production schema application and restricted role checks have also completed, recorded in the handoff. Fresh disposable PostgreSQL additionally reproduced the legal Unicode edit failure before additive migration 002 and passed fixture 005 after the correction, with 003/004 regressions still passing and rolled back.

## Later password-only policy
The earlier Owner MFA assertions describe the original policy and are superseded by Anthony's explicit removal of the authenticator requirement for everyone. Additive migration003 compiled in a separate disposable database with001/002already applied. Updated fixture004 and new fixture006 passed with rollback: AAL1Owner operations succeed, Moderator Owner-only operations remain denied, and inactive/nonmember/malformed actors remain denied. Production application preserved all unrelated function metadata and exact owners/ACLs. The disposable server was stopped after verification.
