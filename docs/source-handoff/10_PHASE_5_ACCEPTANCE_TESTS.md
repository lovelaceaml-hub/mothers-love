# Phase 5 — Acceptance tests and operating readiness

**Status:** Test plan only. All execution states start NOT RUN.  
Acceptance expectations containing proposed policy become binding only after the relevant decision is approved. Passing the old JavaScript syntax check is not evidence that these cases pass.

## 1. Evidence rules

For each case record requirement/decision IDs, build/commit, environment, fixture, actual result, screenshot/recording or automated assertion, reviewer, and remaining limitations. Use fake clocks/events for deterministic behavioral tests plus real-device checks where needed.

Never substitute mock-data success for tested permissions, screenshot appearance for working movement, desktop QR rendering for phone scannability, or a browser heartbeat for a physically visible television. Do not use actual member messages as fixtures.

## 2. Phase 1 cases

| Test ID | Scenario | Required outcome |
|---|---|---|
| T-P1-01 | Normal form with one recipient and expressions 2/6/8. | One logical recognition, three distinct selections, correct eligible/held receipt; no member account. |
| T-P1-02 | Empty/whitespace fields, no expressions, invalid IDs, over-limit message. | Server rejects invalid payload; field-level feedback; no false receipt or unsafe client authority. |
| T-P1-03 | 500-unit boundary, emoji, combining accents, multiline text and large byte payload. | Consistent approved counting rule; no silent truncation or server/client disagreement. |
| T-P1-04 | Names with apostrophes, hyphens, accents and multiword first names; same display name for two people. | Intended format accepted; no automatic identity merging or directory creation. |
| T-P1-05 | Keyboard/assistive navigation and contrast. | Labels, checked states, focus and associated errors; selection not color-only. |
| T-P1-06 | Slow send, repeated tap, lost response and same-key retry. | Values preserved; one record/contribution; truthful pending/failed/received UI. |
| T-P1-07 | Public preview and confirmation/reset. | Submitted name absent from preview; no held-publication promise; Recognize Someone Else resets correctly. |
| T-P1-08 | Collection paused/filter hold. | Clear state without private filter reason; held content never triggers public cue. |

## 3. TV/layout cases

| Test ID | Scenario | Required outcome |
|---|---|---|
| T-TV-01 | Compare identity against catalog and original selected design. | Exact title/tagline; no location/logo drift; bottom-left QR. |
| T-TV-02 | 0, 1, 2, 5, 20 and many eligible recognitions. | Honest empty layout or unique content; density respects readable fit. |
| T-TV-03 | Initial garden, then several full ordinary cycles without arrivals. | No initial stack; messages from the eligible pool rotate fairly, not only the first few fixtures. |
| T-TV-04 | Maximum message/name/selections. | Full readable treatment available; garden excerpt clearly marked if approved; no clipped text. |
| T-TV-05 | Maximum breathing/fresh scale at edges and beside QR/header. | No collisions or unsafe-zone obstruction at every sampled frame. |
| T-TV-06 | 1080p/4K, browser scaling, resize, real viewing distance. | Readable text, bounded shapes; tested at physical church setup before signoff. |
| T-TV-07 | All-nine overview. | All nine exact principles and complete phrases; no accidental omissions; adequate reading dwell. |
| T-TV-08 | Cluster with 2, 3 and 4 qualifying records; none qualifies. | No duplicated fillers; correct shared expression; fallback for insufficient data. |
| T-TV-09 | Constellation and atmosphere with multiple selections. | Links reflect genuine shared selections only; all expressions remain represented in detail. |
| T-TV-10 | Still/reduced motion and Calm/Standard/Lively. | All mechanisms obey intended mode; CSS, physics, canvas and journeys verified. |
| T-TV-11 | Low activity then arrival; manual Quiet then arrival. | Automatic low activity wakes appropriately; manual Quiet does not. |
| T-TV-12 | Real QR at intended distance on representative phones. | Correct deployed form destination, consistent scan; no prototype example address. |
| T-TV-13 | Milestone/recent-count display after edits and month change. | Same aggregate revision across headline and nine counts; correct period/threshold. |
| T-TV-14 | Hours-long session and resource monitoring. | Bounded DOM/trails/timers/memory; no accumulating animation faults or missed removal. |

## 4. Queue and coordinator cases

| Test ID | Scenario | Required outcome |
|---|---|---|
| T-Q-01 | Ten concurrent publication events. | Ten valid stored recognitions; no overlapping journeys; owner-approved backlog policy. |
| T-Q-02 | Duplicate/out-of-order event and edited version. | One first-publication introduction; newest eligible content; no counter changes from playback. |
| T-Q-03 | Slideshow transition becomes due during journey/reading. | Protected presentation finishes unless a safety/override event cancels it. |
| T-Q-04 | Target bubble would move/resize during arrival. | Reserved or tracked landing; no arrival to an outdated coordinate. |
| T-Q-05 | Hide, invalidate or expire waiting/in-flight/current recognition. | Immediate eligible-state removal across queue and active view; no stale replay. |
| T-Q-06 | Force a single animation failure/cancellation. | Cleanup and queue release; appropriate static fallback; later items still work. |
| T-Q-07 | Pause arrivals/rotation, Still, Quiet and emergency neutral combinations. | Exact approved semantics; safety updates continue while paused. |
| T-Q-08 | Restart browser/reconnect with a week's existing records. | Authoritative quiet snapshot; no entire backlog announced as brand-new. |
| T-Q-09 | Lost connectivity, expired cache, stale event and restored connection. | Approved bounded fallback; no expired/hidden resurrection; resync before replay. |
| T-Q-10 | Burst crosses several milestones. | One approved celebration, properly ordered behind reading holds; no lost recognitions. |

## 5. Data/statistics cases

| Test ID | Scenario | Required outcome |
|---|---|---|
| T-D-01 | Held → published with three expressions. | 0/0 while held; +1 recognition and +3 total at publication. |
| T-D-02 | Repeated write/event/reconnect/replay. | No duplicate contribution or invented unique-member count. |
| T-D-03 | Concurrent expression edits 2/6/8 → 2/8 and another version. | Version conflict or consistent committed result; aggregate vector correct. |
| T-D-04 | Privacy hide, invalidation, restore and permanent deletion. | Exactly the approved D03 count effects, applied once. |
| T-D-05 | Original creation near month-end; later approval and edit. | Correct first-publication period under D04; original expiry unchanged. |
| T-D-06 | Local month/week changes and daylight-saving transitions. | Approved timezone/week rules, duration-based expiry, historical totals retained. |
| T-D-07 | Headline versus nine expression counts. | Exact same-period reconciliation after all mutations and refreshes. |
| T-D-08 | Scheduled purge concurrent with edit/publish. | No post-expiry publication; personal rows removed; aggregates retained consistently. |
| T-D-09 | Test/demo fixtures and admin preview buttons. | Never counted in production; no fake milestone achievement. |
| T-D-10 | Cleanup followed by historical report/correction request. | Aggregates remain; expired personal history is unavailable; no secret event archive. |

## 6. Security/privacy cases

| Test ID | Scenario | Required outcome |
|---|---|---|
| T-S-01 | Public visitor enumerates endpoints/IDs. | Cannot obtain private submitted names, admin content, or unauthorized display feed. |
| T-S-02 | TV inspects API responses, DOM, events, canvas and logs. | No sender field, held content, privileged token or secret key. |
| T-S-03 | Signed-in nonadmin/operator attempts moderator/owner actions. | Denied server-side/database-side under approved role matrix. |
| T-S-04 | Revoke admin/device while session is active. | Access stops within approved bound; safe screen after device verification fails. |
| T-S-05 | HTML/script-looking user input in every view. | Plain-text output; no script execution or unsafe markup. |
| T-S-06 | Filter false positives/outage/abuse burst. | Approved moderation behavior, clear private reasons; no unchecked public leak. |
| T-S-07 | Shared Wi-Fi many genuine submissions. | Normal approved capacity without mass blocking; abusive volume controlled. |
| T-S-08 | Expiry of recipient, sender, message, edits, notes, events, cache and queue. | All personal copies obey original lifetime; no feature/restore exception. |
| T-S-09 | Logs, traces, error reports and repository secret scan. | No real member payloads, credentials or unauthorized long-term copies. |
| T-S-10 | Restore backup containing now-expired data. | Closed display, re-expiry/revocation and verification before reopening; documented backup policy. |
| T-S-11 | Expired receipt retry and stale publication replay. | No reconstruction or resurrection of expired personal content. |
| T-S-12 | Browser clock change/offline uncertainty. | Cannot extend lifetime; safe fallback if current eligibility cannot be trusted. |

## 7. Administrator cases

| Test ID | Scenario | Required outcome |
|---|---|---|
| T-AD-01 | Invite, revoke, recover access, attempt to remove last owner. | Approved role/recovery model; no open signup; last-owner protection. |
| T-AD-02 | Search/filter current personal records and historical aggregates. | Clear lifetime boundary; no permanent message archive or sender analytics. |
| T-AD-03 | Two admins edit the same message. | Conflict handled; no silent last-write loss. |
| T-AD-04 | Record expires while editor/review page is open. | Cannot publish/restore expired content; personal view cleared per policy. |
| T-AD-05 | Hide currently featured/clustered/in-flight record. | Removal reaches every mode with accurate acknowledgement. |
| T-AD-06 | Command saved while TV offline. | Pending state; no false applied/physically-off claim. |
| T-AD-07 | Emergency neutral and return-to-normal. | Priority override works and cannot be auto-woken by a new submission. |
| T-AD-08 | Preview, queue simulator, milestone test, aggregate export. | No mutation of real counts; no unapproved raw personal export. |
| T-AD-09 | Cleanup failure/held content near expiry. | Actionable warning without personal logs or indefinite retention. |

## 8. Test environments and launch gate

Local/isolated synthetic tests first. Later staging uses synthetic data and an explicitly authorized environment. Real church testing requires approved privacy/child/recipient policy, authorized infrastructure and a production-safe form; do not casually enter real names into public previews.

A release candidate needs accepted policy decisions, passing automated behavioral/permission tests, human visual review, physical QR/readability confirmation, long-run evidence, moderation coverage, documented backup/expiry behavior, safe fallback instructions and explicit deployment authorization.

No gate is marked passed in this package.

## 9. Proposed operations checklist

**Before a church session:** confirm browser connectivity, correct display source, intended mode, QR destination, fresh counts, moderation coverage and no demo data.  
**During a session:** monitor held messages and acknowledgements; use Quiet/neutral deliberately; follow physical operator procedure if urgent removal cannot reach an offline TV.  
**After a session:** verify collection policy, cleanup health and unresolved holds; do not export private messages to create informal archives.  
**After a restore/security incident:** keep recognition display closed until current expiry/access checks and counting reconciliation are complete.

Owners of domain, hosting, database, moderation and physical TV operations must be named before launch. This document plans those tasks; it does not execute them.
