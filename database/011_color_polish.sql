-- Additive Color Polish support for the Mother's Love campaign.
-- Existing public display bridges, legacy settings JSON, and display_config
-- remain unchanged. All new state stays inside the dedicated campaign schema.

CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_default_playlist()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('id', 'welcome', 'enabled', true, 'durationSeconds', 30),
    pg_catalog.jsonb_build_object('id', 'garden', 'enabled', true, 'durationSeconds', 180),
    pg_catalog.jsonb_build_object('id', 'featured', 'enabled', true, 'durationSeconds', 30),
    pg_catalog.jsonb_build_object('id', 'calendar', 'enabled', true, 'durationSeconds', 30),
    pg_catalog.jsonb_build_object('id', 'peacemakers', 'enabled', true, 'durationSeconds', 60),
    pg_catalog.jsonb_build_object('id', 'status', 'enabled', true, 'durationSeconds', 30),
    pg_catalog.jsonb_build_object('id', 'expressions', 'enabled', true, 'durationSeconds', 30),
    pg_catalog.jsonb_build_object('id', 'peace-in-practice', 'enabled', true, 'durationSeconds', 60),
    pg_catalog.jsonb_build_object('id', 'orbit', 'enabled', true, 'durationSeconds', 30),
    pg_catalog.jsonb_build_object('id', 'milestone', 'enabled', true, 'durationSeconds', 30)
  )
$function$;

CREATE TABLE IF NOT EXISTS mothers_love.color_polish_presentation (
  singleton_id boolean PRIMARY KEY DEFAULT true CHECK (singleton_id),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  version text NOT NULL DEFAULT 'color-polish-v6' CHECK (version = 'color-polish-v6'),
  enabled boolean NOT NULL DEFAULT false,
  playlist jsonb NOT NULL DEFAULT mothers_love.ml_color_polish_default_playlist(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);

CREATE TABLE IF NOT EXISTS mothers_love.color_polish_weekly_focus (
  week_start date PRIMARY KEY,
  week_end date NOT NULL CHECK (week_end = week_start + 6),
  expression_id smallint NOT NULL CHECK (expression_id BETWEEN 1 AND 9),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);

INSERT INTO mothers_love.color_polish_presentation (singleton_id)
VALUES (true)
ON CONFLICT (singleton_id) DO NOTHING;

ALTER TABLE mothers_love.color_polish_presentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE mothers_love.color_polish_presentation FORCE ROW LEVEL SECURITY;
ALTER TABLE mothers_love.color_polish_weekly_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE mothers_love.color_polish_weekly_focus FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE mothers_love.color_polish_presentation FROM PUBLIC;
REVOKE ALL ON TABLE mothers_love.color_polish_weekly_focus FROM PUBLIC;

DO $color_polish_table_acl$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role', 'mothers_love_runtime'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON TABLE mothers_love.color_polish_presentation FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON TABLE mothers_love.color_polish_weekly_focus FROM %I', role_name);
    END IF;
  END LOOP;
END
$color_polish_table_acl$;

CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_valid_playlist(playlist_value jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  item jsonb;
  item_id text;
  seen_ids text[] := ARRAY[]::text[];
  has_enabled boolean := false;
BEGIN
  IF playlist_value IS NULL OR pg_catalog.jsonb_typeof(playlist_value) IS DISTINCT FROM 'array' OR pg_catalog.jsonb_array_length(playlist_value) <> 10 THEN
    RETURN false;
  END IF;

  FOR item IN SELECT entry_value FROM pg_catalog.jsonb_array_elements(playlist_value) AS entries(entry_value) LOOP
    IF pg_catalog.jsonb_typeof(item) IS DISTINCT FROM 'object'
       OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(item)) <> 3 THEN
      RETURN false;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_object_keys(item) AS item_key
      WHERE item_key NOT IN ('id', 'enabled', 'durationSeconds')
    ) THEN
      RETURN false;
    END IF;

    item_id := item->>'id';
    IF COALESCE(item_id, '') NOT IN ('welcome', 'garden', 'featured', 'calendar', 'peacemakers', 'status', 'expressions', 'peace-in-practice', 'orbit', 'milestone') OR item_id = ANY(seen_ids) THEN
      RETURN false;
    END IF;
    IF pg_catalog.jsonb_typeof(item->'enabled') IS DISTINCT FROM 'boolean' THEN
      RETURN false;
    END IF;
    IF (item->>'enabled')::boolean THEN
      has_enabled := true;
    END IF;
    IF item->'durationSeconds' IS NULL
       OR pg_catalog.jsonb_typeof(item->'durationSeconds') IS DISTINCT FROM 'number'
       OR COALESCE(item->>'durationSeconds', '') !~ '^[0-9]+$'
       OR (item->>'durationSeconds')::numeric NOT BETWEEN 12 AND 180 THEN
      RETURN false;
    END IF;
    seen_ids := pg_catalog.array_append(seen_ids, item_id);
  END LOOP;

  RETURN pg_catalog.cardinality(seen_ids) = 10
    AND 'welcome' = ANY(seen_ids)
    AND 'garden' = ANY(seen_ids)
    AND 'featured' = ANY(seen_ids)
    AND 'calendar' = ANY(seen_ids)
    AND 'peacemakers' = ANY(seen_ids)
    AND 'status' = ANY(seen_ids)
    AND 'expressions' = ANY(seen_ids)
    AND 'peace-in-practice' = ANY(seen_ids)
    AND 'orbit' = ANY(seen_ids)
    AND 'milestone' = ANY(seen_ids)
    AND has_enabled;
END
$function$;

CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_presentation_json()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT pg_catalog.jsonb_build_object(
    'version', p.version,
    'enabled', p.enabled,
    'playlist', p.playlist
  )
  FROM mothers_love.color_polish_presentation AS p
  WHERE p.singleton_id = true
$function$;

CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_expression_counts(
  period_from date,
  period_to date,
  through_date date
)
RETURNS integer[]
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT ARRAY[
    COALESCE(pg_catalog.sum(d.expression_counts[1]), 0)::integer,
    COALESCE(pg_catalog.sum(d.expression_counts[2]), 0)::integer,
    COALESCE(pg_catalog.sum(d.expression_counts[3]), 0)::integer,
    COALESCE(pg_catalog.sum(d.expression_counts[4]), 0)::integer,
    COALESCE(pg_catalog.sum(d.expression_counts[5]), 0)::integer,
    COALESCE(pg_catalog.sum(d.expression_counts[6]), 0)::integer,
    COALESCE(pg_catalog.sum(d.expression_counts[7]), 0)::integer,
    COALESCE(pg_catalog.sum(d.expression_counts[8]), 0)::integer,
    COALESCE(pg_catalog.sum(d.expression_counts[9]), 0)::integer
  ]::integer[]
  FROM mothers_love.daily_aggregates AS d
  WHERE period_from IS NOT NULL
    AND period_to IS NOT NULL
    AND through_date IS NOT NULL
    AND d.period_start BETWEEN period_from AND period_to
    AND d.period_start = d.period_end
    AND d.period_start <= through_date
    AND d.period_end <= through_date
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
    AND d.expression_counts[9] >= 0
$function$;

CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_aggregate_json(
  period_from date,
  period_to date,
  through_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $function$
DECLARE
  legacy_value jsonb;
  count_values integer[];
  expression_total_value bigint;
BEGIN
  IF period_from IS NULL OR period_to IS NULL OR through_date IS NULL OR period_from > period_to OR period_to > through_date THEN
    RAISE EXCEPTION 'invalid color polish aggregate range';
  END IF;

  -- Use the legacy aggregate as the source of truth for period selection and
  -- revision. This keeps the month projection byte-for-byte compatible while
  -- retaining strict validation for the new anonymous insights.
  legacy_value := mothers_love.ml_aggregate_json(period_from, period_to);
  IF EXISTS (
    SELECT 1
    FROM mothers_love.daily_aggregates AS d
    WHERE d.period_start BETWEEN period_from AND period_to
      AND (
        d.period_start <> d.period_end
        OR d.period_end > through_date
        OR d.recognitions < 0
        OR d.expression_total < 0
        OR pg_catalog.array_length(d.expression_counts, 1) IS DISTINCT FROM 9
        OR d.expression_counts[1] IS NULL
        OR d.expression_counts[2] IS NULL
        OR d.expression_counts[3] IS NULL
        OR d.expression_counts[4] IS NULL
        OR d.expression_counts[5] IS NULL
        OR d.expression_counts[6] IS NULL
        OR d.expression_counts[7] IS NULL
        OR d.expression_counts[8] IS NULL
        OR d.expression_counts[9] IS NULL
        OR d.expression_counts[1] < 0
        OR d.expression_counts[2] < 0
        OR d.expression_counts[3] < 0
        OR d.expression_counts[4] < 0
        OR d.expression_counts[5] < 0
        OR d.expression_counts[6] < 0
        OR d.expression_counts[7] < 0
        OR d.expression_counts[8] < 0
        OR d.expression_counts[9] < 0
        OR d.expression_total <> d.expression_counts[1]
          + d.expression_counts[2]
          + d.expression_counts[3]
          + d.expression_counts[4]
          + d.expression_counts[5]
          + d.expression_counts[6]
          + d.expression_counts[7]
          + d.expression_counts[8]
          + d.expression_counts[9]
      )
  ) THEN
    RAISE EXCEPTION 'invalid color polish aggregate source';
  END IF;
  IF legacy_value IS NULL
     OR pg_catalog.jsonb_typeof(legacy_value->'expressionCounts') IS DISTINCT FROM 'array'
     OR pg_catalog.jsonb_array_length(legacy_value->'expressionCounts') <> 9
     OR COALESCE(legacy_value->>'expressionTotal', '') !~ '^[0-9]+$'
     OR COALESCE(legacy_value->>'recognitions', '') !~ '^[0-9]+$'
     OR COALESCE(legacy_value->>'revision', '') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'invalid color polish aggregate';
  END IF;

  SELECT pg_catalog.array_agg(entry_value::integer ORDER BY ordinal)
  INTO count_values
  FROM pg_catalog.jsonb_array_elements_text(legacy_value->'expressionCounts') WITH ORDINALITY AS entries(entry_value, ordinal);
  IF count_values IS NULL OR pg_catalog.cardinality(count_values) <> 9 OR count_values[1] < 0 OR count_values[2] < 0 OR count_values[3] < 0 OR count_values[4] < 0 OR count_values[5] < 0 OR count_values[6] < 0 OR count_values[7] < 0 OR count_values[8] < 0 OR count_values[9] < 0 THEN
    RAISE EXCEPTION 'invalid color polish aggregate';
  END IF;
  expression_total_value := (legacy_value->>'expressionTotal')::bigint;

  IF count_values[1]::bigint
     + count_values[2]::bigint
     + count_values[3]::bigint
     + count_values[4]::bigint
     + count_values[5]::bigint
     + count_values[6]::bigint
     + count_values[7]::bigint
     + count_values[8]::bigint
     + count_values[9]::bigint <> expression_total_value THEN
    RAISE EXCEPTION 'invalid color polish aggregate';
  END IF;

  RETURN legacy_value;
END
$function$;

CREATE OR REPLACE FUNCTION public.ml_color_polish_snapshot(after_cursor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $function$
DECLARE
  base_snapshot jsonb;
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
  -- One short campaign lock serializes first use of the anonymous weekly row.
  -- It does not touch the legacy display client or settings payload.
  PERFORM pg_catalog.pg_advisory_xact_lock(910202611::bigint);

  base_snapshot := public.ml_public_display_snapshot(after_cursor);
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

  INSERT INTO mothers_love.color_polish_weekly_focus (week_start, week_end, expression_id)
  VALUES (current_week_start, current_week_end, selected_expression)
  ON CONFLICT (week_start) DO NOTHING;

  SELECT f.expression_id
  INTO frozen_expression
  FROM mothers_love.color_polish_weekly_focus AS f
  WHERE f.week_start = current_week_start;
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

CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_presentation_get(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $function$
DECLARE
  auth_result jsonb;
  presentation_row mothers_love.color_polish_presentation%ROWTYPE;
BEGIN
  auth_result := mothers_love.ml_authorize(payload, 'moderator', true);
  IF NOT COALESCE((auth_result->>'ok')::boolean, false) THEN
    RETURN auth_result;
  END IF;
  SELECT * INTO presentation_row FROM mothers_love.color_polish_presentation WHERE singleton_id = true;
  IF NOT FOUND OR NOT mothers_love.ml_color_polish_valid_playlist(presentation_row.playlist) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
  END IF;
  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'revision', presentation_row.revision,
    'presentation', mothers_love.ml_color_polish_presentation_json()
  );
END
$function$;

CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_presentation_patch(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $function$
DECLARE
  auth_result jsonb;
  presentation_row mothers_love.color_polish_presentation%ROWTYPE;
  changes jsonb;
  expected_revision bigint;
  revision_value text;
BEGIN
  auth_result := mothers_love.ml_authorize(payload, 'moderator', true);
  IF NOT COALESCE((auth_result->>'ok')::boolean, false) THEN
    RETURN auth_result;
  END IF;

  revision_value := COALESCE(payload->>'expectedRevision', payload->>'expectedVersion');
  IF COALESCE(revision_value, '') !~ '^[1-9][0-9]*$' OR pg_catalog.length(revision_value) > 18 THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;
  expected_revision := revision_value::bigint;
  changes := payload->'changes';
  IF changes IS NULL OR pg_catalog.jsonb_typeof(changes) IS DISTINCT FROM 'object' OR changes = '{}'::jsonb THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(changes) AS key_name WHERE key_name <> 'playlist') THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;
  IF NOT changes ? 'playlist' OR NOT mothers_love.ml_color_polish_valid_playlist(changes->'playlist') THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;

  SELECT * INTO presentation_row FROM mothers_love.color_polish_presentation WHERE singleton_id = true FOR UPDATE;
  IF NOT FOUND OR presentation_row.revision <> expected_revision THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 409, 'code', 'STALE');
  END IF;

  UPDATE mothers_love.color_polish_presentation
  SET playlist = changes->'playlist',
      revision = revision + 1,
      updated_at = pg_catalog.clock_timestamp()
  WHERE singleton_id = true;

  SELECT * INTO presentation_row FROM mothers_love.color_polish_presentation WHERE singleton_id = true;
  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'revision', presentation_row.revision,
    'presentation', mothers_love.ml_color_polish_presentation_json()
  );
END
$function$;

CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_presentation_activate(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $function$
DECLARE
  auth_result jsonb;
  settings_row mothers_love.settings%ROWTYPE;
  presentation_row mothers_love.color_polish_presentation%ROWTYPE;
  expected_settings_version bigint;
  expected_revision bigint;
  settings_version_value text;
  revision_value text;
  action_value text;
  enabled_value boolean;
BEGIN
  auth_result := mothers_love.ml_authorize(payload, 'owner', true);
  IF NOT COALESCE((auth_result->>'ok')::boolean, false) THEN
    RETURN auth_result;
  END IF;
  IF payload->>'version' IS DISTINCT FROM 'color-polish-v6' THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;

  settings_version_value := payload->>'expectedSettingsVersion';
  revision_value := COALESCE(payload->>'expectedRevision', payload->>'expectedVersion');
  IF COALESCE(settings_version_value, '') !~ '^[1-9][0-9]*$'
     OR COALESCE(revision_value, '') !~ '^[1-9][0-9]*$'
     OR pg_catalog.length(settings_version_value) > 18
     OR pg_catalog.length(revision_value) > 18 THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;
  expected_settings_version := settings_version_value::bigint;
  expected_revision := revision_value::bigint;
  action_value := payload->>'action';
  IF action_value IS NULL OR action_value NOT IN ('activate', 'rollback') THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;
  enabled_value := action_value = 'activate';

  SELECT * INTO settings_row FROM mothers_love.settings WHERE singleton_id = true FOR UPDATE;
  SELECT * INTO presentation_row FROM mothers_love.color_polish_presentation WHERE singleton_id = true FOR UPDATE;
  IF settings_row.singleton_id IS DISTINCT FROM true
     OR presentation_row.singleton_id IS DISTINCT FROM true
     OR settings_row.version <> expected_settings_version
     OR presentation_row.revision <> expected_revision
     OR presentation_row.version IS DISTINCT FROM 'color-polish-v6'
     OR NOT mothers_love.ml_color_polish_valid_playlist(presentation_row.playlist) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'status', 409, 'code', 'STALE');
  END IF;

  UPDATE mothers_love.color_polish_presentation
  SET enabled = enabled_value,
      revision = revision + 1,
      updated_at = pg_catalog.clock_timestamp()
  WHERE singleton_id = true;
  UPDATE mothers_love.settings
  SET version = version + 1,
      updated_at = pg_catalog.clock_timestamp()
  WHERE singleton_id = true;
  INSERT INTO mothers_love.display_events (event_kind, payload)
  VALUES ('settings', mothers_love.ml_settings_json());

  SELECT * INTO presentation_row FROM mothers_love.color_polish_presentation WHERE singleton_id = true;
  SELECT version INTO expected_settings_version FROM mothers_love.settings WHERE singleton_id = true;
  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'action', action_value,
    'revision', presentation_row.revision,
    'settingsVersion', expected_settings_version,
    'presentation', mothers_love.ml_color_polish_presentation_json()
  );
END
$function$;

REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_default_playlist() FROM PUBLIC;
REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_valid_playlist(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_presentation_json() FROM PUBLIC;
REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_expression_counts(date, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_aggregate_json(date, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_presentation_get(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_presentation_patch(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_presentation_activate(jsonb) FROM PUBLIC;

DO $color_polish_private_function_acl$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role', 'mothers_love_runtime'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_default_playlist() FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_valid_playlist(jsonb) FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_presentation_json() FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_expression_counts(date, date, date) FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_aggregate_json(date, date, date) FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_presentation_get(jsonb) FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_presentation_patch(jsonb) FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION mothers_love.ml_color_polish_presentation_activate(jsonb) FROM %I', role_name);
    END IF;
  END LOOP;
END
$color_polish_private_function_acl$;

REVOKE ALL ON FUNCTION public.ml_color_polish_snapshot(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.ml_color_polish_presentation_get(payload jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $function$
  SELECT mothers_love.ml_color_polish_presentation_get(payload)
$function$;

CREATE OR REPLACE FUNCTION public.ml_color_polish_presentation_patch(payload jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $function$
  SELECT mothers_love.ml_color_polish_presentation_patch(payload)
$function$;

CREATE OR REPLACE FUNCTION public.ml_color_polish_presentation_activate(payload jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $function$
  SELECT mothers_love.ml_color_polish_presentation_activate(payload)
$function$;

REVOKE ALL ON FUNCTION public.ml_color_polish_presentation_get(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ml_color_polish_presentation_patch(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ml_color_polish_presentation_activate(jsonb) FROM PUBLIC;

DO $color_polish_bridge_acl$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION public.ml_color_polish_snapshot(text) FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION public.ml_color_polish_presentation_get(jsonb) FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION public.ml_color_polish_presentation_patch(jsonb) FROM %I', role_name);
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION public.ml_color_polish_presentation_activate(jsonb) FROM %I', role_name);
    END IF;
  END LOOP;
END
$color_polish_bridge_acl$;

GRANT EXECUTE ON FUNCTION public.ml_color_polish_snapshot(text) TO mothers_love_runtime;
GRANT EXECUTE ON FUNCTION public.ml_color_polish_presentation_get(jsonb) TO mothers_love_runtime;
GRANT EXECUTE ON FUNCTION public.ml_color_polish_presentation_patch(jsonb) TO mothers_love_runtime;
GRANT EXECUTE ON FUNCTION public.ml_color_polish_presentation_activate(jsonb) TO mothers_love_runtime;
