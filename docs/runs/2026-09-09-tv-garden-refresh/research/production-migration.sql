-- Production application wrapper for database/008_tv_garden_settings.sql.
-- It imports the exact reviewed source by a psql-relative path and records the
-- source SHA-256 in the campaign migration ledger inside the same transaction.

BEGIN;

DO $preflight$
DECLARE
  fingerprint text;
BEGIN
  IF (SELECT count(*) FROM mothers_love.schema_migrations) <> 7
    OR NOT EXISTS (SELECT 1 FROM mothers_love.schema_migrations WHERE version = '001_mothers_love' AND sha256 = 'f213b423a4e36ec45d1958b7a1c93a282debd1d84cd6d761d3dcaa95fd753a10')
    OR NOT EXISTS (SELECT 1 FROM mothers_love.schema_migrations WHERE version = '002_unicode_edit_parity' AND sha256 = '069ab377c570e57e794ab3f1e765ac16a83d76a347e542f917a4b0e66ecd43b4')
    OR NOT EXISTS (SELECT 1 FROM mothers_love.schema_migrations WHERE version = '003_password_only_admin' AND sha256 = '123fc86f0e10eff3ff5a467c6b496453fa9c74189c15142a0b508c7541c9da04')
    OR NOT EXISTS (SELECT 1 FROM mothers_love.schema_migrations WHERE version = '004_public_feed' AND sha256 = '78611aa702933206dc3b2ba2295dd6e9f0a07dc198515b9f094df6c463089510')
    OR NOT EXISTS (SELECT 1 FROM mothers_love.schema_migrations WHERE version = '005_recognition_reactions' AND sha256 = 'f15c40322e47774d7c164846f5366592890168394ee389a2157d856b59b3e32f')
    OR NOT EXISTS (SELECT 1 FROM mothers_love.schema_migrations WHERE version = '006_public_display' AND sha256 = '3f7aaa77e998ce1abe1395595f7605a7169bfa76c39e54a896b5d60df77536a8')
    OR NOT EXISTS (SELECT 1 FROM mothers_love.schema_migrations WHERE version = '007_public_display_revision' AND sha256 = '2963a4fa0f19793d94196296358e4667482080160d410ec3c60871c33821ef4f')
  THEN
    RAISE EXCEPTION 'Campaign migration precondition changed';
  END IF;
  IF to_regprocedure('mothers_love.ml_patch_display_settings(jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'TV settings writer already exists';
  END IF;
  IF to_regprocedure('public.ml_public_display_snapshot(text)') IS NULL
    OR md5(pg_get_functiondef('public.ml_public_display_snapshot(text)'::regprocedure)) IS DISTINCT FROM 'b2a114e7c0ef1727240fa0cd3917ca43'
  THEN
    RAISE EXCEPTION 'Public display bridge precondition changed';
  END IF;
  IF NOT mothers_love.ml_purge_healthy(clock_timestamp()) THEN
    RAISE EXCEPTION 'Cleanup is unavailable';
  END IF;
  SELECT md5(string_agg(
    n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || '):' || md5(pg_get_functiondef(p.oid)) || ':' || p.proowner::text || ':' || coalesce(p.proacl::text, ''),
    E'\n' ORDER BY n.nspname, p.proname, p.oid
  ))
  INTO fingerprint
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'auth')
    AND p.prokind = 'f'
    AND p.oid <> 'public.ml_public_display_snapshot(text)'::regprocedure;
  IF fingerprint IS DISTINCT FROM 'ad8fb6516459dddda4c3221cf85fbe64' THEN
    RAISE EXCEPTION 'Existing public and auth function fingerprint changed';
  END IF;
END
$preflight$;

\ir ../../../../database/008_tv_garden_settings.sql

DO $postflight$
DECLARE
  fingerprint text;
  role_name text;
  settings_value jsonb;
BEGIN
  SELECT mothers_love.ml_settings_json() INTO settings_value;
  IF settings_value->'externalUrls' <> jsonb_build_object(
    'dailyPractice', 'https://heavenlymotherslove.org/en/checklist',
    'peacePromise', 'https://heavenlymotherslove.org/en/signature'
  )
    OR settings_value->'gardenAmount' IS NULL
    OR settings_value->'playlist' IS NULL
    OR settings_value->'effects' IS NULL
    OR settings_value->'sound' IS NULL
  THEN
    RAISE EXCEPTION 'TV display settings projection is incomplete';
  END IF;
  IF NOT has_function_privilege('mothers_love_runtime', 'mothers_love.ml_patch_display_settings(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TV settings runtime execution missing';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF has_function_privilege(role_name, 'mothers_love.ml_patch_display_settings(jsonb)', 'EXECUTE') THEN
      RAISE EXCEPTION 'Unexpected TV settings writer privilege';
    END IF;
  END LOOP;
  SELECT md5(string_agg(
    n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || '):' || md5(pg_get_functiondef(p.oid)) || ':' || p.proowner::text || ':' || coalesce(p.proacl::text, ''),
    E'\n' ORDER BY n.nspname, p.proname, p.oid
  ))
  INTO fingerprint
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'auth')
    AND p.prokind = 'f'
    AND p.oid <> 'public.ml_public_display_snapshot(text)'::regprocedure;
  IF fingerprint IS DISTINCT FROM 'ad8fb6516459dddda4c3221cf85fbe64' THEN
    RAISE EXCEPTION 'Existing public and auth function fingerprint changed';
  END IF;
  INSERT INTO mothers_love.schema_migrations(version, sha256)
  VALUES ('008_tv_garden_settings', '0cf72b526fd6c61c11565b96b731dddf7d1d41784ad1bdff9c5951087386863e');
END
$postflight$;

COMMIT;
