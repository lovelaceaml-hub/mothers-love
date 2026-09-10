-- ONE PASTE for Anthony: Supabase SQL editor, project cvuwdlmlukepwfffpgdu, click Run.
-- Part 1 applies migration 012 (read-first weekly focus, identical outputs, same grants) and records it in the campaign ledger.
-- Part 2 switches Color Polish on for the verified Owner, with every precondition checked (settings version 5, preset off,
-- valid playlist, healthy cleanup, exactly one verified Owner). If any check fails the whole run raises and NOTHING changes.
-- Expected final row: settings_version 6, enabled true, revision 2, cleanup_healthy true, ledger_rows 10.

-- ===== Part 1: migration 012 =====
-- Additive follow-up to 011_color_polish.sql. Replaces only the public
-- snapshot bridge so an ordinary TV or phone read no longer takes a global
-- advisory lock and a write-transaction INSERT every time. Outputs are
-- identical to 011: the weekly focus row is still frozen once per week with
-- the same official-order tie break, the same lock, and the same
-- ON CONFLICT DO NOTHING insert, but only the first reader of the week pays
-- for them. Every later read this week just SELECTs the already-frozen row.
-- No other function, table, grant, or column from 011 changes.

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

REVOKE ALL ON FUNCTION public.ml_color_polish_snapshot(text) FROM PUBLIC;

DO $color_polish_read_path_bridge_acl$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION public.ml_color_polish_snapshot(text) FROM %I', role_name);
    END IF;
  END LOOP;
END
$color_polish_read_path_bridge_acl$;

GRANT EXECUTE ON FUNCTION public.ml_color_polish_snapshot(text) TO mothers_love_runtime;

INSERT INTO mothers_love.schema_migrations(version, sha256)
VALUES ('012_color_polish_read_path', 'c3d6e5e4298bde87867b8c431276fa4201133c5c6f10b068a974e1990e9204ab')
ON CONFLICT DO NOTHING;

-- ===== Part 2: activation =====
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
       mothers_love.ml_purge_healthy(clock_timestamp()) AS cleanup_healthy,
       (SELECT count(*) FROM mothers_love.schema_migrations) AS ledger_rows,
       (public.ml_color_polish_snapshot(NULL))->>'ok' AS snapshot_ok
FROM mothers_love.settings s CROSS JOIN mothers_love.color_polish_presentation p
WHERE s.singleton_id = true AND p.singleton_id = true;
