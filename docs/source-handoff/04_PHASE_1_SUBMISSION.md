# Phase 1 — Member submission experience

**Status:** Core flow approved; refinements below are proposed pending D01, D07, D17, D19.  
**Visual reference:** [Original submission prototype](references/prototypes/mothers_love_submission_prototype.html).  
**Dependencies:** [Catalog](03_CONTENT_AND_DESIGN.md), [privacy](08_SECURITY_PRIVACY_AND_RETENTION.md), [data/API](07_PHASE_3_DATA_AND_API.md).

## 1. Approved member journey

Scan QR or use the link → complete one form → submit → warm confirmation → optionally Recognize Someone Else.

No account, member directory, church PIN, recipient search/autocomplete, email, phone, photo, attachment, or member-facing browse/search page. Preserve these simplifications.

## 2. Fields

| ID | Field | Approved behavior | Proposed production detail |
|---|---|---|---|
| P1-01 | Submitted name | Manually entered first name + last initial; admin-only. | Label private; treat as self-reported; never include in public preview or TV event payload. |
| P1-02 | Recipient name | Exactly one manually entered first name + last initial; prominent publicly. | Gentle format validation; allow accents, apostrophes, hyphens and multiword first names. No automatic person matching. |
| P1-03 | Expression selection | At least one of nine; several permitted. | Distinct IDs, stable order; all nine individually allowed; do not add a Select all shortcut. |
| P1-04 | Appreciation message | One plain-text message up to 500 characters. | Consistent Unicode counting rule across client/server; counter; no silent shortening. |

The first-name-plus-initial instruction is approved, but the exact parser, name-length cap and Unicode counting unit are not. Resolve D19 rather than assuming ASCII-only names or inheriting the prototype's incidental 60-character input attribute as policy.

## 3. Proposed mobile layout

Campaign title/tagline → private-name explanation → recipient → nine full-phrase selectable cards → appreciation message/counter → optional public preview → submit → brief public-content/privacy note.

Keep decorative bubbles behind the form, not crossing inputs. A selected card needs a checkmark and a semantic selected/checked state, not color alone. Label input controls explicitly, provide visible focus, group the expressions, and associate helper/error text with the relevant input.

The preview (D07) can be inline/expandable, not an extra required wizard page. It shows the public recipient, exact selected expressions and appreciation only. A submitted name must not leak into the preview via hidden DOM, accessibility labels, data attributes, logs, or screenshot tools.

## 4. Validation and feedback — proposed implementation contract

Validate both client-side for convenience and server-side for authority. Trim surrounding whitespace, reject an empty message/name after trimming, validate allowed distinct expression IDs, enforce the agreed character and payload limits, and display all user content as text. Do not accept client-supplied status, expiry, aggregate counts, role, or feature flags.

Do not reject a legitimate name simply because it contains punctuation or non-English letters. Do not deduplicate people by matching typed names. Similar recognitions may be sincere separate events; exact content similarity is not sufficient proof of spam.

Use field-specific errors and preserve all entered values on validation or connection failure. Avoid disruptive automatic scrolling while someone types. Keep selected expressions and message until success is acknowledged or the person intentionally clears the form.

Proposed submission states:

| State | Visible treatment | Data rule |
|---|---|---|
| Editing | Form usable; count updates. | Nothing acknowledged as received. |
| Local validation error | Inline explanation and focus to first relevant field. | No false success. |
| Sending | Clear progress text; submit protected against double-tap. | Same logical request retains its idempotency key. |
| Receipt unconfirmed | Preserve draft; offer retry. | A lost response may conceal a successful write; retry must not duplicate. |
| Published/eligible | Warm receipt, ready-for-display wording. | Only after server acknowledgement; no promise of current TV attendance. |
| Held | Warm generic review wording. | No public arrival cue, no disclosure of filter trigger, no guarantee of publication. |
| Collection paused | Clear temporary campaign-unavailable message. | Do not quietly queue sensitive browser drafts indefinitely. |

Exact public confirmation copy is D01. The original “will appear” promise is historical, not a safe implementation instruction.

## 5. Privacy and recipient comfort

Proposed writing reminder: “Keep your message encouraging and appropriate for public display. Avoid health details, personal disagreements, contact information, or anything the recipient would prefer to keep private.”

The form collects an administrative name, not proof of identity. A message may inadvertently identify its writer; immediate presentation can reveal timing. Explain anonymity as absence of the submitted-name field, not as guaranteed untraceability.

D17 must establish the organizer's rule for naming children, sensitive stories, and recipients asking for removal. A submitter checkbox cannot by itself establish a recipient's permission. Do not invent a directory or collect more personal details to solve this without owner approval.

## 6. Repeated submissions, retries, and drafts

A new recognition is a new form submission, not a browser retry. Distinguish them with a logical submission key. Disable rapid repeated taps but do not rely on that client behavior alone. The server must handle retry idempotency within a defined retention-safe window (see Phase 3).

After success, Recognize Someone Else clears recipient, expressions, message, and submitted name by default. Retaining the submitted name for convenience is not approved. Proposed drafts remain in the current tab's memory only; persistent localStorage, analytics session replay, or automatic cloud drafts are outside current scope.

A receipt/retract feature can be considered later, but no public record-lookup endpoint or searchable history should be added by default.

## 7. Expression explanations

Full phrases remain visible on each choice. Optional principles can be disclosed without expanding every card permanently (D07). This differs from the mandatory full-detail nine-expression TV overview, which must include both principle and phrase.

## 8. Definition of ready for implementation

Resolve D01 and the relevant D07/D17/D19 choices. Confirm exact label/copy, name and character counting rules, error behavior, receipt contract, and treatment of collection pauses. No backend service creation is needed to finalize these documents.

Acceptance cases: T-P1-01 through T-P1-08 in `10_PHASE_5_ACCEPTANCE_TESTS.md`. Prototype approval does not imply those cases have passed.
