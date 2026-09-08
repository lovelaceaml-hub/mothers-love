# Canonical content and design direction

**Status:** Title, tagline, phrases, full principles and chosen visual family are approved. Numeric application tokens and new layout/copy refinements are reference/proposed, not official campaign brand standards.

## Public identity — APPROVED

**THE WORDS OF MOTHER'S LOVE**  
**Where a mother's love resides, peace abides.**

No church logo and no public “Las Vegas Campaign” label. Internal location is Las Vegas. Do not import speaker photographs, person names from video credits, a logo, an anniversary mark, or a source website address merely because it appears in an inspiration image.

## The nine expressions — exact catalog

Use stable IDs 1 through 9 and this display order. Typographic apostrophes may be rendered consistently; do not paraphrase, omit clauses, replace “(or root),” or silently change punctuation and capitalization. The explanatory principles are from the user's campaign poster. Source: `references/campaign/poster_A2_01 2.jpg`; the user specifically requested full details on the TV page.

| ID | Explanatory principle | Exact phrase |
|---|---|---|
| 1 | The first phrase to peace | How Are You? |
| 2 | Express gratitude even for small efforts and acts of kindness | Thank you. It's all thanks to you. You've worked hard. |
| 3 | A phrase that melts the heart by understanding the other's feelings first | I'm sorry. It must have been hard on you. |
| 4 | A phrase of forgiveness that embraces faults | It's okay. I understand. |
| 5 | When feeling impatient, take a breath and yield to others | Please, after you. |
| 6 | When opinions differ, listen carefully to others | I'd love to hear more about your thoughts. |
| 7 | Offer sincere support and encouragement | I'll pray (or root) for you. Everything will go well. |
| 8 | Consideration begins with paying attention to those around you | Can I give you a hand with anything? |
| 9 | Warm compliments bring happiness to both sides | You're amazing. You're doing great! |

The form uses full phrases. The all-nine TV overview uses both columns in full. Featured/cluster views use the exact relevant phrase. Compact number chips are supplemental identifiers, not substitutes for the full content in its detailed presentation. Admins select IDs rather than entering alternative wording.

Canonical words belong in one shared application catalog when implementation is authorized. Ordinary moderators should not freely rewrite the campaign catalog. A wording change requires owner approval and a versioned catalog update.

## Approved aesthetic

Preserve the warm, cheerful Bubble Board: luminous cream/yellow, sky blue, coral/orange, purple/lavender and greens; soft organic circles, translucent bubbles, daisies and leaves; rounded friendly cards and typography. The mobile form is quieter and task-focused. The TV is expressive without becoming a game or competition. The admin area prioritizes clarity and operational actions.

The initial approved poster inspiration used strong coral/purple title contrast. The later chosen Bubble Board uses darker readable typography and colored bubbles. Preserve the selected later layout while using the original material as atmosphere and content reference; do not perform an unsolicited rebrand.

## Reference application tokens — not an official palette

These come from Living Wall V3 and are a reproducible starting point. Adjustments for contrast/readability need review, not assumptions that the original campaign mandates these hex codes.

| Token | Reference value |
|---|---|
| Background cream | `#FFF6DC` |
| Paper/card | `#FFFDF6` |
| Main text | `#303342` |
| Muted text | `#6B6F7B` |
| Expression 1 | `#8ED6F5` |
| Expression 2 | `#FFD86A` |
| Expression 3 | `#FFAF70` |
| Expression 4 | `#FF8E86` |
| Expression 5 | `#EF747B` |
| Expression 6 | `#CBB9F4` |
| Expression 7 | `#CDEB76` |
| Expression 8 | `#9DD99F` |
| Expression 9 | `#A5C9FF` |

For multiple expressions, show all selected IDs. Primary accent can cycle or use a deterministic selection without claiming the first expression is more important. Constellation edges must correspond to an actually shared selection. Do not use bubble size to indicate popularity or personal worth.

## Typography and hierarchy — proposed production rules

Recipient name is prominent; detailed recognition reads “THANK YOU, [recipient].” The appreciation message remains the emotional center. Expression wording must remain legible and present in the relevant full view. Technical labels such as “Living wall · recognitions move organically” belong only in development, not the church display.

Choose a readable rounded sans-serif available under appropriate licensing. A serif can be retained for quoted appreciation/tagline if legible. No font files are supplied in this handoff. Do not invent a font asset or require an external font service before licensing, privacy and offline availability are decided.

Validate TV typography against actual TV size, resolution, scaling and viewing distance. Proposed desktop baselines are not certification of distant readability. More submissions should lead to more rotation before shrinking type. Never reduce contrast or shrink long messages until they technically fit but are unreadable.

## Motion design reference

Breathing amplitude in V3 reaches 1.016 scale, with independently staggered roughly 8–13 second cycles. These are demonstration values, not mandatory constants. Position, breath and fresh-emphasis layers must not overwrite each other's transforms. Constellations and trails remain behind text. Reserve room for the maximum expanded shape and halo.

Approved presets are Calm, Standard and Lively. Still and manual Quiet are proposed additions (D09). Reduced-motion handling must encompass CSS, canvas, physics, and journey animation, not CSS alone. The technical accessibility source is listed in `13_PROTOTYPE_AUDIT_AND_SOURCES.md` [S02].

## Public copy inventory

| Placement | Existing/approved direction | Proposed refinement where applicable |
|---|---|---|
| Submitter field | Your Name; first name + last initial; admin-only. | “The name you enter here is visible only to campaign administrators. It is not included on the public display.” Add a reminder not to identify yourself in the message (D07). |
| Recipient | Who would you like to recognize? | “Enter their first name and last initial.” |
| Expressions | Which expression(s) did they practice? | Full phrases; selected count; optional principle expansion (D07). |
| Message | Share your appreciation. | “Write a personal message of acknowledgement and thanks.” |
| Primary action | SEND RECOGNITION | Heart decoration may remain; do not rely on a symbol for meaning. |
| Confirmation heading | Thank you for sharing Mother's Love. | Eligible/held/failed body copy pending D01. Do not unconditionally promise display. |
| Confirmation action | Recognize Someone Else | Fresh form; no permanent personal draft storage. |
| Garden/featured | THANK YOU, [recipient] | “Recognized anonymously” describes the absent sender field, not verified anonymity. |
| Arrival cue | New recognition received / arriving | Public cue only after publication eligibility; never announce held content. |
| QR | Recognize Someone; Scan to share Mother's Love | “Who encouraged you today?” in invitation; stable real destination after authorization. |
| Main metric | Expressions of Mother's Love Recognized This Month | Not “members recognized” or “verified acts.” |
| Secondary metric | Recognitions shared this month | Same period and counting policy as main metric. |
| Milestone | Expressions of Mother's Love recognized | Keep period/verb consistent; final monthly policy D14 pending. |

## Proposed confirmation copy — D01

**Published:** “Your recognition has been received and is ready for the campaign display.”  
**Held:** “Your recognition has been received. Some messages are reviewed before appearing.”  
**Failed/unconfirmed:** “We couldn't confirm your submission. Your message is still here; please try again.”  
**Sending:** “Sending your recognition…”

A single warm generic confirmation may be chosen instead, provided it truthfully says received and does not guarantee publication. Never claim the TV is on or a viewer saw a message without evidence.

## Asset provenance and restrictions

The original poster supplies campaign words and aesthetic reference. The supplied HTML is generated prototype work. Names and messages in prototypes are sample fixtures, not a verified church roster. The embedded prototype QR points to an example address; do not display it as a working submission link. Source websites on artwork are not an approved app domain or permission to change their destinations.
