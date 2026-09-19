-- One-time data change, approved by Anthony on 2026-09-19. Not a schema migration.
-- Keeps every current recognition on the home page and TV for 21 days from the
-- day it was sent, instead of 7, while PLAN-18 builds the permanent answer.
-- 21 days stays under the browser timer limit of about 24.8 days, so no app
-- change is needed. Nothing is deleted. Recognitions are already archived by
-- migration 014 whenever the cleanup does remove them.
-- Run in the Supabase SQL editor for project cvuwdlmlukepwfffpgdu.

UPDATE mothers_love.recognitions
SET expires_at = created_at + interval '21 days'
WHERE expires_at = created_at + interval '168 hours';

-- Check: should return 0.
SELECT count(*) AS still_on_7_days
FROM mothers_love.recognitions
WHERE expires_at = created_at + interval '168 hours';

-- Undo, if ever needed (only safe for rows less than 7 days old, because older
-- rows would expire at once and move to the archive):
-- UPDATE mothers_love.recognitions SET expires_at = created_at + interval '168 hours'
-- WHERE expires_at = created_at + interval '21 days' AND created_at > now() - interval '7 days';
