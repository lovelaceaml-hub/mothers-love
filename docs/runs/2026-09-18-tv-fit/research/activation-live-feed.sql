-- Plan 17 Lane 13: save the Live Recognitions screen into the playlist (optional step).
--
-- WRITTEN FOR ANTHONY'S APPROVAL. Nobody has run this file.
--
-- Preconditions, in this order:
--   1. The new app build (the one that knows the live-feed screen) is live. The old
--      build b7d92a0 answers 503 UNAVAILABLE for an eleven entry playlist, so this
--      file must never run while the old build is serving the TV.
--   2. database/014_color_polish_live_feed.sql has been run (this file checks that).
--
-- Why it is optional: the new build already shows the screen when the saved playlist
-- has only the ten original entries (it adds live-feed as enabled, 60 seconds, last).
-- Running this file only makes that default explicit in the saved row, so the entry
-- can later be reordered, given another duration, or switched off by editing the row.
--
-- What it changes: one row, mothers_love.color_polish_presentation, columns playlist,
-- revision (plus one) and updated_at, exactly what the app's own playlist save does.
-- It touches nothing outside the mothers_love schema, returns no recognition text and
-- no identity. Idempotent: when live-feed is already saved it changes nothing.

BEGIN;

DO $activate_live_feed$
DECLARE
  v_playlist jsonb;
  v_next jsonb;
  v_revision bigint;
  v_probe jsonb;
BEGIN
  SET LOCAL statement_timeout = '10s';

  -- Guard: the replaced validator must be in place. It accepts the default ten
  -- entries plus live-feed; the validator from 011 rejects that.
  v_probe := mothers_love.ml_color_polish_default_playlist()
    || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id', 'live-feed', 'enabled', true, 'durationSeconds', 60));
  IF NOT mothers_love.ml_color_polish_valid_playlist(v_probe) THEN
    RAISE EXCEPTION USING MESSAGE = 'run database/014_color_polish_live_feed.sql first';
  END IF;

  SELECT p.playlist, p.revision
    INTO STRICT v_playlist, v_revision
  FROM mothers_love.color_polish_presentation p
  WHERE p.singleton_id = true
  FOR UPDATE;

  IF NOT mothers_love.ml_color_polish_valid_playlist(v_playlist) THEN
    RAISE EXCEPTION USING MESSAGE = 'saved playlist is not valid, nothing changed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(v_playlist) AS entries(entry_value)
    WHERE entry_value->>'id' = 'live-feed'
  ) THEN
    RAISE NOTICE 'live-feed is already saved, nothing changed';
    RETURN;
  END IF;

  v_next := v_playlist
    || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id', 'live-feed', 'enabled', true, 'durationSeconds', 60));
  IF NOT mothers_love.ml_color_polish_valid_playlist(v_next) THEN
    RAISE EXCEPTION USING MESSAGE = 'eleven entry playlist was rejected, nothing changed';
  END IF;

  UPDATE mothers_love.color_polish_presentation
  SET playlist = v_next,
      revision = revision + 1,
      updated_at = pg_catalog.clock_timestamp()
  WHERE singleton_id = true AND revision = v_revision;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'presentation changed during activation, nothing changed';
  END IF;
END
$activate_live_feed$;

COMMIT;

-- Result check: screen ids in order, no personal data.
SELECT p.revision, p.enabled,
       pg_catalog.jsonb_array_length(p.playlist) AS entries,
       mothers_love.ml_color_polish_valid_playlist(p.playlist) AS playlist_valid,
       (SELECT pg_catalog.string_agg(entry_value->>'id', ', ' ORDER BY entry_position)
          FROM pg_catalog.jsonb_array_elements(p.playlist) WITH ORDINALITY AS entries(entry_value, entry_position)) AS screens
FROM mothers_love.color_polish_presentation p
WHERE p.singleton_id = true;
