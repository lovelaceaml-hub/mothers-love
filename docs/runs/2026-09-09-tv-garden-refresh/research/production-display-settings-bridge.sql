-- Production application wrapper for database/009_display_settings_runtime_bridge.sql.
-- This is a narrow repair for the Display Studio writer only.

BEGIN;

DO $preflight$
BEGIN
  IF (SELECT count(*) FROM mothers_love.schema_migrations) <> 8
    OR NOT EXISTS (
      SELECT 1
      FROM mothers_love.schema_migrations
      WHERE version = '008_tv_garden_settings'
        AND sha256 = '0cf72b526fd6c61c11565b96b731dddf7d1d41784ad1bdff9c5951087386863e'
    ) THEN
    RAISE EXCEPTION 'Unexpected Mother''s Love migration ledger before Display Studio bridge repair';
  END IF;

  IF to_regprocedure('public.ml_display_settings_patch(jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'Display Studio runtime bridge already exists';
  END IF;

  IF has_schema_privilege('mothers_love_runtime', 'mothers_love', 'USAGE') THEN
    RAISE EXCEPTION 'Private Mother''s Love schema must remain unavailable to the runtime role';
  END IF;
END
$preflight$;

\ir ../../../../database/009_display_settings_runtime_bridge.sql

DO $postflight$
BEGIN
  IF to_regprocedure('public.ml_display_settings_patch(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Display Studio runtime bridge is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE oid = 'public.ml_display_settings_patch(jsonb)'::regprocedure
      AND prosecdef
      AND proconfig @> ARRAY['search_path=""']
  ) THEN
    RAISE EXCEPTION 'Display Studio runtime bridge security settings changed';
  END IF;

  IF NOT has_function_privilege('mothers_love_runtime', 'public.ml_display_settings_patch(jsonb)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.ml_display_settings_patch(jsonb)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.ml_display_settings_patch(jsonb)', 'EXECUTE')
    OR has_schema_privilege('mothers_love_runtime', 'mothers_love', 'USAGE') THEN
    RAISE EXCEPTION 'Unexpected Display Studio runtime bridge privilege';
  END IF;
END
$postflight$;

INSERT INTO mothers_love.schema_migrations(version, sha256)
VALUES ('009_display_settings_runtime_bridge', '13c65b2db703b63a7e52ebff4809ecd497874d96f17582ad0e465181bdf950b9');

COMMIT;
