# UI quality evidence

## Target and visual comparison
The frozen target is ML-BUBBLE-APPROVED-V3. The Downloads prototypes were never changed. Exact title, tagline and all nine phrases/principles remain canonical. Source references and application captures are under runs/2026-09-08-full-app/research/submission-evidence and display-evidence. All people and messages in test screenshots are synthetic.

Controller inspected the 390x844 phone form, 1440x1000 desktop form, preview and receipt, multi-record garden, featured recognition, full-nine overview and cluster. Warm palette, Bubble Board hierarchy, stationary QR, colored bubbles, separate drift/breathing, settings-controlled trails and actual shared-expression connections are retained. Garden excerpts are labeled and complete readings follow. Long recipient/message readings and dense line breaks paginate verbatim, with a separate complete associated-expression page when needed.

## Function and accessibility
Current implementation ccf272e passed 64 focused tests, lint and the production build. The deployed full suite passed all 48 journeys, with one optional screenshot-only test skipped. A stale example-link text assertion was corrected without changing production code. All 23 admin journeys passed, including password-only Owner entry, explicit setup, invalid links, stored-session isolation, provider rejection and legacy MFA redirect, correct settings labels, both Sign out buttons, local logout scope, local token removal and remote logout failure. Correctness tests for long featured/arrival content and dense-line bounds run by default.

Coverage includes published/held receipts, retry/reset, private-name exclusion, Owner/Moderator controls, invitation hash handling, cleanup freshness, conflict/expiry clearing, aggregate CSV, pairing and revocation, arrivals/milestones, offline safety, Still settings, exact message reassembly, phone width and 1080p/4K bounds. Public open-form and admin sign-in axe checks have zero violations. Initial live closed-form, sign-in, unpaired display and privacy scans also had zero axe violations; a privacy decoration overflow was corrected and its focused regression passed.

## Backend evidence
Fresh disposable PostgreSQL compiled 001 and applied exact migrations 002 and 003. Lifecycle, ACL, pairing/revocation, cleanup closure/recovery and Unicode fixtures passed and rolled back. Password-only assertions prove AAL1 Owner access, Moderator limits, revoked/nonmember denial and unchanged role boundaries. Two concurrent-connection checks observed actual lock waits and confirmed mismatched retries return 409 with one contribution and revoked snapshot/ack return 401. Production's restricted login denies direct table access. Minute cleanup is running. No real recognition fixture was inserted into production.

## Production and performance
The current production deployment is dpl_BfhAJijY2zYiFiS3BFGAAhAMKb3W at https://mothers-love.vercel.app, built from implementation ccf272e. Real config returns configured true and collectionOpen false. Protected admin and unpaired display endpoints return 401 with no-store. The retired /admin/mfa route returns 307 to /admin.

Nine real browser views passed with zero axe violations and no horizontal overflow: phone/desktop closed form, login, unpaired TV, privacy, phone/desktop expression guide, password setup without a session and setup-link request. Screenshots and smoke.json are in research/production-evidence. Controller inspected the actual phone setup and full guide captures. The first cold phone page in this isolated run loaded in 806 ms with 237367 transferred resource bytes. Other views reused the context and are not cold benchmarks. This is one laboratory observation, not field performance or INP evidence. Production dependency audit reports 0 known vulnerabilities; dependencies have not changed since that audit.

## Explicit limits
Automated positive journeys intercept APIs with synthetic fixtures. They establish interface behavior on the built application, not a completed real Owner sign-in after the repair or physical TV operation. The actual Owner password was already saved and email verified; the user is invited to confirm the repaired login. Distance readability and a physical phone QR scan remain commissioning actions. No human usability test, INP measurement or arbitrary monitoring period is claimed.

## Completion review
Independent final integration review returned PASS after verifying all 140 isolated manifest hashes and checking the corrected auth, settings, logout, examples and role boundaries. Findings from the prior round were corrected and all affected checks rerun. See research/completion-review.md for the acceptance receipt and evidence limits.
