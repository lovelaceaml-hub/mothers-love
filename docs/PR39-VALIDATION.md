# Independent PR 39 validation — 2026-10-12

No actual integration regression was found in the exact-commit unit comparison or the relevant SQL/build/browser checks. After correcting the deficient world-arrival fetch mock, the complete integration suite passes: 967 passed, seven skipped, zero failed, using default timeouts. The original exact-commit comparison remains recorded below.

## Exact inputs and full unit results

Base: `29da0dd7aa1c5497765809692c7d40c8cb8abd09`.
Integration: `6ff5acfe76511ef57b716b1709df4820207f0b8c`.

Fresh Debian/Linux environment, Node 24.19.0, npm 11.9.0, Vitest 4.0.15, identical pinned lockfile/dependencies, `CI=1`, `TZ=UTC`, two workers, credential variables removed, no `.env` credentials. Main checkout remains at the exact base. Integration uses a detached worktree. `/workspace/.agents` and `/workspace/.codex` are empty; repo AGENTS, contract, handoff/history, active plan and cloud instructions were read. No Mac paths/skills were assumed present.

Both exact commits ran the full suite twice with `npm test -- --maxWorkers=2 --reporter=default --reporter=json --outputFile=<evidence path>` and default timeouts. Base and integration full suites ran sequentially. The first integration run overlapped a separate typecheck; the second pair ran without build/typecheck competition.

| Commit / run | Passed | Skipped | Failed | Total |
| --- | ---: | ---: | ---: | ---: |
| Base first run | 947 | 7 | 6 | 960 |
| Integration first run | 963 | 7 | 4 | 974 |
| Base second run | 946 | 7 | 7 | 960 |
| Integration second run | 964 | 7 | 3 | 974 |

Integration adds 14 tests and removes none. Three existing recovery-test expectations are corrected by including `etag: null`; no corresponding production recovery behavior is removed. All 14 added tests pass. The final integration failures match three exact-base failures. There are zero newly failing tests in the comparison of the first base run with the final integration run.

Stable failures:

- `tests/world/feed-arrivals.test.ts`: keeps entrance across a batched poll/tick; drops an uncommitted arrival on quiet; drops an uncommitted arrival on sample-source switch. The fetch mock omits `response.headers`; the current hook reads `response.headers.get("etag")`, throws, and reports reconnecting. The hook and fixture are byte-identical between these commits. A temporary diagnostic copy adding `headers: new Headers()` passed all 13 tests. That diagnostic copy was removed. The same one-line Headers mock-contract correction is now applied to the tracked fixture for publication; all assertions and production behavior are preserved.
- Exact base also fails three `tests/backend/public-display-recovery.test.ts` equality expectations: wall-deadline recovery, concurrent generation retirement, and timer clearing. The actual query result includes `etag: null`, absent from those expected objects. Integration already corrects the expectations; all four recovery tests pass.

Intermittent failure: the unchanged neighbor animation test `blends clips with weights that always sum to one` exceeded Vitest's five-second default in the first integration run and second base run. The same test passes on both exact commits when run individually with identical `--testTimeout=15000`: base 4.49 seconds test time; integration 3.38 seconds. This is a timeout under workload, not a new assertion regression. Raw timeout runs are retained.

## Integrated checks

- Typecheck: passed.
- Focused unit suite: 37 passed across display cache, query, route, public-display recovery, reaction total and visible polling.
- Efficiency guard: 22 units passed; all 27 disposable PostgreSQL checks passed using 1,200 fictional records. PostgreSQL 16 Docker image digest is recorded with inputs. Container networking was disabled; no configured database URL was used.
- SQL fixture verifies index readiness/validity, limited latest-100 pool, seven-day public expiry cap, delta/unchanged/arrival changes, legacy rollback cursor behavior, quiet/neutral/stale/cleanup safety, function owner/ACLs and fresh restricted runtime JSONB contracts without catalog discovery. Migration 019's tracked bytes match exact base (SHA-256 `131762ba7c45f8557b77a6a7e185c068da8a5eb4f82ab80d34aac29793e1c639`). 020 creates new functions and its separate index; it does not replace main routines or remove the 100-item reaction cap.
- SQL payload measurements: unchanged 155 JSON / 141 gzip bytes; one arrival 12,444 JSON / 3,482 gzip bytes; known-token request 3,299 characters.
- Production Next.js build: passed with fictional public auth configuration and no database configuration.
- Chromium: all 14 selected checks passed, no retries, one worker, system Chromium 151.0.7922.173 against the local production build. Covers Garden circularity/reduced motion, arrival helper, both likes headers, Live Recognitions at 1920/3840, Studio preview, unchanged/hidden/stale cache lifecycle, arrival plus quiet withdrawal, group-arrival stability and moderation, disabled V6 reuse, slow likes/reactions on visibility changes, and unavailable fallback polling. Authentication and APIs are mocked; this is not hosted database evidence or a physical TV check.

Initial build/SQL attempts failed because shared node_modules was a symlink outside the project/container filesystem. Dependencies were copied into the worktree and both checks passed. Those failures and successful reruns are retained as environment evidence, not app failures.

## Local deliverables and release gates

After exact-commit testing, the changes comprise the one-line fetch Headers mock correction, documentation and seven migration-header comment lines: corrected the main SHA typo, replaced the unsafe public-schema data-dump proposal, added the concrete preview/recovery design, and named 020's rollback as AGENTS requires. Migration executable SQL is byte-equivalent after stripping comments. Original tested migration hash: `4fbd2473d19a5804e9d53356bfde5163979dcd8af9e2c6f3a8d5635a1b49079a`; comment-only revised file hash: `0e908e129c23be91d4ca93aa1c3ce6626a06f991c79c87b0df5163f7c70fc096`. If those comments are published, use the revised file hash in its future ledger entry. The only tracked-test correction adds the missing Headers object to the world-arrival fetch mock. No application behavior or assertions changed. Publication and final verification are recorded below.

The [preview/recovery design](PR39-PREVIEW-RECOVERY.md) specifies one isolated Supabase Free project if an authorized free slot exists, its restricted runtime login, five branch-scoped Vercel Preview variables, strict CA verification and actual browser-to-database acceptance. Provisioning an isolated project and new credentials/access still needs action-time permission. The existing test/deploy request covers SQL and preview configuration once the safe target and access are available. No paid resources or production secrets are needed. The supplied hosted preview `https://mothers-love-kdtvw0ftb-lvzion.vercel.app` remains unproven as a functional database preview; READY/200 does not satisfy that gate.

Recovery requires explicit permission for an app-only personal-data export onto the Mac and an isolated encrypted-volume restore. Exclude all public-table data, unrelated routines and global role secrets. Use an AES-256 encrypted APFS image for plaintext and restored PostgreSQL files, an interactive `age` encrypted archive, separate owner-controlled Keychain passphrases, checked ciphertext/internal hashes and an agreed retention/deletion date. Do not perform that backup in this cloud environment. Auth identities, storage objects and other apps are outside this backup's recovery scope.

Before release: obtain approved functional fictional-data hosted preview and backup/restore evidence; reverify exact production identity, ledger and index state with approved access; use existing approved admin access for the production SQL once the recovery and preview gates pass; run the concurrent index in autocommit before additive 020; verify 019 and every main fix remains; then follow the authorized PR/production release path and post-release checks. The original exact-commit suites have the documented baseline debt; the corrected integration suite is green. A church TV/phone check needs actual hardware evidence. Current supplied service-quota restrictions do not imply that all application reads fail; this run did not probe production connectivity.

No main mutation, production mutation, SQL applied to a hosted database, PR merge, manual deploy, credential creation, user-data export or backup occurred. Publishing validation evidence to the existing PR 39 branch is authorized; it does not release production.

Raw evidence remains in `/workspace/validation-pr39`, including every full-suite JSON/log/exit, environment and commit/lock/migration/image identity, comparison JSON, diagnostics, build/SQL/browser logs and local patch. The parent explicitly authorized bounded raw evidence in PR 39. Compressed fictional-only logs and reports are published under `docs/runs/2026-10-12-pr39-validation/evidence/`; complete local artifacts remain available for Drive archival.

## Mock correction and publication verification

The full suite with the one-line mock correction passed with default test timeouts
and two workers: **967 passed, seven skipped, zero failed** (974 tests; 80 test
files passed, one skipped). No production code or assertion was weakened.
The final publication commit is rerun with the full suite and relevant focused
checks; the parent receives the resulting commit and exact results.

Raw exact-base/integration reports, the corrected full-suite report, test logs,
PostgreSQL result JSON, environment/input identity and checksums are in
[runs/2026-10-12-pr39-validation/evidence](runs/2026-10-12-pr39-validation/evidence/).
Logs/reports are compressed individually and bounded below 512 KiB in total.
They contain synthetic test outputs only, no environment-value dump or production
records. This is the explicitly authorized evidence update to existing PR 39,
with no force push, production merge or manual deployment.
