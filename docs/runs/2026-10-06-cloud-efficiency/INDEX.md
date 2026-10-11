# Cloud efficiency validation

Repository `lovelaceaml-hub/mothers-love` (GitHub catalog 1360780135), main
`2e1215dc092ced1978b87a1039b6594b0714bfc2`. The exact transferred commit
`5a1415dc514e43ef1dc543607a88cfe0ea480c4c` is based directly on
`7cf00014fe38807e4739478b2af3138d6f085d88`. Its 17 implementation files and the
approved `vercel.json` transfer-branch exception applied without conflicts onto
newer main. The newer world arrival/review fixes remain intact.

The original `/workspace/mothers-love` checkout remains clean. The integrated
uncommitted changes are preserved in
`/workspace/mothers-love-worktrees/tv-display-efficiency`, local branch
`feat/tv-display-efficiency-cloud`, with no push upstream configured. Nothing
was pushed, opened as a PR, deployed or applied to a live database here.

Cloud follow-up adds bounded/isolated likes-total reads, overlap guards on slow
daily/reaction reads, a five-second legacy fallback cadence, JSONB-compatible
connection type-discovery savings and a repeatable synthetic usage guard.
Playwright can use the installed Chromium and waits for the current Studio
iframe after scene selection. Renderer assets/geometry are unchanged.

Validation uses pinned dependencies, fictional records and disposable databases:

- Typecheck and production build pass; 933 unit tests pass, 7 existing skips.
- `npm run check:display-efficiency` passes 21 focused units and 24 actual
  PostgreSQL checks, including cleanup heartbeat, restricted runtime JSONB
  compatibility, payload limits, expiry, moderation, calendar boundaries,
  reconnect/reset and ACLs.
- Thirteen focused browser checks pass across the final subsets. They cover unchanged freshness beyond 60 seconds, stable
  iframe, single/group arrivals without replay, moderation/quiet withdrawal,
  hidden/return/stale behavior, disabled-preset snapshot reuse, slow likes/hearts
  and five-second fallback. Garden, likes header, Studio and Live Recognitions
  at 1920/3840 are included. Detailed final subset outcomes are recorded in the
  external cloud report below.
- Public feed/reaction/receipt regression: 35 browser tests pass, 1 existing
  skip. This includes mutation races, expiry, throttling/cookie recovery and
  old-page moderation behavior.
- Real disposable PostgreSQL with locally issued strict TLS, production Next
  server and system Chromium passes six end-to-end checks without API mocks.
  Single/group overlay initiation in renderer state took 5,277/5,657 ms from
  SQL publication. Hidden return initiated a read in 110 ms; real database
  outage retained content before 60 seconds and withdrew it at 60,322 ms.
  Renderer animation was advanced between the single and group measurements
  to avoid treating software-GPU frame speed as a publication latency result.
- Full lint retains existing debt: main 30 errors/9 warnings, integrated patch
  29 errors/9 warnings; normalized comparison shows zero introduced findings.
  `git diff --check` passes.

Representative disposable fixture sizes: legacy database 557,802 JSON bytes,
legacy projected browser 58,302, reset 67,579, unchanged 154 (140 gzip), single
arrival 12,447 (3,492 gzip), known-token list 3,299 characters. Actual local HTTP
unchanged responses were approximately 155 bytes. These are fixture/application
measurements, not billed egress, provider quotas or a Free-plan guarantee.

Limits remain: broad scene validation is incomplete, with historical arrival
geometry disagreements and cloud timing failures. The original Mac run records
five identical base/patch geometry failures. The cloud reproduced the old
Studio iframe-detachment race on clean main before fixing test readiness;
assertions were retained. No physical TV, live schema/TLS, billing or deployment
was validated. No paid telemetry or plan change was introduced. Feed and `/world`
retain their existing payload/cadence contracts; published feed hearts still
refresh independently because heart counts can change without a feed edit.

The Library evidence archive could not be downloaded after its authorized
bounded retry. Code transfer was recovered through the verified Git commit;
the archive's expected checksum was not verified. Git source and this cloud's
independent checks are the evidence for integration.

Reproduce with [Cloud validation](../../CLOUD-VALIDATION.md). Detailed logs,
baseline comparisons, final patch identity/manifest and local fixture evidence
are outside Git at `/workspace/scratch/mothers-love-readiness/REPORT.md` and its
neighboring files. At this record's 2026-10-06 validation, migration 019 was
byte-identical to the transfer, SHA-256
`d318a6b3ed22680524d4dc10e967bb59eb4b540d1536e5ba56ee16b6380bc5a9`. A later
hourly-renewal fix amended the migration. Its current hash is recorded in
[Plan 31](../../PLAN-31-display-efficiency.md) and the 2026-10-10 remediation
run record.

Migration 019 must be authorized and applied before app rollout. Publishing,
live SQL and physical-TV commissioning remain separate steps. The original
transfer branch has the approved Vercel deployment-disable exception; the cloud
branch is unpublished and must not be pushed without reviewing deployment
behavior.
