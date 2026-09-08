# Project brief

**Status:** Approved product foundation with proposed production refinements.  
**Read with:** [Decision register](02_DECISION_REGISTER.md).

## Mission

Create a warm church recognition campaign that encourages the nine expressions of Mother's Love. A member scans a QR code, recognizes another member, selects the expression(s) received, and writes an anonymous-on-screen message of appreciation. A Windows-connected church TV displays those recognitions within a gently animated Living Wall.

The purpose is encouragement and a warmer church atmosphere, not competition, individual performance measurement, or proof of who is most loving.

## Identity and scope — APPROVED

**THE WORDS OF MOTHER'S LOVE**  
*Where a mother's love resides, peace abides.*

One internal Las Vegas location. The public branding must not include Las Vegas or a church logo. Stay close to the original campaign artwork: cream/yellow, sky blue, coral, purple, green, bubbles, daisies, leaves, organic shapes, rounded friendly typography.

Members use a public link with no account or church PIN. They manually type both the submitted name and the recipient as first name plus last initial. The submitted-name field is visible only to designated administrators. It is self-reported, not verified.

Exactly one person is recognized per submission. One message may select several of the nine expressions. Maximum message length is 500 characters. No additional required personal fields are approved.

Normal submissions publish without prior human approval after basic content checks. Flagged content is held for review. Admins may edit the recipient, submitted name, message and expressions, feature a recognition, hide it, and restore it before expiry.

Personal content is deleted after one week. Anonymous statistical totals remain: expressions recognized and recognitions shared. A recognition selecting three distinct expressions contributes one recognition and three selections under the eventual approved counting rules.

## Audiences

| Audience | Intended experience | Not assumed |
|---|---|---|
| Member submitting | Mobile-friendly form, clear privacy, quick confirmation. | Account, directory membership, verified identity. |
| Recipient and congregation | Public appreciation visible on the church TV. | Consent to publish sensitive stories; individual ranking. |
| Campaign administrator | Review, correction, hiding, feature selection, statistics, TV operation. | Every admin must have identical privileges; role split is pending. |
| TV browser | Read-only eligible content and display settings. | Access to submitted names or database administration. |
| Owner | Approves policy, access, scope, and later implementation/deployment. | Delegating unapproved policy decisions to a coding tool. |

## Phase status

| Phase | Existing work | Not complete |
|---|---|---|
| 1: Submission | Approved responsive interaction reference and earlier Markdown summary. | Connected delivery, final confirmation copy, accessibility/security validation. |
| 2: TV | Approved Bubble Board direction; latest reference is Living Wall V3. | Reliable scheduler, fair selection, privacy lifecycle, actual-TV readability tests. |
| 3: Backend | Candidate Next.js / Supabase / Vercel direction and proposed contracts. | Final architecture, policy decisions, database, authentication, realtime. |
| 4: Admin | Owner-approved feature list; proposed screen specification in this package. | Role approval, admin design approval, implementation. |
| 5: Readiness | Test and operating plan in this package. | Executed acceptance tests and authorization to launch. |

No production app, live form, live QR destination, or verified operational deployment is delivered by this handoff. The HTML references contain sample names, sample messages, and sample totals only.

## Event vocabulary

A **recognition** is one submitted appreciation message for one recipient. An **expression selection** is one distinct selected expression on that recognition. **Received** means stored; **published** means eligible under policy; **queued** means scheduled by a display; **presented** means the browser reports its presentation completed. None proves a human saw it.

Public anonymity means the application omits the submitted-name field. The message's content or its timing can still allow someone to infer the author. Do not promise untraceable anonymity.

## Product boundaries

Keep the member site focused on submission and confirmation. Do not create a browsable member wall, social network, search directory, message replies, recipient inbox, email campaign, or notifications to named recipients by default.

No member leaderboards, likes, trophies, per-person participation analytics, permanent message archive, real-name matching service, AI rewriting, automatic theological interpretation, or multi-church management. No sound effects were approved. The use of Codex and Claude for development does not imply an AI service inside the campaign.

## Success criteria — proposed operational interpretation

Members can finish a thoughtful recognition without account friction. Recipients can read it at the real TV viewing distance. Admins can remove inappropriate content from every active mode. Counts stay consistent independent of TV availability. Personal information expires predictably. The display remains calm and reliable through the intended church session.

Do not translate these aims into fabricated adoption percentages, unique-member counts, or promised latency until the owner approves measurable targets and the physical setup is tested.
