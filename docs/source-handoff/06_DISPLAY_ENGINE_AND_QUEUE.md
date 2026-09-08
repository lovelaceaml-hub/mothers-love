# Display coordinator, arrival queue and recovery

**Status:** Proposed engineering contract for approved TV features. Not implemented.  
**Pending policy:** D08–D14, D20.  
**Key distinction:** A live **arrival cue** is the visible notification. The live **arrival queue** is the ordered work behind it. The product needs both.

## 1. One owner of presentation state

Use one explicit controller/state machine for screen selection, arrival timing, reading holds, milestones, pause behavior, and administrative overrides. Independent timers must not be able to interrupt each other's protected presentations.

The database owns eligibility and aggregate statistics. The display coordinator owns local presentation only. Animation success/failure never increments or reverses campaign totals.

## 2. Proposed states

| State | Entry | Permitted exit / invariant |
|---|---|---|
| BOOTSTRAP | Open display, restore browser or credential refresh. | Verify access and obtain current snapshot; no automatic backlog celebration. |
| ROTATING | Normal eligible content and playlist. | Queue request or next ordinary screen. |
| ARRIVAL_WAITING | New valid publication event is queued. | Wait for a safe reading boundary and any cooldown. |
| ARRIVAL_JOURNEY | One reserved landing slot; visible QR-origin cue. | Complete, fail to static fallback, or cancel on removal/expiry. |
| ARRIVAL_READING | Full appropriate recognition treatment after landing. | Protected reading budget completes before another arrival. |
| ORDINARY_INTERVAL | Resume normal programming between arrivals. | Next eligible queued item after approved interval. |
| MILESTONE | Pending valid threshold celebration. | Show once after the current reading hold; return to prior program. |
| QUIET | Explicit manual override. | Owner/operator release only; no auto-wake from submission. |
| OFFLINE_SAFE | Display access/visibility cannot be verified within grace period. | Current authenticated resync before returning. |
| EMERGENCY_NEUTRAL | Explicit urgent admin action. | Valid administrative release; no recognition text displayed. |

Motion level (Calm/Standard/Lively/Still), rotation pause, arrival pause, automatic low activity, and collection-open are orthogonal settings. Document how they compose; do not overload one boolean called `paused`.

## 3. Priority order

Removal, expiry and access revocation outrank every visual hold. Emergency neutral outranks milestones and arrivals. Manual Quiet/pause rules govern whether a new presentation may start. In normal operation, finish the current person's readable hold before another journey or a milestone celebration. Decorations are always lowest priority.

Paused presentation must still process removal/expiry. It must not freeze sensitive content in place indefinitely.

## 4. Proposed queue item contract

Each item identifies a stable publication event, recognition ID, campaign, relevant content version, original event time and current status. No submitted name. Avoid making permanent copies of the message in the queue; fetch or validate against the current eligible snapshot. Any cached display payload is bounded by original expiry and verification freshness.

Transport duplicates can occur. Treat `(campaign, publication event ID)` as the logical arrival identity, not a new locally generated sequence on every receipt. Edits have a new content version, not a new first-publication event. Replayed or out-of-order updates cannot restore an older visible version over a hidden/expired record.

Exactly-once effects are required for statistics and intended for introductions; do not assume an exactly-once network transport. State that distinction in implementation reviews.

## 5. Normal arrival sequence

1. A validated first publication commits; the server produces a stable event.
2. Display receives notification and confirms current eligibility/version. Held content has no public cue.
3. Deduplicate, enqueue and show an accurate waiting count, excluding any already-active item.
4. At a safe boundary, reserve a landing location; protect it against movement or track its current position continuously.
5. Animate one QR-origin orb, or show a static acknowledgement under Still/reduced motion.
6. Replace/add the recognition, apply fresh emphasis, and hold readable content for the chosen budget.
7. Record local presentation receipt only after the required full treatment, not after a truncated bubble or cancelled journey.
8. Resume ordinary programming before the next queued journey.

Proposed initial tuning: 2–3 seconds for the journey; 12–20 seconds minimum readable emphasis for a normal short message; longer content gets an adjusted hold/continuation. All tuning remains pending D11. Fresh halo duration and message reading duration are not the same clock.

## 6. Bursts and backpressure — D10

Every valid publication joins the eligible recognition pool, even when individual introductions cannot keep up. Do not silently discard records because the queue is long. Separate content retention, rotation eligibility and introduction eligibility.

Owner must choose a maximum acceptable introduction wait and whether old intros may be grouped. Until approved, present this as an unresolved policy, not a background heuristic. Proposed approach: ordinary bursts get one-at-a-time journeys with spacing; excessive backlogs get grouped acknowledgement while individual messages remain in fair rotation. Do not claim every event had a personal journey if it was grouped.

Batch receives and milestone thresholds are coordinated. A recognition selecting several expressions creates one journey and several statistical selections, not several journeys.

## 7. Pause semantics — proposed D09

| Control | What stops | What continues |
|---|---|---|
| Pause rotation | Automatic ordinary page transitions. | Data updates and mandatory removals; arrival behavior follows the separate arrival setting. |
| Pause arrivals | New journeys/popups; pending items remain bounded by eligibility. | Ordinary approved rotation, publication, aggregate updates, removals. |
| Still | All motion mechanisms; replace moving arrivals with static cues. | Approved screen changes may occur without animation unless rotation is also paused. |
| Quiet | Coordinated interruption suppression; optional neutral/expressions-only screen per owner choice. | Collection, storage and moderation unless separately paused. Does not auto-wake. |
| Pause collection | Form says temporarily unavailable. | Admin operations and current TV program as configured. |
| Emergency neutral | Immediate recognition presentation removal when connected. | Receipt of safety/configuration updates and administrative recovery. |

Automatic low activity is not a privacy/security mode. It slows programming after inactivity and can wake from eligible content. It cannot override manual Quiet or emergency neutral.

## 8. Errors, cancellation and teardown

A per-item failure must release locks and clean up the orb, label, timers and reserved slot. Use static full recognition as a fallback when possible; do not leave the queue permanently busy. Failures and cleanup are observable without logging message bodies.

If a recognition becomes hidden, invalid, expired or revoked while waiting, remove it from queue and all cached active views. If that happens in flight or during reading, interrupt even protected reading, remove its text and return to safe programming. Do not display a rejection reason to the room.

On resize, recalculate safe positions without restarting publication events, losing queue state or reintroducing old records as fresh. On tab suspension, handle elapsed time deliberately; do not create a burst of deferred animations when focus returns.

## 9. Startup, reconnect and expiry

Proposed sequence: subscribe/buffer changes or obtain a cursor-consistent snapshot → load current eligible records, counters, settings and expiry times → apply newer buffered revisions → begin ordinary program. Implement the actual snapshot/event race handling; a plain fetch followed by subscribe can miss changes between them.

Server time and record expiry control eligibility. Browser clock changes must not extend lifetimes. Use a documented clock-offset/verification mechanism and safe fallback when uncertain. All cached personal display records disappear on original expiry.

Startup is quiet. Reconnection obtains current truth before replaying any events. A short-term bounded record of already presented IDs may reduce repeats, but no indefinite recognition/event history is permitted. Exact event/receipt lifetime is D22. Old removed records cannot be resurrected from local storage or stale events.

## 10. Test hooks and evidence requirements

Design deterministic fake-clock and event-stream tests for duplicate IDs, bursts, interruptions, failure, reconnect, expired events, and out-of-order versions. Provide a synthetic simulator separate from production data. “Queue ×3” and milestone demo controls are development tools, not admin actions that create real counts.

Required evidence includes a screen recording of sequential bursts, logs stripped of personal content, and assertions that all published records are counted once regardless of animation success. The current browser-only demo does not establish those guarantees.
