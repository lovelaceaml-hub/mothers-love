-- Rollback-only fixture for a disposable PostgreSQL database with migrations 001 to 021
-- applied. Synthetic rows only. Never run this file against production.
BEGIN;

DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM mothers_love.recognitions) THEN
    RAISE EXCEPTION '021 fixture requires an empty recognition table';
  END IF;
END
$preflight$;

INSERT INTO mothers_love.recognitions
  (id, submitted_name, recipient, message, status, reason_category, created_at, first_published_at, expires_at)
VALUES
  ('00000000-0000-4000-8000-000000000301', 'Synthetic Sender 1', 'Synthetic Recipient 1', 'Synthetic message 1',
   'published', NULL, now() - interval '2 days', now() - interval '2 days', now() + interval '100 years'),
  ('00000000-0000-4000-8000-000000000302', 'Synthetic Sender 2', 'Synthetic Recipient 2', 'Synthetic message 2',
   'hidden', 'privacy', now() - interval '1 day', now() - interval '1 day', now() + interval '100 years'),
  ('00000000-0000-4000-8000-000000000303', 'Synthetic Sender 3', 'Synthetic Recipient 3', 'Synthetic message 3',
   'held', 'safety', now() - interval '1 hour', NULL, now() + interval '100 years');

INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id)
VALUES ('00000000-0000-4000-8000-000000000301', 2), ('00000000-0000-4000-8000-000000000301', 6),
       ('00000000-0000-4000-8000-000000000302', 3), ('00000000-0000-4000-8000-000000000303', 9);

INSERT INTO mothers_love.recognition_reactions (recognition_id, visitor_hash)
SELECT '00000000-0000-4000-8000-000000000301', lpad(n::text, 64, '0') FROM generate_series(1, 7) AS n;
INSERT INTO mothers_love.recognition_reactions (recognition_id, visitor_hash)
VALUES ('00000000-0000-4000-8000-000000000302', repeat('a', 64));

INSERT INTO mothers_love.admin_memberships (user_id, role)
VALUES ('00000000-0000-4000-8000-0000000003a1', 'owner'), ('00000000-0000-4000-8000-0000000003a2', 'moderator');

INSERT INTO mothers_love.admin_audit (actor_user_id, action_category, target_id, reason_category, metadata, created_at)
VALUES
  ('00000000-0000-4000-8000-0000000003a2', 'hide', '00000000-0000-4000-8000-000000000302', 'privacy', '{"version": 2}', now() - interval '3 hours'),
  ('00000000-0000-4000-8000-0000000003a1', 'restore', '00000000-0000-4000-8000-000000000302', 'correction', '{"version": 3}', now() - interval '2 hours'),
  ('00000000-0000-4000-8000-0000000003a1', 'hide', '00000000-0000-4000-8000-000000000302', 'privacy', '{"version": 4}', now() - interval '1 hour'),
  -- An administrator who no longer has a membership row: the action stays, the role is unknown.
  ('00000000-0000-4000-8000-0000000003a9', 'edit', '00000000-0000-4000-8000-000000000301', 'correction', '{"version": 2}', now() - interval '30 minutes'),
  -- Another recognition's action must never appear on this one.
  ('00000000-0000-4000-8000-0000000003a1', 'publish', '00000000-0000-4000-8000-000000000303', NULL, '{"version": 2}', now() - interval '10 minutes');

DO $assertions$
DECLARE
  one jsonb;
  two jsonb;
  three jsonb;
  public_two jsonb;
BEGIN
  SELECT mothers_love.ml_admin_recognition(r) INTO one FROM mothers_love.recognitions r WHERE r.id = '00000000-0000-4000-8000-000000000301';
  SELECT mothers_love.ml_admin_recognition(r) INTO two FROM mothers_love.recognitions r WHERE r.id = '00000000-0000-4000-8000-000000000302';
  SELECT mothers_love.ml_admin_recognition(r) INTO three FROM mothers_love.recognitions r WHERE r.id = '00000000-0000-4000-8000-000000000303';
  SELECT mothers_love.ml_public_recognition(r) INTO public_two FROM mothers_love.recognitions r WHERE r.id = '00000000-0000-4000-8000-000000000302';

  IF (one->>'heartCount')::integer IS DISTINCT FROM 7 OR (two->>'heartCount')::integer IS DISTINCT FROM 1
     OR (three->>'heartCount')::integer IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'heart counts are wrong: %, %, %', one->>'heartCount', two->>'heartCount', three->>'heartCount';
  END IF;
  IF one->>'submittedName' IS DISTINCT FROM 'Synthetic Sender 1' OR two->>'reason' IS DISTINCT FROM 'privacy'
     OR one->>'updatedAt' IS NULL OR one->'expressionIds' IS DISTINCT FROM '[2, 6]'::jsonb THEN
    RAISE EXCEPTION 'the existing admin fields changed';
  END IF;
  IF jsonb_array_length(two->'audit') IS DISTINCT FROM 3
     OR two->'audit'->0->>'action' IS DISTINCT FROM 'hide' OR (two->'audit'->0->>'version')::integer IS DISTINCT FROM 4
     OR two->'audit'->0->>'actorRole' IS DISTINCT FROM 'owner'
     OR two->'audit'->1->>'action' IS DISTINCT FROM 'restore'
     OR two->'audit'->2->>'actorRole' IS DISTINCT FROM 'moderator' OR two->'audit'->2->>'reason' IS DISTINCT FROM 'privacy'
     OR two->'audit'->2->>'outcome' IS DISTINCT FROM 'success' THEN
    RAISE EXCEPTION 'the audit trail is wrong: %', two->'audit';
  END IF;
  IF jsonb_array_length(one->'audit') IS DISTINCT FROM 1 OR one->'audit'->0->'actorRole' IS DISTINCT FROM 'null'::jsonb THEN
    RAISE EXCEPTION 'an action by a removed administrator must stay, with no role: %', one->'audit';
  END IF;
  IF jsonb_array_length(three->'audit') IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'each recognition lists only its own actions';
  END IF;
  IF (two->'audit')::text ~ '0000000003a' THEN
    RAISE EXCEPTION 'the audit trail must never carry an administrator identifier';
  END IF;
  IF public_two ?| ARRAY['submittedName', 'reason', 'heartCount', 'audit', 'updatedAt'] THEN
    RAISE EXCEPTION 'the public projection must not gain admin fields';
  END IF;
END
$assertions$;

-- The audit list stops at 50, newest first.
INSERT INTO mothers_love.admin_audit (actor_user_id, action_category, target_id, metadata, created_at)
SELECT '00000000-0000-4000-8000-0000000003a1', 'edit', '00000000-0000-4000-8000-000000000303',
       jsonb_build_object('version', n + 2), now() - interval '9 minutes' + n * interval '1 second'
FROM generate_series(1, 60) AS n;
DO $limit_check$
DECLARE
  three jsonb;
BEGIN
  SELECT mothers_love.ml_admin_recognition(r) INTO three FROM mothers_love.recognitions r WHERE r.id = '00000000-0000-4000-8000-000000000303';
  IF jsonb_array_length(three->'audit') IS DISTINCT FROM 50 OR (three->'audit'->0->>'version')::integer IS DISTINCT FROM 62 THEN
    RAISE EXCEPTION 'the audit list must hold the newest 50: % first %', jsonb_array_length(three->'audit'), three->'audit'->0;
  END IF;
END
$limit_check$;

SELECT 'ok 021 fixture';
ROLLBACK;
