# Lane RD: data activation readiness

## Scope and status

- Owner: data activation readiness lane
- Runtime: gpt-5.6-luna, xhigh
- Worktree: `/Users/anthony/Projects/mothers-love-worktrees/ready-data`
- Exclusive write: this lane record only
- Protected: provider state, credentials, schema, source, plan, contract, index, board, and all other lane records
- Status: READY for root-controlled activation after the root preflight already reported in this run

This audit was read-only. No provider call, SQL write, credential access, network access, schema change, real recognition read, or deployment was performed here.

## Findings

The existing settings operation is the correct activation boundary:

- `public.ml_api('admin_settings_patch', payload)` is the existing security-definer bridge used by `/api/admin/settings`.
- `mothers_love.ml_authorize` rechecks the active campaign membership and Owner role inside the function. Migration 003 keeps the function signature compatible and removes the campaign authenticator requirement, so the operator payload must use `aal2: false` rather than claim a factor that was not used.
- `admin_settings_patch` locks the singleton settings row, compares `expectedVersion`, rejects Owner changes from a Moderator, and checks `mothers_love.ml_purge_healthy(now_value)` before opening collection.
- A successful change updates only `collection_open` plus the existing `updated_at`, increments `settings.version` exactly once, and inserts the existing `display_events` row with `event_kind = 'settings'`. The current function does not create a separate `admin_audit` row for settings changes, so this record makes no claim that one exists.
- `config` and submission both continue to apply the same purge-health gate after activation. An unhealthy cleanup state therefore closes effective collection even if a later operator check sees the stored preference as open.

Root reported the current live preflight as healthy: settings version `1`, stored collection closed, normal mode, standard motion, both pauses off, exact campaign submission URL, cleanup healthy, overdue purge count `0`, one active cleanup schedule, one verified-password active Owner, zero active display sessions, all migration 003 ledger hashes matching, and the current backup exclusion verified before selecting only the retained settings and daily aggregate rows. Those facts are root-owned provider evidence and were not independently queried by this lane.

## Exact activation query

Run this as one standalone transaction from the root-authorized provider operator session against the authorized campaign database. It needs only the operator's existing metadata read access to `auth.users` and the existing bridge execution path. Do not run it with the deployed restricted runtime login, and do not grant that login any new read privilege. It selects exactly one active Owner whose Auth email is confirmed, keeps the identity in local variables, and returns no owner identifier. It calls the existing operation once. A missing, ambiguous, or unverified Owner, a stale version, an unhealthy purge state, or any unexpected response aborts the transaction.

```sql
BEGIN;
SET LOCAL statement_timeout = '10s';

DO $activate_collection$
DECLARE
  v_owner_count integer;
  v_owner_id uuid;
  v_owner_email text;
  v_expected_version bigint;
  v_result jsonb;
BEGIN
  SELECT count(*)::integer
    INTO v_owner_count
  FROM mothers_love.admin_memberships am
  JOIN auth.users au ON au.id = am.user_id
  WHERE am.role = 'owner'
    AND am.active
    AND au.email_confirmed_at IS NOT NULL;

  IF v_owner_count <> 1 THEN
    RAISE EXCEPTION USING MESSAGE = 'verified active Owner precondition failed';
  END IF;

  SELECT am.user_id, au.email
    INTO STRICT v_owner_id, v_owner_email
  FROM mothers_love.admin_memberships am
  JOIN auth.users au ON au.id = am.user_id
  WHERE am.role = 'owner'
    AND am.active
    AND au.email_confirmed_at IS NOT NULL;

  SELECT s.version
    INTO STRICT v_expected_version
  FROM mothers_love.settings s
  WHERE s.singleton_id = true;

  IF v_expected_version < 1 OR v_expected_version > 2147483646 THEN
    RAISE EXCEPTION USING MESSAGE = 'settings version is outside the operator range';
  END IF;

  v_result := public.ml_api(
    'admin_settings_patch',
    jsonb_build_object(
      'actor', jsonb_build_object(
        'userId', v_owner_id::text,
        'email', v_owner_email,
        'role', 'owner',
        'aal2', false
      ),
      'expectedVersion', v_expected_version,
      'changes', jsonb_build_object('collectionOpen', true)
    )
  );

  IF v_result->>'ok' IS DISTINCT FROM 'true'
     OR v_result->'settings'->>'collectionOpen' IS DISTINCT FROM 'true'
     OR v_result->'settings'->>'version' IS DISTINCT FROM (v_expected_version + 1)::text THEN
    RAISE EXCEPTION USING MESSAGE = 'collection activation was rejected';
  END IF;
END
$activate_collection$;

COMMIT;
```

The query does not create a token, invent an Auth factor, grant a role, update a table directly, change schema objects, or call a new function. The function itself remains the authority for role, version, and purge health.

## Immediate verification

Run this immediately after the transaction. It returns only the bridge result and effective collection state, with no identifiers or personal data:

```sql
WITH config_result AS (
  SELECT public.ml_api('config', '{}'::jsonb) AS result
)
SELECT (result->>'ok')::boolean AS bridge_ok,
       (result->>'collectionOpen')::boolean AS collection_open
FROM config_result;
```

The expected result is `bridge_ok = true` and `collection_open = true`. The existing function response from activation also verifies that the settings version advanced exactly once. If verification is not exactly that result, root should use the existing `admin_settings_patch` operation with the current settings version, the same internally selected verified active Owner, and only `changes = {"collectionOpen": false}`. That rollback does not need the purge-health precondition because closing collection is always allowed. It must still require the same Owner check and expected-version check, and it must fail closed on any unexpected response.

The following is the exact rollback form. Run it only when the immediate verification is not exactly the expected result or root otherwise needs to close collection. It emits no identity and rolls back through the same function, never through a direct table update:

```sql
BEGIN;
SET LOCAL statement_timeout = '10s';

DO $rollback_collection$
DECLARE
  v_owner_count integer;
  v_owner_id uuid;
  v_owner_email text;
  v_expected_version bigint;
  v_result jsonb;
BEGIN
  SELECT count(*)::integer
    INTO v_owner_count
  FROM mothers_love.admin_memberships am
  JOIN auth.users au ON au.id = am.user_id
  WHERE am.role = 'owner'
    AND am.active
    AND au.email_confirmed_at IS NOT NULL;

  IF v_owner_count <> 1 THEN
    RAISE EXCEPTION USING MESSAGE = 'verified active Owner precondition failed';
  END IF;

  SELECT am.user_id, au.email
    INTO STRICT v_owner_id, v_owner_email
  FROM mothers_love.admin_memberships am
  JOIN auth.users au ON au.id = am.user_id
  WHERE am.role = 'owner'
    AND am.active
    AND au.email_confirmed_at IS NOT NULL;

  SELECT s.version
    INTO STRICT v_expected_version
  FROM mothers_love.settings s
  WHERE s.singleton_id = true;

  IF v_expected_version < 1 OR v_expected_version > 2147483647 THEN
    RAISE EXCEPTION USING MESSAGE = 'settings version is outside the operator range';
  END IF;

  v_result := public.ml_api(
    'admin_settings_patch',
    jsonb_build_object(
      'actor', jsonb_build_object(
        'userId', v_owner_id::text,
        'email', v_owner_email,
        'role', 'owner',
        'aal2', false
      ),
      'expectedVersion', v_expected_version,
      'changes', jsonb_build_object('collectionOpen', false)
    )
  );

  IF v_result->>'ok' IS DISTINCT FROM 'true'
     OR v_result->'settings'->>'collectionOpen' IS DISTINCT FROM 'false'
     OR v_result->'settings'->>'version' IS DISTINCT FROM (v_expected_version + 1)::text THEN
    RAISE EXCEPTION USING MESSAGE = 'collection rollback was rejected';
  END IF;
END
$rollback_collection$;

COMMIT;
```

## Safety preconditions and limitations

- Root must confirm the current private backup exclusion, cleanup health, zero overdue purge count, exact campaign schema target, migration ledger, and restricted runtime boundary immediately before execution. This lane does not repeat provider access.
- The query is authorized operator work on behalf of the campaign Owner. It is not a browser sign-in test and does not claim that Anthony completed a real Owner login after the repair.
- Physical TV pairing, QR scanning, and participant usability remain separate owner-only checks. They are not fabricated by this data readiness result.
- If the root verification reports `PURGE_UNHEALTHY`, `STALE`, `OWNER_REQUIRED`, `FORBIDDEN`, `UNAUTHENTICATED`, or any other non-success result, collection remains closed and no retry should bypass the existing function.

## Verification performed in this lane

- Read the required absolute run index, project instructions, plan with Build log, and contract.
- Read `database/001_mothers_love.sql`, `database/002_unicode_edit_parity.sql`, and `database/003_password_only_admin.sql`.
- Read the settings route, server auth and database operation paths, backup review, hosting decision, handoff, and production evidence records.
- Confirmed by source inspection that the proposed call is the existing version-checked, Owner-only, purge-gated settings operation and that the current migration 003 policy supports `aal2: false`.

## Remaining owner-controlled action

Root may execute the exact transaction above after the live preflight, run the immediate `config` check, and keep or roll back through the same settings operation based on that result. No material data-path blocker was found.
