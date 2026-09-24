# Submission evidence

Date: 2026-09-08

Target: `TargetML-BUBBLE-APPROVED-V3`

Environment: local Next.js dev server at `127.0.0.1:3102`, Chromium headless, synthetic intercepted API responses only.

## Synthetic fixture

- Submitted name: `Maya R.`
- Recipient: `Michelle R.`
- Expressions: IDs 2, 6, and 8 from the shared catalog.
- Message: `Your kindness made a hard day feel lighter.`
- API result: published receipt with a synthetic ID and synthetic future expiry.
- No real people, provider services, credentials, or production routes were used.

## Captured screens

| Screen | Size | Evidence |
|---|---:|---|
| Open form | 390 x 844 | [submission-open-phone-390x844.png](submission-open-phone-390x844.png) |
| Open form | 1440 x 1000 | [submission-open-desktop-1440x1000.png](submission-open-desktop-1440x1000.png) |
| Public preview | 390 x 844 | [submission-preview-phone-390x844.png](submission-preview-phone-390x844.png) |
| Published receipt | 390 x 844 | [submission-receipt-phone-390x844.png](submission-receipt-phone-390x844.png) |

The immutable prototype was also captured at both reference sizes for direct comparison:

- [prototype-reference-phone-390x844.png](prototype-reference-phone-390x844.png)
- [prototype-reference-desktop-1440x1000.png](prototype-reference-desktop-1440x1000.png)

## Visual comparison

The final open form preserves the reference hierarchy and material: centered campaign title and tagline, cream background, compact centered desktop card, single-column phone layout, two-column desktop expression cards, rounded inputs, full phrase cards, and the warm blue, yellow, orange, coral, purple, lime, green palette with bubbles, daisies, and leaves. The final screenshots show no material fidelity mismatch after narrowing the desktop card to about 540px and restoring the title to the reference scale.

The following visible differences are intentional contract corrections or accessibility additions:

- The kicker uses `A small word of encouragement` instead of the prototype’s location label. The public campaign has no location label.
- The private-name callout, public-content reminder, optional principle controls, public preview, and truthful receipt states are required production behavior.
- The selected expression uses a semantic pressed state and a visible checkmark. The coral card color is slightly lightened to pass the automated contrast check.

## Privacy copy verification

[privacy/page.tsx](../../../../../src/app/privacy/page.tsx) now states:

- Active recognition content, including submitted names and messages, expires after seven days, or 168 hours from submission.
- The original lifetime does not extend through edit, feature, restore, or hide actions.
- The application’s custom backup excludes personal recognition rows.
- Provider recovery copies may follow the provider’s retention policy.
- Provider recovery copies are not reused for campaign display before current purge checks.
- The copy makes no irreversible-erasure claim.
- Display fallback remains 60 seconds from the last verified snapshot.

## Evidence hashes

```text
prototype-reference-desktop-1440x1000.png 713e2716710cc49bb9b56329c7bf923817adbde64bb9db57a96026b10d8e2946
prototype-reference-phone-390x844.png 00ff5a3908b4473452c324f3174661ce1ce54297b63da0fc87246dac7074a048
submission-open-desktop-1440x1000.png 92bb6412ee8c37e2bc99e93f78702b253110ddb0bbff12cd4ae8e372e1427114
submission-open-phone-390x844.png 51582f29aebb9fe68e66039641b3fbb21ce5131fced4e6cbd7c47ab39d3024b5
submission-preview-phone-390x844.png 9a7dd45d7715bbcdb40590c7609fefca9d6e1225d1131703cb21df9878cf0ed3
submission-receipt-phone-390x844.png 671db519895e40dbc704b2fb188cc987087ef7fcb13549332605714c6bda812b
```
