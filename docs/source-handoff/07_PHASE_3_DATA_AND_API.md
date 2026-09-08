# Phase 3 — Architecture, data, publication and API planning

**Status:** Proposed implementation design, not SQL, provisioned infrastructure or deployed endpoints.  
**Blocking policy:** D02–D06, D15–D19, D22.  
**Scope:** One campaign, one main church display context, a few admins, public submissions.

## 1. Candidate architecture

Earlier direction: Next.js web application, Supabase PostgreSQL/Auth/Realtime, and Vercel hosting. This is a candidate to validate under D18; no stack version, subscription, hosting account, region, domain or budget has been finalized.

The necessary capabilities are a public form, trusted submission handler, authoritative database, authenticated administration, controlled read-only display delivery, scheduled retention, and browser presentation. A separate message broker, mobile app, runtime LLM, external analytics system or microservice fleet is not required by the current scope.

Later implementation should choose current stable dependencies from primary documentation, record exact versions, and test the integration. Do not copy a dated setup recipe into production or claim a service plan is free indefinitely. No accounts need to be created during planning.

## 2. Logical data model — proposed

Table names below are conceptual. Equivalent structures are acceptable if access, counting and retention guarantees are demonstrated.

| Entity | Fields / responsibility | Lifetime and access |
|---|---|---|
| Campaign | Internal ID, title/tagline/catalog version, reporting timezone, collection availability. | Configuration; no new multi-location UI. |
| Expression catalog | Stable ID 1–9, exact phrase, principle, reference color. | Versioned content; exact text from `03_CONTENT_AND_DESIGN.md`. |
| Recognition | ID, recipient display name, message, status, validity if D03 selected, created_at, first_published_at, expires_at, version, feature metadata. | Personal record; seven-day content lifetime. |
| Recognition expressions | Recognition ID plus expression ID; unique pair. | Same record lifetime; no duplicate selections. |
| Private submission identity | Recognition ID, submitted name. | Admin-only; same expiration as recognition. Separate permissions/structure strongly recommended. |
| Mutable contribution state | Whether counted, statistics period, current counted expression set. | Restricted and bounded by personal lifetime; permits corrections without duplicate accounting. |
| Aggregate day/month counts | Campaign, period, recognition count and each expression count, revision/as-of. | Retained without names, messages or permanent record links. |
| Display event/outbox | Stable event ID, entity/version, event kind, ordering cursor. | Bounded, no sender name; payload no longer survives original personal expiry. |
| Display device/session | Pairing state, read-only authorization, revocation, last heartbeat, settings acknowledgement. | Separate operational retention policy. |
| Presentation receipt | Event/display ID, disposition such as shown/cancelled/grouped, short timing metadata. | Bounded under D22; no long-term person-level attention history. |
| Admin membership | Auth user ID, approved role, active/revoked status, invitations. | Separate admin-account lifecycle. |
| Audit action | Admin actor, action, timestamp, reason category; temporary record reference/diff when needed. | Personal text/reference removed with recognition; durable minimal admin metadata requires D22 policy. |
| Display settings | Motion, playlist, dwell/density bounds, pauses, quiet state, QR destination, versions. | Server authoritative; demonstration settings isolated. |

Do not create a permanent table called anonymous events that retains one row per recognition with an exact time, recipient hash and unique expression combination. Renaming linked data does not make it aggregate.

## 3. Lifecycle

Proposed persistent states: HELD, PUBLISHED, HIDDEN, INVALID. EXPIRED is a read-eligibility condition and eventual purge, not a permanent archive of personal content. A receipt may be accepted before its moderation result is available, but only PUBLISHED and still-valid/unexpired records reach a display.

A basic content check permits ordinary immediate publication; flagged content remains HELD privately. Human approval makes held content PUBLISHED only if it has not expired. A moderator may hide or correct published content. Feature state is presentation metadata, not a separate permission to display private/expired content.

Original submission time is immutable. D02 proposes expiry at that time plus 168 hours; editing, approval, restoring or re-featuring cannot extend it. First publication time is immutable after first publication and proposed as the reporting date (D04).

Proposed effective display eligibility: published status, valid under the chosen policy, now before expiry, campaign/device permitted, and no overriding recognition-display restriction. Checks apply on every read and presentation entry, not only the insert path.

## 4. Counting contract — D03/D04 pending

Publication—not the browser queue or animation—is the point of statistical contribution. The TV may be off or its journey may fail without affecting totals.

Proposed model separates visibility from validity:

| Transition/event | Recognition contribution | Expression contribution |
|---|---:|---:|
| Accepted but held | 0 | 0 |
| First valid publication selecting 2, 6, 8 | +1 | +1 to each of 2, 6, 8; +3 total |
| Retry or duplicate event | 0 change | 0 change |
| Edit from 2, 6, 8 to 2, 8 | 0 change | -1 to expression 6 |
| Edit text/name only | 0 change | 0 change |
| Hide for privacy while valid | Retain | Retain |
| Invalidate spam/duplicate/test | Reverse once if previously counted | Reverse current counted selections once |
| Restore previously counted valid hidden content | No second count | No second count |
| Reinstate an invalidated record, if owner permits and unexpired | Recompute contribution against stored counted state | Restore only appropriate difference, not a duplicate |
| Ordinary expiry/purge | Retain aggregate | Retain aggregate |

Alternative D03: every hide subtracts. Do not mix models. Public wording must explain counts as recognitions/expressions shared, not currently visible message count, unique people, verified acts, or participation percentage.

Each recognition has one contribution vector: recognition count is 0 or 1; each expression component is 0 or 1. A mutation computes old-versus-new contribution and applies the difference atomically to the appropriate period. Counted state and aggregate updates must commit together with visibility changes and the publication event. Concurrent edits, retries and restore races require tests, not just client button disabling.

Aggregate invariant: expression_total equals the sum of all nine expression counts for exactly the same campaign, period and inclusion policy. Recognition_total is separate. Do not hardcode it from pool length. A sample 214/57 is a fixture only.

## 5. Time rules — proposed D04

Store authoritative timestamps consistently. Use America/Los_Angeles for display/reporting periods; it represents the internal Las Vegas context without public location branding. Proposed week starts Monday. Label calendar week separately from “last seven days.” The owner's seven-day retention is a duration, not a weekly clearing schedule.

First publication determines aggregate period. A message created late in one month and approved in the next contributes to the next month's publication total but keeps its original expiry. An expression correction applies to the original publication period, not arbitrarily to the edit date. Repeated publication/restore does not move a contribution to a new month.

Historical month records remain; “monthly reset” means selecting a new period, not deleting prior aggregates. Test daylight-saving changes, month-end and timezone conversion. Do not let a client-supplied timestamp choose a favorable expiry or reporting date.

Once personal linkage expires, per-message correction may no longer be possible. If a later correction to an aggregate is needed, it is a separately approved documented aggregate adjustment, not a justification for secretly keeping all message IDs forever.

## 6. Proposed server operations (names are not deployed URLs)

| Operation | Caller | Input | Output / rules |
|---|---|---|---|
| SubmitRecognition | Public form | Submitted name, recipient, message, distinct expression IDs, logical request key. | Server-assigned ID and receipt/eligibility state; never trust role/status/expiry/feature values from client. |
| GetDisplaySnapshot | Authorized read-only display if D05 approved | Device session, optional cursor. | Eligible public fields, canonical catalog, current aggregates, settings, expiry/server time and revision; no submitted names. |
| SubscribeDisplayChanges | Authorized display | Device/session context and cursor. | Safe event identifiers/versions or sanitized payload; no private names/holds. |
| ListAdminRecognitions | Authorized admin | Search/date/expression/state filters and bounded pagination. | Only active-lifetime records within that role's permission. |
| GetAdminRecognition | Authorized admin | Recognition ID. | Private/public separation, version and expiry; exact public preview. |
| MutateRecognition | Authorized admin | ID, expected version, action/allowed fields, optional reason. | Atomic state/aggregate/event result or conflict; stale edits do not overwrite silently. |
| ChangeDisplaySettings | Authorized owner/operator policy | Expected settings version and bounded change. | Saved version and delivery status; browser acknowledgement separate. |
| AcknowledgeDisplay | Read-only device | Settings/event version and disposition. | Operational receipt only; cannot alter campaign totals. |
| Pair/RevokeDisplay | Owner under D05 | One-time pairing/revocation instruction. | Read-only bounded device authority; never admin credentials on TV. |
| AggregateReport | Authorized role | Approved period/filter. | Counts only; no unique-member inference or raw-content export by default. |
| ExpireAndPurge | Trusted scheduled process | Server time / bounded batch. | Exclude expired content, purge related personal copies, keep aggregates, report health without content. |

Model validation errors, authorization failure, version conflicts, expired/missing records, rate limits, temporary filtering delays and service unavailability. Exact HTTP mappings can be selected later. Public errors should not reveal whether a private record/name exists.

## 7. Idempotency and transactional events

The same logical submission retry must not create or count twice even when the first response is lost. Define an accepted retry window and a retention-safe receipt. A receipt containing personal data follows the original expiry. Any minimal deduplication token retained separately needs an explicit bounded policy and must not become a hidden permanent link to a recognition.

Expired receipt/retry should not reconstruct expired content or silently reaccept an old private payload as fresh. State the limits once its deduplication window has elapsed; do not promise infinite idempotency without durable storage.

Publication, contribution change, and event creation should commit atomically. Event dispatch can retry safely with the same ID. The display deduplicates and resynchronizes; network notification alone is not authoritative state.

## 8. Display event kinds

Plan for first-publication, content revision, hide/invalidation, expiry/removal, feature change, settings change, aggregate revision, and device revocation. An insert-only stream is insufficient.

A race between initial snapshot and subscription must not lose changes. Use a documented cursor/snapshot or subscribe-and-buffer strategy; verify at reconnect. Every event is rechecked against current version/eligibility. A late first-publication event cannot revive a now-hidden record.

## 9. Safety and service failures

Content filter failure policy is D16; recommended result is safely received/held rather than unchecked publication. Shared-IP rate limits must not accidentally deny an entire church Wi-Fi network. Never treat the typed name as the rate-limit identity or authorization credential.

Do not invoke third-party AI for moderation, rewriting or sentiment analytics by implication. No real member records in agent prompts, error reporting tools or development fixtures. Technical authorization, logging and backup sources are in `13_PROTOTYPE_AUDIT_AND_SOURCES.md` [S03–S08].

## 10. Definition of ready

Resolve counting/calendar/expiry/access/roles, characterize chosen data provider and backup policy, approve operation contracts and tests, and record budgets/ownership before implementation. The application will later need schema migrations and executable tests; this document contains neither and authorizes neither.
