-- 022: admin history is kept as long as the recognitions (Anthony, 2026-11-11: "Do all 9",
-- item 6: "Keep admin history longer. Admin actions are only kept for 30 days today.").
--
-- mothers_love.admin_audit rows used to expire 30 days after they were written, and the
-- cleanup removed them. A row holds who acted (an administrator's account id), the action,
-- its reason category, the recognition it touched and the version it produced. It holds no
-- submitted name, recipient or message. From now on a row is kept for 100 years, the same
-- convention migration 016 uses for recognitions:
--   1. new rows default to now() + 100 years
--   2. rows still on record are extended to created_at + 100 years
-- Nothing else changes: no function, grant, index or other table. The cleanup's own rule
-- (remove a row once its expires_at has passed) is untouched and simply stops matching, and
-- a permanently deleted recognition still has its id cleared from its history rows.
--
-- Rollback:
--   ALTER TABLE mothers_love.admin_audit ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');
--   UPDATE mothers_love.admin_audit SET expires_at = created_at + interval '30 days';
--   (the cleanup then removes rows older than 30 days on its next run)
BEGIN;

DO $keep_admin_history_preflight$
DECLARE
  current_default text;
BEGIN
  IF pg_catalog.to_regclass('mothers_love.admin_audit') IS NULL THEN
    RAISE EXCEPTION 'mothers_love.admin_audit is missing';
  END IF;
  SELECT pg_catalog.pg_get_expr(d.adbin, d.adrelid)
  INTO current_default
  FROM pg_catalog.pg_attribute AS a
  JOIN pg_catalog.pg_attrdef AS d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attrelid = 'mothers_love.admin_audit'::regclass AND a.attname = 'expires_at';
  IF current_default LIKE '%100 years%' THEN
    RAISE EXCEPTION 'migration 022 is already applied';
  END IF;
  IF current_default IS NULL OR current_default NOT LIKE '%30 days%' THEN
    RAISE EXCEPTION 'admin_audit.expires_at default precondition changed: %', current_default;
  END IF;
END
$keep_admin_history_preflight$;

ALTER TABLE mothers_love.admin_audit
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '100 years');

UPDATE mothers_love.admin_audit
SET expires_at = created_at + interval '100 years'
WHERE expires_at < created_at + interval '100 years';

DO $keep_admin_history_postflight$
BEGIN
  IF EXISTS (SELECT 1 FROM mothers_love.admin_audit WHERE expires_at < created_at + interval '99 years') THEN
    RAISE EXCEPTION 'an admin history row still expires early';
  END IF;
END
$keep_admin_history_postflight$;

COMMIT;
