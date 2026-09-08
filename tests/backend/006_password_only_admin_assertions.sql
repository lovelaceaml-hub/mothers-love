-- Password-only campaign admin fixture.
-- Synthetic rows are rolled back. Run after database/001_mothers_love.sql and
-- database/003_password_only_admin.sql in a disposable PostgreSQL database.
BEGIN;

INSERT INTO mothers_love.admin_memberships (user_id, role, active)
VALUES
  ('00000000-0000-4000-8000-000000000601', 'owner', true),
  ('00000000-0000-4000-8000-000000000602', 'moderator', true),
  ('00000000-0000-4000-8000-000000000603', 'moderator', false)
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, active = EXCLUDED.active;
SELECT public.ml_purge();
UPDATE mothers_love.settings SET collection_open = true;

DO $password_only_fixture$
DECLARE
  owner_aal1 jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000601', 'email', 'owner-password@example.test', 'aal2', false);
  moderator_aal1 jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000602', 'email', 'moderator-password@example.test', 'aal2', false);
  revoked jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000603', 'email', 'revoked-password@example.test', 'aal2', false);
  outsider jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000604', 'email', 'outsider-password@example.test', 'aal2', false);
  malformed jsonb := jsonb_build_object('userId', 'not-a-uuid', 'email', 'invalid-password@example.test', 'aal2', false);
  result jsonb;
  action_name text;
  recognition_id uuid;
  settings_version integer := 1;
BEGIN
  result := public.ml_api('admin_session', jsonb_build_object('actor', owner_aal1));
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'needsMfa' IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'AAL1 owner session was not accepted without MFA: %', result;
  END IF;

  FOREACH action_name IN ARRAY ARRAY['admin_overview', 'admin_list', 'admin_settings_get', 'admin_devices_list', 'admin_members_list', 'admin_report'] LOOP
    result := public.ml_api(action_name, jsonb_build_object(
      'actor', owner_aal1,
      'page', 0,
      'pageSize', 50,
      'from', '2026-09-01',
      'to', '2026-09-30'
    ));
    IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'code' IS NOT NULL THEN
      RAISE EXCEPTION 'AAL1 owner allowed action % failed: %', action_name, result;
    END IF;
  END LOOP;

  result := public.ml_api('admin_settings_patch', jsonb_build_object(
    'actor', owner_aal1,
    'expectedVersion', 1,
    'changes', jsonb_build_object('mode', 'quiet')
  ));
  IF result->>'ok' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'AAL1 owner write was rejected: %', result;
  END IF;
  settings_version := (result->'settings'->>'version')::integer;
  IF settings_version IS NULL THEN
    RAISE EXCEPTION 'AAL1 owner write did not return a settings version: %', result;
  END IF;

  result := public.ml_api('submit', jsonb_build_object(
    'submittedName', 'Password Fixture Sender',
    'recipient', 'Password Fixture Recipient',
    'message', 'Synthetic password-only authorization fixture.',
    'expressionIds', jsonb_build_array(2),
    'requestKey', 'password-only-0001',
    'payloadHash', 'password-only-hash-0001',
    'hold', false,
    'rateIp', 'password-only-ip',
    'rateContext', 'password-only-context'
  ));
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'status' IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'synthetic recognition setup failed: %', result;
  END IF;
  recognition_id := (result->>'id')::uuid;

  FOREACH action_name IN ARRAY ARRAY['member_invite_pending', 'admin_members_list', 'admin_settings_patch', 'admin_device_create', 'admin_device_revoke', 'admin_member_patch', 'admin_mutate'] LOOP
    result := public.ml_api(action_name, jsonb_build_object(
      'actor', moderator_aal1,
      'email', 'new-password@example.test',
      'expectedVersion', CASE WHEN action_name = 'admin_settings_patch' THEN settings_version ELSE 1 END,
      'changes', jsonb_build_object('collectionOpen', false),
      'label', 'Password Fixture',
      'codeHash', mothers_love.ml_hash('password-fixture-code'),
      'id', CASE WHEN action_name = 'admin_mutate' THEN recognition_id::text ELSE '00000000-0000-4000-8000-000000000699' END,
      'active', false,
      'mutation', 'delete'
    ));
    IF result->>'code' IS DISTINCT FROM 'OWNER_REQUIRED' THEN
      RAISE EXCEPTION 'moderator gained Owner-only action %: %', action_name, result;
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM mothers_love.recognitions r WHERE r.id = recognition_id) THEN
    RAISE EXCEPTION 'moderator delete attempt removed the recognition';
  END IF;
  result := public.ml_api('admin_mutate', jsonb_build_object(
    'actor', owner_aal1,
    'id', recognition_id::text,
    'expectedVersion', 1,
    'mutation', 'delete'
  ));
  IF result->>'ok' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'AAL1 owner delete was rejected: %', result;
  END IF;
  IF EXISTS (SELECT 1 FROM mothers_love.recognitions r WHERE r.id = recognition_id) THEN
    RAISE EXCEPTION 'AAL1 owner delete did not remove the recognition';
  END IF;

  result := public.ml_api('admin_session', jsonb_build_object('actor', outsider));
  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN
    RAISE EXCEPTION 'nonmember session was accepted: %', result;
  END IF;
  result := public.ml_api('admin_session', jsonb_build_object('actor', revoked));
  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN
    RAISE EXCEPTION 'revoked membership session was accepted: %', result;
  END IF;
  result := public.ml_api('admin_session', jsonb_build_object('actor', malformed));
  IF result->>'code' IS DISTINCT FROM 'UNAUTHENTICATED' THEN
    RAISE EXCEPTION 'malformed token actor was accepted: %', result;
  END IF;
END
$password_only_fixture$;

ROLLBACK;
