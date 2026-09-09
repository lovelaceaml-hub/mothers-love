BEGIN;
DO $preflight$
DECLARE fingerprint text;
BEGIN
 IF (SELECT count(*) FROM mothers_love.schema_migrations) <> 6 OR NOT EXISTS(SELECT 1 FROM mothers_love.schema_migrations WHERE version='001_mothers_love' AND sha256='f213b423a4e36ec45d1958b7a1c93a282debd1d84cd6d761d3dcaa95fd753a10')
 OR NOT EXISTS(SELECT 1 FROM mothers_love.schema_migrations WHERE version='002_unicode_edit_parity' AND sha256='069ab377c570e57e794ab3f1e765ac16a83d76a347e542f917a4b0e66ecd43b4')
 OR NOT EXISTS(SELECT 1 FROM mothers_love.schema_migrations WHERE version='003_password_only_admin' AND sha256='123fc86f0e10eff3ff5a467c6b496453fa9c74189c15142a0b508c7541c9da04')
 OR NOT EXISTS(SELECT 1 FROM mothers_love.schema_migrations WHERE version='004_public_feed' AND sha256='78611aa702933206dc3b2ba2295dd6e9f0a07dc198515b9f094df6c463089510')
 OR NOT EXISTS(SELECT 1 FROM mothers_love.schema_migrations WHERE version='005_recognition_reactions' AND sha256='f15c40322e47774d7c164846f5366592890168394ee389a2157d856b59b3e32f')
 OR NOT EXISTS(SELECT 1 FROM mothers_love.schema_migrations WHERE version='006_public_display' AND sha256='3f7aaa77e998ce1abe1395595f7605a7169bfa76c39e54a896b5d60df77536a8') THEN RAISE EXCEPTION 'Campaign migration precondition changed'; END IF;
 IF to_regprocedure('public.ml_public_display_snapshot(text)') IS NULL THEN RAISE EXCEPTION 'Public display bridge missing'; END IF;
 IF md5(pg_get_functiondef('public.ml_public_display_snapshot(text)'::regprocedure)) IS DISTINCT FROM '9d81fd21ea494dc607bffe8c7bd2027e' THEN RAISE EXCEPTION 'Public display bridge definition changed'; END IF;
 IF NOT mothers_love.ml_purge_healthy(clock_timestamp()) THEN RAISE EXCEPTION 'Cleanup is unavailable'; END IF;
 SELECT md5(string_agg(n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||'):'||md5(pg_get_functiondef(p.oid))||':'||p.proowner::text||':'||coalesce(p.proacl::text,''), E'\n' ORDER BY n.nspname,p.proname,p.oid)) INTO fingerprint FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth') AND p.prokind='f' AND p.oid <> 'public.ml_public_display_snapshot(text)'::regprocedure;
 IF fingerprint IS DISTINCT FROM 'ad8fb6516459dddda4c3221cf85fbe64' THEN RAISE EXCEPTION 'Existing function fingerprint changed'; END IF;
END
$preflight$;

-- Replace the public snapshot bridge so snapshot revisions survive cascade
-- deletes and expired-event cleanup. Cursors intentionally continue to use the
-- greatest surviving event ID, so a removed cursor resets safely.
CREATE OR REPLACE FUNCTION public.ml_public_display_snapshot(after_cursor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $function$
DECLARE
  now_value timestamptz := pg_catalog.clock_timestamp();
  settings_row mothers_love.settings%ROWTYPE;
  latest_event bigint;
  event_high_water bigint;
  snapshot_revision bigint;
  after_value numeric;
  after_epoch numeric;
  cursor_value bigint;
  cursor_epoch bigint;
  sync_value text := 'reset';
  items jsonb := '[]'::jsonb;
  arrivals jsonb := '[]'::jsonb;
  arrival_overflow boolean := false;
  aggregate_value jsonb;
  settings_value jsonb;
BEGIN
  SELECT *
  INTO settings_row
  FROM mothers_love.settings AS s
  WHERE s.singleton_id = true;

  IF NOT FOUND OR NOT mothers_love.ml_purge_healthy(now_value) THEN
    RETURN jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
  END IF;

  SELECT COALESCE(pg_catalog.max(de.event_id), 0)::bigint
  INTO latest_event
  FROM mothers_love.display_events AS de
  WHERE de.created_at <= now_value;
  SELECT COALESCE(
    pg_catalog.pg_sequence_last_value('mothers_love.display_events_event_id_seq'::pg_catalog.regclass),
    0
  )::bigint
  INTO event_high_water;
  snapshot_revision := GREATEST(event_high_water, settings_row.version);

  -- Parse only a short, unsigned decimal pair. Numeric is used for the
  -- initial comparison so hostile input can never overflow a bigint cast.
  IF after_cursor IS NOT NULL
     AND after_cursor <> ''
     AND pg_catalog.char_length(after_cursor) <= 64
     AND after_cursor ~ '^[0-9]+\.[0-9]+$' THEN
    after_value := pg_catalog.split_part(after_cursor, '.', 1)::numeric;
    after_epoch := pg_catalog.split_part(after_cursor, '.', 2)::numeric;
    IF after_value >= 0
       AND after_value <= 9223372036854775807::numeric
       AND after_epoch >= pg_catalog.floor(EXTRACT(epoch FROM now_value - interval '7 days'))
       AND after_epoch <= pg_catalog.floor(EXTRACT(epoch FROM now_value))
       AND after_epoch <= 9223372036854775807::numeric
       AND after_value <= latest_event THEN
      cursor_value := after_value::bigint;
      cursor_epoch := after_epoch::bigint;
      sync_value := 'delta';
    END IF;
  END IF;

  settings_value := mothers_love.ml_settings_json();
  aggregate_value := mothers_love.ml_aggregate_json(
    (now_value AT TIME ZONE 'America/Los_Angeles')::date
      - EXTRACT(day FROM (now_value AT TIME ZONE 'America/Los_Angeles'))::integer + 1,
    (now_value AT TIME ZONE 'America/Los_Angeles')::date
  );

  -- Quiet and neutral modes clear personal display content and restart
  -- arrival history when the display returns to normal mode.
  IF settings_row.mode = 'normal' THEN
    WITH selected AS (
      SELECT
        r.id,
        r.recipient,
        r.message,
        r.created_at,
        r.first_published_at,
        r.expires_at,
        r.version,
        (r.featured AND (r.feature_until IS NULL OR r.feature_until > now_value)) AS featured,
        COALESCE(
          (
            SELECT pg_catalog.jsonb_agg(re.expression_id ORDER BY re.expression_id)
            FROM mothers_love.recognition_expressions AS re
            WHERE re.recognition_id = r.id
          ),
          '[]'::jsonb
        ) AS expression_ids
      FROM mothers_love.recognitions AS r
      WHERE r.status = 'published'
        AND r.first_published_at IS NOT NULL
        AND r.expires_at > now_value
      ORDER BY
        (r.featured AND (r.feature_until IS NULL OR r.feature_until > now_value)) DESC,
        r.first_published_at DESC,
        r.id DESC
      LIMIT 1000
    )
    SELECT COALESCE(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', selected.id::text,
          'recipient', selected.recipient,
          'message', selected.message,
          'expressionIds', selected.expression_ids,
          'createdAt', selected.created_at,
          'firstPublishedAt', selected.first_published_at,
          'expiresAt', selected.expires_at,
          'version', selected.version,
          'status', 'published',
          'featured', selected.featured
        )
        ORDER BY selected.featured DESC, selected.first_published_at DESC, selected.id DESC
      ),
      '[]'::jsonb
    )
    INTO items
    FROM selected;

    IF sync_value = 'delta' THEN
      WITH selected AS (
        SELECT
          r.id,
          r.first_published_at,
          r.expires_at
        FROM mothers_love.recognitions AS r
        WHERE r.status = 'published'
          AND r.first_published_at IS NOT NULL
          AND r.expires_at > now_value
        ORDER BY
          (r.featured AND (r.feature_until IS NULL OR r.feature_until > now_value)) DESC,
          r.first_published_at DESC,
          r.id DESC
        LIMIT 1000
      )
      , bounded AS (
        SELECT de.event_id, de.recognition_id, de.created_at
        FROM mothers_love.display_events AS de
        JOIN selected ON selected.id = de.recognition_id
        JOIN mothers_love.recognitions AS current_rec ON current_rec.id = de.recognition_id
        WHERE de.event_id > cursor_value
          AND de.event_id <= latest_event
          AND de.created_at > now_value - interval '7 days'
          AND de.event_kind = 'published'
          AND de.expires_at > now_value
          AND current_rec.status = 'published'
          AND current_rec.first_published_at IS NOT NULL
          AND current_rec.expires_at > now_value
        ORDER BY de.event_id
        LIMIT 1001
      ), numbered AS (
        SELECT
          bounded.*,
          pg_catalog.row_number() OVER (ORDER BY bounded.event_id) AS arrival_index
        FROM bounded
      )
      SELECT
        COALESCE(
          pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'eventId', numbered.event_id::text,
              'recognitionId', numbered.recognition_id::text,
              'publishedAt', numbered.created_at
            )
            ORDER BY numbered.event_id
          ) FILTER (WHERE numbered.arrival_index <= 1000),
          '[]'::jsonb
        ),
        COALESCE(pg_catalog.bool_or(numbered.arrival_index > 1000), false)
      INTO arrivals, arrival_overflow
      FROM numbered;

      -- A truncated delta would make the cursor claim events the display
      -- never received. Return a bounded reset snapshot instead, so the
      -- next poll starts cleanly from the current cursor.
      IF arrival_overflow THEN
        sync_value := 'reset';
        arrivals := '[]'::jsonb;
      END IF;
    END IF;
  ELSE
    sync_value := 'reset';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'serverTime', now_value,
    'revision', snapshot_revision,
    'recognitions', items,
    'aggregate', aggregate_value,
    'settings', settings_value,
    'submissionUrl', settings_row.submission_url,
    'cursor', pg_catalog.format('%s.%s', latest_event, pg_catalog.floor(EXTRACT(epoch FROM now_value))::bigint),
    'sync', sync_value,
    'arrivals', arrivals
  );
END
$function$;

REVOKE ALL ON FUNCTION public.ml_public_display_snapshot(text) FROM PUBLIC;
DO $public_display_acl$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION public.ml_public_display_snapshot(text) FROM %I', role_name);
    END IF;
  END LOOP;
END
$public_display_acl$;
GRANT EXECUTE ON FUNCTION public.ml_public_display_snapshot(text) TO mothers_love_runtime;

DO $postflight$
DECLARE fingerprint text; role_name text;
BEGIN
 SELECT md5(string_agg(n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||'):'||md5(pg_get_functiondef(p.oid))||':'||p.proowner::text||':'||coalesce(p.proacl::text,''), E'\n' ORDER BY n.nspname,p.proname,p.oid)) INTO fingerprint FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth') AND p.prokind='f' AND p.oid <> 'public.ml_public_display_snapshot(text)'::regprocedure;
 IF fingerprint IS DISTINCT FROM 'ad8fb6516459dddda4c3221cf85fbe64' THEN RAISE EXCEPTION 'Existing function fingerprint changed'; END IF;
 IF NOT has_function_privilege('mothers_love_runtime','public.ml_public_display_snapshot(text)','EXECUTE') THEN RAISE EXCEPTION 'Runtime execution missing'; END IF;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_function_privilege(role_name,'public.ml_public_display_snapshot(text)','EXECUTE') THEN RAISE EXCEPTION 'Unexpected bridge privilege'; END IF;
 END LOOP;
 INSERT INTO mothers_love.schema_migrations(version,sha256) VALUES('007_public_display_revision','2963a4fa0f19793d94196296358e4667482080160d410ec3c60871c33821ef4f');
END
$postflight$;
COMMIT;
