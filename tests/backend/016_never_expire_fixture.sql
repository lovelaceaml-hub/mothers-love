-- Synthetic scratch-database fixture. Split at the marker and apply 016 between parts.
-- PART 1: seed
BEGIN;

DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM mothers_love.recognitions) THEN
    RAISE EXCEPTION '016 fixture requires an empty recognition table';
  END IF;
END
$preflight$;

UPDATE mothers_love.settings
SET collection_open = true, mode = 'normal', last_cleanup_at = clock_timestamp();

INSERT INTO mothers_love.recognitions
  (id, submitted_name, recipient, message, status, created_at, first_published_at,
   expires_at, featured, feature_until)
VALUES
  ('00000000-0000-4000-8000-000000000201', 'Test Sender 1', 'Test Recipient 1', 'Synthetic message 1',
   'published', now() - interval '1 day', now() - interval '1 day', now() + interval '7 days',
   true, now() + interval '7 days'),
  ('00000000-0000-4000-8000-000000000202', 'Test Sender 2', 'Test Recipient 2', 'Synthetic message 2',
   'held', now() - interval '1 day', NULL, now() + interval '7 days', false, NULL),
  ('00000000-0000-4000-8000-000000000203', 'Test Sender 3', 'Test Recipient 3', 'Synthetic message 3',
   'published', now() - interval '1 day', now() - interval '1 day', now() + interval '7 days', false, NULL);

INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id)
VALUES ('00000000-0000-4000-8000-000000000201', 2),
       ('00000000-0000-4000-8000-000000000202', 3),
       ('00000000-0000-4000-8000-000000000203', 4);

INSERT INTO mothers_love.recognitions_archive
  (id, submitted_name, recipient, message, status, reason_category, created_at,
   first_published_at, expires_at, version, featured, updated_at, expression_ids, heart_count)
VALUES
  ('00000000-0000-4000-8000-000000000204', 'Test Sender 4', 'Test Recipient 4',
   'Synthetic message 4', 'hidden', 'privacy', now() - interval '10 days',
   now() - interval '10 days', now() - interval '3 days', 3, true,
   now() - interval '3 days', ARRAY[2, 6]::smallint[], 5);

COMMIT;

-- APPLY 016 HERE

-- PART 2: assertions
BEGIN;

DO $retention_assertions$
DECLARE
  api_definition text;
  far_expiry timestamptz;
BEGIN
  IF (SELECT count(*) FROM mothers_love.recognitions) <> 4 THEN
    RAISE EXCEPTION '016 did not retain and restore all four recognitions';
  END IF;
  IF EXISTS (SELECT 1 FROM mothers_love.recognitions WHERE expires_at <= now() + interval '99 years') THEN
    RAISE EXCEPTION '016 did not extend every recognition expiry';
  END IF;
  SELECT feature_until INTO far_expiry FROM mothers_love.recognitions
  WHERE id = '00000000-0000-4000-8000-000000000201';
  IF far_expiry <= now() + interval '99 years' THEN
    RAISE EXCEPTION '016 did not extend the featured recognition';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM mothers_love.recognitions r
    WHERE r.id = '00000000-0000-4000-8000-000000000204'
      AND r.status = 'hidden' AND r.reason_category = 'privacy'
      AND r.version = 3 AND r.featured = false AND r.feature_until IS NULL
  ) THEN
    RAISE EXCEPTION '016 did not restore archived recognition fields';
  END IF;
  IF (SELECT array_agg(expression_id ORDER BY expression_id)
      FROM mothers_love.recognition_expressions
      WHERE recognition_id = '00000000-0000-4000-8000-000000000204')
      IS DISTINCT FROM ARRAY[2, 6]::smallint[] THEN
    RAISE EXCEPTION '016 did not restore both archived expressions';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM mothers_love.contribution_state cs
    JOIN mothers_love.recognitions r ON r.id = cs.recognition_id
    WHERE cs.recognition_id = '00000000-0000-4000-8000-000000000204'
      AND cs.period_start = (r.first_published_at AT TIME ZONE 'America/Los_Angeles')::date
      AND cs.contribution = ARRAY[1, 0, 1, 0, 0, 0, 1, 0, 0, 0]
  ) THEN
    RAISE EXCEPTION '016 did not rebuild the restored contribution record';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM mothers_love.recognitions_archive
                 WHERE id = '00000000-0000-4000-8000-000000000204') THEN
    RAISE EXCEPTION '016 removed the archive row';
  END IF;
  SELECT pg_catalog.pg_get_functiondef('public.ml_api(text, jsonb)'::regprocedure)
  INTO api_definition;
  IF (length(api_definition) - length(replace(api_definition, $anchor$now_value + interval '100 years')$anchor$, '')))
      / length($anchor$now_value + interval '100 years')$anchor$) <> 1 THEN
    RAISE EXCEPTION '016 recognition insert replacement is absent or duplicated';
  END IF;
  IF (length(api_definition) - length(replace(api_definition, $anchor$LEAST(rec.expires_at, now_value + interval '168 hours')$anchor$, '')))
      / length($anchor$LEAST(rec.expires_at, now_value + interval '168 hours')$anchor$) <> 1 THEN
    RAISE EXCEPTION '016 admin event replacement is absent or duplicated';
  END IF;
  IF api_definition NOT LIKE '%CASE WHEN hold THEN ''held'' ELSE ''published'' END, expires_value)%' THEN
    RAISE EXCEPTION '016 changed the idempotency key expiry';
  END IF;
END
$retention_assertions$;

UPDATE mothers_love.settings SET last_cleanup_at = NULL;
DO $null_cleanup$
BEGIN
  IF mothers_love.ml_purge_healthy(now()) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'NULL cleanup time should not close collection';
  END IF;
END
$null_cleanup$;

UPDATE mothers_love.settings SET last_cleanup_at = now() - interval '1 day';
DO $old_cleanup$
BEGIN
  IF mothers_love.ml_purge_healthy(now()) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'old cleanup time should not close collection';
  END IF;
END
$old_cleanup$;

INSERT INTO mothers_love.recognitions
  (id, submitted_name, recipient, message, status, created_at, expires_at)
VALUES ('00000000-0000-4000-8000-000000000205', 'Test Sender 5', 'Test Recipient 5',
        'Synthetic message 5', 'held', now() - interval '2 days', now() - interval '1 day');
DO $overdue_check$
BEGIN
  IF mothers_love.ml_purge_healthy(now()) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'an overdue recognition must fail the health check';
  END IF;
END
$overdue_check$;
DELETE FROM mothers_love.recognitions WHERE id = '00000000-0000-4000-8000-000000000205';

SELECT 'ok 016 fixture';
ROLLBACK;
