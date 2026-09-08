# Decision register and approval gates

**Version:** 1.0 • **State:** No open proposal in this package has been newly approved.  
This is the controlling record for distinguishing the owner's choices from engineering suggestions.

## Approved decisions

| ID | Decision | Basis |
|---|---|---|
| A01 | One internal Las Vegas campaign; no public location branding; no church logo. | Interview 6, 38–40. |
| A02 | Title and tagline as recorded in the catalog. | Interview 40. |
| A03 | Public QR/link → submission → confirmation; no account, directory, PIN, or public browsing wall. | Interview 8–9, 19, 33. |
| A04 | Manually enter first name + last initial for submitter and recipient. | Interview 1, 8–9, 22–23. |
| A05 | Submitted name is admin-only; recipient name is prominent publicly. | Interview 2, 17, 43, 48. |
| A06 | Exactly one recipient; one message; one or more expressions. | Interview 10–11, 20. |
| A07 | 500-character message limit; nine selectable cards; Recognize Someone Else. | Interview 12, 24–25. |
| A08 | Normal submissions publish immediately; basic filter; flagged messages held, not rejected publicly. | Interview 3, 13, 46. |
| A09 | Admins can edit all submission fields, hide/remove, restore, search/filter and feature. | Interview 14, 30–31. |
| A10 | A few designated admins use individual secured logins. | Interview 45. |
| A11 | Delete personal recognition content after one week; preserve anonymous aggregates. | Interview 32, 36. |
| A12 | Ongoing campaign: public monthly totals, admin week/month/history/all-time. | Interview 21, 42, 49. |
| A13 | Count expressions selected and recognitions shared; display all nine counts equally, no rankings. | Interview 7, 18, 21, 29, 42. |
| A14 | TV on a Windows computer during selected church times. | Interview 34. |
| A15 | Automatic cycle: recent/garden views, featured recognition, statistics, all-nine expression information. | Interview 26–27. |
| A16 | Feature selected manually when available, otherwise automatic selection; recency weighting. | Interview 37, 41. |
| A17 | New-recognition moment with sequential queue and spacing, not simultaneous interruptions. | Interview 16, 28; later queue request. |
| A18 | Bubble Board / Living Wall design is the selected direction. | User chose Bubble Campaign Board. |
| A19 | Organic paths, variable bubble sizes, fresh emphasis, colored trails and atmosphere. | Subsequent feature approvals. |
| A20 | Constellations and smarter expression-related clusters. | Subsequent feature approvals. |
| A21 | Milestone progress and celebrations; adaptive living-wall density. | Subsequent feature approvals. |
| A22 | QR in bottom-left with invitation animation; new-recognition journey begins there. | Subsequent feature approvals. |
| A23 | Low-activity behavior and admin motion presets. | Subsequent feature approvals. |
| A24 | Independent subtle breathing; arrival cue and sequential live-arrival queue. | Most recent prototype feature request. |
| A25 | All-nine page includes full principles AND exact expressions, not abbreviated phrases alone. | Most recent prototype feature request. |
| A26 | Plan remaining work now; eventual implementation via Codex and Claude. Do not build/deploy yet. | Latest owner instructions. |

Precise code constants, the exact sample layout, provisional stack choice, and the review's new recommendations are not separately approved just because a prototype was liked.

## Derived facts, not new features

**F01:** Manual submitted names are self-reported. No authenticated identity proof exists.  
**F02:** With multiple selections per recognition, expression totals are not unique people or verified separate acts.  
**F03:** Holding content and promising that every message will appear conflict. Copy must be resolved.  
**F04:** TV animation completion is not a reliable source for campaign-wide totals.  
**F05:** A passing syntax check does not establish runtime, visual, security, or physical-TV correctness.

## Open decisions — proposed defaults only

All rows are **PENDING**. Exact values are starting points for review. Group related questions rather than re-interviewing the owner on approved choices.

| ID | Decision and proposed default | Why it matters / blocked area |
|---|---|---|
| D01 | Confirmation: distinguish eligible, held, sending, failed; alternatively one truthful generic received message. Keep the warm thank-you. | Phase 1 copy; avoid promises for held/offline content. |
| D02 | Expiry: created_at + 168 hours, including held time; edits/restores/features do not extend it. | Data lifecycle and purge tests. Seven days itself is approved. |
| D03 | Counting: valid privacy-hidden content stays counted; invalid spam/duplicates/tests reverse counts once. Alternative: all hiding subtracts. | Moderation actions, aggregate ledger, reports. |
| D04 | Reporting: first publication date; calendar month in America/Los_Angeles; Monday-start week, distinct from rolling seven days. | Dates, late approval, month-end corrections. |
| D05 | Display access: pair the TV with a revocable read-only session rather than public anonymous browsing. | Security/device model. Public form remains open. |
| D06 | Roles: Owner + Moderator, optional Display operator; invited accounts, privileged MFA, last-owner protection. | Admin permissions and recovery. |
| D07 | Form refinements: private submitted-name wording, public-content reminder, inline public preview, selected count and optional principle expansion. | User experience; no new personal fields. |
| D08 | Long messages: clearly marked verbatim garden excerpt only when needed; full detailed presentation/continuation pages required. | No silent truncation or AI summaries. |
| D09 | Still + manual Quiet modes, separate from automatic low activity; quiet does not wake on arrival. | All motion engines, overrides, collection vs presentation. |
| D10 | Arrival burst/restart policy: preserve eligible messages; owner decides when individual intros may be grouped or expire from the introduction queue. | Queue capacity and fairness. No silent content loss. |
| D11 | Display tuning: typography at actual viewing distance, four-to-six default bubbles, content-aware reading time, 2–3 second journey. | UX targets need physical testing. |
| D12 | Full nine-expression overview plus optional enlarged three-at-a-time supplements. | Full content remains mandatory; supplements are not yet approved. |
| D13 | Offline policy: cached public content only for a short approved grace period; then neutral campaign/expressions until verification. | Removal and privacy versus continuity. Exact grace time pending. |
| D14 | Milestones: monthly, once per campaign/month/threshold; highest new threshold if a batch crosses several. | Counter/milestone consistency. All-time celebrations not assumed. |
| D15 | Backups/purge: choose provider retention, disclosure, purge cadence/maximum lag, restore re-expiry procedure. | No claim of complete irreversible erasure at day seven without proof. |
| D16 | Filter outage: hold safely for admin review. Approve rule list, exception handling and layered abuse limits. | Immediate publishing safety and shared church Wi-Fi. |
| D17 | Organizer policy: children, sensitive stories, recipient opt-out/removal requests, responsible reviewer and coverage. | Required before real data collection. Do not infer consent. |
| D18 | Infrastructure: confirm or replace candidate Next.js/Supabase/Vercel, service ownership, domain, budget, environments. | Build/deployment architecture; nothing provisioned. |
| D19 | Character counting and name validation: Unicode-aware consistent 500-unit rule; recommend user-perceived graphemes with separate payload byte limit. | Client/server consistency; accented names/emoji. |
| D20 | Scope of admin controls: emergency neutral, device acknowledgements, audit reasons/concurrent editing, aggregate-only export. | Recommended Phase 4 additions. |
| D21 | QR: keep code stationary, animate invitation/glow, use tested readable short address. | Requested animation retained without scan interference. |
| D22 | Data minimization: daily aggregates + bounded content-linked events; define admin/audit/security-log retention separately. | Avoid permanent identifiers masquerading as anonymous data. |

## Approval bundles

**Bundle 1 — Privacy and publication:** D01–D05, D15–D17, D19, D22.  
**Bundle 2 — Display behavior:** D08–D14, D21.  
**Bundle 3 — Administration and ownership:** D06–D07, D18, D20.

The owner can approve a bundle with exceptions. Record the exact exceptions. Open child/recipient policy and service ownership need actual organizer inputs; the agent cannot manufacture them.

## Dependency and authorization rules

Planning can continue while decisions are pending. Later implementation must not encode unresolved counting, access, retention, or consent choices as hidden defaults. Nonblocking visual tuning may be isolated behind documented development settings after coding is authorized, but not represented as owner-approved production policy.

Authorization to implement is separate from policy approval. Authorization to deploy is separate from both. Preserve the historical interview rather than asking all 49 questions again.

## Decision change template

| Field | Value to record |
|---|---|
| Decision ID | Dxx or new ID |
| Previous state | PENDING / APPROVED / SUPERSEDED |
| Owner's exact choice | Quote or faithful concise description |
| Approved by / date | Owner and actual date |
| Affected requirements | Files, tests and contracts |
| Migration/UX implication | What changes; what stays intact |

Until an entry is completed from an actual owner instruction, it stays pending.
