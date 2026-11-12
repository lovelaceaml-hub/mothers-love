-- Synthetic scratch-database fixture for migration 022. Split at the marker and apply 022
-- between the parts. Never run this file against production.
-- PART 1: seed (before 022)
BEGIN;
DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM mothers_love.admin_audit) THEN
    RAISE EXCEPTION '022 fixture requires an empty admin history';
  END IF;
END
$preflight$;
INSERT INTO mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at)
VALUES ('00000000-0000-4000-8000-000000000401', 'Synthetic Sender', 'Synthetic Recipient', 'Synthetic message',
        'published', now() - interval '40 days', now() - interval '40 days', now() + interval '100 years');
INSERT INTO mothers_love.admin_audit (actor_user_id, action_category, target_id, reason_category, metadata, created_at, expires_at)
VALUES ('00000000-0000-4000-8000-0000000004a1', 'edit', '00000000-0000-4000-8000-000000000401', 'correction', '{"version": 2}',
        now() - interval '29 days', now() + interval '1 day');
COMMIT;
-- PART 2: assertions (after 022)
BEGIN;
INSERT INTO mothers_love.admin_audit (actor_user_id, action_category, target_id, reason_category, metadata)
VALUES ('00000000-0000-4000-8000-0000000004a1', 'hide', '00000000-0000-4000-8000-000000000401', 'privacy', '{"version": 3}');
DO $assertions$
DECLARE
  early integer;
  listed integer;
BEGIN
  SELECT count(*) INTO early FROM mothers_love.admin_audit WHERE expires_at < created_at + interval '99 years';
  IF early <> 0 THEN RAISE EXCEPTION '% admin history rows still expire early', early; END IF;
  PERFORM public.ml_purge();
  IF (SELECT count(*) FROM mothers_love.admin_audit) <> 2 THEN
    RAISE EXCEPTION 'the cleanup removed admin history';
  END IF;
  SELECT jsonb_array_length(mothers_love.ml_admin_recognition(r)->'audit') INTO listed
  FROM mothers_love.recognitions AS r WHERE r.id = '00000000-0000-4000-8000-000000000401';
  IF listed <> 2 THEN RAISE EXCEPTION 'the admin projection lists % actions, not 2', listed; END IF;
END
$assertions$;
SELECT 'ok 022 fixture';
ROLLBACK;
-- cleanup of part 1
DELETE FROM mothers_love.admin_audit WHERE target_id = '00000000-0000-4000-8000-000000000401';
DELETE FROM mothers_love.recognitions WHERE id = '00000000-0000-4000-8000-000000000401';
