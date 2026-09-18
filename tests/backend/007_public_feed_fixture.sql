-- Rollback-only public feed boundary fixture for a disposable PostgreSQL database.
-- It uses synthetic rows only. Never run this file against production.
BEGIN;

DO $public_feed_preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM mothers_love.recognitions) THEN
    RAISE EXCEPTION 'public feed fixture requires an empty campaign table';
  END IF;
END
$public_feed_preflight$;

UPDATE mothers_love.settings
SET collection_open = false,
    mode = 'normal',
    last_cleanup_at = clock_timestamp(),
    overdue_purge_count = 0;

INSERT INTO mothers_love.recognitions (id, submitted_name, recipient, message, status, reason_category, created_at, first_published_at, expires_at)
VALUES
  ('00000000-0000-4000-8000-000000000010', 'Synthetic Sender A.', 'Synthetic Recipient A.', 'Synthetic published fixture.', 'published', NULL, clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours', clock_timestamp() + interval '1 hour'),
  ('00000000-0000-4000-8000-000000000011', 'Synthetic Sender B.', 'Synthetic Recipient B.', 'Synthetic held fixture.', 'held', 'safety', clock_timestamp() - interval '90 minutes', NULL, clock_timestamp() + interval '1 hour'),
  ('00000000-0000-4000-8000-000000000012', 'Synthetic Sender C.', 'Synthetic Recipient C.', 'Synthetic hidden fixture.', 'hidden', 'privacy', clock_timestamp() - interval '80 minutes', clock_timestamp() - interval '80 minutes', clock_timestamp() + interval '1 hour'),
  ('00000000-0000-4000-8000-000000000013', 'Synthetic Sender D.', 'Synthetic Recipient D.', 'Synthetic invalid fixture.', 'invalid', 'spam', clock_timestamp() - interval '70 minutes', clock_timestamp() - interval '70 minutes', clock_timestamp() + interval '1 hour'),
  ('00000000-0000-4000-8000-000000000014', 'Synthetic Sender E.', 'Synthetic Recipient E.', 'Synthetic expired fixture.', 'published', NULL, clock_timestamp() - interval '5 minutes', clock_timestamp() - interval '5 minutes', clock_timestamp() - interval '1 minute');

INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id)
VALUES
  ('00000000-0000-4000-8000-000000000010', 2),
  ('00000000-0000-4000-8000-000000000010', 6),
  ('00000000-0000-4000-8000-000000000012', 3),
  ('00000000-0000-4000-8000-000000000013', 4);

DO $initial_feed_assertions$
DECLARE
  result jsonb;
BEGIN
  result := public.ml_public_feed();
  IF result->>'ok' IS DISTINCT FROM 'true' OR jsonb_array_length(result->'items') IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'initial public feed did not return the one eligible item: %', result;
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(result)) IS DISTINCT FROM 3
     OR NOT (result ? 'items' AND result ? 'ok' AND result ? 'serverTime') THEN
    RAISE EXCEPTION 'initial feed top-level keys changed: %', result;
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(result->'items'->0)) IS DISTINCT FROM 6
     OR NOT (result->'items'->0 ? 'expiresAt'
             AND result->'items'->0 ? 'expressionIds'
             AND result->'items'->0 ? 'firstPublishedAt'
             AND result->'items'->0 ? 'id'
             AND result->'items'->0 ? 'message'
             AND result->'items'->0 ? 'recipient') THEN
    RAISE EXCEPTION 'initial feed item keys changed: %', result;
  END IF;
  IF result->'items'->0->>'id' IS DISTINCT FROM '00000000-0000-4000-8000-000000000010' THEN
    RAISE EXCEPTION 'initial published item was not returned while collection was closed: %', result;
  END IF;
  IF result->'items'->0->'expressionIds' IS DISTINCT FROM '[2, 6]'::jsonb THEN
    RAISE EXCEPTION 'initial expression ordering changed: %', result;
  END IF;
END
$initial_feed_assertions$;

DO $limit_fixture$
DECLARE
  index_value integer;
  recognition_id uuid;
  published_at timestamptz;
BEGIN
  FOR index_value IN 1..105 LOOP
    recognition_id := format('00000000-0000-4000-8000-%s', lpad(to_hex(1000 + index_value), 12, '0'))::uuid;
    published_at := clock_timestamp() - ((105 - index_value) * interval '1 second');
    INSERT INTO mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at)
    VALUES (recognition_id, format('Synthetic Sender %s.', index_value), format('Synthetic Recipient %s.', index_value), format('Synthetic limit item %s.', index_value), 'published', published_at, published_at, clock_timestamp() + interval '1 hour');
    INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id) VALUES (recognition_id, 1), (recognition_id, 8);
  END LOOP;
END
$limit_fixture$;

DO $public_feed_assertions$
DECLARE
  result jsonb;
  expected_id text;
  role_name text;
  index_value integer;
  function_security_definer boolean;
  function_config text[];
BEGIN
  result := public.ml_public_feed();
  IF result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'healthy feed failed: %', result; END IF;
  IF result ? 'status' OR result ? 'error' THEN RAISE EXCEPTION 'successful feed leaked error fields: %', result; END IF;
  IF jsonb_array_length(result->'items') IS DISTINCT FROM 100 THEN RAISE EXCEPTION 'feed was not limited to 100: %', result; END IF;

  FOR index_value IN 0..99 LOOP
    expected_id := format('00000000-0000-4000-8000-%s', lpad(to_hex(1000 + 105 - index_value), 12, '0'));
    IF result->'items'->index_value->>'id' IS DISTINCT FROM expected_id THEN RAISE EXCEPTION 'feed order mismatch at %: %', index_value, result->'items'->index_value; END IF;
    IF result->'items'->index_value->'expressionIds' IS DISTINCT FROM '[1, 8]'::jsonb THEN RAISE EXCEPTION 'expression ordering mismatch: %', result->'items'->index_value; END IF;
  END LOOP;

  IF result::text ~ 'submittedName|submitted_name|reason|status|createdAt|featured|version' THEN RAISE EXCEPTION 'private field leaked from feed: %', result; END IF;
  IF result::text LIKE '%00000000-0000-4000-8000-000000000010%' THEN RAISE EXCEPTION 'older published fixture should fall beyond the bounded page'; END IF;
  IF result::text LIKE '%00000000-0000-4000-8000-000000000011%' OR result::text LIKE '%00000000-0000-4000-8000-000000000012%' OR result::text LIKE '%00000000-0000-4000-8000-000000000013%' OR result::text LIKE '%00000000-0000-4000-8000-000000000014%' THEN RAISE EXCEPTION 'held, hidden, invalid, or expired fixture leaked: %', result; END IF;

  UPDATE mothers_love.settings SET mode = 'neutral';
  result := public.ml_public_feed();
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->'items' IS DISTINCT FROM '[]'::jsonb THEN RAISE EXCEPTION 'neutral mode did not clear personal items: %', result; END IF;

  UPDATE mothers_love.settings SET mode = 'normal', last_cleanup_at = clock_timestamp() - interval '3 minutes';
  result := public.ml_public_feed();
  IF result->>'ok' IS DISTINCT FROM 'false' OR (result->>'status')::integer IS DISTINCT FROM 503 THEN RAISE EXCEPTION 'stale cleanup did not fail closed: %', result; END IF;

  SELECT p.prosecdef, p.proconfig
  INTO function_security_definer, function_config
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.ml_public_feed()'::regprocedure;
  IF function_security_definer IS DISTINCT FROM true
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.unnest(COALESCE(function_config, ARRAY[]::text[])) AS config(value)
       WHERE replace(config.value, ' ', '') IN ('search_path=', $$search_path=""$$, $$search_path=''$$)
     ) THEN
    RAISE EXCEPTION 'feed function hardening metadata is incorrect';
  END IF;
  IF has_function_privilege('mothers_love_runtime', 'public.ml_public_feed()', 'EXECUTE') IS DISTINCT FROM true THEN RAISE EXCEPTION 'runtime role lacks feed execution'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name)
       AND has_function_privilege(role_name, 'public.ml_public_feed()', 'EXECUTE') IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'role % can execute feed function', role_name;
    END IF;
  END LOOP;
END
$public_feed_assertions$;

UPDATE mothers_love.settings SET mode = 'normal', last_cleanup_at = clock_timestamp();

DO $tie_break_fixture$
DECLARE
  tie_at timestamptz := clock_timestamp();
  result jsonb;
BEGIN
  INSERT INTO mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at)
  VALUES
    ('00000000-0000-4000-8000-000000002001', 'Synthetic Sender Tie A.', 'Synthetic Recipient Tie A.', 'Synthetic tie fixture A.', 'published', tie_at, tie_at, tie_at + interval '1 hour'),
    ('00000000-0000-4000-8000-000000002002', 'Synthetic Sender Tie B.', 'Synthetic Recipient Tie B.', 'Synthetic tie fixture B.', 'published', tie_at, tie_at, tie_at + interval '1 hour');
  INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id)
  VALUES ('00000000-0000-4000-8000-000000002001', 1), ('00000000-0000-4000-8000-000000002002', 1);

  result := public.ml_public_feed();
  IF result->'items'->0->>'id' IS DISTINCT FROM '00000000-0000-4000-8000-000000002002'
     OR result->'items'->1->>'id' IS DISTINCT FROM '00000000-0000-4000-8000-000000002001' THEN
    RAISE EXCEPTION 'same-timestamp feed tie-break is not id descending: %', result->'items'->0;
  END IF;
END
$tie_break_fixture$;

SET LOCAL ROLE mothers_love_runtime;
DO $runtime_feed$
DECLARE
  runtime_result jsonb;
BEGIN
  runtime_result := public.ml_public_feed();
  IF runtime_result->>'ok' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'restricted runtime could not execute the feed bridge';
  END IF;
END
$runtime_feed$;
RESET ROLE;

ROLLBACK;
