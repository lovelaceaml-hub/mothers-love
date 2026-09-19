-- Plan 17 Lane 13: optional eleventh Color Polish screen, slug live-feed
-- (Live Recognitions full screen).
--
-- WRITTEN FOR ANTHONY'S APPROVAL. Nobody has run this file. It must only be run
-- against the shared production database after Anthony approves it.
--
-- What it does: replaces ONE function, mothers_love.ml_color_polish_valid_playlist,
-- so a saved playlist may hold the ten original screens (exactly as today) or those
-- ten plus one live-feed entry. Rules kept from database/011_color_polish.sql:
-- every entry has exactly the keys id, enabled, durationSeconds; each id at most
-- once; all ten original ids required; durationSeconds a whole number from 12 to
-- 180; at least one entry enabled.
--
-- What it does not do: it changes no table, no row, no other function, no grant and
-- nothing outside the mothers_love schema. The saved playlist row is not touched,
-- so the ten entry playlist saved today stays valid and unchanged. CREATE OR
-- REPLACE keeps the function's owner and its existing access list (011 revoked
-- PUBLIC and the API roles; nothing is granted here). Same signature, same
-- IMMUTABLE marking, same empty search_path.
--
-- Idempotent: running it twice leaves the same function.
--
-- Order of operations (see docs/runs/2026-09-18-tv-fit/research/L13-writer-result.md):
--   forward:  1. deploy the new app build (it works with the ten entry playlist),
--             2. run this file,
--             3. optional: docs/runs/2026-09-18-tv-fit/research/activation-live-feed.sql
--   backward: run docs/runs/2026-09-18-tv-fit/research/rollback-live-feed.sql BEFORE
--             returning the app to the old build b7d92a0. The old build answers
--             503 UNAVAILABLE for any playlist that is not exactly ten entries.

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
  IF playlist_value IS NULL OR pg_catalog.jsonb_typeof(playlist_value) IS DISTINCT FROM 'array' OR pg_catalog.jsonb_array_length(playlist_value) NOT BETWEEN 10 AND 11 THEN
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
    IF COALESCE(item_id, '') NOT IN ('welcome', 'garden', 'featured', 'calendar', 'peacemakers', 'status', 'expressions', 'peace-in-practice', 'orbit', 'milestone', 'live-feed') OR item_id = ANY(seen_ids) THEN
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

  -- Ten entries: exactly the ten original screens. Eleven entries: the ten original
  -- screens plus live-feed. Each id appears at most once (checked in the loop), so the
  -- ten required ids below plus the cardinality rule leave live-feed as the only
  -- possible eleventh entry.
  RETURN pg_catalog.cardinality(seen_ids) BETWEEN 10 AND 11
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
    AND (pg_catalog.cardinality(seen_ids) = 10 OR 'live-feed' = ANY(seen_ids))
    AND has_enabled;
END
$function$;
