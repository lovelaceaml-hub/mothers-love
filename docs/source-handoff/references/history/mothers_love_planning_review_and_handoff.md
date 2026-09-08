# The Words of Mother's Love — Planning Review and Implementation Handoff

**Review date:** September 4, 2026  
**Status:** Planning review. Proposed changes below require owner approval; they do not replace approved decisions silently.  
**Future implementation tools:** Codex and Claude.  
**Current boundary:** Do not implement, deploy, provision services, migrate databases, or change existing prototypes as part of this review.

## 1. Executive assessment

Keep the approved submission experience and the Bubble Board / Living Wall visual direction. The next work should clarify behavior, safety, administration, and acceptance tests—not add more visual effects.

Phase 1 is an approved interaction prototype, not a connected submission system. Phase 2 is a rich visual prototype with several identified behavior gaps. Phase 3 has a candidate architecture but needs a complete data, privacy, lifecycle, and delivery contract. Phase 4 has an agreed feature list but needs a screen-by-screen operational specification. Phase 5 should be planned as testing and launch readiness, with actual deployment separately authorized later.

A passing JavaScript syntax check does not validate runtime behavior, layout, authorization, or data accuracy. This document is a source/design review and proposed plan, not a completed production QA report.

### Authoritative review inputs

- `mothers_love_submission_prototype.html` — approved Phase 1 visual reference.
- `mothers_love_phase_1.md` — earlier requirements handoff; contains wording that this review proposes correcting.
- `mothers_love_phase_2_living_wall_v3.html` — latest Phase 2 visual/interaction reference.
- Original campaign poster, `poster_A2_01 2.jpg` — canonical wording and visual inspiration.
- User decisions in the interview and subsequent feature approvals.

Older TV versions are design history, not competing implementation specifications. Use V3 as the visual reference, but do not copy its demonstration logic into production without redesign and tests.

## 2. Confirmed decisions to preserve

**Identity:** THE WORDS OF MOTHER'S LOVE. Tagline: “Where a mother's love resides, peace abides.” Do not add a church logo or publicly brand the experience with Las Vegas. Internally the campaign serves one Las Vegas location.

**Member flow:** QR/link → submission form → confirmation. No public account or member directory. Manually entered submitter and recipient names use first name plus last initial. The submitter-name field is administrative-only. Exactly one recipient, one message up to 500 characters, and one or more distinct expression selections. Keep “Recognize Someone Else.”

**Publication:** Normal submissions publish without prior human approval. A basic content filter may hold a submission for private review. Admins can edit, feature, hide, and restore content. There are no member leaderboards.

**TV:** Windows-connected TV used during selected church times. Living recognition bubbles, organic motion, variable sizing, gentle breathing, fresh-arrival emphasis, expression-colored trails/atmosphere, constellations, related-expression clusters, featured recognitions, all-nine expression details, aggregate statistics, milestone progress/celebrations, queued arrival journeys, low-activity mode, and motion presets. QR remains bottom-left.

**Privacy and statistics:** Personal recognition content has a seven-day lifetime. Retain aggregate expression and recognition counts after expiration. Public statistics focus on this month; admins can see weekly, monthly, historical monthly, and all-time aggregates. Counts are not unique-member counts or verified distinct real-world acts.

**Administration:** Owner plus a few designated administrators with individual logins.

## 3. Review findings in current artifacts

| Finding | Evidence in the prototype | Planning implication |
|---|---|---|
| Location branding differs from the approved direction | Phase 1 header contains “Las Vegas Campaign.” | Remove this public label in the eventual implementation. Keep location internal. |
| Confirmation promises publication even for held content | Form and Phase 1 MD say the message “will appear,” while the same plan permits holds. | Write truthful confirmation states and reserve “received” for server-acknowledged storage. |
| Self-entered names are not verified identities | No login or private member credential is required. | Label the admin field “Submitted name,” not “Verified sender.” Preserve the frictionless flow. |
| Latest garden does not cycle through its entire existing pool | `renderGarden()` starts from the beginning of `recognitionPool`; normal playback does not replace old garden messages. | Restore fair rotation, age weighting, and no-repeat behavior as explicit requirements. |
| Clusters duplicate entries | `renderNextCluster()` fills four slots using modulo indexing even when only two matches exist. | Render two unique messages when only two qualify; never duplicate to fill space. |
| Cluster centering and bobbing share a transform | `.cluster-center` uses `translate(-50%,-50%)` and `bobSoft` animates `transform`. | Positioning, floating, and scaling need independent visual layers. |
| Readability is not a protected constraint | V3 detail text is `0.72vw`, phrase text `0.88vw`; these are approximately 13.8 and 16.9 CSS pixels at a 1920-wide viewport. | Use a minimum readable text size and verify actual viewing distance. Do not shrink text merely to increase bubble count. |
| Pause is not a universal pause | `togglePause()` clears the rotation timer; physics, QR invitations, arrivals, and other animations have separate loops. | Specify separate controls and a single Quiet/Freeze option. |
| Reduced-motion preference is incomplete | CSS has a media query, but the JavaScript physics and journey logic do not consult it. | Reduced motion must govern all animation mechanisms, not CSS alone. |
| Queue and slideshow are independent | `processArrivalQueue()` runs while `showById()` independently schedules screen changes. | A single presentation coordinator must own journeys, reading holds, ordinary screens, and celebrations. |
| Queue recovery is incomplete | Queue is browser memory; no publication-event deduplication, persistence, or per-item recovery contract is present. | Specify stable IDs, recovery, cancellation, resynchronization, and restart policy. |
| A flying arrival can target an outdated position | Journey end coordinates are captured before the target continues moving. | Reserve/pause the landing slot, or follow its current position. |
| Counters are tied to animation completion | `addExpressionCount()` is called after a journey lands. | Database publication, not television animation, must determine totals. |
| Per-expression display can become stale | The nine counts are rendered once; subsequent updates alter data objects and headline totals without rebuilding those count elements. | Every statistic must derive from one authoritative aggregate snapshot. |
| Monthly behavior is a demonstration | Totals start from hardcoded values; there is no month boundary implementation. | Define local calendar boundaries and history explicitly. |
| QR is not a production destination | Embedded prototype QR was generated for an example URL. | Label all demo QR usage; replace only after the real form URL is chosen and tested. |
| Raw HTML interpolation is unsuitable for future public content | Some recipient/message content enters `innerHTML` templates. | Render member messages as plain text with safe output handling. |

These are not grounds to discard the design. They are boundaries between a visual reference and a reliable implementation.

## 4. Phase 1 — Recommended improvements

### 4.1 Keep the flow short

Do not add accounts, recipient search, photos, attachments, reaction counts, or a member directory. Preserve the four logical inputs: submitter name, recipient name, expressions, and message.

Show the complete expression phrase on selection cards. An optional “What does this mean?” expansion can reveal the corresponding principle without making every mobile card permanently longer. Add a clear selected count such as “3 expressions selected.” Do not add a “Select all” shortcut; selecting all nine individually remains allowed.

### 4.2 Make privacy wording precise

Recommended helper text:

> The name you enter here is visible only to campaign administrators. It is not included on the public display. Please do not identify yourself or share private information in the appreciation message.

The admin system knows the name entered, not a verified identity. A detailed story or real-time arrival may allow someone in the room to infer the author. Do not promise untraceable anonymity.

Add a short, calm message-writing note:

> Keep your message encouraging and appropriate for public display. Avoid health details, personal disagreements, contact information, or anything the recipient would prefer to keep private.

Organizer decisions are still needed for recipients who do not want public recognition and whether children may be named. Do not add a permanent directory to solve these questions by default.

### 4.3 Add a public-preview step without a separate wizard

A compact inline preview should show exactly what is eligible for the TV: recipient, selected expressions, and message. Never include the private submitter field. Mark long-message garden excerpts accurately and make the full message accessible in the larger recognition view.

### 4.4 Correct confirmation states

Do not show success before the server confirms storage.

- **Published/eligible:** “Thank you for sharing Mother's Love. Your recognition has been received and is ready for the campaign display.” This does not claim a TV is currently on or that the animation has already played.
- **Held:** “Thank you for sharing Mother's Love. Your recognition has been received. Some messages are reviewed before appearing.” Do not accuse the person or disclose filter trigger rules.
- **Send failed:** Preserve the text, clearly say it was not confirmed, and offer a retry.
- **Send still pending:** Keep the button disabled and show a sending state. Retrying must not create another recognition.

A generic received message is acceptable only when it does not promise eventual publication.

### 4.5 Names and accessibility

Continue manual entry, but accept apostrophes, hyphens, multiword first names, and accented characters. Validate the intended first-name-plus-initial format without rejecting ordinary names. Do not auto-merge two people because their first name and initial match.

Use real accessible checkbox/multiselect states behind the decorative cards. Provide keyboard focus, associated helper/error text, and a visible checkmark rather than color alone. Place errors next to the relevant input. Define the 500-character counting rule consistently across client and server, including emoji and Unicode; do not truncate a valid message after submission without explanation.

Optionally keep a draft only during the current tab session; avoid retaining private content on shared devices by default. A short-lived private receipt/withdrawal control can be considered later, but it is not a public recognition archive.

## 5. Phase 2 — Recommended final display contract

### 5.1 Readability takes precedence over density

Maintain these priorities: privacy eligibility → readable content → collision-free layout → fair coverage → decorative motion.

Start with four to six readable recognition bubbles, then allow additional bubbles only when actual text and viewport space permit. More submissions should primarily mean more rotation, not smaller and smaller text. Density should depend on available safe area and measured content, not total submissions alone.

Short messages may be shown fully in a bubble. Longer messages should receive a larger, calmer featured presentation. An excerpt must be a clearly indicated verbatim excerpt, not an AI summary or silent rewrite. The complete message must be shown in its appropriate detailed presentation before the recognition is considered fully presented.

Include name/phrase/message in the reading budget. Allow a reading hold proportional to content, with a configurable upper limit and continuation pages for unusually dense combinations such as 500 characters plus all nine expressions.

### 5.2 Protect motion layers and safe zones

Keep physics position, floating decoration, breathing scale, and fresh emphasis on independent layers. Do not let separate animations replace the transform used to center or locate the same element.

Reserve space for the header, bottom-left QR, arrival status, and maximum expanded bubble size. Collision checks must include breathing and fresh-emphasis margins. New arrivals should reserve a landing position instead of flying toward a moving target's old location. Provide a calm stationary fallback when a layout cannot fit.

Add **Still** alongside Calm, Standard, and Lively. Still must stop physics, breathing, trails, moving constellations, QR movement, and journey motion. It can show a static arrival acknowledgement. Quiet event mode should additionally suppress screen interruptions while preserving collection and storage.

### 5.3 Keep full details on the nine-expression screen

Preserve all nine explanatory principles and exact phrases from the poster. Increase usable typography and give this screen a generous reading dwell.

Optional supplementary pages may show expressions 1–3, 4–6, and 7–9 in larger type. These supplement, rather than replace, the complete nine-expression overview. Link canonical wording to one shared expression catalog so the form, display, admin editor, and reports cannot drift.

### 5.4 Fair rotation and honest freshness

Before building, specify:

- Newer messages receive more attention, but older eligible messages are not permanently starved.
- Do not show the same recognition twice in one garden or cluster.
- Avoid repeatedly featuring the same recipient in consecutive selections where other recognitions are available. Matching typed display names is only a heuristic, not identity resolution.
- Feature status never overrides hidden, held, invalid, or expired eligibility.
- Edits and restores do not automatically trigger another new-recognition celebration.
- No recognition retains personal content after its lifetime just because it is featured.
- New display sessions initially load current eligible recognitions quietly. Do not replay a week's backlog as if every item just arrived.
- Only newly published records create arrival events. Held content creates no public cue.

### 5.5 Coordinate the queue with every presentation mode

Recommended states: ordinary rotation → arrival waiting → arrival journey → reading hold → ordinary rotation. Milestones and manual admin overrides also pass through this coordinator.

A proposed initial timing is a 2–3 second journey, followed by at least 12–20 seconds of readable emphasis for an ordinary message, then ordinary display time before another journey. These are tuning defaults, not fixed promises or validated readability thresholds.

Specify separate meanings for **Pause rotation**, **Pause arrivals**, and **Freeze movement**. A global quiet control can coordinate them. Safety removals and expiration must still take effect while presentation is paused.

Every incoming publication needs a stable recognition/event identifier. Duplicate delivery must not create another journey or increase totals. On cancellation, hidden/expired content is removed from the queue and active presentation. A failed animation must clean up its elements and release the queue; it must not strand every later message.

A burst policy needs approval: all valid recognitions enter the eligible rotation, but extremely long queues may need grouped introductions instead of an individual cinematic journey for every old event. Do not silently drop recognitions. Separate “not individually animated” from “not displayed.”

### 5.6 Constellations and clusters

Connect recognitions because they share an expression, not because the people are inferred to have a relationship. Use a brief label where helpful. Keep lines decorative and away from text.

A cluster must use unique eligible messages. Two matching recognitions means a two-message layout, not two duplicates. Rotate among expressions with adequate data without implying that the most common expression is the most important. When no cluster qualifies, show an expression spotlight or ordinary recognition screen.

### 5.7 QR interaction

Keep the QR bottom-left, high contrast, with its clear border and a human-readable submission address. Prefer animating the invitation text and surrounding glow while the code itself stays stationary. Verify scannability on the actual TV from intended distances; the current small code is only a layout placeholder.

### 5.8 Milestones and quiet periods

Use **Expressions Recognized This Month** consistently. Recommend monthly milestones for the public TV, matching its main counter; all-time milestones can remain an admin statistic unless explicitly selected.

A threshold celebration should occur once per campaign/month/threshold, not every refresh. Corrected statistics must not repeatedly retrigger it. If several thresholds are crossed at once, recommend one celebration for the highest newly crossed threshold. Queue the celebration behind the current person's reading hold.

Low activity should slow presentation without rejecting submissions. Manual Quiet mode should not be overridden by an incoming recognition. End-of-session schedule and “no recent submissions” are separate conditions.

### 5.9 Empty, offline, and restricted states

Plan screens for no recognitions yet, all messages expired, content loading, temporary connection loss, maintenance, and an intentionally paused campaign. An unavailable statistic is not zero.

A proposed privacy-first offline policy is a short grace period using still-valid cached public-display data, then a neutral campaign/expressions screen if current visibility cannot be verified. Exact timing requires approval. Never retain private submitter data on the TV. Reconnection must retrieve the current authoritative snapshot before resuming old events.

A display heartbeat can show that the browser is connected; it does not prove the physical television is on or visible to attendees.

## 6. Phase 4 — Administrator product specification

Design this phase before finalizing Phase 3 data structures. It is the control room for the campaign, not merely a data table.

### Proposed navigation

| Area | Main purpose |
|---|---|
| Overview | Held messages needing attention, display last seen, current mode, queue state, retention-job health, aggregate totals. |
| Recognition manager | Search/filter live, held, and hidden recognitions within the personal-data retention window; edit, feature, hide, restore. |
| Review inbox | Review flagged messages with reasons, public preview, publish/keep-held/hide/remove actions. |
| Display controls | Playlist, motion, reading dwell, density ceiling, quiet mode, arrival pause, emergency neutral screen, device status. |
| Campaign insights | Monthly expression and recognition totals, all nine expression counts, prior-month and all-time aggregates. |
| Settings and access | Invited admins, roles, campaign settings, canonical wording control, privacy/retention settings, device pairing. |

### Roles

Proposed minimum: **Owner** and **Moderator**. Add **Display operator** only if someone needs screen controls without access to private names.

Owner controls access, campaign configuration, irreversible actions, and recovery. Moderators review/edit/hide/restore and see submitted names for moderation. A display operator sees only eligible public-display content and controls. Signed-in status alone is not permission to be an administrator.

Use individual invitations, no open admin signup, and a documented lost-access recovery process. Prefer multifactor authentication for privileged accounts. Protect against removing the last owner accidentally.

### Recognition detail view

Show recipient, message, selected expressions, submitted name in an explicitly private area, current state, expiration time/countdown, first publication time, feature state, and recent actions.

Place an exact public preview beside the editor. Keep expiry visible so an admin understands that featuring or restoring does not renew the record. Flag concurrent edits rather than allowing one admin to silently overwrite another's save. A content-version number is a suitable acceptance requirement; implementation may choose the specific mechanism.

Admin editing remains permitted as requested. Recommend intentional human corrections and a short reason for substantive edits; do not add AI rewriting. Avoid retaining before/after personal text beyond the record's seven-day lifetime.

### Moderation actions

- **Publish:** Make eligible content public and count it once.
- **Keep held:** Preserve privately until review/expiration; never count or announce an unapproved hold.
- **Hide:** Remove from all display modes and queues; preserve temporarily in admin history.
- **Restore:** Restore eligibility only if still within its original lifetime.
- **Remove as invalid:** Remove mistaken, duplicate, abusive, or test content and reverse its statistical contribution as appropriate.
- **Permanent deletion:** Owner-confirmed irreversible content removal; distinguish the reason and statistical effect.

Moderation needs a stated responsible person and review cadence. The dashboard should warn when a held message will expire soon; it must not retain the content indefinitely because nobody reviewed it.

### Hide must reach the entire display

Removal includes a current bubble, featured card, cluster, pending journey, and cached display record. “Saved in the database,” “delivered to the display,” and “applied by the display” are different statuses. Do not claim immediate physical removal when the TV browser is offline.

An **Emergency neutral screen** control should suspend recognition presentation and show only campaign branding. Its online/offline delivery limitations must be explicit.

### Operational controls

Keep screen motion and display administration distinct from submission availability. Quiet mode can accept messages while suppressing interruptions. A separate collection pause closes the form politely for maintenance.

Provide safe bounded presets before exposing many detailed sliders. Suggested saved modes: Fellowship, Quiet, and Still. Preserve user choice of bottom-left QR. Preview controls must not generate real recognitions or alter campaign totals.

Show an apply/save confirmation and whether the display acknowledged the setting. Device credentials should be read-only for the display and revocable independently of admin accounts.

### Insights and exports

Keep this communal. Do not add member rankings, private-sender activity reports, or claims about unique members from manually typed names.

Default exports to aggregate counts only. Exporting full messages/private names would create a separate copy beyond automatic deletion; it should not be a default feature. Email or push alerts, if added, should say “3 messages need review,” not reproduce private submissions.

## 7. Phase 3 — Data and backend planning decisions

### 7.1 Provisional architecture

Keep the earlier Next.js / Supabase / Vercel direction as a candidate, not a provisioned or mandatory deployment decision. The plan needs one web application, a database, authenticated administration, a controlled display feed, and a server-side retention schedule. There is no current requirement for a separate message broker or an AI service in the runtime application.

Using Codex and Claude for implementation is separate from sending member messages to AI. Do not add an AI moderation, rewriting, or analytics dependency by implication.

### 7.2 Separate data by purpose

Suggested logical entities, not final SQL:

- **Expression catalog:** exact number, phrase, principle, and application color.
- **Recognition:** recipient, message, selected expressions, visibility/moderation state, creation/publication/expiration times, version, optional feature selection.
- **Private submission identity:** submitted name, separately restricted and tied to the same expiration.
- **Aggregate statistics:** date/month and campaign totals plus expression counts; no names, messages, per-person hashes, or lasting message-event links.
- **Display events and receipts:** short-lived publication/version identifiers and delivery state, without sender identity; enforce a bounded retention window.
- **Campaign/display settings:** modes, schedule, reading dwell, density cap, QR destination.
- **Admin memberships and audit metadata:** privileged access and actions. Personal recognition text in audits expires with the original record.

The implementation can combine or separate tables differently if it demonstrates the same access and retention guarantees.

### 7.3 Access boundaries

A public submission form does not require an anonymously browsable recognition feed. Recommend a paired/read-only display session for the TV, while leaving the form public and frictionless.

Public visitors may submit through a validated endpoint; they must not retrieve private identity or privileged records. The TV receives only currently eligible recipient/message/expression data. Admin authorization must be checked server-side and in the database policies.

Supabase documentation distinguishes table/column privileges, row-level authorization, and Realtime channel authorization. Do not assume row-level access automatically hides a sensitive column. Never ship an elevated secret/service-role key to the TV or browser.

### 7.4 Publication and counting rules

**Recommended model, awaiting approval:** distinguish content visibility from statistical validity.

| Event | Recognition total | Expression total |
|---|---:|---:|
| Held and never published | 0 | 0 |
| First valid publication with three distinct selections | +1 | +3 |
| Delivery retry / TV refresh / replay | No change | No change |
| Valid edit from three selections to two | No change | -1, with correct per-expression deltas |
| Hide for recipient privacy, recognition remains valid | Retain contribution | Retain contribution |
| Invalidate as spam/duplicate/test | Reverse contribution once | Reverse contribution once |
| Restore a previously counted valid message | No second count | No second count |
| Normal seven-day expiration | Retain aggregate | Retain aggregate |

Alternative simpler rule: every hide reverses the contribution. Choose one policy explicitly; do not leave it to an implementer to infer.

Use the first publication timestamp as the proposed statistics date. Store timestamps consistently and compute public month/week boundaries in America/Los_Angeles. Proposed week start: Monday; this is not yet approved. Expiration is a duration, not the end of a calendar week.

The headline expression count must always equal the sum of the nine counts for the same period and inclusion policy. One recognition may select an expression at most once. No number measures unique recipients, verified distinct acts, or church-wide participation percentage.

Count at publication, not when a screen animation completes. The TV may be off, fail, or reconnect; none of those should change the recognition's contribution. Use idempotency for submission retries and duplicate publication events.

### 7.5 Seven-day retention

Recommend expiration at **creation time + 168 hours**, including time spent held. Editing, featuring, restoring, or reconnecting must not restart that clock.

At expiration, immediately exclude the record from all reads/displays, then physically purge through a server-controlled job with a defined maximum lag. Apply the same lifetime to private identity, message versions, personal moderation notes, queues, and caches. An “expired” status is not an indefinite archive of the expired personal text.

Retain daily or monthly aggregate counts, not a permanent per-recognition event history with exact timestamp and expression combination. After personal linkage is deleted, individual historical correction may no longer be possible; document that limitation rather than keeping hidden identifiers indefinitely.

The seven-day application policy must be distinguished from backup retention. Supabase backups can preserve earlier database states. Define provider backup windows, restore procedures, and any necessary disclosure before claiming the information is irrecoverably erased everywhere after seven days. A restore must reapply expiration before reopening the display.

Operational logs must not contain message bodies, submitted names, tokens, or unnecessary request payloads. Durable audit metadata may record actor/action/time without retaining expired recognition text. Admin account retention is a separate policy from recognition-content retention.

### 7.6 Content filtering and spam

Preserve normal immediate publishing and holding of flagged submissions. Define allowed campaign phrases so phrases such as “I'm sorry” are not treated as inappropriate in isolation.

Validate names, required fields, distinct allowed expression IDs, and message length server-side. Treat member input as text, not executable markup. Rate-limit without treating the typed sender name as a credential. Avoid a crude shared-IP limit that blocks all ordinary attendees using the same church Wi-Fi. Add a temporary admin emergency-review mode for abuse spikes.

Proposed failure policy: if the filter is unavailable, hold new submissions for review rather than publishing unchecked. Do not silently discard them or promise display.

### 7.7 Delivery and recovery

Maintain separate concepts:

1. **Submission accepted:** safely stored and assigned a stable identifier.
2. **Published:** currently eligible for the public display and included in statistics.
3. **Queued by a display:** eligible for its presentation.
4. **Presented:** the browser reports completing the applicable presentation.

Realtime is a notification mechanism; the authoritative database remains the source for current visibility and totals. On startup or reconnect, load a current snapshot and process subsequent changes using identifiers/versions. Specify removal, editing, expiration, and feature changes as well as new inserts.

TV subscriptions and device sessions need their own authorization. Private submitter data must never enter the public-display payload, browser state, canvas, or logs.

## 8. Phase 5 — Acceptance and operations plan

Define acceptance evidence before implementation. Proposed release gates:

| Test | Required result |
|---|---|
| Long content | 500 characters, long valid names, and nine selections remain readable via the planned full-message treatment; no clipped or silently lost text. |
| Sparse/dense content | Zero, one, two, five, and many eligible recognitions produce appropriate layouts without duplicates or overlap. |
| Breathing/arrival bounds | Maximum scale, glow, and motion remain within safe zones and do not obstruct QR/header. |
| Queue burst | Ten simultaneous valid publications create ten stored recognitions, accurate totals, no simultaneous journeys, and preserved reading holds. |
| Retry/reconnect | Duplicate deliveries and retrying a timed-out submit do not double-count or repeatedly announce the same event. |
| Pause modes | Quiet suppresses interruptions; Still stops all visual movement; routine data collection continues unless separately paused. |
| Immediate hide | An online display removes a recognition from garden, feature, cluster, queue, and cache; offline status is accurately reported. |
| Expiration | A featured/held/hidden message expires on the original schedule and cannot be resurrected by a restore, restart, or old event. |
| Statistics | Monthly and expression totals reconcile; holds, edits, invalidations, restores, retries, and expiration follow the chosen rule. |
| Time boundaries | Las Vegas midnight/month turnover and daylight-saving transitions use the chosen calendar/duration rules. |
| Authorization | Public visitors and paired display devices cannot fetch submitter names or perform admin actions; revoked access stops working. |
| Accessibility | Keyboard, assistive-state labels, focus, contrast, and complete reduced-motion behavior are tested. |
| QR | Real destination scans on intended phones and from intended viewing positions. |
| Quiet/offline/empty | Correct fallback screens; no fabricated zero totals, stale hidden content indefinitely, or sample messages in production. |
| Long run | Actual Windows/browser setup runs through a full intended operating period with bounded memory, no growing trails/queues, and recovery from network interruption. |

Launch planning should identify the campaign owner, moderator coverage, TV operator, account/domain ownership, support procedure, backup/restore procedure, and retention monitoring. No deployment is authorized by this planning document.

## 9. Priorities and decision register

### Before implementation

Resolve privacy/publication wording, display access, readable long-message behavior, queue priority/pause semantics, moderation roles, seven-day scope, hidden-message counting, calendar boundaries, and the test gates. Fix documented prototype regressions as implementation tasks rather than treating visual approval as a correctness test.

### Approved visual features to preserve, with safety controls

Organic bubbles, breathing, trails, constellations, colored atmosphere, smart clusters, bottom-left QR invitation, queued journeys, full expression detail, featured recognitions, monthly stats, milestones, quiet activity handling, and motion presets.

### Do not add by default

Member accounts, member directories, photos, attachments, social reactions, recipient leaderboards, sender analytics, AI rewriting, permanent message archives, raw-content exports, multi-location management, or sound effects.

### Open decisions and proposed defaults

| Decision | Proposed default |
|---|---|
| Sender identity assurance | Self-reported name only; disclose this to admins. |
| Confirmation | Distinguish published/eligible, held, sending, and failed states. |
| TV access | Paired, read-only device session; public form remains login-free. |
| Hidden counts | Retain valid privacy-hidden contributions; reverse invalid/spam/duplicate contributions. |
| Expiration start | Submission creation + 168 hours; never renewed by edits or featuring. |
| Permanent history | Aggregate counts only; no indefinitely retained recognition-level identifiers. |
| Public milestone period | Current month, matching the primary TV counter. |
| Quiet mode | Accept/store submissions, stop new visual interruptions, do not auto-wake from a submission. |
| Arrival backlog | Preserve every eligible recognition; owner approves whether very old intros may be grouped. |
| Long-message display | Full message in larger presentation; clearly marked verbatim garden excerpt when necessary. |
| Nine-expression legibility | Full-detail overview plus optional enlarged detail pages. |
| Children/opt-out policy | Organizer decision before launch; no inferred consent. |
| Shared Wi-Fi abuse controls | Layered limits and temporary review mode, not sender-name trust or a tiny global IP quota. |
| Backup retention | Document separately from seven-day active-content lifetime. |

## 10. Handoff method for Codex and Claude

Prepare one version-controlled specification as the source of truth, with sections for approved decisions, proposed defaults awaiting approval, canonical content, page/flow descriptions, data contracts, display state transitions, privacy, moderation, acceptance tests, and known prototype defects.

Use small scoped implementation tasks later. Assign one tool as implementer and the other as reviewer for a task; roles may alternate. Avoid simultaneous edits to the same schema or central presentation logic. The reviewer should compare the result with the agreed acceptance criteria, not redesign the campaign independently.

Every later task should state its dependencies, permitted scope, evidence required, and actions requiring explicit authorization. Real congregation submissions and credentials must not be used as development fixtures. Test data stays separate and is excluded from all campaign counters.

The first next planning deliverable should be the **admin screen-by-screen specification**, including the detail editor and display control states. That will settle many of the remaining Phase 3 contracts before either coding tool starts implementation.

## Reference notes

Primary technical sources consulted for this review:

- W3C, WCAG 2.2 Understanding SC 2.2.2, “Pause, Stop, Hide”: moving and auto-updating content, global pause/control principles.
- OWASP Cheat Sheet Series, “Cross Site Scripting Prevention”: output encoding and safe text rendering.
- OWASP Cheat Sheet Series, “Logging”: restrictions on sensitive data and credentials in logs.
- Supabase Docs, “Row Level Security,” “Securing your data,” and “API keys”: database grants, RLS, and never exposing elevated keys to clients.
- Supabase Docs, “Realtime Authorization”: private channels and authorization for data delivery.
- Supabase Docs, “Database Backups”: retained database snapshots and restore behavior.

These inform proposed requirements; they do not constitute a compliance certification or a completed security review of this prototype.
