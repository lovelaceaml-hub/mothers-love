BEGIN;
SET LOCAL statement_timeout = '10s';

DO $activate_collection$
DECLARE
  v_owner_count integer;
  v_owner_id uuid;
  v_owner_email text;
  v_expected_version bigint;
  v_result jsonb;
  v_before jsonb;
  v_after jsonb;
BEGIN
  SELECT count(*)::integer
    INTO v_owner_count
  FROM mothers_love.admin_memberships am
  JOIN auth.users au ON au.id = am.user_id
  WHERE am.role = 'owner'
    AND am.active
    AND au.email_confirmed_at IS NOT NULL
    AND COALESCE(au.encrypted_password, '') <> '';

  IF v_owner_count <> 1 THEN
    RAISE EXCEPTION USING MESSAGE = 'verified active Owner precondition failed';
  END IF;

  SELECT am.user_id, au.email
    INTO STRICT v_owner_id, v_owner_email
  FROM mothers_love.admin_memberships am
  JOIN auth.users au ON au.id = am.user_id
  WHERE am.role = 'owner'
    AND am.active
    AND au.email_confirmed_at IS NOT NULL
    AND COALESCE(au.encrypted_password, '') <> '';

  SELECT s.version, to_jsonb(s)
    INTO STRICT v_expected_version, v_before
  FROM mothers_love.settings s
  WHERE s.singleton_id = true;

  IF v_expected_version <> 1 OR (v_before->>'collection_open')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION USING MESSAGE = 'settings changed since readiness preflight';
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
  SELECT to_jsonb(s) INTO STRICT v_after FROM mothers_love.settings s WHERE s.singleton_id=true;
  IF (v_before - ARRAY['collection_open','version','updated_at','last_cleanup_at','overdue_purge_count']) IS DISTINCT FROM (v_after - ARRAY['collection_open','version','updated_at','last_cleanup_at','overdue_purge_count']) THEN
    RAISE EXCEPTION USING MESSAGE = 'unrelated campaign settings changed';
  END IF;
END
$activate_collection$;

COMMIT;
SELECT version, collection_open, mothers_love.ml_purge_healthy(now()) AS cleanup_healthy FROM mothers_love.settings WHERE singleton_id=true;
