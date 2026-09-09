-- Rollback-only synthetic proof that public snapshot revisions do not fall
-- when cascade deletes or the expiry purge remove the greatest event ID.
BEGIN;

DO $public_display_revision_preflight$
BEGIN
  IF pg_catalog.to_regprocedure('public.ml_public_display_snapshot(text)') IS NULL THEN
    RAISE EXCEPTION 'public display snapshot bridge is missing';
  END IF;
  IF pg_catalog.to_regclass('mothers_love.display_events_event_id_seq') IS NULL THEN
    RAISE EXCEPTION 'display event identity sequence is missing';
  END IF;
END
$public_display_revision_preflight$;

UPDATE mothers_love.settings
SET mode = 'normal',
    collection_open = false,
    last_cleanup_at = pg_catalog.clock_timestamp(),
    overdue_purge_count = 0,
    submission_url = 'https://mothers-love.example/recognize';

DO $public_display_revision_fixture$
DECLARE
  before_delete jsonb;
  after_delete jsonb;
  after_next_event jsonb;
  before_purge jsonb;
  after_purge jsonb;
  first_id constant uuid := '00000000-0000-4000-8000-000000000701'::uuid;
  deleted_id constant uuid := '00000000-0000-4000-8000-000000000702'::uuid;
  next_id constant uuid := '00000000-0000-4000-8000-000000000703'::uuid;
  purge_id constant uuid := '00000000-0000-4000-8000-000000000704'::uuid;
  before_delete_max bigint;
  after_delete_max bigint;
  before_purge_max bigint;
  after_purge_max bigint;
  next_event_id bigint;
  now_value timestamptz := pg_catalog.clock_timestamp();
BEGIN
  INSERT INTO mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at)
  VALUES
    (first_id, 'Synthetic Sender Private 701.', 'Synthetic Recipient A.', 'Synthetic first revision fixture.', 'published', now_value - interval '2 minutes', now_value - interval '2 minutes', now_value + interval '1 hour'),
    (deleted_id, 'Synthetic Sender Private 702.', 'Synthetic Recipient B.', 'Synthetic deleted revision fixture.', 'published', now_value - interval '1 minute', now_value - interval '1 minute', now_value + interval '1 hour');
  INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id)
  VALUES (first_id, 2), (deleted_id, 6);
  INSERT INTO mothers_love.display_events (recognition_id, event_kind, recognition_version, payload, created_at, expires_at)
  VALUES
    (first_id, 'published', 1, '{}'::jsonb, now_value - interval '2 minutes', now_value + interval '1 hour'),
    (deleted_id, 'published', 1, '{}'::jsonb, now_value - interval '1 minute', now_value + interval '1 hour');

  before_delete := public.ml_public_display_snapshot(NULL);
  SELECT pg_catalog.max(event_id) INTO before_delete_max FROM mothers_love.display_events;
  DELETE FROM mothers_love.recognitions WHERE id = deleted_id;
  after_delete := public.ml_public_display_snapshot(before_delete->>'cursor');
  SELECT pg_catalog.max(event_id) INTO after_delete_max FROM mothers_love.display_events;
  IF after_delete_max >= before_delete_max
     OR (after_delete->>'revision')::bigint < (before_delete->>'revision')::bigint
     OR after_delete->>'sync' IS DISTINCT FROM 'reset'
     OR after_delete->'recognitions' @> pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id', deleted_id::text)) THEN
    RAISE EXCEPTION 'cascade delete lowered revision or left stale public content: before %, after %', before_delete, after_delete;
  END IF;

  INSERT INTO mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at)
  VALUES (next_id, 'Synthetic Sender Private 703.', 'Synthetic Recipient C.', 'Synthetic next revision fixture.', 'published', now_value, now_value, now_value + interval '1 hour');
  INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id) VALUES (next_id, 3);
  INSERT INTO mothers_love.display_events (recognition_id, event_kind, recognition_version, payload, created_at, expires_at)
  VALUES (next_id, 'published', 1, '{}'::jsonb, now_value, now_value + interval '1 hour')
  RETURNING event_id INTO next_event_id;
  after_next_event := public.ml_public_display_snapshot(after_delete->>'cursor');
  IF after_next_event->>'sync' IS DISTINCT FROM 'delta'
     OR after_next_event->'arrivals' IS DISTINCT FROM pg_catalog.jsonb_build_array(
       pg_catalog.jsonb_build_object('eventId', next_event_id::text, 'recognitionId', next_id::text, 'publishedAt', now_value)
     ) THEN
    RAISE EXCEPTION 'next event did not resume after deletion reset: %', after_next_event;
  END IF;

  INSERT INTO mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at)
  VALUES (purge_id, 'Synthetic Sender Private 704.', 'Synthetic Recipient D.', 'Synthetic purge revision fixture.', 'published', now_value - interval '3 hours', now_value - interval '3 hours', now_value - interval '1 minute');
  INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id) VALUES (purge_id, 4);
  INSERT INTO mothers_love.display_events (recognition_id, event_kind, recognition_version, payload, created_at, expires_at)
  VALUES (purge_id, 'published', 1, '{}'::jsonb, now_value - interval '3 hours', now_value - interval '1 minute');
  before_purge := public.ml_public_display_snapshot(NULL);
  SELECT pg_catalog.max(event_id) INTO before_purge_max FROM mothers_love.display_events;
  PERFORM public.ml_purge();
  after_purge := public.ml_public_display_snapshot(before_purge->>'cursor');
  SELECT pg_catalog.max(event_id) INTO after_purge_max FROM mothers_love.display_events;
  IF after_purge_max >= before_purge_max
     OR (after_purge->>'revision')::bigint < (before_purge->>'revision')::bigint
     OR after_purge->>'sync' IS DISTINCT FROM 'reset' THEN
    RAISE EXCEPTION 'expiry purge lowered revision or accepted a removed cursor: before %, after %', before_purge, after_purge;
  END IF;
END
$public_display_revision_fixture$;

ROLLBACK;
