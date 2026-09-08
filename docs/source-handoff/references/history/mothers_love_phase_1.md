# The Words of Mother's Love — Phase 1

## Campaign Identity

**Title:** THE WORDS OF MOTHER'S LOVE  
**Tagline:** *Where a mother's love resides, peace abides.*

**Location:** Las Vegas  
**Public church logo:** Not shown on the campaign display.

---

## Phase 1 Status

**Approved:** Mobile submission experience

The Phase 1 prototype has been reviewed and approved as the foundation for the campaign submission flow.

The approved experience is:

**Scan QR → Submission Page → Submit Recognition → Thank You Confirmation**

No member account or login is required.

---

## Primary Goals

The campaign is designed to:

- Encourage members to consciously practice the 9 expressions of Mother's Love.
- Help members feel recognized and appreciated.
- Create a warmer atmosphere in the church.
- Encourage participation through visible campaign totals.
- Show that Mother's Love is actively being practiced throughout the church family.

The campaign should feel encouraging and communal rather than competitive.

---

## Submission Flow

### 1. Your Name

Members enter:

**First name + last initial**

Example:

`Anthony L.`

Helper text:

> Your identity is visible only to campaign administrators and will never appear on the public display.

The submitter's identity is stored privately for up to 7 days and is never shown publicly.

### 2. Person Being Recognized

Prompt:

**Who would you like to recognize?**

Members manually enter:

**First name + last initial**

Example:

`Michelle R.`

Helper text:

> Enter their first name and last initial.

One submission recognizes exactly one person.

### 3. Expression Selection

Members may select **one or more** of the 9 expressions within the same recognition.

The expression cards should feel colorful, inviting, and campaign-specific rather than like standard checkboxes.

### Exact Expression Wording

1. **“How Are You?”**
2. **“Thank you. It's all thanks to you. You've worked hard.”**
3. **“I'm sorry. It must have been hard on you.”**
4. **“It's okay. I understand.”**
5. **“Please, after you.”**
6. **“I'd love to hear more about your thoughts.”**
7. **“I'll pray (or root) for you. Everything will go well.”**
8. **“Can I give you a hand with anything?”**
9. **“You're amazing. You're doing great!”**

These exact expressions should be used consistently throughout the submission form, TV display, statistics screen, and future admin interface.

### 4. Appreciation Message

Prompt:

**Share your appreciation**

Helper text:

> Write a personal message of acknowledgement and thanks.

Maximum length:

**500 characters**

One message may describe all selected expressions.

### 5. Submission

Primary action:

**SEND RECOGNITION ♥**

Normal submissions should publish immediately to the TV system.

A basic inappropriate-content filter should run before public display.

If a submission is flagged:

- The member still receives the normal thank-you confirmation.
- The submission is placed on hold privately.
- It does not appear on the TV until an administrator reviews it.

---

## Confirmation Page

After a successful submission, show:

### Thank you for sharing Mother's Love.

> Your recognition has been received and will help encourage our church family.

> **Your message will appear on the Words of Mother's Love display.**

Primary follow-up action:

**Recognize Someone Else**

This starts a fresh submission.

---

## Privacy Rules

### Publicly Visible

The TV may display:

- Recipient first name + last initial
- Selected expression(s)
- Appreciation message
- Submission time/date when useful

### Admin Only

Administrators may view:

- Submitter first name + last initial
- Recipient
- Selected expressions
- Message
- Submission status

### Retention

Personal recognition content is retained for **7 days**.

After 7 days, delete:

- Recipient name
- Submitter name
- Message
- Any other personally identifying recognition content

Anonymous aggregate statistics are retained permanently.

---

## Campaign Statistics

The primary public metric is the number of expression selections, not simply the number of submissions.

Example:

**214 Expressions of Mother's Love Recognized This Month**

Secondary metric:

**57 recognitions shared this month**

A single recognition that selects expressions #2, #6, and #8 contributes:

- 1 recognition
- 3 expression recognitions

The public display should show all 9 expression counts equally rather than ranking them competitively.

---

## Historical Statistics

The campaign is ongoing.

Public TV display:

- This month's totals

Admin dashboard:

- This week
- This month
- All time
- Previous monthly totals

Anonymous aggregate statistics remain available after the 7-day personal-data expiration period.

---

## Visual Direction

The digital campaign should remain **very close to the original campaign inspiration**.

Key characteristics:

- Warm cream and pale-yellow backgrounds
- Sky blue
- Sunny yellow
- Orange
- Coral / soft red
- Lavender
- Lime green
- Leaf green
- Rounded typography
- Large expression numbers
- Daisies
- Leaves
- Soft organic circles
- Translucent bubbles
- Friendly rounded cards
- Generous spacing
- Cheerful and warm without looking childish
- No church logo required on the display

### Mobile vs. TV

**Mobile submission form:** calmer, highly readable, easy to complete.

**TV display:** more expressive, animated, decorative, and visually immersive.

---

## Phase 1 Prototype Behavior

The approved Phase 1 prototype includes:

- Responsive mobile layout
- Private submitter field
- Recipient field
- All 9 expression cards
- Multi-select expression support
- 500-character appreciation message
- Character counter
- Form validation
- Submission confirmation screen
- “Recognize Someone Else” reset flow
- Campaign-inspired visual styling

The prototype is intentionally front-end only.

No data is saved yet.

---

## Phase 2 Handoff

Phase 2 is the dedicated TV display.

It should include:

1. Recent recognition card screen
2. Featured recognition screen
3. New Recognition interstitial
4. Monthly campaign impact / statistics screen
5. All 9 Expressions screen
6. Persistent QR code area
7. Automatic timed rotation
8. Sample recognition data for prototyping
9. 16:9 full-screen layout designed for a Windows-connected TV
10. Smooth transitions suitable for unattended display during church hours

### Planned Rotation

A recommended baseline cycle:

1. Recent Recognitions — 12 seconds
2. Recent Recognitions — 12 seconds
3. Featured Recognition — 15 seconds
4. Recent Recognitions — 12 seconds
5. Mother's Love in Action — 12–15 seconds
6. The Nine Expressions — 15 seconds
7. Repeat

A new recognition may temporarily interrupt the rotation.

New recognitions should queue rather than interrupt repeatedly back-to-back.

A short normal-display interval should occur between queued new-recognition moments.

---

## Phase 2 New Recognition Behavior

Example:

**A NEW ACT OF MOTHER'S LOVE**

**Michelle R.**

was just recognized for

**#8 — “Can I give you a hand with anything?”**

Then display the submitted appreciation message.

Recommended display duration:

**8–10 seconds**

Then return to the normal rotation.

---

## Persistent QR Code

A QR code should remain visible in a consistent corner of the TV experience.

Suggested treatment:

**Recognize Someone**  
**Scan to share Mother's Love**

The QR destination will eventually point directly to the Phase 1 submission page.

A production domain has not yet been selected.

---

## Future Phase 3

After the TV prototype is approved, connect the application to:

- Next.js
- Supabase database
- Supabase Realtime
- Supabase Auth for administrators
- Vercel hosting
- Content filtering
- Seven-day personal-data expiration
- Permanent anonymous aggregate statistics
- Admin dashboard
- Featured recognition controls
- Hide / restore controls
- New-recognition popup pause control
- Rate limiting
- Reconnection/recovery behavior for the TV display
