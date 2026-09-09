# Local verification

Existing schema and exact 006 migration compiled on fresh PostgreSQL16.15 through a private Unix socket with no TCP listener. The rollback-only 009 fixture passed after replacing unsupported object-length helper calls with jsonb_object_keys counts. It verifies explicit public projection, eligibility, order/cap, cursor bounds/resets, quiet/neutral suppression, cleanup closure, hardened function metadata, denied anonymous/authenticated/service-role execution and no device/session row changes. Backend tests passed 52/52; root full unit tests passed 88/88, typecheck and lint passed. Final frontend build and browser checks follow the bounded timeout correction.

006 SQL SHA-256: 3f7aaa77e998ce1abe1395595f7605a7169bfa76c39e54a896b5d60df77536a8. Production uses the exact embedded migration inside BEGIN/COMMIT with five-entry ledger, cleanup and existing-function fingerprint guards, ACL postflight and the new ledger entry. No other live function or table is replaced. Public reads contain no device/session write.

The final revised006 and rollback fixture pass on the disposable PostgreSQL instance, including1001eligible arrivals producing a quiet reset and subsequent normal delta recovery. Current runtime passes89unit tests,80browser journeys and5synthetic visual checks, with3optional capture skips.
