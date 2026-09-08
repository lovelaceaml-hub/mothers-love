-- Optional pgTAP transaction fixture. Run only in an isolated campaign test
-- database after applying database/001_mothers_love.sql. No real people or
-- provider records belong in this file.
BEGIN;
SELECT plan(8);

CREATE TEMP TABLE _ml_fixture (recognition_id uuid) ON COMMIT DROP;
INSERT INTO mothers_love.admin_memberships (user_id, role, active)
VALUES ('00000000-0000-4000-8000-000000000001', 'owner', true)
ON CONFLICT (user_id) DO UPDATE SET role = 'owner', active = true;
SELECT public.ml_purge();
UPDATE mothers_love.settings SET collection_open = true;

INSERT INTO _ml_fixture
SELECT ((public.ml_api('submit', jsonb_build_object(
  'submittedName', 'Synthetic Sender',
  'recipient', 'Synthetic Recipient',
  'message', 'A synthetic thank you for testing the campaign.',
  'expressionIds', jsonb_build_array(2, 6),
  'requestKey', 'fixture-request-0001',
  'payloadHash', 'fixture-hash-0001',
  'hold', false,
  'rateIp', 'fixture-ip',
  'rateContext', 'fixture-context'
)))->>'id')::uuid;

SELECT is((SELECT count(*)::integer FROM mothers_love.recognitions WHERE id = (SELECT recognition_id FROM _ml_fixture)), 1, 'synthetic submit stores one recognition');
SELECT is((SELECT recognitions FROM mothers_love.daily_aggregates ORDER BY period_start DESC LIMIT 1), 1, 'publication contributes one recognition');
SELECT is((SELECT expression_total FROM mothers_love.daily_aggregates ORDER BY period_start DESC LIMIT 1), 2, 'publication contributes both expressions');

SELECT is((public.ml_api('submit', jsonb_build_object(
  'submittedName', 'Synthetic Sender', 'recipient', 'Synthetic Recipient',
  'message', 'A synthetic thank you for testing the campaign.',
  'expressionIds', jsonb_build_array(2, 6), 'requestKey', 'fixture-request-0001',
  'payloadHash', 'fixture-hash-0001', 'hold', false, 'rateIp', 'fixture-ip', 'rateContext', 'fixture-context'
))->>'id'), (SELECT recognition_id::text FROM _ml_fixture), 'same request key is idempotent');

SELECT is((public.ml_api('admin_mutate', jsonb_build_object(
  'actor', jsonb_build_object('userId', '00000000-0000-4000-8000-000000000001', 'aal2', true),
  'id', (SELECT recognition_id::text FROM _ml_fixture), 'expectedVersion', 1, 'mutation', 'edit',
  'fields', jsonb_build_object('expressionIds', jsonb_build_array(2, 8)), 'reason', 'correction'
))->>'ok', 'true', 'edit succeeds with expected version');
SELECT is((SELECT expression_total FROM mothers_love.daily_aggregates ORDER BY period_start DESC LIMIT 1), 2, 'edit keeps expression total stable');

SELECT is((public.ml_api('admin_mutate', jsonb_build_object(
  'actor', jsonb_build_object('userId', '00000000-0000-4000-8000-000000000001', 'aal2', true),
  'id', (SELECT recognition_id::text FROM _ml_fixture), 'expectedVersion', 2, 'mutation', 'delete'
))->>'ok', 'true', 'delete removes personal row');
SELECT is((SELECT recognitions FROM mothers_love.daily_aggregates ORDER BY period_start DESC LIMIT 1), 1, 'valid delete preserves anonymous aggregate');

SELECT * FROM finish();
ROLLBACK;
