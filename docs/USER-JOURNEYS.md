# Clickable user journeys

Status: full app deployed with collection closed. Password setup, no-authenticator access and the expression guide are live. Real public pages, accessibility and denied unauthenticated API access were checked. Exact automated counts and limitations are in UI-QUALITY-REPORT.md; final independent integration review passed.

| Journey | Start | Decisive action | Success and recovery |
|---|---|---|---|
| Visitor on phone or desktop | [Form](https://mothers-love.vercel.app) | Select expressions and send appreciation | Ready or held receipt, same-key retry when unconfirmed, fresh reset |
| Moderator | [Sign in](https://mothers-love.vercel.app/admin/login) then [review](https://mothers-love.vercel.app/admin/review) | Read, correct and publish or hide/invalidate with category | Current version returned; stale conflict requires reload; expiry removes personal content |
| Owner | [Set password](https://mothers-love.vercel.app/admin/set-password) from the invitation, then [sign in](https://mothers-love.vercel.app/admin/login) | Open [settings](https://mothers-love.vercel.app/admin/settings) | Invite/revoke moderator or create/revoke paired display |
| TV operator | [Display](https://mothers-love.vercel.app/display) | Enter Owner-issued code | Quiet initial snapshot, approved presentation; offline neutral or pairing on revocation |
| Daily operations | [Display controls](https://mothers-love.vercel.app/admin/display) | Save motion/Quiet/neutral controls | Saved/pending/applied browser acknowledgement |
| Campaign reporting | [Insights](https://mothers-love.vercel.app/admin/insights) | Select reporting period and export | Anonymous aggregate CSV, no names/messages |

Phone 390x844, desktop 1440x1000 and TV 1920x1080/3840x2160 are software verification targets. Physical TV and participant usability checks remain distinct evidence. The approved reference HTML stays unchanged.
