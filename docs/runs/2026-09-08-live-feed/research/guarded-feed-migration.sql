DO $preflight$
DECLARE fingerprint text;
BEGIN
 SELECT md5(string_agg(n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||'):'||md5(pg_get_functiondef(p.oid))||':'||p.proowner::text||':'||coalesce(p.proacl::text,''), E'\n' ORDER BY n.nspname,p.proname,p.oid)) INTO fingerprint FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth') AND p.prokind='f' AND p.oid <> coalesce(to_regprocedure('public.ml_public_feed()'),0);
 IF fingerprint <> '06e31c44807a74873ba6908558fd7796' THEN RAISE EXCEPTION 'Protected function metadata changed'; END IF;
 IF to_regprocedure('public.ml_public_feed()') IS NOT NULL OR EXISTS(SELECT 1 FROM mothers_love.schema_migrations WHERE version='004_public_feed') THEN RAISE EXCEPTION 'Feed migration already present'; END IF;
 IF NOT mothers_love.ml_purge_healthy(clock_timestamp()) THEN RAISE EXCEPTION 'Campaign cleanup unavailable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM mothers_love.schema_migrations WHERE version='001_mothers_love' AND sha256='f213b423a4e36ec45d1958b7a1c93a282debd1d84cd6d761d3dcaa95fd753a10') THEN RAISE EXCEPTION 'Existing migration mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM mothers_love.schema_migrations WHERE version='002_unicode_edit_parity' AND sha256='069ab377c570e57e794ab3f1e765ac16a83d76a347e542f917a4b0e66ecd43b4') THEN RAISE EXCEPTION 'Existing migration mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM mothers_love.schema_migrations WHERE version='003_password_only_admin' AND sha256='123fc86f0e10eff3ff5a467c6b496453fa9c74189c15142a0b508c7541c9da04') THEN RAISE EXCEPTION 'Existing migration mismatch'; END IF;
END
$preflight$;
-- Add the campaign-only public feed bridge without replacing existing functions.
-- The restricted runtime can execute this definer function but cannot read campaign tables directly.
DO $public_feed_migration$
BEGIN
  IF pg_catalog.to_regprocedure('public.ml_public_feed()') IS NOT NULL THEN
    RAISE EXCEPTION 'public.ml_public_feed() already exists';
  END IF;

  EXECUTE $function_definition$
    CREATE FUNCTION public.ml_public_feed()
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = ''
    AS $function$
    DECLARE
      now_value timestamptz := clock_timestamp();
      mode_value text;
      item_value jsonb;
    BEGIN
      SELECT s.mode
      INTO mode_value
      FROM mothers_love.settings AS s
      WHERE s.singleton_id = true;

      IF NOT FOUND OR NOT mothers_love.ml_purge_healthy(now_value) THEN
        RETURN jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
      END IF;

      IF mode_value = 'neutral' THEN
        RETURN jsonb_build_object('ok', true, 'serverTime', now_value, 'items', '[]'::jsonb);
      END IF;

      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', feed.id::text,
            'recipient', feed.recipient,
            'message', feed.message,
            'expressionIds', feed.expression_ids,
            'firstPublishedAt', feed.first_published_at,
            'expiresAt', feed.expires_at
          )
          ORDER BY feed.first_published_at DESC, feed.id DESC
        ),
        '[]'::jsonb
      )
      INTO item_value
      FROM (
        SELECT
          r.id,
          r.recipient,
          r.message,
          r.first_published_at,
          r.expires_at,
          COALESCE(
            (
              SELECT jsonb_agg(re.expression_id ORDER BY re.expression_id)
              FROM mothers_love.recognition_expressions AS re
              WHERE re.recognition_id = r.id
            ),
            '[]'::jsonb
          ) AS expression_ids
        FROM mothers_love.recognitions AS r
        WHERE r.status = 'published'
          AND r.expires_at > now_value
        ORDER BY r.first_published_at DESC, r.id DESC
        LIMIT 50
      ) AS feed;

      RETURN jsonb_build_object('ok', true, 'serverTime', now_value, 'items', item_value);
    END
    $function$;
  $function_definition$;
END
$public_feed_migration$;

REVOKE ALL ON FUNCTION public.ml_public_feed() FROM PUBLIC;
DO $public_feed_acl$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.ml_public_feed() FROM %I', role_name);
    END IF;
  END LOOP;
END
$public_feed_acl$;
GRANT EXECUTE ON FUNCTION public.ml_public_feed() TO mothers_love_runtime;

INSERT INTO mothers_love.schema_migrations(version,sha256) VALUES ('004_public_feed','78611aa702933206dc3b2ba2295dd6e9f0a07dc198515b9f094df6c463089510');
