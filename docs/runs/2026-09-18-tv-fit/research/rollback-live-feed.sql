-- Plan 17 Lane 13: rollback of the Live Recognitions screen.
--
-- WRITTEN FOR ANTHONY'S APPROVAL. Nobody has run this file.
--
-- Run this BEFORE the app is returned to the old build b7d92a0, never after. The old
-- build (and the validator from database/011_color_polish.sql) accept exactly ten
-- entries: an eleven entry playlist makes the old build answer 503 UNAVAILABLE and
-- makes the 011 validator refuse the row (snapshot 503, Color Polish rollback STALE).
--
-- Order inside this file, in ONE transaction so the TV never reads a half way state:
--   step 1. return the saved playlist to the ten original entries (the live-feed entry
--           is removed; the ten others keep their order, enabled flags and durations),
--   step 2. restore mothers_love.ml_color_polish_valid_playlist word for word from
--           database/011_color_polish.sql (exactly ten entries),
--   step 3. refuse to commit unless the saved playlist is valid under the restored
--           validator.
-- The new build keeps working after this file: it treats a ten entry playlist as
-- "live-feed at its default". To stop showing the screen entirely, return the app to
-- the old build after this file has run.
--
-- Touches only mothers_love objects: one row of mothers_love.color_polish_presentation
-- and one function. Idempotent: on a ten entry playlist step 1 changes nothing.

BEGIN;

DO $rollback_live_feed_playlist$
DECLARE
  v_playlist jsonb;
  v_next jsonb;
  v_revision bigint;
BEGIN
  SET LOCAL statement_timeout = '10s';

  SELECT p.playlist, p.revision
    INTO STRICT v_playlist, v_revision
  FROM mothers_love.color_polish_presentation p
  WHERE p.singleton_id = true
  FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(v_playlist) AS entries(entry_value)
    WHERE entry_value->>'id' = 'live-feed'
  ) THEN
    RAISE NOTICE 'live-feed is not saved, playlist unchanged';
    RETURN;
  END IF;

  SELECT COALESCE(pg_catalog.jsonb_agg(entry_value ORDER BY entry_position), '[]'::jsonb)
    INTO v_next
  FROM pg_catalog.jsonb_array_elements(v_playlist) WITH ORDINALITY AS entries(entry_value, entry_position)
  WHERE entry_value->>'id' IS DISTINCT FROM 'live-feed';

  -- If live-feed was the only enabled entry, the ten entry playlist would have no
  -- enabled screen and be invalid. Enable Welcome in that one case.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(v_next) AS entries(entry_value)
    WHERE (entry_value->>'enabled')::boolean
  ) THEN
    SELECT pg_catalog.jsonb_agg(
             CASE WHEN entry_value->>'id' = 'welcome'
                  THEN pg_catalog.jsonb_set(entry_value, '{enabled}', 'true'::jsonb)
                  ELSE entry_value END
             ORDER BY entry_position)
      INTO v_next
    FROM pg_catalog.jsonb_array_elements(v_next) WITH ORDINALITY AS entries(entry_value, entry_position);
  END IF;

  IF pg_catalog.jsonb_array_length(v_next) <> 10 OR NOT mothers_love.ml_color_polish_valid_playlist(v_next) THEN
    RAISE EXCEPTION USING MESSAGE = 'ten entry playlist could not be rebuilt, nothing changed';
  END IF;

  UPDATE mothers_love.color_polish_presentation
  SET playlist = v_next,
      revision = revision + 1,
      updated_at = pg_catalog.clock_timestamp()
  WHERE singleton_id = true AND revision = v_revision;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'presentation changed during rollback, nothing changed';
  END IF;
END
$rollback_live_feed_playlist$;

-- Step 2: the validator exactly as database/011_color_polish.sql defines it.
CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_valid_playlist(playlist_value jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  item jsonb;
  item_id text;
  seen_ids text[] := ARRAY[]::text[];
  has_enabled boolean := false;
BEGIN
  IF playlist_value IS NULL OR pg_catalog.jsonb_typeof(playlist_value) IS DISTINCT FROM 'array' OR pg_catalog.jsonb_array_length(playlist_value) <> 10 THEN
    RETURN false;
  END IF;

  FOR item IN SELECT entry_value FROM pg_catalog.jsonb_array_elements(playlist_value) AS entries(entry_value) LOOP
    IF pg_catalog.jsonb_typeof(item) IS DISTINCT FROM 'object'
       OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(item)) <> 3 THEN
      RETURN false;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_object_keys(item) AS item_key
      WHERE item_key NOT IN ('id', 'enabled', 'durationSeconds')
    ) THEN
      RETURN false;
    END IF;

    item_id := item->>'id';
    IF COALESCE(item_id, '') NOT IN ('welcome', 'garden', 'featured', 'calendar', 'peacemakers', 'status', 'expressions', 'peace-in-practice', 'orbit', 'milestone') OR item_id = ANY(seen_ids) THEN
      RETURN false;
    END IF;
    IF pg_catalog.jsonb_typeof(item->'enabled') IS DISTINCT FROM 'boolean' THEN
      RETURN false;
    END IF;
    IF (item->>'enabled')::boolean THEN
      has_enabled := true;
    END IF;
    IF item->'durationSeconds' IS NULL
       OR pg_catalog.jsonb_typeof(item->'durationSeconds') IS DISTINCT FROM 'number'
       OR COALESCE(item->>'durationSeconds', '') !~ '^[0-9]+$'
       OR (item->>'durationSeconds')::numeric NOT BETWEEN 12 AND 180 THEN
      RETURN false;
    END IF;
    seen_ids := pg_catalog.array_append(seen_ids, item_id);
  END LOOP;

  RETURN pg_catalog.cardinality(seen_ids) = 10
    AND 'welcome' = ANY(seen_ids)
    AND 'garden' = ANY(seen_ids)
    AND 'featured' = ANY(seen_ids)
    AND 'calendar' = ANY(seen_ids)
    AND 'peacemakers' = ANY(seen_ids)
    AND 'status' = ANY(seen_ids)
    AND 'expressions' = ANY(seen_ids)
    AND 'peace-in-practice' = ANY(seen_ids)
    AND 'orbit' = ANY(seen_ids)
    AND 'milestone' = ANY(seen_ids)
    AND has_enabled;
END
$function$;

-- Step 3: never commit a state the restored validator refuses.
DO $rollback_live_feed_guard$
BEGIN
  IF NOT COALESCE((
    SELECT mothers_love.ml_color_polish_valid_playlist(p.playlist) AND pg_catalog.jsonb_array_length(p.playlist) = 10
    FROM mothers_love.color_polish_presentation p
    WHERE p.singleton_id = true
  ), false) THEN
    RAISE EXCEPTION USING MESSAGE = 'saved playlist is not valid under the restored validator, rollback aborted';
  END IF;
END
$rollback_live_feed_guard$;

COMMIT;

-- Result check: screen ids in order, no personal data.
SELECT p.revision, p.enabled,
       pg_catalog.jsonb_array_length(p.playlist) AS entries,
       mothers_love.ml_color_polish_valid_playlist(p.playlist) AS playlist_valid,
       (SELECT pg_catalog.string_agg(entry_value->>'id', ', ' ORDER BY entry_position)
          FROM pg_catalog.jsonb_array_elements(p.playlist) WITH ORDINALITY AS entries(entry_value, entry_position)) AS screens
FROM mothers_love.color_polish_presentation p
WHERE p.singleton_id = true;
