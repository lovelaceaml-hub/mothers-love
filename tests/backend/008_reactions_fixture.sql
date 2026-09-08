-- Rollback-only synthetic reaction fixture.
-- Never run this file against production or with real recognition content.
BEGIN;

DO $reaction_preflight$
BEGIN
  IF to_regprocedure('public.ml_reactions_get(jsonb,text)') IS NULL
     OR to_regprocedure('public.ml_reactions_set(uuid,text,boolean,text)') IS NULL THEN
    RAISE EXCEPTION 'reaction bridge functions are missing';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM mothers_love.recognitions
    WHERE id IN (
      '00000000-0000-4000-8000-000000008010'::uuid,
      '00000000-0000-4000-8000-000000008011'::uuid,
      '00000000-0000-4000-8000-000000008012'::uuid,
      '00000000-0000-4000-8000-000000008013'::uuid
    )
  ) THEN
    RAISE EXCEPTION 'reaction fixture IDs already exist';
  END IF;
END
$reaction_preflight$;

UPDATE mothers_love.settings
SET mode = 'normal',
    last_cleanup_at = clock_timestamp(),
    overdue_purge_count = 0;

INSERT INTO mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at)
VALUES
  ('00000000-0000-4000-8000-000000008010', 'Synthetic Reaction Sender A.', 'Synthetic Reaction Recipient A.', 'Synthetic reaction fixture A.', 'published', clock_timestamp() - interval '1 hour', clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 hour'),
  ('00000000-0000-4000-8000-000000008011', 'Synthetic Reaction Sender B.', 'Synthetic Reaction Recipient B.', 'Synthetic reaction fixture B.', 'hidden', clock_timestamp() - interval '1 hour', clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 hour'),
  ('00000000-0000-4000-8000-000000008012', 'Synthetic Reaction Sender C.', 'Synthetic Reaction Recipient C.', 'Synthetic reaction fixture C.', 'held', clock_timestamp() - interval '1 hour', NULL, clock_timestamp() + interval '1 hour'),
  ('00000000-0000-4000-8000-000000008013', 'Synthetic Reaction Sender D.', 'Synthetic Reaction Recipient D.', 'Synthetic reaction fixture D.', 'published', clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours', clock_timestamp() - interval '1 minute');

DO $reaction_projection$
DECLARE
  result jsonb;
BEGIN
  result := public.ml_reactions_get(
    jsonb_build_array(
      '00000000-0000-4000-8000-000000008010',
      '00000000-0000-4000-8000-000000008011',
      '00000000-0000-4000-8000-000000008012',
      '00000000-0000-4000-8000-000000008013'
    ),
    repeat('a', 64)
  );
  IF result->>'ok' IS DISTINCT FROM 'true'
     OR jsonb_array_length(result->'items') IS DISTINCT FROM 1
     OR result->'items'->0->>'id' IS DISTINCT FROM '00000000-0000-4000-8000-000000008010'
     OR result->'items'->0->>'count' IS DISTINCT FROM '0'
     OR result->'items'->0->>'liked' IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'eligible-only reaction projection failed: %', result;
  END IF;

  result := public.ml_reactions_get('null'::jsonb, repeat('a', 64));
  IF result->>'code' IS DISTINCT FROM 'INVALID_REQUEST' THEN RAISE EXCEPTION 'null request was accepted: %', result; END IF;
  result := public.ml_reactions_get('"not-an-array"'::jsonb, repeat('a', 64));
  IF result->>'code' IS DISTINCT FROM 'INVALID_REQUEST' THEN RAISE EXCEPTION 'scalar request was accepted: %', result; END IF;
  result := public.ml_reactions_get(jsonb_build_array('00000000-0000-4000-8000-000000008010', '00000000-0000-4000-8000-000000008010'), repeat('a', 64));
  IF result->>'code' IS DISTINCT FROM 'INVALID_REQUEST' THEN RAISE EXCEPTION 'duplicate request was accepted: %', result; END IF;
END
$reaction_projection$;

DO $reaction_runtime$
DECLARE
  result jsonb;
  before_recognitions integer;
  before_expression_total integer;
  before_revision bigint;
  after_recognitions integer;
  after_expression_total integer;
  after_revision bigint;
  index_value integer;
BEGIN
  SELECT COALESCE(sum(recognitions), 0), COALESCE(sum(expression_total), 0), COALESCE(max(revision), 0)
  INTO before_recognitions, before_expression_total, before_revision
  FROM mothers_love.daily_aggregates;

  SET LOCAL ROLE mothers_love_runtime;

  result := public.ml_reactions_set('00000000-0000-4000-8000-000000008010', repeat('a', 64), true, 'reaction-fixture-ip-a');
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'count' IS DISTINCT FROM '1' OR result->>'liked' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'first like failed: %', result; END IF;
  result := public.ml_reactions_set('00000000-0000-4000-8000-000000008010', repeat('a', 64), true, 'reaction-fixture-ip-a');
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'count' IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'repeated like was not idempotent: %', result; END IF;
  result := public.ml_reactions_set('00000000-0000-4000-8000-000000008010', repeat('b', 64), true, 'reaction-fixture-ip-b');
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'count' IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'second browser did not count independently: %', result; END IF;
  result := public.ml_reactions_set('00000000-0000-4000-8000-000000008010', repeat('a', 64), false, 'reaction-fixture-ip-a');
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'count' IS DISTINCT FROM '1' OR result->>'liked' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'unlike failed: %', result; END IF;
  result := public.ml_reactions_set('00000000-0000-4000-8000-000000008010', repeat('a', 64), false, 'reaction-fixture-ip-a');
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'count' IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'repeated unlike was not idempotent: %', result; END IF;

  result := public.ml_reactions_set('00000000-0000-4000-8000-000000008011', repeat('c', 64), true, 'reaction-fixture-ip-c');
  IF result->>'code' IS DISTINCT FROM 'NOT_FOUND' THEN RAISE EXCEPTION 'hidden target accepted a reaction: %', result; END IF;
  result := public.ml_reactions_set('00000000-0000-4000-8000-000000008012', repeat('c', 64), true, 'reaction-fixture-ip-c');
  IF result->>'code' IS DISTINCT FROM 'NOT_FOUND' THEN RAISE EXCEPTION 'held target accepted a reaction: %', result; END IF;
  result := public.ml_reactions_set('00000000-0000-4000-8000-000000008013', repeat('c', 64), true, 'reaction-fixture-ip-c');
  IF result->>'code' IS DISTINCT FROM 'NOT_FOUND' THEN RAISE EXCEPTION 'expired target accepted a reaction: %', result; END IF;

  FOR index_value IN 1..30 LOOP
    result := public.ml_reactions_set('00000000-0000-4000-8000-000000008010', repeat('d', 64), true, format('reaction-fixture-browser-%s', index_value));
    IF result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'reaction write setup failed at %: %', index_value, result; END IF;
  END LOOP;
  result := public.ml_reactions_set('00000000-0000-4000-8000-000000008010', repeat('d', 64), true, 'reaction-fixture-browser-31');
  IF result->>'code' IS DISTINCT FROM 'THROTTLED' OR result->>'retryAfter' IS DISTINCT FROM '60' THEN RAISE EXCEPTION 'browser rate limit failed: %', result; END IF;

  RESET ROLE;

  SELECT COALESCE(sum(recognitions), 0), COALESCE(sum(expression_total), 0), COALESCE(max(revision), 0)
  INTO after_recognitions, after_expression_total, after_revision
  FROM mothers_love.daily_aggregates;
  IF before_recognitions <> after_recognitions
     OR before_expression_total <> after_expression_total
     OR before_revision <> after_revision THEN
    RAISE EXCEPTION 'reaction writes changed campaign totals: before %, %, % after %, %, %', before_recognitions, before_expression_total, before_revision, after_recognitions, after_expression_total, after_revision;
  END IF;
END
$reaction_runtime$;

DO $reaction_health$
DECLARE
  result jsonb;
BEGIN
  UPDATE mothers_love.settings SET mode = 'neutral';
  result := public.ml_reactions_get(jsonb_build_array('00000000-0000-4000-8000-000000008010'), repeat('a', 64));
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->'items' IS DISTINCT FROM '[]'::jsonb THEN RAISE EXCEPTION 'neutral read did not clear items: %', result; END IF;
  UPDATE mothers_love.settings SET mode = 'normal', last_cleanup_at = clock_timestamp() - interval '3 minutes';
  result := public.ml_reactions_get(jsonb_build_array('00000000-0000-4000-8000-000000008010'), repeat('a', 64));
  IF result->>'code' IS DISTINCT FROM 'UNAVAILABLE' THEN RAISE EXCEPTION 'stale cleanup allowed read: %', result; END IF;
  result := public.ml_reactions_set('00000000-0000-4000-8000-000000008010', repeat('e', 64), true, 'reaction-fixture-ip-e');
  IF result->>'code' IS DISTINCT FROM 'UNAVAILABLE' THEN RAISE EXCEPTION 'stale cleanup allowed write: %', result; END IF;
  UPDATE mothers_love.settings SET mode = 'normal', last_cleanup_at = clock_timestamp();
END
$reaction_health$;

DO $reaction_cascade$
BEGIN
  INSERT INTO mothers_love.recognition_reactions (recognition_id, visitor_hash)
  VALUES ('00000000-0000-4000-8000-000000008011', repeat('f', 64));
  DELETE FROM mothers_love.recognitions WHERE id = '00000000-0000-4000-8000-000000008011';
  IF EXISTS (SELECT 1 FROM mothers_love.recognition_reactions WHERE recognition_id = '00000000-0000-4000-8000-000000008011') THEN
    RAISE EXCEPTION 'reaction row did not cascade on recognition deletion';
  END IF;
END
$reaction_cascade$;

DO $reaction_acl$
DECLARE
  role_name text;
  function_security_definer boolean;
  function_config text[];
BEGIN
  SELECT p.prosecdef, p.proconfig
  INTO function_security_definer, function_config
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.ml_reactions_get(jsonb,text)'::regprocedure;
  IF function_security_definer IS DISTINCT FROM true
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.unnest(COALESCE(function_config, ARRAY[]::text[])) AS config(value) WHERE replace(config.value, ' ', '') IN ('search_path=', $$search_path=""$$, $$search_path=''$$)) THEN
    RAISE EXCEPTION 'reaction getter hardening metadata is incorrect';
  END IF;

  SELECT p.prosecdef, p.proconfig
  INTO function_security_definer, function_config
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.ml_reactions_set(uuid,text,boolean,text)'::regprocedure;
  IF function_security_definer IS DISTINCT FROM true
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.unnest(COALESCE(function_config, ARRAY[]::text[])) AS config(value) WHERE replace(config.value, ' ', '') IN ('search_path=', $$search_path=""$$, $$search_path=''$$)) THEN
    RAISE EXCEPTION 'reaction setter hardening metadata is incorrect';
  END IF;

  IF has_table_privilege('mothers_love_runtime', 'mothers_love.recognition_reactions', 'SELECT')
     OR has_table_privilege('mothers_love_runtime', 'mothers_love.recognition_reactions', 'INSERT') THEN
    RAISE EXCEPTION 'runtime role can access reaction table directly';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name)
       AND (has_function_privilege(role_name, 'public.ml_reactions_get(jsonb,text)', 'EXECUTE') OR has_function_privilege(role_name, 'public.ml_reactions_set(uuid,text,boolean,text)', 'EXECUTE')) THEN
      RAISE EXCEPTION 'role % can execute reaction bridge', role_name;
    END IF;
  END LOOP;
  IF has_function_privilege('mothers_love_runtime', 'public.ml_reactions_get(jsonb,text)', 'EXECUTE') IS DISTINCT FROM true
     OR has_function_privilege('mothers_love_runtime', 'public.ml_reactions_set(uuid,text,boolean,text)', 'EXECUTE') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'runtime role lacks reaction bridge execution';
  END IF;
END
$reaction_acl$;

ROLLBACK;
