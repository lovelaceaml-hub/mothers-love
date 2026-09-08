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
