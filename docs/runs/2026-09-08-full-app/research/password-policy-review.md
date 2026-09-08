# Password-only campaign policy verification

## Authority
Anthony explicitly removed the authenticator requirement for everyone after the real Owner setup attempt. Individual confirmed email/password, verified token subject, fresh active membership, role restrictions and last-Owner protection remain. This change concerns only the campaign. No shared Auth MFA setting or another application was changed.

## Implementation and scope
Migration 003 SHA-256 123fc86f0e10eff3ff5a467c6b496453fa9c74189c15142a0b508c7541c9da04 replaces one exact AAL2 guard in mothers_love.ml_authorize and one needsMfa expression in public.ml_api. The compatibility argument remains but has no effect. HTTP auth retains getUser, email confirmation, verified getClaims subject and current membership; session DTO needsMfa is false. Invitation retries preserve expiry and use the dedicated password setup callback.

## Evidence
Controller compiled 003 in disposable PostgreSQL and ran security fixture004 plus password-only fixture006 successfully with rollback. Fixture006 proves valid AAL1 Owner reads, settings write and permanent delete; Moderator attempts are denied with a real record and current versions, preserving the row; nonmembers, revoked memberships and malformed actors remain denied. Earlier fixture setup errors used missing records or stale versions and were corrected without changing production authorization.

Independent Terra static review returned PASS after verifying all39 sealed file hashes. It found no material scope, token, membership, privilege or role-isolation regression. No provider or real-data access was used by that reviewer.

Root applied exactly003 transactionally to the authorized shared target, verified the two full function definitions changed exactly as intended, and recorded the migration hash in the private ledger. Function owners and ACLs are identical; all unrelated public/Auth function metadata hashes remained unchanged. Runtime bridge access remains allowed only to the restricted role, denied to anon/authenticated. Existing001/002 hashes remain immutable.

The dedicated https://mothers-love.vercel.app/admin/set-password callback was appended to the Auth redirect list. Only uri_allow_list changed; all other Auth configuration was verified unchanged. Actual Owner metadata confirms password saved, email verified and prior sign-in; no verified authenticator factor exists. No account password or factor was changed by an agent.

Implemented-by: Codex/gpt-5.6-luna xhigh. Reviewed-by: Codex controller and independent gpt-5.6-terra high.
