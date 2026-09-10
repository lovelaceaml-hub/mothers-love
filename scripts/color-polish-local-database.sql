-- Synthetic integration checks. Run only in the isolated local test cluster.
BEGIN;
DO $guard$
BEGIN
  IF current_setting('port') <> '55436' OR inet_server_addr() <> '127.0.0.1'::inet THEN
    RAISE EXCEPTION 'This fixture requires the dedicated local test cluster';
  END IF;
END
$guard$;

UPDATE mothers_love.settings SET last_cleanup_at = clock_timestamp(),
  overdue_purge_count = 0, submission_url = 'https://mothers-love.vercel.app/recognize';

DO $checks$
DECLARE
  today date := (clock_timestamp() AT TIME ZONE 'America/Los_Angeles')::date;
  sunday date;
  result jsonb;
  original_config jsonb;
  version_before bigint;
  preset_revision bigint;
  owner_payload jsonb := '{"actor":{"userId":"00000000-0000-4000-8000-000000000001"}}';
  moderator_payload jsonb := '{"actor":{"userId":"00000000-0000-4000-8000-000000000002"}}';
BEGIN
  sunday := today - extract(dow FROM today)::integer;
  result := public.ml_color_polish_snapshot(NULL);
  ASSERT result->>'ok' = 'true', 'zero-activity snapshot failed';
  ASSERT result#>>'{presentation,enabled}' = 'false', 'preset must start disabled';
  ASSERT result#>>'{insights,goal,expressionId}' = '1', 'zero tie must pick first expression';
  ASSERT result#>>'{insights,goal,target}' = '1', 'zero target must be one';
  ASSERT jsonb_array_length(result->'recognitions') = 0, 'test database must contain no recognition records';

  -- Reset only the local anonymous fixture before testing nonzero first use.
  DELETE FROM mothers_love.color_polish_weekly_focus WHERE week_start = sunday;
  INSERT INTO mothers_love.daily_aggregates(period_start,period_end,recognitions,expression_counts,expression_total,revision)
  VALUES(sunday - 1,sunday - 1,5,ARRAY[5,0,0,0,0,0,0,0,0],5,1),
        (today,today,8,ARRAY[8,1,7,6,5,4,3,2,1],37,2);
  result := public.ml_color_polish_snapshot(NULL);
  ASSERT result->>'ok' = 'true', 'nonzero snapshot failed';
  ASSERT result#>>'{insights,goal,expressionId}' = '2', 'official order tie failed';
  ASSERT result#>>'{insights,goal,target}' = '6', 'fourth-highest-other target failed';
  ASSERT result#>>'{insights,goal,value}' = '1', 'verified progress failed';

  UPDATE mothers_love.daily_aggregates SET expression_counts = ARRAY[0,5,0,0,0,0,0,0,0] WHERE period_start = sunday - 1;
  UPDATE mothers_love.daily_aggregates SET expression_counts = ARRAY[8,6,7,6,5,4,3,2,1], expression_total = 42 WHERE period_start = today;
  result := public.ml_color_polish_snapshot(NULL);
  ASSERT result#>>'{insights,goal,expressionId}' = '2', 'focus changed after freeze';
  ASSERT result#>>'{insights,goal,achieved}' = 'true', 'live progress did not update';
  ASSERT jsonb_array_length(result->'recognitions') = 0, 'historical totals must not require personal records';

  INSERT INTO mothers_love.admin_memberships(user_id,role) VALUES
    ('00000000-0000-4000-8000-000000000001','owner'),
    ('00000000-0000-4000-8000-000000000002','moderator');
  result := public.ml_color_polish_presentation_get('{}');
  ASSERT result->>'status' = '401', 'anonymous admin access accepted';
  result := public.ml_color_polish_presentation_get(moderator_payload);
  ASSERT result->>'ok' = 'true', 'moderator get failed';
  preset_revision := (result->>'revision')::bigint;
  result := public.ml_color_polish_presentation_patch(moderator_payload || jsonb_build_object('expectedRevision',preset_revision,'changes',jsonb_build_object('enabled',true)));
  ASSERT result->>'ok' IS DISTINCT FROM 'true', 'moderator bypassed activation';
  SELECT to_jsonb(s), version INTO original_config, version_before FROM mothers_love.settings s;
  result := public.ml_color_polish_presentation_activate(moderator_payload || jsonb_build_object('version','color-polish-v6','expectedRevision',preset_revision,'expectedSettingsVersion',version_before,'action','activate'));
  ASSERT result->>'status' = '403', 'moderator activation accepted';
  result := public.ml_color_polish_presentation_activate(owner_payload || jsonb_build_object('version','color-polish-v6','expectedRevision',preset_revision,'expectedSettingsVersion',version_before,'action','activate'));
  ASSERT result->>'ok' = 'true', 'owner activation failed';
  ASSERT result#>>'{presentation,enabled}' = 'true', 'activation did not enable';
  ASSERT (SELECT to_jsonb(s) - 'version' - 'updated_at' FROM mothers_love.settings s) = original_config - 'version' - 'updated_at', 'legacy settings changed';
  result := public.ml_color_polish_presentation_activate(owner_payload || jsonb_build_object('version','color-polish-v6','expectedRevision',preset_revision,'expectedSettingsVersion',version_before,'action','rollback'));
  ASSERT result->>'status' = '409', 'stale activation accepted';
  result := public.ml_color_polish_presentation_activate(owner_payload || jsonb_build_object('version','color-polish-v6','expectedRevision',preset_revision+1,'expectedSettingsVersion',version_before+1,'action','rollback'));
  ASSERT result->>'ok' = 'true' AND result#>>'{presentation,enabled}' = 'false', 'version checked rollback failed';
  RAISE NOTICE 'PASS: zero, ties, weekly freeze, dynamic goal, anonymous history, authorization, activation, stale version, rollback';
END
$checks$;
ROLLBACK;
