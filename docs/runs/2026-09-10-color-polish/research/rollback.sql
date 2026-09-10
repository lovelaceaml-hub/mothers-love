-- Color Polish rollback: version-checked disable of the presentation preset.
-- Same operator pattern as activation.sql. The TV falls back to the preserved V6
-- renderer on its next poll (five seconds). Legacy settings and display_config are untouched.

DO $rollback_color_polish$
DECLARE
  v_owner_count integer;
  v_owner_id uuid;
  v_settings_version bigint;
  v_revision bigint;
  v_result jsonb;
BEGIN
  SET LOCAL statement_timeout = '10s';

  SELECT count(*)::integer INTO v_owner_count
  FROM mothers_love.admin_memberships am
  JOIN auth.users au ON au.id = am.user_id
  WHERE am.role = 'owner' AND am.active
    AND au.email_confirmed_at IS NOT NULL AND COALESCE(au.encrypted_password, '') <> '';
  IF v_owner_count <> 1 THEN
    RAISE EXCEPTION USING MESSAGE = 'verified active Owner precondition failed';
  END IF;

  SELECT am.user_id INTO STRICT v_owner_id
  FROM mothers_love.admin_memberships am
  JOIN auth.users au ON au.id = am.user_id
  WHERE am.role = 'owner' AND am.active
    AND au.email_confirmed_at IS NOT NULL AND COALESCE(au.encrypted_password, '') <> '';

  SELECT s.version INTO STRICT v_settings_version FROM mothers_love.settings s WHERE s.singleton_id = true;
  SELECT p.revision INTO STRICT v_revision FROM mothers_love.color_polish_presentation p WHERE p.singleton_id = true;

  v_result := public.ml_color_polish_presentation_activate(
    jsonb_build_object(
      'actor', jsonb_build_object('userId', v_owner_id::text, 'role', 'owner', 'aal2', false),
      'version', 'color-polish-v6',
      'expectedSettingsVersion', v_settings_version::text,
      'expectedRevision', v_revision::text,
      'action', 'rollback'
    )
  );

  IF v_result->>'ok' IS DISTINCT FROM 'true' OR v_result->'presentation'->>'enabled' IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION USING MESSAGE = 'color polish rollback was rejected: ' || COALESCE(v_result->>'code', 'unknown');
  END IF;
END
$rollback_color_polish$;

SELECT s.version AS settings_version, p.enabled, p.revision
FROM mothers_love.settings s
CROSS JOIN mothers_love.color_polish_presentation p
WHERE s.singleton_id = true AND p.singleton_id = true;
