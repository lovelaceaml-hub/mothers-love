# Additive database release

Applied the reviewed transaction to the existing authorized Supabase project cvuwdlmlukepwfffpgdu. Migration005 SHA256 f15c40322e47774d7c164846f5366592890168394ee389a2157d856b59b3e32f. The provider returned success. The ledger hash matches, cleanup is healthy, restricted runtime can execute both new functions, anonymous/authenticated execution is denied and direct runtime table access is denied.

The existing public/auth function source, owner and ACL fingerprint remains a774f6f8cbcfb58cbd06bacee0ba51c3, excluding only the two new reaction functions. No existing application function, credential, Auth setting, schema exposure, or aggregate rule changed. Existing backup logic excludes every campaign table except settings and anonymous daily aggregates before row reads, so reaction rows remain excluded automatically.

Independent Terra review iteration3 verified all49 sealed files and the exact BEGIN/COMMIT release wrapper. It found no remaining material issue. Earlier findings were corrected with scoped cookies, request-bound DTOs, canonical origin and a Unix-socket-only synthetic runner. Root already prepared the transactional wrapper; its omission from an earlier review bundle was corrected in the final payload.

Local PostgreSQL17.6 fixture008 passed. Real concurrent runner passed duplicateCount1, opposingCount1, hidden NOT_FOUND, expiry-after-lock-wait NOT_FOUND, purge PURGED, concurrent setter NOT_FOUND and zero remaining purge rows.84 unit tests passed. All positive writes were isolated synthetic operations, no production recognition or reaction was created for verification.
