-- Roll back the app to the pre-019 build FIRST. Legacy APIs were not replaced,
-- so the additive database objects can also safely remain after an app rollback.
-- Optional database removal, limited to this migration's named objects.
BEGIN;
DROP FUNCTION IF EXISTS public.ml_color_polish_delta(text, jsonb);
DROP FUNCTION IF EXISTS mothers_love.ml_color_polish_metadata();
DROP INDEX IF EXISTS mothers_love.recognitions_display_latest_idx;
COMMIT;
