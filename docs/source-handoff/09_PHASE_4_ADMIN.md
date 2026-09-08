# Phase 4 — Administration: screen-by-screen planning specification

**Status:** Owner-approved capabilities are preserved; screen organization, roles and additional operating controls below are proposed. No admin application has been built.  
**Related decisions:** D03–D06, D15–D17, D20, D22.  
**Planning priority:** Finalize this before committing the Phase 3 schema.

## 1. Administrative goals

Make it easy to notice content needing attention, correct a recognition, remove it from every TV mode, understand what the display is actually doing, and confirm that personal information is expiring. Do not turn this into a leaderboard, CRM or social platform.

The original approved capabilities are: view submissions and private submitted names; edit names/messages/expressions; hide/remove and restore; search recipients; filter expressions and dates; feature manually with automatic fallback; view aggregate statistics; pause new-recognition interruptions. Individual admin logins are required.

## 2. Proposed navigation

Overview → Recognitions → Review inbox → Display controls → Insights → Settings and access.

Use a clean, legible dashboard with restrained campaign colors. It need not reproduce moving bubbles behind administrative tasks. Prioritize comfortable phone/tablet use for someone operating the church display, while preserving a useful desktop table/editor.

## 3. Roles — D06 pending

| Capability | Owner | Moderator | Optional display operator |
|---|---|---|---|
| View public display preview | Yes | Yes | Yes |
| Read private submitted name | Yes | Yes | No |
| Review/publish/edit/hide/restore | Yes | Yes | No |
| Feature eligible records | Yes | Yes | Owner choice; public-only picker if granted |
| Pause arrivals/rotation or choose approved mode | Yes | Proposed yes | Yes |
| Emergency neutral screen | Yes | Proposed yes | Yes |
| Change canonical wording/retention policy | Owner approval plus documented change | No | No |
| Invite/revoke admins, pair/revoke devices | Yes | No | No |
| Permanent deletion, invalidation authority | Owner; moderator scope to approve | Proposed limited | No |
| Aggregate insight/export | Yes | Proposed yes | Optional read-only totals |
| Change infrastructure/secrets | Separately authorized owner operation | No | No |

Use minimal roles rather than inventing a large permission system. The owner may prefer all designated admins to share capabilities; record that choice. A display operator role is optional, not a requirement inferred from a television.

Invite accounts, prevent open admin registration, protect the last owner's access, define recovery and proposed MFA. Exact auth method/provider is D18, not a hardcoded password embedded in a display URL.

## 4. AD01 — Overview

The first screen should answer: Does anything need review? Is the TV browser connected? Is the display intentionally quiet or unexpectedly stale? Is retention working? What are the campaign's communal totals?

Recommended top actions: Review held submissions, Open recognition manager, Display controls, Emergency neutral. Show held count with nearest expiry, current mode, last display heartbeat, pending settings/removal acknowledgements, and last successful cleanup. Put monthly expression/recognition totals below operational alerts, not ahead of urgent privacy tasks.

States: loading, healthy, no submissions, attention needed, disconnected display, cleanup warning, settings pending. A heartbeat cannot prove physical TV visibility. Use “Browser last connected…” rather than “TV is definitely on.”

Do not populate an empty production dashboard with fake sample counts. Development fixtures must carry an obvious DEMO label and stay outside real counters.

## 5. AD02 — Recognition manager

Proposed table columns: recipient, expressions, current status, created/first-published time, expires in, feature state. Keep submitted name in a private detail region rather than a prominent public-looking column; admins can access it as approved.

Filters: recipient text, expression, date range, published/held/hidden states, feature status. Provide clear results count and empty state. Labels must state that records older than the content lifetime are unavailable, even when historical aggregate counts remain.

Do not create sender-activity analytics. Searching exact recipient text is not verified identity lookup. Avoid auto-merging typed names or disclosing a member directory through suggestions.

Batch hide may be useful but is proposed; bulk publish of held content needs explicit review and confirmation. No blanket “delete all campaign data” shortcut on the ordinary moderator screen.

## 6. AD03 — Recognition detail and editor

Layout: editable public fields and exact public preview side by side on desktop; separate stacked sections on mobile. Private submitted-name section is clearly labeled administrative-only. Show original creation time, first publication time, current state, expiry countdown, selected-expression set, version and feature state.

Editable approved fields: recipient, submitted name, message and expressions. Administrative editing is permitted; do not arbitrarily restrict it to typo corrections. Proposed safeguards: explanation for substantive changes, plain-text preview, validation, expected-version save and conflict resolution.

When another admin changes a record, show the latest version/diff and allow deliberate reconciliation; do not silently overwrite. If it expires while the editor is open, disable publication/restore, remove personal data from the view when policy requires, and show an expiration notice.

Feature selection must visibly say it does not extend expiry. Proposed feature end cannot exceed record expiry. Personal before/after versions and notes do not outlive that deadline.

## 7. AD04 — Review inbox

Show held submissions with private reason category, age, expiry countdown and public preview. Reasons are not public accusations. Actions: Publish, Edit then publish, Keep held, Hide, Remove as invalid under the approved policy.

When publishing, rerun appropriate validation, confirm it has not expired, and count once. A record still held must not contribute to public counts or arrival cues. Do not retain a false-positive hold forever because it is awaiting a human.

Review cadence and responsibility are D17. Propose an overdue/expiring-soon indicator. Any future notification should say “3 messages need review,” not reproduce personal content in email/push services.

## 8. AD05 — Hide, restore, invalidation and deletion dialog

| Action | Proposed effect | User-facing admin explanation |
|---|---|---|
| Hide | Remove from all display contexts; preserve personal record until original expiry. | “This removes the recognition from the display. It does not extend retention.” |
| Restore | Make eligible again if unexpired and valid. | “Restores remaining display eligibility; does not create another first-publication count.” |
| Invalidate | Remove spam/duplicate/test content; reverse contribution if D03 chosen. | Show count impact and reason before committing. |
| Permanent delete | Remove personal content irreversibly through authorized operation; handle contribution under chosen policy. | Explicit confirmation; not equivalent to “hide.” No automatic backup-erasure claim. |
| Feature | Select an eligible record for a large presentation. | Expiry and hidden state always override feature. |

D03 must decide whether ordinary hiding keeps a valid contribution. Use visible action wording that matches the chosen rule. An admin should not unknowingly lower campaign totals when addressing a recipient privacy request.

## 9. AD06 — Display control room

Proposed main card: current screen/mode, eligible queue count, last browser connection, pending command/version, and a sanitized display preview. A stale preview is labeled with its time; it is not a live camera feed of the TV.

Primary controls: Pause arrivals, Pause rotation, motion preset, manual Quiet/Still if approved, Return to normal, Emergency neutral. Separate Pause collection for maintenance; it changes the form's availability, not merely the display.

Secondary settings: playlist ordering, full-detail page enablement, approved reading/density limits, constellation/trail toggles, QR destination and invitation timing, milestone policy, session schedule. Bound them to safe ranges. Never make “retain indefinitely” a casual slider; changing privacy policy requires a new owner decision.

Suggested presets: Fellowship (normal arrivals), Quiet (no interruptions, deliberate release), Still (no movement), plus the approved Calm/Standard/Lively intensity settings. Do not use intensity and operational mode as interchangeable concepts.

A production preview/simulator is isolated from real data effects. Buttons that demonstrate three arrivals or a milestone must not add records, inflate totals, or register a real achieved threshold.

## 10. Command acknowledgement and emergency behavior

Show distinct stages: Saved in server → Pending delivery → Applied by browser. Include the command/settings version and last acknowledgement. Do not claim the TV removed a message when its browser is offline.

Emergency neutral should remove names/messages from the display and stop queued introductions while remaining able to receive safety/configuration updates. Its priority is above normal reading holds and milestones. An offline manual procedure remains necessary; the app cannot guarantee remote removal without connectivity.

Device credentials are read-only and independently revocable. A QR for public submission is not a pairing token or an admin login link. Pairing and operational credential lifetimes are pending D05/D06/D18.

## 11. AD07 — Insights

Approved views: this week, this month, past monthly totals, all time; all nine expression counts and recognition count. Date semantics are D04. Show a clear period and data-as-of state. Displayed totals come from authoritative aggregates, not the number of currently unexpired message rows.

No unique-member counts, recipient rankings, individual sender histories or spiritual-performance metrics. Proposed export is aggregate-only, with period, timezone and counting-policy label. Historical raw appreciation is not available after expiry; do not offer a link that implies otherwise.

## 12. AD08 — Settings and access

Owner manages admins/invitations/revocation, approved campaign settings, device pairing/revocation and organizational ownership records. Separate content-retention policy from admin-account/log/backup policy. Canonical wording changes require explicit ownership/versioning, not casual free editing.

Settings include clear unsaved changes, Save, Cancel, conflict handling and browser acknowledgement. Changes with privacy/security consequences need explicit confirmation. Removing the last owner must be prevented or handled by a deliberately approved recovery process.

## 13. AD09 — Activity and retention health

Recommended minimal history: actor, action category, time, outcome, temporary target reference and reason. Personal diffs expire with the recognition. After purge, avoid keeping identifiers that reconstruct the personal record indefinitely.

Show recent cleanup success/failure, count of records due for purge, acknowledgement delays and exceptional moderation backlog. Do not include full messages in operational logs to make debugging convenient.

## 14. Administrative acceptance

Prove invite/revoke boundaries; no operator leakage of submitted names; conflicting edits handled; expiry during editing; published/hide/restore count correctness; removal from current bubbles, features, clusters and journeys; saved-versus-applied accuracy; quiet not waking; demo controls not changing real counts. Cases T-AD-01–T-AD-09 and relevant security/data cases define future evidence.

The owner still needs to approve D06/D20 and organizer responsibilities. This document is a detailed proposal for that review, not a new blanket approval of every admin feature.
