-- Rollback-only synthetic fixture for the public TV snapshot bridge.
-- Never run this file against production or with real recognition content.
BEGIN;

DO $public_display_preflight$
BEGIN
  IF pg_catalog.to_regprocedure('public.ml_public_display_snapshot(text)') IS NULL THEN
    RAISE EXCEPTION 'public display snapshot bridge is missing';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM mothers_love.recognitions
    WHERE id IN (
      '00000000-0000-4000-8000-000000000010'::uuid,
      '00000000-0000-4000-8000-000000000011'::uuid,
      '00000000-0000-4000-8000-000000000012'::uuid,
      '00000000-0000-4000-8000-000000000013'::uuid,
      '00000000-0000-4000-8000-000000000014'::uuid
    )
  ) THEN
    RAISE EXCEPTION 'public display fixture IDs already exist';
  END IF;
END
$public_display_preflight$;

UPDATE mothers_love.settings
SET mode = 'normal',
    collection_open = false,
    last_cleanup_at = clock_timestamp(),
    overdue_purge_count = 0,
    submission_url = 'https://mothers-love.example/recognize';

INSERT INTO mothers_love.recognitions (id, submitted_name, recipient, message, status, reason_category, created_at, first_published_at, expires_at, featured)
VALUES
  ('00000000-0000-4000-8000-000000000010', 'Synthetic Sender Private A.', 'Synthetic Recipient A.', 'Synthetic featured display fixture.', 'published', NULL, clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours', clock_timestamp() + interval '1 hour', true),
  ('00000000-0000-4000-8000-000000000011', 'Synthetic Sender Private B.', 'Synthetic Recipient B.', 'Synthetic newest display fixture.', 'published', NULL, clock_timestamp() - interval '1 hour', clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 hour', false),
  ('00000000-0000-4000-8000-000000000012', 'Synthetic Sender Private C.', 'Synthetic Recipient C.', 'Synthetic hidden display fixture.', 'hidden', 'privacy', clock_timestamp() - interval '50 minutes', clock_timestamp() - interval '50 minutes', clock_timestamp() + interval '1 hour', false),
  ('00000000-0000-4000-8000-000000000013', 'Synthetic Sender Private D.', 'Synthetic Recipient D.', 'Synthetic held display fixture.', 'held', 'safety', clock_timestamp() - interval '40 minutes', NULL, clock_timestamp() + interval '1 hour', false),
  ('00000000-0000-4000-8000-000000000014', 'Synthetic Sender Private E.', 'Synthetic Recipient E.', 'Synthetic expired display fixture.', 'published', NULL, clock_timestamp() - interval '10 minutes', clock_timestamp() - interval '10 minutes', clock_timestamp() - interval '1 minute', false);

INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id)
VALUES
  ('00000000-0000-4000-8000-000000000010', 2),
  ('00000000-0000-4000-8000-000000000010', 6),
  ('00000000-0000-4000-8000-000000000011', 3),
  ('00000000-0000-4000-8000-000000000012', 4),
  ('00000000-0000-4000-8000-000000000013', 5);

INSERT INTO mothers_love.display_events (recognition_id, event_kind, recognition_version, payload, created_at, expires_at)
VALUES
  ('00000000-0000-4000-8000-000000000010', 'published', 1, '{}'::jsonb, clock_timestamp() - interval '2 hours', clock_timestamp() + interval '1 hour'),
  ('00000000-0000-4000-8000-000000000011', 'published', 1, '{}'::jsonb, clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 hour');

DO $initial_display_assertions$
DECLARE
  result jsonb;
BEGIN
  result := public.ml_public_display_snapshot(NULL);
  IF result->>'ok' IS DISTINCT FROM 'true'
     OR result->>'sync' IS DISTINCT FROM 'reset'
     OR jsonb_array_length(result->'recognitions') IS DISTINCT FROM 2
     OR jsonb_array_length(result->'arrivals') IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'initial public display snapshot failed: %', result;
  END IF;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(result)) IS DISTINCT FROM 10
     OR NOT (result ? 'ok' AND result ? 'serverTime' AND result ? 'revision'
             AND result ? 'recognitions' AND result ? 'aggregate' AND result ? 'settings'
             AND result ? 'submissionUrl' AND result ? 'cursor' AND result ? 'sync' AND result ? 'arrivals') THEN
    RAISE EXCEPTION 'public display snapshot top-level keys changed: %', result;
  END IF;
  IF result->'recognitions'->0->>'id' IS DISTINCT FROM '00000000-0000-4000-8000-000000000010'
     OR result->'recognitions'->1->>'id' IS DISTINCT FROM '00000000-0000-4000-8000-000000000011' THEN
    RAISE EXCEPTION 'featured-first display ordering failed: %', result;
  END IF;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(result->'recognitions'->0)) IS DISTINCT FROM 10
     OR result::text ~ 'submittedName|submitted_name|reason_category|private' THEN
    RAISE EXCEPTION 'private recognition fields leaked: %', result;
  END IF;
  IF result::text LIKE '%00000000-0000-4000-8000-000000000012%'
     OR result::text LIKE '%00000000-0000-4000-8000-000000000013%'
     OR result::text LIKE '%00000000-0000-4000-8000-000000000014%' THEN
    RAISE EXCEPTION 'hidden, held, or expired records leaked: %', result;
  END IF;
END
$initial_display_assertions$;

DO $bounded_display_fixture$
DECLARE
  index_value integer;
  recognition_id uuid;
  published_at timestamptz;
  base_time timestamptz := clock_timestamp();
BEGIN
  FOR index_value IN 1..1001 LOOP
    recognition_id := format('00000000-0000-4000-8000-%s', lpad(to_hex(4096 + index_value), 12, '0'))::uuid;
    published_at := base_time - ((1001 - index_value) * interval '1 second');
    INSERT INTO mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at)
    VALUES (recognition_id, format('Synthetic Sender Private %s.', index_value), format('Synthetic Recipient %s.', index_value), format('Synthetic bounded display item %s.', index_value), 'published', published_at, published_at, base_time + interval '1 hour');
    INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id) VALUES (recognition_id, 2), (recognition_id, 6);
    INSERT INTO mothers_love.display_events (recognition_id, event_kind, recognition_version, payload, created_at, expires_at)
    VALUES (recognition_id, 'published', 1, '{}'::jsonb, published_at, base_time + interval '1 hour');
  END LOOP;
END
$bounded_display_fixture$;

DO $bounded_display_assertions$
DECLARE
  result jsonb;
  delta_result jsonb;
  invalid_result jsonb;
  old_result jsonb;
  future_result jsonb;
  latest_event bigint;
  epoch_value bigint;
  arrival jsonb;
BEGIN
  SELECT pg_catalog.max(event_id), pg_catalog.floor(EXTRACT(epoch FROM clock_timestamp()))::bigint
  INTO latest_event, epoch_value
  FROM mothers_love.display_events;

  result := public.ml_public_display_snapshot(format('0.%s', epoch_value));
  IF result->>'ok' IS DISTINCT FROM 'true'
     OR result->>'sync' IS DISTINCT FROM 'delta'
     OR jsonb_array_length(result->'recognitions') IS DISTINCT FROM 1000
     OR jsonb_array_length(result->'arrivals') IS DISTINCT FROM 1000 THEN
    RAISE EXCEPTION 'bounded public display result failed: %', result;
  END IF;
  IF result->'recognitions'->0->>'id' IS DISTINCT FROM '00000000-0000-4000-8000-000000000010'
     OR result::text ~ 'submittedName|submitted_name|reason_category' THEN
    RAISE EXCEPTION 'bounded public display projection failed: %', result;
  END IF;
  FOR arrival IN SELECT value FROM jsonb_array_elements(result->'arrivals') LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(result->'recognitions') AS item
      WHERE item->>'id' = arrival->>'recognitionId'
    ) THEN
      RAISE EXCEPTION 'arrival referenced an unreturned recognition: %', arrival;
    END IF;
  END LOOP;

  delta_result := public.ml_public_display_snapshot(format('%s.%s', latest_event - 1, epoch_value));
  IF delta_result->>'ok' IS DISTINCT FROM 'true' OR delta_result->>'sync' IS DISTINCT FROM 'delta' THEN
    RAISE EXCEPTION 'valid delta cursor was not accepted: %', delta_result;
  END IF;

  invalid_result := public.ml_public_display_snapshot(format('%s.%s', repeat('9', 64), epoch_value));
  IF invalid_result->>'ok' IS DISTINCT FROM 'true' OR invalid_result->>'sync' IS DISTINCT FROM 'reset' THEN
    RAISE EXCEPTION 'overflow cursor did not reset safely: %', invalid_result;
  END IF;
  old_result := public.ml_public_display_snapshot(format('0.%s', epoch_value - (8 * 24 * 60 * 60)));
  IF old_result->>'sync' IS DISTINCT FROM 'reset' THEN
    RAISE EXCEPTION 'old cursor did not reset: %', old_result;
  END IF;
  future_result := public.ml_public_display_snapshot(format('%s.%s', latest_event + 1, epoch_value + 3600));
  IF future_result->>'sync' IS DISTINCT FROM 'reset' THEN
    RAISE EXCEPTION 'future cursor did not reset: %', future_result;
  END IF;
END
$bounded_display_assertions$;

DO $arrival_overflow_assertions$
DECLARE
  index_value integer;
  cursor_before text;
  overflow_result jsonb;
  normal_delta_result jsonb;
  expected_recognition_id constant uuid := '00000000-0000-4000-8000-000000000010'::uuid;
BEGIN
  -- Use a currently returned featured recognition, so all 1,001 events are
  -- eligible arrivals rather than events omitted by the 1,000-record snapshot cap.
  cursor_before := public.ml_public_display_snapshot(NULL)->>'cursor';
  FOR index_value IN 1..1001 LOOP
    INSERT INTO mothers_love.display_events (recognition_id, event_kind, recognition_version, payload, created_at, expires_at)
    VALUES (expected_recognition_id, 'published', 1, '{}'::jsonb, clock_timestamp(), clock_timestamp() + interval '1 hour');
  END LOOP;

  overflow_result := public.ml_public_display_snapshot(cursor_before);
  IF overflow_result->>'ok' IS DISTINCT FROM 'true'
     OR overflow_result->>'sync' IS DISTINCT FROM 'reset'
     OR overflow_result->'arrivals' IS DISTINCT FROM '[]'::jsonb
     OR overflow_result->>'cursor' IS NOT DISTINCT FROM cursor_before
     OR jsonb_array_length(overflow_result->'recognitions') IS DISTINCT FROM 1000 THEN
    RAISE EXCEPTION 'arrival overflow did not return a bounded reset: %', overflow_result;
  END IF;

  INSERT INTO mothers_love.display_events (recognition_id, event_kind, recognition_version, payload, created_at, expires_at)
  VALUES (expected_recognition_id, 'published', 1, '{}'::jsonb, clock_timestamp(), clock_timestamp() + interval '1 hour');
  normal_delta_result := public.ml_public_display_snapshot(overflow_result->>'cursor');
  IF normal_delta_result->>'ok' IS DISTINCT FROM 'true'
     OR normal_delta_result->>'sync' IS DISTINCT FROM 'delta'
     OR jsonb_array_length(normal_delta_result->'arrivals') IS DISTINCT FROM 1
     OR normal_delta_result->'arrivals'->0->>'recognitionId' IS DISTINCT FROM expected_recognition_id::text THEN
    RAISE EXCEPTION 'normal delta did not resume after arrival overflow reset: %', normal_delta_result;
  END IF;
END
$arrival_overflow_assertions$;

DO $mode_display_assertions$
DECLARE
  result jsonb;
BEGIN
  UPDATE mothers_love.settings SET mode = 'quiet';
  result := public.ml_public_display_snapshot(NULL);
  IF result->>'ok' IS DISTINCT FROM 'true'
     OR result->>'sync' IS DISTINCT FROM 'reset'
     OR result->'recognitions' IS DISTINCT FROM '[]'::jsonb
     OR result->'arrivals' IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'quiet mode did not suppress display content: %', result;
  END IF;

  UPDATE mothers_love.settings SET mode = 'neutral';
  result := public.ml_public_display_snapshot(NULL);
  IF result->>'ok' IS DISTINCT FROM 'true'
     OR result->'recognitions' IS DISTINCT FROM '[]'::jsonb
     OR result->'arrivals' IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'neutral mode did not suppress display content: %', result;
  END IF;
END
$mode_display_assertions$;

DO $display_health_assertions$
DECLARE
  result jsonb;
BEGIN
  UPDATE mothers_love.settings SET mode = 'normal', last_cleanup_at = clock_timestamp() - interval '3 minutes';
  result := public.ml_public_display_snapshot(NULL);
  IF result->>'ok' IS DISTINCT FROM 'false' OR result->>'status' IS DISTINCT FROM '503' OR result->>'code' IS DISTINCT FROM 'UNAVAILABLE' THEN
    RAISE EXCEPTION 'stale cleanup did not fail closed: %', result;
  END IF;
  UPDATE mothers_love.settings SET last_cleanup_at = clock_timestamp(), overdue_purge_count = 0;
END
$display_health_assertions$;

DO $display_acl_assertions$
DECLARE
  role_name text;
  function_security_definer boolean;
  function_config text[];
BEGIN
  SELECT p.prosecdef, p.proconfig
  INTO function_security_definer, function_config
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.ml_public_display_snapshot(text)'::regprocedure;
  IF function_security_definer IS DISTINCT FROM true
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.unnest(COALESCE(function_config, ARRAY[]::text[])) AS config(value)
       WHERE replace(config.value, ' ', '') IN ('search_path=', $$search_path=""$$, $$search_path=''$$)
     ) THEN
    RAISE EXCEPTION 'public display hardening metadata is incorrect';
  END IF;
  IF has_function_privilege('mothers_love_runtime', 'public.ml_public_display_snapshot(text)', 'EXECUTE') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'runtime role lacks public display execution';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name)
       AND has_function_privilege(role_name, 'public.ml_public_display_snapshot(text)', 'EXECUTE') IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'role % can execute public display bridge', role_name;
    END IF;
  END LOOP;
END
$display_acl_assertions$;

DO $display_runtime_write_assertions$
DECLARE
  result jsonb;
  devices_before bigint;
  sessions_before bigint;
  devices_after bigint;
  sessions_after bigint;
BEGIN
  SELECT count(*) INTO devices_before FROM mothers_love.devices;
  SELECT count(*) INTO sessions_before FROM mothers_love.display_sessions;
  UPDATE mothers_love.settings SET mode = 'normal', last_cleanup_at = clock_timestamp();
  SET LOCAL ROLE mothers_love_runtime;
  result := public.ml_public_display_snapshot(NULL);
  RESET ROLE;
  SELECT count(*) INTO devices_after FROM mothers_love.devices;
  SELECT count(*) INTO sessions_after FROM mothers_love.display_sessions;
  IF result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'runtime role could not read public display: %', result; END IF;
  IF devices_before IS DISTINCT FROM devices_after OR sessions_before IS DISTINCT FROM sessions_after THEN
    RAISE EXCEPTION 'public display read changed devices or sessions';
  END IF;
END
$display_runtime_write_assertions$;

ROLLBACK;
