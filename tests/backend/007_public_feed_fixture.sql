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

DO $limit_fixture$
DECLARE
  index_value integer;
  recognition_id uuid;
  published_at timestamptz;
BEGIN
  FOR index_value IN 1..55 LOOP
    recognition_id := format('00000000-0000-4000-8000-%s', lpad(to_hex(1000 + index_value), 12, '0'))::uuid;
    published_at := clock_timestamp() - ((55 - index_value) * interval '1 second');
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
  function_definition text;
BEGIN
  result := public.ml_public_feed();
  IF result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'healthy feed failed: %', result; END IF;
  IF result ? 'status' OR result ? 'error' THEN RAISE EXCEPTION 'successful feed leaked error fields: %', result; END IF;
  IF jsonb_array_length(result->'items') IS DISTINCT FROM 50 THEN RAISE EXCEPTION 'feed was not limited to 50: %', result; END IF;

  FOR index_value IN 0..49 LOOP
    expected_id := format('00000000-0000-4000-8000-%s', lpad(to_hex(1000 + 55 - index_value), 12, '0'));
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

  SELECT pg_catalog.pg_get_functiondef('public.ml_public_feed()'::regprocedure) INTO function_definition;
  IF function_definition NOT LIKE '%SECURITY DEFINER%'
     OR function_definition NOT LIKE '%' || 'SET search_path = ' || pg_catalog.quote_literal('') || '%' THEN
    RAISE EXCEPTION 'feed function is not hardened: %', function_definition;
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

ROLLBACK;
