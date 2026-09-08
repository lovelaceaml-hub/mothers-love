# Security, privacy, moderation and retention

**Status:** Seven-day personal-content lifetime and admin-only submitted name are approved. Detailed guarantees, policies and mechanisms here are proposed for approval/testing.  
**Related decisions:** D02–D06, D13, D15–D17, D20, D22.

## 1. Honest privacy model

The sender name is typed without authentication. Call it “Submitted name” in admin records. Do not describe it as a verified person. On-screen anonymity means the application excludes that field. It does not prevent identification through a unique anecdote, recipient knowledge, cameras or submission timing.

Recipient first name plus initial and appreciation can still be personal information in a small church. The seven-day limit applies to this content, not only the hidden sender name. Anonymous aggregates must not retain a personal-history side channel.

## 2. Data access boundaries

| Actor | Allowed by approved intent / proposed least-privilege model | Must not receive |
|---|---|---|
| Unauthenticated form visitor | Submit via validated operation; see own safe acknowledgement. | Directory, other recognitions, admin lists, submitted names, aggregate mutation rights. |
| Paired read-only TV (D05) | Currently eligible recipient/message/expressions, aggregate statistics, approved display settings. | Submitted names, held records, moderation notes, admin credentials. |
| Moderator (D06) | Review/edit/publish/hide/restore within approved role. | Owner-only account/security changes unless separately granted. |
| Owner | Approved configuration, membership, recovery and destructive controls. | Any assumption that possession of a client key substitutes for authentication. |
| Scheduled backend | Retention/counting operations with scoped server authority. | Exposed browser/TV secret credentials. |

Do not assume row-level rules hide one sensitive column within an otherwise readable row. Private identity should have separate table/projection/grant protection and tests. If Supabase is selected, apply grants and row-level policies deliberately and secure realtime channels separately. Elevated secret/service-role keys remain server-only. See [S03–S06](13_PROTOTYPE_AUDIT_AND_SOURCES.md).

Membership authorization must be checked per privileged operation. A signed-in user is not automatically a campaign admin. Revocation must take effect in the defined session/token window; approve that latency and test it.

## 3. Proposed threat scenarios

Consider unwanted external submissions, impersonated typed names, accidental private stories, abusive or oversized input, script injection, a lost/shared TV credential, public feed enumeration, concurrent moderator edits, logging leaks, screenshot/analytics recording, stale offline displays, and restored backups resurrecting expired data.

Planning does not require hypothetical enterprise complexity. It does require safe plain-text rendering, bounded inputs, endpoint authorization, secret handling, content moderation, access revocation and expiry at every layer.

## 4. Content moderation

APPROVED: normal submissions publish immediately after a basic inappropriate-content check; flagged records are held privately. Do not announce a held message on the TV or count it as published.

PROPOSED: filter names/message with carefully chosen rules and allow harmless campaign wording. Do not treat “I'm sorry,” “pray,” or ordinary support as misconduct in isolation. Do not infer a member's beliefs, health or intent from a filter hit. Display a reason category privately to moderators; maintain human judgment for false positives.

Filter errors should hold rather than publish unchecked (D16). An emergency review-all mode is proposed for an abuse spike, not the default replacement for immediate publication. Define who reviews, expected coverage, and escalation when holds approach expiry. No record survives indefinitely because nobody reviewed it.

Recipient opt-out/removal requests and children/sensitive-content rules require organizer input (D17). A public name should not become an indefinitely stored opt-out directory without a separate retention/access decision. Put only nonsensitive review counts in alerts, not copied messages.

## 5. Safe input and abuse limits

Treat content as text, never instructions or executable HTML. Do not copy prototype `innerHTML` interpolation of member data into the implementation. Context-appropriate safe rendering must cover garden, featured, clusters, admin previews and notifications. See OWASP [S07].

Server validation enforces field bounds and canonical distinct expression IDs. Reject or safely handle oversized request bytes separately from the display-character limit. The public client cannot choose role/status/expiry/contribution/featured fields.

Layer spam controls. Shared church Wi-Fi can place many legitimate people behind one external IP; no tiny shared-IP quota should block ordinary participation. Typed names are not trustworthy limiter keys. Avoid persistent device fingerprinting or indefinite IP logs by default. Document any short-lived technical abuse identifiers and expiry (D22).

## 6. Seven-day recognition lifetime

APPROVED: one week for personal recognition content, aggregate statistics retained.  
PROPOSED D02: original server creation time + 168 hours, including time held. No resetting the clock for edits, approval, feature, restore, export or restart.

At expiry: all reads and display selection exclude the record immediately according to authoritative time; every active presentation and local cached record is invalidated; scheduled processing physically deletes personal rows/copies within an approved maximum lag. A soft-deleted or expired status with the message intact forever does not satisfy the requirement.

The owner must approve how literal the seven-day deletion promise is relative to cleanup lag and backup windows. Do not silently add a multi-day grace period to physical content retention.

| Data | Proposed handling |
|---|---|
| Recipient, submitted name, message, selected-expression links | Expire and purge with the original record. |
| Personal edit history and moderation comments | Same deadline; do not preserve old versions longer. |
| Browser queue/cached message copy | Never later than original expiry, earlier on hide/revocation or lost verification policy. |
| Outbox/publication payload and linked receipts | Bounded lifetime no longer than associated personal content unless a shorter/metadata-only policy is explicitly approved. |
| Daily/monthly aggregate counts | Retain without message IDs, names, hashes of people or exact per-event combinations. |
| Minimal admin actor/action records | Separate approved administrative retention; sever record links/personal text at recognition expiry. |
| Admin identities/device credentials | Separate access lifecycle; not incorrectly deleted every seven days. |
| Provider logs and backups | Distinct documented policy; never assumed erased by deleting one row. |

## 7. Backups and restore

Provider backups can preserve earlier database states. Supabase backup documentation [S06] describes retained snapshots/restoration; do not promise all copies are irrecoverably erased on day seven merely because active rows are gone.

D15 must identify backup duration, access, disclosure and restoration steps. On restore, keep the display closed, reapply expiry/purge and access revocations using trustworthy current time/state, reconcile counters/settings, verify no old personal content became eligible, then allow reopening. A backup of short-lived data is still sensitive.

Do not claim a legal/compliance certification. Review the actual provider plan and organization policy before launch. A security or provider review remains a release gate.

## 8. Logging and development data

Never log message bodies, private names, tokens, credentials or complete submission requests by default. Redact structured errors and traces. Client monitoring/session replay must not capture form fields, admin views or hidden personal DOM. OWASP logging guidance is source [S08].

Use obviously synthetic fixtures in isolated test environments. Do not import a church roster, live recognitions, passwords, or member data into Codex/Claude tasks. The existing sample names do not establish identity or membership.

Secrets should be stored through approved environment/secret mechanisms after implementation is authorized; not in Markdown, QR query strings, example HTML, screenshots or repository history. No actual secrets are supplied in this package.

## 9. Offline and cached display safety — D13

Proposed privacy-first policy: temporarily show still-valid sanitized cache only for an approved short verification grace period. After that, switch to campaign/expressions without recognition names/messages until current authority is restored. Expiry still applies immediately to local content. Unavailable data is not zero.

Hiding cannot be honestly confirmed on an offline browser. Admin shows saved/pending, last seen, and acknowledgement. A neutral-screen command is similarly subject to connectivity; a physical TV operator procedure is needed for urgent offline removal.

A browser heartbeat means the browser connected, not that the TV is powered on, correctly routed to HDMI, or watched.

## 10. Export and reporting

Aggregate-only export is proposed. Raw recognition export is not approved because it creates copies beyond automated expiry. Do not add it as a convenient admin button. Permanent per-sender reports, recipient rankings and unique-person analytics are outside scope.

Small aggregate categories can still reveal something in a small group. Retain only what the campaign needs; avoid exact-event reconstruction through narrow timestamp filters or individual combinations. Public reports show communal monthly counts, not investigative drilldowns.

## 11. Required evidence later

Negative authorization tests, payload inspection for sender leakage, XSS/plain-text cases, concurrency and retry tests, purge/backup-restore rehearsal, shared-Wi-Fi burst tests, cache/hide/expiry tests, and revoked-session tests are required. A visually hidden private field and a successful ordinary sign-in test do not prove the security boundary.
