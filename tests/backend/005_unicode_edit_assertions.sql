-- Unicode parity fixture for database/002_unicode_edit_parity.sql.
-- Synthetic rows are rolled back. Run after the reviewed 001 and 002 SQL
-- artifacts in a disposable PostgreSQL database, never against production.
BEGIN;
SELECT public.ml_purge();
INSERT INTO mothers_love.admin_memberships (user_id, role, active)
VALUES ('00000000-0000-4000-8000-000000000201', 'owner', true)
ON CONFLICT (user_id) DO UPDATE SET role = 'owner', active = true;
UPDATE mothers_love.settings SET collection_open = true;

DO $unicode_fixture$
DECLARE
  actor jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000201', 'email', 'unicode-owner@example.test', 'aal2', true);
  family_message text := repeat('👩‍👩‍👧‍👦', 500);
  edited_message text := repeat('👨‍👩‍👧‍👦', 500);
  request_payload jsonb;
  result jsonb;
  recognition_id uuid;
  aggregate_row mothers_love.daily_aggregates%ROWTYPE;
BEGIN
  IF char_length(family_message) IS DISTINCT FROM 3500 THEN
    RAISE EXCEPTION 'family emoji fixture did not produce 3500 codepoints';
  END IF;
  request_payload := jsonb_build_object(
    'submittedName', 'A. Sender',
    'recipient', 'M. Friend',
    'message', family_message,
    'expressionIds', jsonb_build_array(2),
    'requestKey', 'unicode-edit-0001',
    'payloadHash', 'unicode-edit-hash-0001',
    'hold', false,
    'rateIp', 'unicode-edit-ip',
    'rateContext', 'unicode-edit-context'
  );
  IF octet_length(request_payload::text) >= 16384 THEN
    RAISE EXCEPTION '500 family emoji request exceeded 16 KiB fixture bound';
  END IF;
  result := public.ml_api('submit', request_payload);
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'status' IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION '500 family emoji submit failed';
  END IF;
  recognition_id := (result->>'id')::uuid;

  result := public.ml_api('admin_mutate', jsonb_build_object(
    'actor', actor,
    'id', recognition_id::text,
    'expectedVersion', 1,
    'mutation', 'edit',
    'fields', jsonb_build_object(
      'submittedName', 'A. Sender',
      'recipient', 'M. Friend',
      'message', edited_message,
      'expressionIds', jsonb_build_array(2)
    ),
    'reason', 'correction'
  ));
  IF result->>'ok' IS DISTINCT FROM 'true' OR result->'recognition'->>'version' IS DISTINCT FROM '2' THEN
    RAISE EXCEPTION '500 family emoji admin edit failed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM mothers_love.recognitions r
    WHERE r.id = recognition_id
      AND char_length(r.message) IS NOT DISTINCT FROM 3500
      AND r.message = edited_message
  ) THEN
    RAISE EXCEPTION 'edited family emoji message was not stored';
  END IF;
  SELECT * INTO aggregate_row FROM mothers_love.daily_aggregates WHERE period_start = (now() AT TIME ZONE 'America/Los_Angeles')::date;
  IF NOT FOUND OR aggregate_row.recognitions IS DISTINCT FROM 1 OR aggregate_row.expression_total IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Unicode edit changed contribution counts';
  END IF;
END
$unicode_fixture$;

ROLLBACK;
