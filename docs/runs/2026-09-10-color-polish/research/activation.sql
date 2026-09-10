-- Color Polish activation on the verified Owner's behalf.
-- Adapted from docs/runs/2026-09-08-full-app/research/activation.sql (the reviewed
-- collection activation pattern). Runs as an operator action through the project's
-- privileged SQL path; returns no identity, no recognition text, no credential.
-- Preconditions: exactly one verified active Owner, settings version 5, preset disabled,
-- preset version color-polish-v6, valid playlist, healthy cleanup.

DO $activate_color_polish$
DECLARE
  v_owner_count integer;
  v_owner_id uuid;
  v_settings_version bigint;
  v_revision bigint;
  v_enabled boolean;
  v_preset_version text;
  v_playlist_valid boolean;
  v_result jsonb;
  v_before jsonb;
  v_after jsonb;
BEGIN
  SET LOCAL statement_timeout = '10s';

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

  SELECT am.user_id
    INTO STRICT v_owner_id
  FROM mothers_love.admin_memberships am
  JOIN auth.users au ON au.id = am.user_id
  WHERE am.role = 'owner'
    AND am.active
    AND au.email_confirmed_at IS NOT NULL
    AND COALESCE(au.encrypted_password, '') <> '';

  SELECT s.version, to_jsonb(s)
    INTO STRICT v_settings_version, v_before
  FROM mothers_love.settings s
  WHERE s.singleton_id = true;

  SELECT p.revision, p.enabled, p.version, mothers_love.ml_color_polish_valid_playlist(p.playlist)
    INTO STRICT v_revision, v_enabled, v_preset_version, v_playlist_valid
  FROM mothers_love.color_polish_presentation p
  WHERE p.singleton_id = true;

  IF v_settings_version <> 5 THEN
    RAISE EXCEPTION USING MESSAGE = 'settings changed since release preflight';
  END IF;
  IF v_enabled OR v_preset_version IS DISTINCT FROM 'color-polish-v6' OR NOT v_playlist_valid THEN
    RAISE EXCEPTION USING MESSAGE = 'presentation preset precondition failed';
  END IF;
  IF NOT mothers_love.ml_purge_healthy(clock_timestamp()) THEN
    RAISE EXCEPTION USING MESSAGE = 'cleanup is unavailable';
  END IF;

  v_result := public.ml_color_polish_presentation_activate(
    jsonb_build_object(
      'actor', jsonb_build_object(
        'userId', v_owner_id::text,
        'role', 'owner',
        'aal2', false
      ),
      'version', 'color-polish-v6',
      'expectedSettingsVersion', v_settings_version::text,
      'expectedRevision', v_revision::text,
      'action', 'activate'
    )
  );

  IF v_result->>'ok' IS DISTINCT FROM 'true'
     OR v_result->>'action' IS DISTINCT FROM 'activate'
     OR v_result->'presentation'->>'enabled' IS DISTINCT FROM 'true'
     OR v_result->>'settingsVersion' IS DISTINCT FROM (v_settings_version + 1)::text
     OR v_result->>'revision' IS DISTINCT FROM (v_revision + 1)::text THEN
    RAISE EXCEPTION USING MESSAGE = 'color polish activation was rejected: ' || COALESCE(v_result->>'code', 'unknown');
  END IF;

  SELECT to_jsonb(s) INTO STRICT v_after FROM mothers_love.settings s WHERE s.singleton_id = true;
  IF (v_before - ARRAY['version','updated_at','last_cleanup_at','overdue_purge_count'])
     IS DISTINCT FROM (v_after - ARRAY['version','updated_at','last_cleanup_at','overdue_purge_count']) THEN
    RAISE EXCEPTION USING MESSAGE = 'unrelated campaign settings changed';
  END IF;
END
$activate_color_polish$;

SELECT s.version AS settings_version, p.enabled, p.revision, p.version AS preset_version,
       mothers_love.ml_purge_healthy(clock_timestamp()) AS cleanup_healthy
FROM mothers_love.settings s
CROSS JOIN mothers_love.color_polish_presentation p
WHERE s.singleton_id = true AND p.singleton_id = true;
