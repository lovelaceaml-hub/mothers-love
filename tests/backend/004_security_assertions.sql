-- Security and retry fixture for an authorized isolated database.
-- Synthetic rows are rolled back. Run only after database/001_mothers_love.sql
-- in a disposable PostgreSQL database, never against Supabase production.
BEGIN;

DO $privileges$
DECLARE
  role_name text;
  table_name text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'mothers_love'
      AND c.relkind = 'r'
      AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)
  ) THEN
    RAISE EXCEPTION 'campaign table is missing forced RLS';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_schema_privilege(role_name, 'mothers_love', 'USAGE') IS DISTINCT FROM false THEN
      RAISE EXCEPTION '% can use campaign schema', role_name;
    END IF;
    FOREACH table_name IN ARRAY ARRAY['settings', 'recognitions', 'daily_aggregates', 'devices', 'admin_memberships'] LOOP
      IF has_table_privilege(role_name, format('mothers_love.%s', table_name), 'SELECT') IS DISTINCT FROM false THEN
        RAISE EXCEPTION '% can read campaign table %', role_name, table_name;
      END IF;
    END LOOP;
    IF has_function_privilege(role_name, 'public.ml_api(text,jsonb)', 'EXECUTE') IS DISTINCT FROM false THEN
      RAISE EXCEPTION '% can execute ml_api', role_name;
    END IF;
    IF has_function_privilege(role_name, 'public.ml_purge()', 'EXECUTE') IS DISTINCT FROM false THEN
      RAISE EXCEPTION '% can execute ml_purge', role_name;
    END IF;
  END LOOP;

  IF has_schema_privilege('mothers_love_runtime', 'mothers_love', 'USAGE') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'runtime role has direct campaign schema usage';
  END IF;
  IF has_table_privilege('mothers_love_runtime', 'mothers_love.recognitions', 'SELECT') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'runtime role has direct table access';
  END IF;
  IF has_function_privilege('mothers_love_runtime', 'public.ml_api(text,jsonb)', 'EXECUTE') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'runtime role cannot execute ml_api';
  END IF;
  IF has_function_privilege('mothers_love_runtime', 'public.ml_purge()', 'EXECUTE') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'runtime role cannot execute ml_purge';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND has_function_privilege('mothers_love_runtime', p.oid, 'EXECUTE')
      AND p.proname NOT IN ('ml_api', 'ml_purge')
  ) THEN
    RAISE EXCEPTION 'runtime role has an unapproved public function grant';
  END IF;
END
$privileges$;

INSERT INTO mothers_love.admin_memberships (user_id, role, active)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'owner', true),
  ('00000000-0000-4000-8000-000000000102', 'moderator', true),
  ('00000000-0000-4000-8000-000000000103', 'moderator', false)
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, active = EXCLUDED.active;
SELECT public.ml_purge();
UPDATE mothers_love.settings SET collection_open = true;

DO $authorization$
DECLARE
  owner_aal2 jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000101', 'email', 'owner-security@example.test', 'aal2', true);
  owner_aal1 jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000101', 'email', 'owner-security@example.test', 'aal2', false);
  moderator jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000102', 'email', 'moderator-security@example.test', 'aal2', false);
  revoked jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000103', 'email', 'revoked-security@example.test', 'aal2', true);
  outsider jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000104', 'email', 'outsider-security@example.test', 'aal2', true);
  result jsonb;
  action_name text;
  recognition_id uuid;
BEGIN
  result := public.ml_api('admin_session', jsonb_build_object('actor', owner_aal1));
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'needsMfa' IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'Owner AAL1 session was not accepted without MFA: %', result;
  END IF;

  FOREACH action_name IN ARRAY ARRAY['admin_overview', 'admin_list', 'admin_settings_get', 'admin_devices_list', 'admin_members_list', 'admin_report'] LOOP
    result := public.ml_api(action_name, jsonb_build_object(
      'actor', owner_aal1,
      'page', 0,
      'pageSize', 50,
      'from', '2026-09-01',
      'to', '2026-09-30',
      'expectedVersion', 1,
      'changes', jsonb_build_object('mode', 'quiet'),
      'id', '00000000-0000-4000-8000-000000000999',
      'active', false,
      'mutation', 'delete',
      'label', 'Security Fixture',
      'codeHash', mothers_love.ml_hash('security-code')
    ));
    IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'code' IS NOT NULL THEN
      RAISE EXCEPTION 'Owner AAL1 action % was not accepted: %', action_name, result;
    END IF;
  END LOOP;

  result := public.ml_api('admin_session', jsonb_build_object('actor', outsider));
  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN RAISE EXCEPTION 'nonmember session was accepted: %', result; END IF;
  result := public.ml_api('admin_session', jsonb_build_object('actor', revoked));
  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN RAISE EXCEPTION 'revoked member session was accepted: %', result; END IF;
  result := public.ml_api('admin_list', jsonb_build_object('actor', revoked, 'page', 0, 'pageSize', 50));
  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN RAISE EXCEPTION 'revoked member admin call was accepted: %', result; END IF;

  result := public.ml_api('submit', jsonb_build_object('submittedName', 'Security Sender', 'recipient', 'Security Recipient', 'message', 'Synthetic security fixture.', 'expressionIds', jsonb_build_array(2), 'requestKey', 'security-delete-0001', 'payloadHash', 'security-delete-hash', 'hold', false, 'rateIp', 'security-auth-ip', 'rateContext', 'security-auth-context'));
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'status' IS DISTINCT FROM 'published' THEN RAISE EXCEPTION 'security submit failed: %', result; END IF;
  recognition_id := (result->>'id')::uuid;

  result := public.ml_api('admin_settings_patch', jsonb_build_object('actor', moderator, 'expectedVersion', 1, 'changes', jsonb_build_object('collectionOpen', false)));
  IF result->>'code' IS DISTINCT FROM 'OWNER_REQUIRED' THEN RAISE EXCEPTION 'moderator changed collection setting: %', result; END IF;
  result := public.ml_api('member_invite_pending', jsonb_build_object('actor', moderator, 'email', 'new-security@example.test'));
  IF result->>'code' IS DISTINCT FROM 'OWNER_REQUIRED' THEN RAISE EXCEPTION 'moderator changed account membership: %', result; END IF;
  result := public.ml_api('admin_device_create', jsonb_build_object('actor', moderator, 'label', 'Security Fixture', 'codeHash', mothers_love.ml_hash('security-code')));
  IF result->>'code' IS DISTINCT FROM 'OWNER_REQUIRED' THEN RAISE EXCEPTION 'moderator created a display pairing device: %', result; END IF;
  result := public.ml_api('admin_mutate', jsonb_build_object('actor', moderator, 'id', recognition_id::text, 'expectedVersion', 1, 'mutation', 'delete'));
  IF result->>'code' IS DISTINCT FROM 'OWNER_REQUIRED' THEN RAISE EXCEPTION 'moderator deleted a recognition: %', result; END IF;

  INSERT INTO mothers_love.recognitions (submitted_name, recipient, message, status, created_at, expires_at)
  VALUES ('Synthetic Overdue Sender', 'Synthetic Overdue Recipient', 'Synthetic overdue fixture.', 'held', now() - interval '4 minutes', now() - interval '3 minutes');
  result := public.ml_api('config', '{}'::jsonb);
  IF result->>'collectionOpen' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'unhealthy purge left config open: %', result; END IF;
  result := public.ml_api('submit', jsonb_build_object('submittedName', 'Synthetic Blocked Sender', 'recipient', 'Synthetic Blocked Recipient', 'message', 'Synthetic blocked submit.', 'expressionIds', jsonb_build_array(1), 'requestKey', 'security-health-0001', 'payloadHash', 'security-health-hash', 'hold', false, 'rateIp', 'security-health-ip', 'rateContext', 'security-health-context'));
  IF result->>'code' IS DISTINCT FROM 'UNAVAILABLE' THEN RAISE EXCEPTION 'unhealthy purge allowed submit: %', result; END IF;
  UPDATE mothers_love.settings SET collection_open = false;
  result := public.ml_api('admin_settings_patch', jsonb_build_object('actor', owner_aal2, 'expectedVersion', 1, 'changes', jsonb_build_object('collectionOpen', true)));
  IF result->>'code' IS DISTINCT FROM 'PURGE_UNHEALTHY' THEN RAISE EXCEPTION 'unhealthy purge allowed collection enable: %', result; END IF;
  result := public.ml_api('admin_overview', jsonb_build_object('actor', owner_aal2));
  IF result->>'overduePurgeCount' IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'overdue purge health was not reported: %', result; END IF;
  PERFORM mothers_love.purge_expired();
  result := public.ml_api('admin_settings_patch', jsonb_build_object('actor', owner_aal2, 'expectedVersion', 1, 'changes', jsonb_build_object('collectionOpen', true)));
  IF result->'settings'->>'collectionOpen' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'healthy purge did not allow collection enable: %', result; END IF;
END
$authorization$;

DO $pairing_and_retry$
DECLARE
  owner_actor jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000101', 'email', 'owner-security@example.test', 'aal2', true);
  result jsonb;
  device_id uuid;
  held_id uuid;
  retry_result jsonb;
BEGIN
  INSERT INTO mothers_love.devices (label, pairing_code_hash, pairing_code_expires_at)
  VALUES ('Security Pairing Fixture', mothers_love.ml_hash('ABCDEFGH'), now() + interval '10 minutes')
  RETURNING id INTO device_id;

  result := public.ml_api('display_pair', jsonb_build_object('code', 'ABCDEFGH', 'tokenHash', 'security-token-one', 'rateIp', 'security-pair-ip', 'rateContext', 'security-pair-context'));
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'paired' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'first pairing failed: %', result; END IF;
  IF NOT EXISTS (SELECT 1 FROM mothers_love.devices d WHERE d.id = device_id AND d.pairing_code_hash IS NULL AND d.paired_at IS NOT NULL) THEN RAISE EXCEPTION 'pairing code was not consumed'; END IF;
  result := public.ml_api('display_pair', jsonb_build_object('code', 'ABCDEFGH', 'tokenHash', 'security-token-two', 'rateIp', 'security-pair-ip-two', 'rateContext', 'security-pair-context-two'));
  IF result->>'code' IS DISTINCT FROM 'INVALID_PAIRING' THEN RAISE EXCEPTION 'pairing code was reusable: %', result; END IF;
  result := public.ml_api('display_snapshot', jsonb_build_object('tokenHash', 'security-token-one'));
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'sync' IS DISTINCT FROM 'reset' THEN RAISE EXCEPTION 'paired snapshot failed: %', result; END IF;
  result := public.ml_api('admin_device_revoke', jsonb_build_object('actor', owner_actor, 'id', device_id::text));
  IF result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'device revoke failed: %', result; END IF;
  result := public.ml_api('display_snapshot', jsonb_build_object('tokenHash', 'security-token-one'));
  IF result->>'code' IS DISTINCT FROM 'UNAUTHENTICATED' THEN RAISE EXCEPTION 'revoked snapshot was accepted: %', result; END IF;
  result := public.ml_api('display_ack', jsonb_build_object('tokenHash', 'security-token-one', 'settingsVersion', 1, 'snapshotRevision', 1));
  IF result->>'code' IS DISTINCT FROM 'UNAUTHENTICATED' THEN RAISE EXCEPTION 'revoked ack was accepted: %', result; END IF;

  result := public.ml_api('submit', jsonb_build_object('submittedName', 'Security Held Sender', 'recipient', 'Security Held Recipient', 'message', 'Synthetic idempotency fixture.', 'expressionIds', jsonb_build_array(4), 'requestKey', 'security-retry-0001', 'payloadHash', 'security-retry-hash-a', 'hold', true, 'rateIp', 'security-retry-ip', 'rateContext', 'security-retry-context'));
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'status' IS DISTINCT FROM 'held' THEN RAISE EXCEPTION 'held retry setup failed: %', result; END IF;
  held_id := (result->>'id')::uuid;
  result := public.ml_api('admin_mutate', jsonb_build_object('actor', owner_actor, 'id', held_id::text, 'expectedVersion', 1, 'mutation', 'publish'));
  IF result->'recognition'->>'status' IS DISTINCT FROM 'published' THEN RAISE EXCEPTION 'held retry setup publication failed: %', result; END IF;
  retry_result := public.ml_api('submit', jsonb_build_object('submittedName', 'Security Held Sender', 'recipient', 'Security Held Recipient', 'message', 'Synthetic idempotency fixture.', 'expressionIds', jsonb_build_array(4), 'requestKey', 'security-retry-0001', 'payloadHash', 'security-retry-hash-a', 'hold', true, 'rateIp', 'security-retry-ip', 'rateContext', 'security-retry-context'));
  IF retry_result->>'ok' IS DISTINCT FROM 'true' OR retry_result->>'id' IS DISTINCT FROM held_id::text OR retry_result->>'status' IS DISTINCT FROM 'held' THEN RAISE EXCEPTION 'retry did not preserve original receipt: %', retry_result; END IF;
  result := public.ml_api('submit', jsonb_build_object('submittedName', 'Security Held Sender', 'recipient', 'Security Held Recipient', 'message', 'Synthetic idempotency fixture.', 'expressionIds', jsonb_build_array(4), 'requestKey', 'security-retry-0001', 'payloadHash', 'security-retry-hash-b', 'hold', true, 'rateIp', 'security-retry-ip', 'rateContext', 'security-retry-context'));
  IF result->>'code' IS DISTINCT FROM 'IDEMPOTENCY_CONFLICT' THEN RAISE EXCEPTION 'mismatched retry was accepted: %', result; END IF;
END
$pairing_and_retry$;

ROLLBACK;
