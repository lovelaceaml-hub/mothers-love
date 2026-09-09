# Clickable user journeys

Status: full app deployed and accepting recognitions. TV opens directly without a code. Physical viewing-distance and phone QR checks remain on-site tasks. Password setup, no-authenticator access and the expression guide are live. Real public pages, accessibility and denied unauthenticated API access were checked. Exact automated counts and limitations are in UI-QUALITY-REPORT.md; final independent integration review passed.

| Journey | Start | Decisive action | Success and recovery |
|---|---|---|---|
| Visitor on phone or desktop | [Live feed](https://mothers-love.vercel.app), then [form](https://mothers-love.vercel.app/recognize) | Read recent recognitions, select expressions and send appreciation | Ready or held receipt, same-key retry when unconfirmed, fresh reset |
| Moderator | [Sign in](https://mothers-love.vercel.app/admin/login) then [review](https://mothers-love.vercel.app/admin/review) | Read, correct and publish or hide/invalidate with category | Current version returned; stale conflict requires reload; expiry removes personal content |
| Owner | [Set password](https://mothers-love.vercel.app/admin/set-password) from the invitation, then [sign in](https://mothers-love.vercel.app/admin/login) | Open [settings](https://mothers-love.vercel.app/admin/settings) | Invite/revoke moderator or open TV View |
| TV operator | [Display](https://mothers-love.vercel.app/display) | Open the link without sign-in | Quiet initial snapshot, approved presentation; offline neutral when verification expires |
| Daily operations | [Display controls](https://mothers-love.vercel.app/admin/display) | Save motion/Quiet/neutral controls | Saved/pending/applied browser acknowledgement |
| Campaign reporting | [Insights](https://mothers-love.vercel.app/admin/insights) | Select reporting period and export | Anonymous aggregate CSV, no names/messages |

Phone 390x844, desktop 1440x1000 and TV 1920x1080/3840x2160 are software verification targets. Physical TV and participant usability checks remain distinct evidence. The approved reference HTML stays unchanged.
