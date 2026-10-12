-- 020: opt-in TV cache protocol. Legacy snapshot functions stay compatible.
-- Metadata retains 012's settings, cleanup, calendar and weekly-focus behavior.
-- Additive only: no existing routine, table rows or privileges are replaced.
-- Install and validate the concurrent latest-records index before this file.
-- App rollback: use legacy snapshot readers; 020 can remain installed.
-- SQL rollback, if selected after release:
--   DROP FUNCTION public.ml_color_polish_delta(text, jsonb);
--   DROP FUNCTION mothers_love.ml_color_polish_metadata();
-- Optional index removal, in autocommit mode after verifying no dependencies:
--   DROP INDEX CONCURRENTLY mothers_love.recognitions_display_latest_idx;
-- Do not undo migration 019 or delete existing settings/weekly-focus rows.
BEGIN;

DO $delta_index_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index AS i
    JOIN pg_catalog.pg_class AS index_class ON index_class.oid = i.indexrelid
    JOIN pg_catalog.pg_namespace AS index_schema ON index_schema.oid = index_class.relnamespace
    WHERE index_schema.nspname = 'mothers_love'
      AND index_class.relname = 'recognitions_display_latest_idx'
      AND i.indrelid = 'mothers_love.recognitions'::pg_catalog.regclass
      AND i.indisready
      AND i.indisvalid
  ) THEN
    RAISE EXCEPTION 'required display latest-records index is absent or invalid';
  END IF;
END
$delta_index_check$;

CREATE FUNCTION mothers_love.ml_color_polish_metadata()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $function$
DECLARE
  base_snapshot jsonb;
  settings_row mothers_love.settings%ROWTYPE;
  latest_event bigint;
  event_high_water bigint;
  presentation_row mothers_love.color_polish_presentation%ROWTYPE;
  now_value timestamptz;
  local_date date;
  current_week_start date;
  current_week_end date;
  previous_week_start date;
  previous_week_end date;
  month_start date;
  campaign_start date;
  prior_counts integer[];
  current_counts integer[];
  frozen_expression smallint;
  selected_expression integer := 1;
  expression_index integer;
  other_counts integer[];
  fourth_highest integer;
  goal_target integer;
  calendar_value jsonb;
  current_week_value jsonb;
  previous_week_value jsonb;
  month_value jsonb;
  campaign_value jsonb;
  insights_value jsonb;
BEGIN
  now_value := pg_catalog.clock_timestamp();
  SELECT * INTO settings_row FROM mothers_love.settings WHERE singleton_id = true;
  IF NOT FOUND OR NOT mothers_love.ml_purge_healthy(now_value) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
  END IF;
  SELECT COALESCE(pg_catalog.max(event_id), 0) INTO latest_event
  FROM mothers_love.display_events WHERE created_at <= now_value;
  SELECT COALESCE(pg_catalog.pg_sequence_last_value('mothers_love.display_events_event_id_seq'::pg_catalog.regclass), 0)
  INTO event_high_water;
  base_snapshot := pg_catalog.jsonb_build_object(
    'ok', true, 'serverTime', now_value, 'revision', GREATEST(1, event_high_water, settings_row.version),
    'recognitions', '[]'::jsonb, 'arrivals', '[]'::jsonb, 'sync', 'reset',
    'settings', mothers_love.ml_settings_json(), 'submissionUrl', settings_row.submission_url,
    'cursor', pg_catalog.format('%s.%s', latest_event, pg_catalog.floor(EXTRACT(epoch FROM now_value))::bigint),
    'aggregate', mothers_love.ml_aggregate_json(
      pg_catalog.date_trunc('month', now_value AT TIME ZONE 'America/Los_Angeles')::date,
      (now_value AT TIME ZONE 'America/Los_Angeles')::date)
  );
  IF base_snapshot IS NULL OR COALESCE((base_snapshot->>'ok')::boolean, false) IS DISTINCT FROM true THEN
    RETURN COALESCE(base_snapshot, pg_catalog.jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE'));
  END IF;
  IF COALESCE(base_snapshot->>'submissionUrl', '') NOT IN ('https://mothers-love.vercel.app', 'https://mothers-love.vercel.app/', 'https://mothers-love.vercel.app/recognize') THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
  END IF;
  base_snapshot := base_snapshot || pg_catalog.jsonb_build_object('submissionUrl', 'https://mothers-love.vercel.app/recognize');
  now_value := (base_snapshot->>'serverTime')::timestamptz;
  IF now_value IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
  END IF;

  SELECT *
  INTO presentation_row
  FROM mothers_love.color_polish_presentation AS p
  WHERE p.singleton_id = true
  FOR SHARE;
  IF NOT FOUND OR presentation_row.version IS DISTINCT FROM 'color-polish-v6' OR NOT mothers_love.ml_color_polish_valid_playlist(presentation_row.playlist) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
  END IF;

  local_date := (now_value AT TIME ZONE 'America/Los_Angeles')::date;
  current_week_start := local_date - EXTRACT(dow FROM local_date)::integer;
  current_week_end := current_week_start + 6;
  previous_week_start := current_week_start - 7;
  previous_week_end := current_week_start - 1;
  month_start := pg_catalog.date_trunc('month', local_date)::date;

  prior_counts := mothers_love.ml_color_polish_expression_counts(previous_week_start, previous_week_end, local_date);
  FOR expression_index IN 2..9 LOOP
    IF prior_counts[expression_index] < prior_counts[selected_expression] THEN
      selected_expression := expression_index;
    END IF;
  END LOOP;

  current_counts := mothers_love.ml_color_polish_expression_counts(current_week_start, local_date, local_date);

  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'periodStart', d.period_start,
        'periodEnd', d.period_end,
        'recognitions', d.recognitions,
        'expressionCounts', pg_catalog.to_jsonb(d.expression_counts),
        'expressionTotal', d.expression_total,
        'revision', d.revision
      )
      ORDER BY d.period_start
    ),
    '[]'::jsonb
  )
  INTO calendar_value
  FROM mothers_love.daily_aggregates AS d
  WHERE d.period_start BETWEEN month_start AND local_date
    AND d.period_start = d.period_end
    AND d.period_start <= local_date
    AND d.period_end <= local_date
    AND d.recognitions >= 0
    AND d.expression_total >= 0
    AND pg_catalog.array_length(d.expression_counts, 1) = 9
    AND d.expression_counts[1] >= 0
    AND d.expression_counts[2] >= 0
    AND d.expression_counts[3] >= 0
    AND d.expression_counts[4] >= 0
    AND d.expression_counts[5] >= 0
    AND d.expression_counts[6] >= 0
    AND d.expression_counts[7] >= 0
    AND d.expression_counts[8] >= 0
    AND d.expression_counts[9] >= 0;

  SELECT COALESCE(pg_catalog.min(d.period_start), local_date)
  INTO campaign_start
  FROM mothers_love.daily_aggregates AS d
  WHERE d.period_start = d.period_end
    AND d.period_start <= local_date
    AND d.period_end <= local_date
    AND d.recognitions >= 0
    AND d.expression_total >= 0
    AND pg_catalog.array_length(d.expression_counts, 1) = 9
    AND d.expression_counts[1] >= 0
    AND d.expression_counts[2] >= 0
    AND d.expression_counts[3] >= 0
    AND d.expression_counts[4] >= 0
    AND d.expression_counts[5] >= 0
    AND d.expression_counts[6] >= 0
    AND d.expression_counts[7] >= 0
    AND d.expression_counts[8] >= 0
    AND d.expression_counts[9] >= 0;

  current_week_value := mothers_love.ml_color_polish_aggregate_json(current_week_start, local_date, local_date);
  previous_week_value := mothers_love.ml_color_polish_aggregate_json(previous_week_start, previous_week_end, local_date);
  month_value := mothers_love.ml_color_polish_aggregate_json(month_start, local_date, local_date);
  campaign_value := mothers_love.ml_color_polish_aggregate_json(campaign_start, local_date, local_date);
  IF base_snapshot->'aggregate' IS DISTINCT FROM month_value THEN
    RAISE EXCEPTION 'legacy aggregate mismatch';
  END IF;

  -- Read path first: most reads land on a week whose focus row was already
  -- frozen, so they never touch the advisory lock or the insert below.
  SELECT f.expression_id
  INTO frozen_expression
  FROM mothers_love.color_polish_weekly_focus AS f
  WHERE f.week_start = current_week_start;

  IF frozen_expression IS NULL THEN
    -- Only the first reader of a new week pays for serialization: take the
    -- same short campaign lock 011 used, then re-check in case another
    -- session froze the row while this one waited on the lock.
    PERFORM pg_catalog.pg_advisory_xact_lock(910202611::bigint);

    SELECT f.expression_id
    INTO frozen_expression
    FROM mothers_love.color_polish_weekly_focus AS f
    WHERE f.week_start = current_week_start;

    IF frozen_expression IS NULL THEN
      INSERT INTO mothers_love.color_polish_weekly_focus (week_start, week_end, expression_id)
      VALUES (current_week_start, current_week_end, selected_expression)
      ON CONFLICT (week_start) DO NOTHING;

      SELECT f.expression_id
      INTO frozen_expression
      FROM mothers_love.color_polish_weekly_focus AS f
      WHERE f.week_start = current_week_start;
    END IF;
  END IF;

  IF frozen_expression IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
  END IF;

  SELECT COALESCE(pg_catalog.array_agg(current_counts[g.index_value] ORDER BY current_counts[g.index_value] DESC), ARRAY[]::integer[])
  INTO other_counts
  FROM pg_catalog.generate_subscripts(current_counts, 1) AS g(index_value)
  WHERE g.index_value <> frozen_expression;
  fourth_highest := COALESCE(other_counts[4], 0);
  goal_target := GREATEST(1, fourth_highest + 1);

  insights_value := pg_catalog.jsonb_build_object(
    'calendar', calendar_value,
    'currentWeek', current_week_value,
    'previousWeek', previous_week_value,
    'month', month_value,
    'campaign', campaign_value,
    'goal', pg_catalog.jsonb_build_object(
      'weekStart', current_week_start,
      'weekEnd', current_week_end,
      'expressionId', frozen_expression,
      'value', current_counts[frozen_expression],
      'target', goal_target,
      'achieved', current_counts[frozen_expression] >= goal_target
    )
  );

  RETURN base_snapshot || pg_catalog.jsonb_build_object(
    'presentation', pg_catalog.jsonb_build_object(
      'version', presentation_row.version,
      'enabled', presentation_row.enabled,
      'playlist', presentation_row.playlist
    ),
    'insights', insights_value
  );
EXCEPTION WHEN others THEN
  RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
END
$function$;

CREATE FUNCTION public.ml_color_polish_delta(after_cursor text, known_tokens jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $delta$
DECLARE
  base_snapshot jsonb;
  now_value timestamptz;
  pool_value jsonb := '[]'::jsonb;
  pool_ids uuid[] := ARRAY[]::uuid[];
  state_hash text;
  cache_cursor text;
  lease_epoch numeric;
  after_event numeric;
  after_epoch numeric;
  latest_event bigint;
  event_cursor_valid boolean := false;
  valid_cursor boolean := false;
  items jsonb := '[]'::jsonb;
  arrivals jsonb := '[]'::jsonb;
  arrival_overflow boolean := false;
BEGIN
  IF known_tokens IS NULL OR pg_catalog.jsonb_typeof(known_tokens) <> 'array'
     OR pg_catalog.jsonb_array_length(known_tokens) > 100 THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'status', 400);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(known_tokens) AS t(value)
             WHERE pg_catalog.jsonb_typeof(t.value) <> 'string' OR t.value #>> '{}' !~ '^[a-f0-9]{32}$') THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'status', 400);
  END IF;

  base_snapshot := mothers_love.ml_color_polish_metadata();
  IF COALESCE((base_snapshot->>'ok')::boolean, false) IS DISTINCT FROM true THEN RETURN base_snapshot; END IF;
  now_value := (base_snapshot->>'serverTime')::timestamptz;
  latest_event := pg_catalog.split_part(base_snapshot->>'cursor', '.', 1)::bigint;

  -- No recipient or message is read in this query. xmin also detects changes
  -- made without incrementing the application's recognition version. Expression
  -- IDs and row versions cover edits to the relationship table independently.
  -- First choose the latest 100 at database timestamp precision, then apply the
  -- existing featured-first presentation order within that pool.
  IF base_snapshot->'settings'->>'mode' = 'normal' THEN
    WITH newest AS MATERIALIZED (
      SELECT r.id, r.xmin::text AS row_version, r.version, r.first_published_at, r.expires_at,
        (r.featured AND (r.feature_until IS NULL OR r.feature_until > now_value)) AS featured
      FROM mothers_love.recognitions AS r
      WHERE r.status = 'published' AND r.first_published_at IS NOT NULL AND r.expires_at > now_value
      ORDER BY r.first_published_at DESC, r.id DESC LIMIT 100
    ), tokens AS (
      SELECT n.*, pg_catalog.md5(pg_catalog.jsonb_build_array(n.id, n.row_version, n.version,
        n.expires_at, n.featured, COALESCE((SELECT pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_array(re.expression_id, re.xmin::text) ORDER BY re.expression_id)
          FROM mothers_love.recognition_expressions AS re WHERE re.recognition_id = n.id), '[]'::jsonb))::text) AS token
      FROM newest AS n
    )
    SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id', id::text, 'token', token)
             ORDER BY featured DESC, first_published_at DESC, id DESC), '[]'::jsonb),
           COALESCE(pg_catalog.array_agg(id ORDER BY featured DESC, first_published_at DESC, id DESC), ARRAY[]::uuid[])
    INTO pool_value, pool_ids FROM tokens;
  END IF;

  -- The hash covers full anonymous insights and presentation, not just the
  -- historic max(event, settings version). Eligibility/feature boundaries and
  -- Los Angeles day/week/month changes are re-evaluated on every verification.
  state_hash := pg_catalog.md5(pg_catalog.jsonb_build_array(
    base_snapshot - ARRAY['serverTime', 'cursor', 'recognitions', 'arrivals', 'sync'], pool_value, latest_event)::text);
  IF after_cursor IS NOT NULL AND pg_catalog.char_length(after_cursor) <= 120
     AND after_cursor ~ '^v2:[a-f0-9]{32}:[0-9]{1,19}:[0-9]{1,19}\.[0-9]{1,19}$' THEN
    lease_epoch := pg_catalog.split_part(after_cursor, ':', 3)::numeric;
    after_event := pg_catalog.split_part(pg_catalog.split_part(after_cursor, ':', 4), '.', 1)::numeric;
    after_epoch := pg_catalog.split_part(pg_catalog.split_part(after_cursor, ':', 4), '.', 2)::numeric;
    event_cursor_valid := after_epoch >= lease_epoch
      AND after_epoch <= pg_catalog.floor(EXTRACT(epoch FROM now_value))
      AND after_event <= latest_event AND after_event <= 9223372036854775807::numeric;
    valid_cursor := lease_epoch > pg_catalog.floor(EXTRACT(epoch FROM now_value - interval '1 hour'))
      AND lease_epoch <= pg_catalog.floor(EXTRACT(epoch FROM now_value))
      AND event_cursor_valid;
  END IF;
  IF NOT valid_cursor THEN
    lease_epoch := pg_catalog.floor(EXTRACT(epoch FROM now_value));
    known_tokens := '[]'::jsonb;
  END IF;
  cache_cursor := pg_catalog.format('v2:%s:%s:%s', state_hash, lease_epoch, base_snapshot->>'cursor');

  -- Return before joining the wide recognition rows or building their JSON.
  IF valid_cursor AND pg_catalog.split_part(after_cursor, ':', 2) = state_hash
     AND pg_catalog.jsonb_array_length(known_tokens) = pg_catalog.jsonb_array_length(pool_value)
     AND NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(pool_value) AS p(value)
                     WHERE NOT known_tokens ? (p.value->>'token')) THEN
    RETURN pg_catalog.jsonb_build_object('ok', true, 'cacheCursor', cache_cursor,
      'serverTime', now_value, 'unchanged', true);
  END IF;

  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id', r.id::text, 'recipient', r.recipient, 'message', r.message,
    'expressionIds', COALESCE((SELECT pg_catalog.jsonb_agg(re.expression_id ORDER BY re.expression_id)
       FROM mothers_love.recognition_expressions AS re WHERE re.recognition_id = r.id), '[]'::jsonb),
    'createdAt', r.created_at, 'firstPublishedAt', r.first_published_at,
    'expiresAt', LEAST(r.expires_at, now_value + interval '7 days'), 'version', r.version,
    'status', 'published', 'featured', r.featured AND (r.feature_until IS NULL OR r.feature_until > now_value)
  ) ORDER BY p.position), '[]'::jsonb)
  INTO items
  FROM pg_catalog.jsonb_array_elements(pool_value) WITH ORDINALITY AS p(value, position)
  JOIN mothers_love.recognitions AS r ON r.id = (p.value->>'id')::uuid
  WHERE NOT known_tokens ? (p.value->>'token');

  IF event_cursor_valid AND base_snapshot->'settings'->>'mode' = 'normal' THEN
    WITH bounded AS (
      SELECT de.event_id, de.recognition_id, de.created_at
      FROM mothers_love.display_events AS de
      WHERE de.event_id > after_event AND de.event_id <= latest_event
        AND de.event_kind = 'published' AND de.recognition_id = ANY(pool_ids)
        AND de.created_at > now_value - interval '7 days' AND de.expires_at > now_value
      ORDER BY de.event_id LIMIT 1001
    )
    SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'eventId', event_id::text, 'recognitionId', recognition_id::text, 'publishedAt', created_at)
      ORDER BY event_id), '[]'::jsonb), pg_catalog.count(*) > 1000
    INTO arrivals, arrival_overflow FROM bounded;
    -- Never advance past an unreported event batch. Retry as a bounded reset.
    IF arrival_overflow THEN RETURN public.ml_color_polish_delta(NULL, '[]'::jsonb); END IF;
  END IF;
  base_snapshot := base_snapshot || pg_catalog.jsonb_build_object('recognitions', items, 'arrivals', arrivals,
    'sync', CASE WHEN event_cursor_valid AND base_snapshot->'settings'->>'mode' = 'normal' THEN 'delta' ELSE 'reset' END);
  RETURN pg_catalog.jsonb_build_object('ok', true, 'cacheCursor', cache_cursor,
    'serverTime', now_value, 'unchanged', false, 'pool', pool_value, 'snapshot', base_snapshot);
EXCEPTION WHEN others THEN
  RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
END
$delta$;

-- Keep SECURITY DEFINER ownership explicit and restrict both definers. The
-- private helper is never a runtime API endpoint.
ALTER FUNCTION mothers_love.ml_color_polish_metadata() OWNER TO postgres;
ALTER FUNCTION public.ml_color_polish_delta(text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_metadata() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ml_color_polish_delta(text, jsonb) FROM PUBLIC;
DO $delta_acl$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role', 'mothers_love_runtime'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_metadata() FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION public.ml_color_polish_delta(text, jsonb) FROM %I', role_name);
    END IF;
  END LOOP;
END
$delta_acl$;
GRANT EXECUTE ON FUNCTION public.ml_color_polish_delta(text, jsonb) TO mothers_love_runtime;
COMMIT;
