# Handoff

Status: ready to use at https://mothers-love.vercel.app. Recognition sharing is OPEN. Current application source 58e9388 includes the shared Unicode-aware first-name/last-initial check on public submissions and supplied admin name edits. Fully exercised runtime deployment: dpl_EsYytA55LTx1yneGsH1iZApLoErp. Final publication: dpl_4YzqFf4spX6S6WGZxbUnFsPEKjeR, published source 9aa762d, immediate checks passed. See research/readiness-publication.md. Password-only Owner/Moderator sign-in, explicit password setup, local-scope Sign out, expression guide and the approved Bubble Board remain intact.

## Verification
Root: 71 focused tests, lint and production Turbopack build pass. All 48 synthetic browser journeys pass on the deployed assets, including 23 admin flows; one optional screenshot-only test is skipped. The live API rejected malformed names with 400 while collection was still closed. After activation, nine real anonymous page views passed with zero axe violations and no horizontal overflow. Evidence is in runs/2026-09-08-full-app/research/readiness-evidence. Positive browser paths use intercepted synthetic APIs, and no valid synthetic recognition was inserted into production.

Independent Terra high readiness review PASS verified 92 sealed file hashes and the scoped activation query. The previous full-release review and all database/security receipts remain historical evidence in the same research folder. No material finding remains from the three Luna readiness lanes.

## Activation and data boundary
Anthony's latest request authorizes everything deployed and ready to use. Root invoked the existing campaign settings operation on the verified Owner's behalf, with preflight version 1 and closed collection and healthy cleanup checks. Only collectionOpen changed, version advanced to 2 and the ordinary settings event was emitted. The operator query required a unique active Owner with confirmed email and a password, returned no identity, and preserved every unrelated setting. Exact query SHA-256:43f15f674f7b897dc87029e4011875c827c8ee4d9c189604a1a826f9c4f29794. This was an authorized operator action, not a real Owner browser sign-in test.

Existing Supabase target cvuwdlmlukepwfffpgdu, private mothers_love schema and restricted mothers_love_runtime login remain. All 001/002/003 migration ledger hashes match reviewed artifacts. Certificate-verified TLS is mandatory. No new schema, role, credential, service, shared Auth setting or unrelated application change was made. Cleanup remains healthy; effective collection fails closed if cleanup becomes stale or overdue. Unauthenticated admin and unpaired display data still return 401 with no-store.

Shared backup remains at 589c098, privately pushed, excluding campaign personal row tables before selection and retaining only settings and daily anonymous aggregates plus schema metadata. No live backup or personal row export was run. Runtime secrets stay in ignored local/provider configuration; temporary elevated provisioning config is removed. Downloads references remain unchanged.

## Source, records and storage
Private source: https://github.com/lovelaceaml-hub/mothers-love, branch codex/mothers-love. The final readiness source/status commit is pushed and remote HEAD verified by root. New manifests and readiness receipts record the source/operation evidence. Read PLAN-01-full-app.md, CONTRACT.md, USER-MANUAL.md and UI-QUALITY-REPORT.md. Original source-handoff and prior release receipts remain history.

Non-sensitive evidence storage: https://drive.google.com/drive/folders/1JBeoaxaZ9ZMTIFMSmlKT5jn9rcdysnmw
Exact mounted folder: /Users/anthony/Library/CloudStorage/GoogleDrive-lovelace.aml@gmail.com/My Drive/Anthony Mac Storage/Project Outputs/The Words of Mother's Love
The prior release archive and its verified SHA-256 remain in research/release-storage.md. The readiness supplement is privately uploaded and its mounted-copy SHA-256 verified; see research/readiness-storage.md for the exact artifact URL and hash.

## Physical commissioning
No active TV session was paired during preflight. The Owner creates a code at https://mothers-love.vercel.app/admin/settings; the TV operator enters it at https://mothers-love.vercel.app/display. Actual TV visibility, distance readability, phone QR scan and post-fix human Owner sign-in have not been reported. Those physical/identity actions are not fabricated by the automated software checks. The public website is already accepting recognitions.
