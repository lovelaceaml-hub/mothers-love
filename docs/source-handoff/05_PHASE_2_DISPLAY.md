# Phase 2 — Living Wall display specification

**Status:** Feature family approved; production behavior and tuning remain proposed where identified.  
**Selected visual reference:** [Living Wall V3](references/prototypes/mothers_love_phase_2_living_wall_v3.html).  
**Not a competing direction:** Original editorial and non-bubble experiments are not needed for the selected design.

## 1. Approved experience

A Windows-connected television runs a dedicated display page during selected church times. It automatically rotates through the Recognition Garden, featured appreciation, expression-related clusters, campaign statistics, and the complete nine-expression page. Eligible new recognitions receive a bottom-left QR-origin arrival journey and cue, sequentially with spacing. Preserve organic paths, breathing, variable sizes, fresh emphasis, trails, constellations, responsive atmosphere, milestones, density behavior, low-activity mode and motion presets.

Keep public branding free of Las Vegas and church logos. The QR is consistently bottom-left. Recipients are prominent; submitted names are never sent to this client.

## 2. Screen family

| Screen ID | Content | Approved core | Proposed safeguards |
|---|---|---|---|
| TV01 Garden | Multiple recognition bubbles. | Floating appreciation and recipient names, variable sizes. | Measured fit, protected reading time, unique records, fair replenishment. |
| TV02 Featured | One recognition with exact associated expressions. | Admin-chosen or automatic feature. | Full message, continuation treatment if needed; eligibility overrides feature. |
| TV03 Cluster | One expression with related recognitions. | Smarter rotating clusters. | Two matches means two distinct messages; no duplicate filling. |
| TV04 Impact | Monthly expression total, recognition count and all nine counts. | Equal treatment, no rankings. | One consistent aggregate snapshot and explicit period. |
| TV05 All nine | Exact principles and phrases. | Complete detail, not short labels alone. | Large readable type and dwell; optional supplemental detail pages D12. |
| TV06 Arrival | Cue, journey, fresh emphasis and readable recognition. | Sequential queue from QR. | Single presentation coordinator, cancellation, safe landing and no duplicate announcements. |
| TV07 Milestone | Warm communal celebration. | Progress/celebration. | Monthly period and once-per-threshold behavior pending D14. |
| TV08 Fallback | Empty/loading/offline/quiet/neutral state. | Needed operational refinement. | No fictional recognitions, unavailable counts shown as unavailable, privacy-safe recovery. |

## 3. Layout: readable content before density — proposed D08/D11

Priority order: current privacy eligibility → readable message → safe spacing → fair coverage → decoration.

Begin testing four to six bubbles, not eight by default. Increase density only when the safe area and actual content fit at the approved minimum text size. Participation controls how many items cycle through the display, not how much small type can be crammed in. Decrease density or switch to a calm larger layout when fit fails.

Bubble size may reflect content length and number of selected expressions. It must not reflect a person's rank, total recognition count, or inferred importance. Recipients remain readable in smaller and larger bubbles.

Do not automatically summarize or rewrite appreciation. Proposed long-message strategy: garden may show a clearly marked verbatim excerpt, then a larger feature/details presentation shows the complete message and selected expressions. A partial garden excerpt does not qualify as a completed full-message presentation. The owner must approve excerpts in D08.

Worst case: a valid 500-character appreciation, a long punctuated/Unicode name, and nine expression selections. Provide continuation pages or another readable full treatment rather than clipping inside a circular mask. Do not pretend that extending dwell alone makes tiny text readable.

## 4. Motion model

Use independent layers for base position, floating decoration, breathing scale, and new-arrival emphasis. The original cluster transform conflict is a known defect, not an aesthetic choice to copy.

Plan positions within measured safe bounds before making bubbles visible. Keep circles away from the title/header, lower-left QR, arrival status, and any reading overlay. Collision envelopes include maximum breathing, fresh enlargement and visual margin. A collision solver must not spend several seconds visibly untangling initially stacked text.

Motion should be slow enough that a person can track and read a bubble. Paths can wander inside comfortable regions rather than choosing distant random destinations constantly. Use time-normalized motion, bounded trails, and pause offscreen animation work. Under overload or failed fit, fall back to a stationary spaced layout rather than overlap.

Breathing remains subtle and staggered, approximately the demonstrated 1–2% range as an initial tuning reference. The effect is not a reason to oscillate text aggressively. Fresh enlargement should settle, not keep competing for attention.

Calm/Standard/Lively are approved. Still is proposed in D09 and must disable all visual movement, including physics, breathing, trails, canvas and journeys. A static cue can replace a flying arrival. CSS-only reduced-motion handling is insufficient for the JavaScript engine; see source [S02] in the audit document.

## 5. Garden selection and fairness

Age weighting is approved: newest within the first 24 hours are prioritized; days 2–3 normal/high; days 4–7 occasional; after expiry excluded. These are relative priorities, not promises of how often every message appears.

Proposed scheduler balances recency with time-since-last-presented, so older eligible content is not permanently starved. Avoid duplicate recognition IDs within one garden. Avoid immediately repeating the same featured record when alternatives exist. A typed recipient-name match may be used only as a soft repetition heuristic, never identity verification or unique-member counting.

Feature requests do not exempt messages from held/hidden/expired rules. Edits or restoration should refresh visible content without another “new” celebration by default. New sessions load the current pool quietly, not as a week of fresh arrivals.

Track any per-record display history only within the approved content/event lifetime. Do not create permanent person-level attention analytics.

## 6. Clusters and constellations

Clusters rotate across expressions with enough qualifying recent records. Two unique records create a two-record layout; one or none triggers an approved fallback/spotlight. No duplicate messages or names manufactured to fill symmetry.

Constellation links mean “shared expression,” not friendship or other personal relationship. Lines stay faint and behind text. They can be toggled off. Focusing on one expression at a time was suggested, not explicitly approved; keep it optional pending a later owner choice.

The primary atmosphere can use the featured/cluster expression's color. Avoid assigning significance to the most frequent expression. All nine remain equally valued. Multi-expression recognitions show all associated selections even when one color leads the animation.

## 7. QR and arrival-cue area

Approved position: bottom-left. Reserve this area across all modes, including popups and celebrations. A production QR uses the confirmed submission address only. Prototype example addresses must be clearly labeled in testing and never passed off as usable.

D21 proposes holding the actual QR still and animating the surrounding glow/question. Retain the invitation “Who encouraged you today?” and human-readable short address. The final dimensions require actual phones and intended TV viewing positions; desktop screenshots cannot certify scanning.

Arrival cues must reflect published events only, not private moderation holds. They should not reveal the submitted name, publicize private filter reasons, or promise exactly when a viewer will see content under a paused/offline display.

## 8. Statistics and milestones

Main: Expressions of Mother's Love Recognized This Month. Secondary: recognitions shared this month. Present nine expression counts in canonical order without ranking. Same period, same inclusion rule, same aggregate revision across all counters.

No statistics are derived from animation completions, queue length, local sample pool length, or a deduplicated recipient-name count. Actual data replaces fixtures only in the later authorized application.

D14 proposes monthly thresholds 50, 100, 250, 500, 1,000 and beyond as configurable milestones, not participation targets members must meet. Celebrate once per period/threshold and coordinate with reading holds. An edit/reconnect cannot repeatedly trigger a celebration. When a batch crosses several, recommend the highest newly crossed threshold once. Progress denominator must match its label; do not show a previous-to-next interval bar as if it were total/next without explanation.

## 9. Rotation and timing

The earlier 12/15/21-second constants are demonstrations, not validated reading budgets. Proposed final timing should account for name, message and displayed expression words. Continue large text over several pages when appropriate.

Keep recognitions as the majority of normal programming; precise percentage is pending D11. Suggested sequence: Garden → featured appreciation → Garden with different records → impact → all-nine details → cluster → Garden. The actual playlist is editable only within owner-approved rules.

One coordinator handles ordinary rotation, arrivals, reading holds, milestones and admin overrides. See `06_DISPLAY_ENGINE_AND_QUEUE.md`. The current independent timers are known incomplete behavior.

## 10. Low activity, intentional quiet and fallback states

Automatic low activity after an approved inactivity duration reduces motion and simplifies rotation; new eligible publication can wake it. The prototype's 20-minute timer is not a finalized threshold.

Manual Quiet (D09) suppresses interruptions and does not auto-wake. Collection availability is separate: users can still submit unless an admin separately pauses collection. End-of-session schedules differ from inactivity and do not imply the browser can power the physical TV off.

With no current eligible recognitions, show campaign information and invitation without demo people. With unavailable statistics, show loading/unavailable—not zero. On lost verification, follow D13's bounded offline policy, then use neutral campaign/expressions content. Locally expired content disappears even while offline.

## 11. Done means evidence

Owner approval of the visual direction does not certify floating overlap, 500-character fit, timing, reduced motion, permission boundaries, or runtime behavior. Acceptance cases T-TV-01–T-TV-14 and T-Q-01–T-Q-10 must be demonstrated during later implementation. No runtime/TV tests were executed by this documentation handoff.
