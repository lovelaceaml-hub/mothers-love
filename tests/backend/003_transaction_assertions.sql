-- Pure PostgreSQL transaction fixture. It raises on any failed assertion and
-- rolls back every synthetic row. Run after the campaign migration in a local
-- isolated database, never against Supabase production.
BEGIN;
INSERT INTO mothers_love.admin_memberships (user_id, role, active)
VALUES ('00000000-0000-4000-8000-000000000002', 'owner', true)
ON CONFLICT (user_id) DO UPDATE SET role = 'owner', active = true;
UPDATE mothers_love.settings SET collection_open = true;

DO $fixture$
DECLARE
  actor jsonb := jsonb_build_object('userId', '00000000-0000-4000-8000-000000000002', 'aal2', true);
  result jsonb;
  recognition_id uuid;
  held_id uuid;
  aggregate_row mothers_love.daily_aggregates%ROWTYPE;
  version_now integer;
BEGIN
  result := public.ml_api('submit', jsonb_build_object('submittedName', 'Synthetic Held Sender', 'recipient', 'Synthetic Held Recipient', 'message', 'Synthetic held fixture.', 'expressionIds', jsonb_build_array(1), 'requestKey', 'fixture-assert-held-0001', 'payloadHash', 'fixture-hash-held-0001', 'hold', true, 'rateIp', 'fixture-assert-ip', 'rateContext', 'fixture-assert-context'));
  held_id := (result->>'id')::uuid;
  IF result->>'status' <> 'held' THEN RAISE EXCEPTION 'held submit failed: %', result; END IF;
  result := public.ml_api('admin_mutate', jsonb_build_object('actor', actor, 'id', held_id::text, 'expectedVersion', 1, 'mutation', 'hide', 'reason', 'privacy'));
  IF result->'recognition'->>'status' <> 'hidden' THEN RAISE EXCEPTION 'held hide failed'; END IF;
  result := public.ml_api('admin_mutate', jsonb_build_object('actor', actor, 'id', held_id::text, 'expectedVersion', 2, 'mutation', 'publish'));
  IF result->>'code' <> 'INVALID_STATE' THEN RAISE EXCEPTION 'hidden publish bypassed review: %', result; END IF;
  result := public.ml_api('admin_mutate', jsonb_build_object('actor', actor, 'id', held_id::text, 'expectedVersion', 2, 'mutation', 'restore', 'reason', 'correction'));
  IF result->'recognition'->>'status' <> 'held' THEN RAISE EXCEPTION 'held restore changed publication state'; END IF;
  SELECT * INTO aggregate_row FROM mothers_love.daily_aggregates ORDER BY period_start DESC LIMIT 1;
  IF COALESCE(aggregate_row.recognitions, 0) <> 0 OR COALESCE(aggregate_row.expression_total, 0) <> 0 THEN RAISE EXCEPTION 'held hide/restore changed counts'; END IF;

  result := public.ml_api('submit', jsonb_build_object('submittedName', 'Synthetic Sender', 'recipient', 'Synthetic Recipient', 'message', 'Synthetic thanks for the fixture.', 'expressionIds', jsonb_build_array(2, 6), 'requestKey', 'fixture-assert-0002', 'payloadHash', 'fixture-hash-0002', 'hold', false, 'rateIp', 'fixture-assert-ip', 'rateContext', 'fixture-assert-context'));
  IF result->>'status' <> 'published' THEN RAISE EXCEPTION 'submit failed: %', result; END IF;
  recognition_id := (result->>'id')::uuid;

  SELECT * INTO aggregate_row FROM mothers_love.daily_aggregates ORDER BY period_start DESC LIMIT 1;
  IF aggregate_row.recognitions <> 1 OR aggregate_row.expression_total <> 2 THEN RAISE EXCEPTION 'initial vector/count failed'; END IF;

  result := public.ml_api('admin_mutate', jsonb_build_object('actor', actor, 'id', recognition_id::text, 'expectedVersion', 1, 'mutation', 'edit', 'fields', jsonb_build_object('expressionIds', jsonb_build_array(2, 8)), 'reason', 'correction'));
  IF result->>'ok' <> 'true' THEN RAISE EXCEPTION 'edit failed: %', result; END IF;
  SELECT * INTO aggregate_row FROM mothers_love.daily_aggregates ORDER BY period_start DESC LIMIT 1;
  IF aggregate_row.expression_counts[6] <> 0 OR aggregate_row.expression_counts[8] <> 1 THEN RAISE EXCEPTION 'edit delta failed'; END IF;
  version_now := (result->'recognition'->>'version')::integer;

  result := public.ml_api('admin_mutate', jsonb_build_object('actor', actor, 'id', recognition_id::text, 'expectedVersion', version_now, 'mutation', 'hide', 'reason', 'privacy'));
  IF result->'recognition'->>'status' <> 'hidden' THEN RAISE EXCEPTION 'hide failed'; END IF;
  version_now := (result->'recognition'->>'version')::integer;
  result := public.ml_api('admin_mutate', jsonb_build_object('actor', actor, 'id', recognition_id::text, 'expectedVersion', version_now, 'mutation', 'publish'));
  IF result->>'code' <> 'INVALID_STATE' THEN RAISE EXCEPTION 'hidden publish bypassed review: %', result; END IF;
  IF (SELECT count(*) FROM mothers_love.display_events WHERE recognition_id = recognition_id AND event_kind = 'published') <> 1 THEN RAISE EXCEPTION 'hidden publish emitted a new arrival'; END IF;
  result := public.ml_api('admin_mutate', jsonb_build_object('actor', actor, 'id', recognition_id::text, 'expectedVersion', version_now, 'mutation', 'invalidate', 'reason', 'spam'));
  IF result->'recognition'->>'status' <> 'invalid' THEN RAISE EXCEPTION 'invalidate failed'; END IF;
  SELECT * INTO aggregate_row FROM mothers_love.daily_aggregates ORDER BY period_start DESC LIMIT 1;
  IF aggregate_row.recognitions <> 0 OR aggregate_row.expression_total <> 0 THEN RAISE EXCEPTION 'invalidation vector reverse failed'; END IF;
  version_now := (result->'recognition'->>'version')::integer;
  result := public.ml_api('admin_mutate', jsonb_build_object('actor', actor, 'id', recognition_id::text, 'expectedVersion', version_now, 'mutation', 'hide', 'reason', 'privacy'));
  IF result->>'code' <> 'INVALID_STATE' THEN RAISE EXCEPTION 'invalid hide was accepted: %', result; END IF;
  result := public.ml_api('admin_mutate', jsonb_build_object('actor', actor, 'id', recognition_id::text, 'expectedVersion', version_now, 'mutation', 'restore', 'reason', 'correction'));
  IF result->'recognition'->>'status' <> 'published' THEN RAISE EXCEPTION 'restore failed'; END IF;
  SELECT * INTO aggregate_row FROM mothers_love.daily_aggregates ORDER BY period_start DESC LIMIT 1;
  IF aggregate_row.recognitions <> 1 OR aggregate_row.expression_total <> 2 THEN RAISE EXCEPTION 'restore count failed'; END IF;

  version_now := (result->'recognition'->>'version')::integer;
  result := public.ml_api('admin_mutate', jsonb_build_object('actor', actor, 'id', recognition_id::text, 'expectedVersion', version_now, 'mutation', 'delete'));
  IF result->>'ok' <> 'true' THEN RAISE EXCEPTION 'delete failed: %', result; END IF;
  SELECT * INTO aggregate_row FROM mothers_love.daily_aggregates ORDER BY period_start DESC LIMIT 1;
  IF aggregate_row.recognitions <> 1 THEN RAISE EXCEPTION 'valid delete changed aggregate'; END IF;

  result := public.ml_api('admin_member_patch', jsonb_build_object('actor', actor, 'id', '00000000-0000-4000-8000-000000000002', 'active', false));
  IF result->>'code' <> 'LAST_OWNER' THEN RAISE EXCEPTION 'last owner protection failed: %', result; END IF;

  result := public.ml_api('submit', jsonb_build_object('submittedName', 'Synthetic Sender Two', 'recipient', 'Synthetic Recipient Two', 'message', 'Synthetic expiry test.', 'expressionIds', jsonb_build_array(1), 'requestKey', 'fixture-assert-0003', 'payloadHash', 'fixture-hash-0003', 'hold', false, 'rateIp', 'fixture-assert-ip', 'rateContext', 'fixture-assert-context'));
  UPDATE mothers_love.recognitions SET created_at = now() - interval '2 seconds', expires_at = now() - interval '1 second' WHERE id = (result->>'id')::uuid;
  PERFORM mothers_love.purge_expired();
  IF EXISTS (SELECT 1 FROM mothers_love.recognitions WHERE expires_at <= now()) THEN RAISE EXCEPTION 'purge left personal data'; END IF;
END
$fixture$;

ROLLBACK;
