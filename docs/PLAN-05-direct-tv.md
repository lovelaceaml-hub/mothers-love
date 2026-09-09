# Plan 05: Open TV View directly

## Authority and result
Anthony explicitly requests removing the TV code requirement so TV View opens with its link. This supersedes paired-only TV access and per-browser access/revocation expectations. Everyone may open /display without a code, login, cookie, device registration or setup step. Admin authentication and permissions remain. Preserve all approved visual design, exact campaign words, live updates, global display controls, quiet/neutral mode, expiry, cleanup health and 60-second offline privacy limit.

## Model and lane choices
Runner: this root coordinator. B, D and A are concurrent, disjoint Luna xhigh writers in separate worktrees. Root owns contract, integration, Git, provider actions, tests, records and publication. After three failed Luna attempts use Terra, then Sol after two Terra failures. Native Sol high final controller review; independent Terra high public-data/security review for the new unauthenticated read surface. Reviews use sealed read-only source, no live data or credentials.

Baseline e15cb1ecf2d6f2141c0a604f66bc1aa5b418c8e2, clean. Use the project-lifecycle and finish-and-verify workflows. No new visual interview or dependencies. Existing Supabase cvuwdlmlukepwfffpgdu and Vercel mothers-love only. No unrelated table/function/Auth/ACL changes.

## Frozen interface
GET /api/display/snapshot retains DisplaySnapshot and optional after cursor, now public and no-store with noindex. A new additive runtime-only hardened SECURITY DEFINER function public.ml_public_display_snapshot(text) returns only explicitly projected published/unexpired display records, safe display settings, anonymous monthly aggregates, configured submission URL, cursor and eligible publication arrivals. Never return submittedName, moderation reason, device/session/member information or secret. Quiet/neutral return no recognitions or arrivals. Unhealthy cleanup fails unavailable. No database/session/device writes during public reads. Do not create a privileged or shared device token to bypass pairing.

Bounded technical default: at most 1000 display records, featured records first then newest publication; arrivals must reference returned eligible records and use a bounded validated cursor. Startup/reconnect reset quietly, no historical arrival replay. Keep the existing Recognition display shape for compatibility, with only public display metadata and status always published. Server projects/validates the snapshot again before response. Existing legacy pairing APIs stay secured and unused; no destructive removal of old device records.

D removes code UI and pair/ack calls, retries initial failure automatically, preserves safety clearing and all existing layouts/motion. Existing internal paired state may remain as a readiness flag to avoid unrelated coordinator changes. A replaces device pairing/status claims with a direct TV View link and truthful global-setting guidance. Do not imply individually tracked acknowledgement for public screens. Member management stays unchanged.

## Verification and release
Root builds and runs meaningful endpoint, synthetic SQL and display/admin tests. Prove direct fresh-browser access without cookies, no pair/ack calls, transient-startup recovery, global modes and expiry clearing, protected admin denial, allowlist and no device writes. Inspect synthetic TV screenshot and admin phone view, keyboard/axe. Guard additive migration with exact baseline function metadata and ledger pre/post checks; apply only after local SQL and public-data review. Deploy existing production project, verify alias/commit and immediate safe smoke. Positive data examples are intercepted, never inserted into production. Private Git push, synthetic Drive evidence, docs and cleanup complete the plan. Physical display readability is separately unverified.

## Build log
- User explicitly supersedes paired-only TV with direct public link. No repeated approval needed. Three Luna lanes own separate worktrees; root retains provider operations and shared records.

- Integrated admin lane 451b8f6 and direct startup lane 8295e32. Root corrected misleading offline-state wording via Luna follow-up a297275. A bounded snapshot timeout/retry fix is in D because client-api has no request deadline. Local PostgreSQL16.15 uses a private Unix socket, with cryptographic extension prerequisite and existing migrations001..005 loaded; no production data is present.

- Integrated public bridge d9f1467, SQL fixture correction 76ef088, bounded retry 0cbefad, deterministic retry fixture 671f08e and final offline copy 4020072. Local synthetic TV sizes 1280/1920/3840 and admin 390/1440 passed five visual/axe checks. Native Terra public-data review found aggregate revision zero was rejected for an empty month; Luna correction is underway. No production change before this correction and review retry.

- Native security retry found capped arrivals could skip events while advancing the cursor. After three backend correction rounds (fixture compatibility, empty aggregate, delta cap), user fallback moves this bounded SQL fix to Terra high in B2. Overflow above1000 eligible events will reset quietly with empty arrivals, consistent with reconnect behavior. No production change yet.

- Terra B2 correction009f34e integrated. Exact revised006 SQL and009 fixture passed locally, including1001eligible arrivals resetting quietly and next normal delta recovery. Independent public-data review round3 begins with a fresh sealed export.

- Security round3 passed; exact guarded006 applied successfully with unchanged existing-function fingerprint and healthy cleanup. Production009f34e is READY at the canonical alias. Anonymous actual endpoint and fresh-browser checks pass, along with80deployed synthetic journeys and5visual/axe views. Final native controller review, private backup and final board publication remain.

- Private synthetic Drive archive verified by provider metadata, owner-only visibility, ZIP CRC/member hashes and matching mounted SHA256. Full deployed verification passed; no real personal content was captured. Final native Sol high review uses the complete cumulative code and current records before private Git completion.

- Final native Sol round1 found revision rollback after permanent deletion. Initial direct-TV deployment was temporarily rolled back to prior release while Terra B3 adds immutable007 using the existing identity-sequence high-water mark and deletion/purge regressions. Root also requested the millisecond ordering validation correction.006 remains immutable and installed; no destructive rollback.

- Terra B3 corrections b2930e2 and dca01fa integrated. Exact007 SQL plus009and010rollback fixtures pass, proving permanent-delete and purge safety with stable sequence-backed revisions. The submillisecond ordering regression passes. Corrected-source independent Terra and native Sol reviews run in parallel before restoring direct access; root then verifies the actual deployment and updates closure receipts.

- Native Sol cumulative correction review passed through dca01fa. Independent public-data check requested a request-pressure guard. B4 e7b726e adds bounded per-instance read admission without caching personal content or writing to the database; focused tests, typecheck and lint pass. Final payload is re-exported rather than waiving the later change.

- B4 header fallback integrated separately as a0911ec after checking official Vercel header behavior. Final source is frozen for the parallel review gates. No dependency, credential, service, personal response cache or database write was introduced by request admission.

- Sol B5 runtime77d23b7 adds a transaction-scoped five-second statement timeout and request-abort checks. Real local PostgreSQL sleep terminates after5008ms, connection recovers, session configuration restores.101unit tests, typecheck, lint and production build pass. Independent Terra public-data review passed; guarded007 is applied and verified. Restoring direct access with final native Sol retry and immediate production checks.

- Integration review passed: native Sol high found no material issue, independent Terra public-data review passed. Restored production passed80fresh browser journeys plus6supplemental checks;101unit tests and actual anonymous readiness passed. Final private synthetic archive and mounted SHA256 verified. Task worktrees and disposable database cleaned; root closes source push and final status publication.

Implemented-by: Codex/Luna xhigh, Terra high, Sol high. Reviewed-by: native Sol high + independent Terra high.
