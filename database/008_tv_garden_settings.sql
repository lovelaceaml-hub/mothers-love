-- Plan 08: additive display-studio storage. This migration stays entirely
-- within the dedicated mothers_love schema and keeps the legacy settings
-- fields available for current display clients.

ALTER TABLE mothers_love.settings
  ADD COLUMN IF NOT EXISTS display_config jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION mothers_love.ml_display_default_config()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'gardenAmount', 'all-active',
    'playlist', jsonb_build_array(
      jsonb_build_object('id', 'garden', 'enabled', true),
      jsonb_build_object('id', 'featured', 'enabled', true),
      jsonb_build_object('id', 'impact', 'enabled', true),
      jsonb_build_object('id', 'expressions', 'enabled', true),
      jsonb_build_object('id', 'shared-expression', 'enabled', true),
      jsonb_build_object('id', 'spotlight', 'enabled', true),
      jsonb_build_object('id', 'daily-practice', 'enabled', true),
      jsonb_build_object('id', 'one-kind-word', 'enabled', true),
      jsonb_build_object('id', 'everyday-peace', 'enabled', true),
      jsonb_build_object('id', 'peace-promise', 'enabled', true)
    ),
    'tempo', 'standard',
    'durationOverrides', '{}'::jsonb,
    'effects', jsonb_build_object('trails', true, 'constellations', true, 'sparkles', true, 'background', true),
    'sound', jsonb_build_object('enabled', true, 'volume', 0.2, 'arrivalChime', true, 'milestoneChime', true)
  )
$$;

CREATE OR REPLACE FUNCTION mothers_love.ml_display_config_json(value jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT mothers_love.ml_display_default_config() || COALESCE(value, '{}'::jsonb)
$$;

UPDATE mothers_love.settings
SET display_config = mothers_love.ml_display_default_config() || COALESCE(display_config, '{}'::jsonb)
WHERE singleton_id = true;

CREATE OR REPLACE FUNCTION mothers_love.ml_settings_json()
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'version', s.version,
    'mode', s.mode,
    'motion', s.motion,
    'pauseArrivals', s.pause_arrivals,
    'pauseRotation', s.pause_rotation,
    'collectionOpen', s.collection_open AND mothers_love.ml_purge_healthy(now()),
    'lowActivityMinutes', s.low_activity_minutes,
    'readingSeconds', s.reading_seconds,
    'maxBubbles', s.max_bubbles,
    'gardenAmount', config.value->'gardenAmount',
    'playlist', config.value->'playlist',
    'tempo', config.value->'tempo',
    'durationOverrides', config.value->'durationOverrides',
    'effects', config.value->'effects',
    'sound', config.value->'sound',
    'externalUrls', jsonb_build_object(
      'dailyPractice', 'https://heavenlymotherslove.org/en/checklist',
      'peacePromise', 'https://heavenlymotherslove.org/en/signature'
    ),
    'showTrails', s.show_trails,
    'showConstellations', s.show_constellations
  )
  FROM mothers_love.settings s
  CROSS JOIN LATERAL (SELECT mothers_love.ml_display_config_json(s.display_config) AS value) config
  WHERE s.singleton_id = true
$$;

CREATE OR REPLACE FUNCTION mothers_love.ml_patch_display_settings(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  settings_row mothers_love.settings%ROWTYPE;
  auth_result jsonb;
  setting_changes jsonb;
  config jsonb;
  expected_version bigint;
  now_value timestamptz := clock_timestamp();
  playlist_item jsonb;
  duration_value jsonb;
BEGIN
  auth_result := mothers_love.ml_authorize(payload, 'moderator', true);
  IF NOT COALESCE((auth_result->>'ok')::boolean, false) THEN RETURN auth_result; END IF;
  expected_version := (payload->>'expectedVersion')::bigint;
  setting_changes := COALESCE(payload->'changes', '{}'::jsonb);
  IF expected_version IS NULL OR jsonb_typeof(setting_changes) <> 'object' OR setting_changes = '{}'::jsonb THEN
    RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(setting_changes) AS key_name
    WHERE key_name NOT IN (
      'mode', 'motion', 'pauseArrivals', 'pauseRotation', 'collectionOpen',
      'lowActivityMinutes', 'readingSeconds', 'maxBubbles', 'gardenAmount',
      'playlist', 'tempo', 'durationOverrides', 'effects', 'sound',
      'showTrails', 'showConstellations', 'soundEnabled', 'soundVolume',
      'arrivalChime', 'milestoneChime', 'externalUrls'
    )
  ) THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_each(setting_changes) AS item
    WHERE item.key IN ('pauseArrivals', 'pauseRotation', 'collectionOpen', 'showTrails', 'showConstellations', 'soundEnabled', 'arrivalChime', 'milestoneChime')
      AND jsonb_typeof(item.value) <> 'boolean'
  ) THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
  IF setting_changes ? 'soundVolume' AND (
    jsonb_typeof(setting_changes->'soundVolume') <> 'number'
    OR NOT (CASE WHEN jsonb_typeof(setting_changes->'soundVolume') = 'number' THEN (setting_changes->>'soundVolume')::numeric BETWEEN 0 AND 0.4 ELSE false END)
  ) THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
  IF setting_changes ? 'externalUrls' AND setting_changes->'externalUrls' <> jsonb_build_object(
    'dailyPractice', 'https://heavenlymotherslove.org/en/checklist',
    'peacePromise', 'https://heavenlymotherslove.org/en/signature'
  ) THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;

  SELECT * INTO settings_row FROM mothers_love.settings WHERE singleton_id = true FOR UPDATE;
  IF settings_row.version <> expected_version THEN RETURN jsonb_build_object('ok', false, 'status', 409, 'code', 'STALE'); END IF;
  IF (setting_changes ? 'collectionOpen') AND auth_result->>'role' <> 'owner' THEN RETURN jsonb_build_object('ok', false, 'status', 403, 'code', 'OWNER_REQUIRED'); END IF;
  IF setting_changes ? 'collectionOpen' AND COALESCE((setting_changes->>'collectionOpen')::boolean, false) AND NOT mothers_love.ml_purge_healthy(now_value) THEN RETURN jsonb_build_object('ok', false, 'status', 503, 'code', 'PURGE_UNHEALTHY'); END IF;
  IF setting_changes ? 'mode' AND setting_changes->>'mode' NOT IN ('normal', 'quiet', 'neutral') THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
  IF setting_changes ? 'motion' AND setting_changes->>'motion' NOT IN ('calm', 'standard', 'lively', 'still') THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
  IF setting_changes ? 'lowActivityMinutes' AND (setting_changes->>'lowActivityMinutes') !~ '^[0-9]+$' THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
  IF setting_changes ? 'lowActivityMinutes' AND ((setting_changes->>'lowActivityMinutes')::integer < 1 OR (setting_changes->>'lowActivityMinutes')::integer > 180) THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
  IF setting_changes ? 'readingSeconds' AND (setting_changes->>'readingSeconds') !~ '^[0-9]+$' THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
  IF setting_changes ? 'readingSeconds' AND ((setting_changes->>'readingSeconds')::integer < 8 OR (setting_changes->>'readingSeconds')::integer > 60) THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
  IF setting_changes ? 'maxBubbles' AND (setting_changes->>'maxBubbles') !~ '^[0-9]+$' THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
  IF setting_changes ? 'maxBubbles' AND ((setting_changes->>'maxBubbles')::integer < 1 OR (setting_changes->>'maxBubbles')::integer > 6) THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;

  IF setting_changes ? 'gardenAmount' AND NOT (
    setting_changes->'gardenAmount' = '"all-active"'::jsonb
    OR (jsonb_typeof(setting_changes->'gardenAmount') = 'number' AND (setting_changes->>'gardenAmount') ~ '^[1-9][0-9]*$')
  ) THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;

  IF setting_changes ? 'tempo' AND setting_changes->>'tempo' NOT IN ('calm', 'standard', 'lively', 'slow', 'gentle', 'fast') THEN
    RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;

  IF setting_changes ? 'playlist' THEN
    IF jsonb_typeof(setting_changes->'playlist') <> 'array' OR jsonb_array_length(setting_changes->'playlist') < 1 OR jsonb_array_length(setting_changes->'playlist') > 10 THEN
      RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(setting_changes->'playlist') item
      WHERE jsonb_typeof(item.value) <> 'object'
        OR item.value->>'id' NOT IN ('garden', 'featured', 'impact', 'expressions', 'shared-expression', 'spotlight', 'daily-practice', 'one-kind-word', 'everyday-peace', 'peace-promise')
        OR jsonb_typeof(item.value->'enabled') <> 'boolean'
        OR (item.value ? 'durationSeconds' AND NOT (CASE
          WHEN jsonb_typeof(item.value->'durationSeconds') = 'number' AND (item.value->>'durationSeconds') ~ '^[0-9]+$'
          THEN (item.value->>'durationSeconds')::integer BETWEEN 12 AND 120
          ELSE false
        END))
    ) THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
    IF (SELECT count(*) FROM jsonb_array_elements(setting_changes->'playlist')) <> (SELECT count(DISTINCT item.value->>'id') FROM jsonb_array_elements(setting_changes->'playlist') item) THEN
      RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(setting_changes->'playlist') item WHERE item.value->>'enabled' = 'true') THEN
      RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
    END IF;
  END IF;

  IF setting_changes ? 'durationOverrides' THEN
    IF jsonb_typeof(setting_changes->'durationOverrides') <> 'object' THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;
    FOR duration_value IN SELECT value FROM jsonb_each(setting_changes->'durationOverrides') LOOP
      IF NOT (CASE
        WHEN jsonb_typeof(duration_value) = 'number' AND duration_value::text ~ '^[0-9]+$'
        THEN duration_value::text::integer BETWEEN 12 AND 120
        ELSE false
      END) THEN
        RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM jsonb_each(setting_changes->'durationOverrides') item WHERE item.key NOT IN ('garden', 'featured', 'impact', 'expressions', 'shared-expression', 'spotlight', 'daily-practice', 'one-kind-word', 'everyday-peace', 'peace-promise')) THEN
      RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
    END IF;
  END IF;

  IF setting_changes ? 'effects' AND (
    jsonb_typeof(setting_changes->'effects') <> 'object'
    OR EXISTS (SELECT 1 FROM jsonb_each(setting_changes->'effects') item WHERE item.key NOT IN ('trails', 'constellations', 'sparkles', 'background') OR jsonb_typeof(item.value) <> 'boolean')
  ) THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;

  IF setting_changes ? 'sound' AND (
    jsonb_typeof(setting_changes->'sound') <> 'object'
    OR jsonb_typeof(setting_changes->'sound'->'enabled') <> 'boolean'
    OR jsonb_typeof(setting_changes->'sound'->'arrivalChime') <> 'boolean'
    OR jsonb_typeof(setting_changes->'sound'->'milestoneChime') <> 'boolean'
    OR jsonb_typeof(setting_changes->'sound'->'volume') <> 'number'
    OR NOT (CASE
      WHEN jsonb_typeof(setting_changes->'sound'->'volume') = 'number'
      THEN (setting_changes->'sound'->>'volume')::numeric BETWEEN 0 AND 0.4
      ELSE false
    END)
  ) THEN RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST'); END IF;

  config := mothers_love.ml_display_config_json(settings_row.display_config);
  IF setting_changes ? 'gardenAmount' THEN config := jsonb_set(config, '{gardenAmount}', setting_changes->'gardenAmount', true); END IF;
  IF setting_changes ? 'playlist' THEN config := jsonb_set(config, '{playlist}', setting_changes->'playlist', true); END IF;
  IF setting_changes ? 'tempo' THEN
    config := jsonb_set(config, '{tempo}', to_jsonb(CASE setting_changes->>'tempo' WHEN 'slow' THEN 'calm' WHEN 'gentle' THEN 'calm' WHEN 'fast' THEN 'lively' ELSE setting_changes->>'tempo' END), true);
  END IF;
  IF setting_changes ? 'durationOverrides' THEN config := jsonb_set(config, '{durationOverrides}', setting_changes->'durationOverrides', true); END IF;
  IF setting_changes ? 'effects' THEN config := jsonb_set(config, '{effects}', COALESCE(config->'effects', '{}'::jsonb) || setting_changes->'effects', true); END IF;
  IF setting_changes ? 'soundEnabled' THEN config := jsonb_set(config, '{sound,enabled}', setting_changes->'soundEnabled', true); END IF;
  IF setting_changes ? 'soundVolume' THEN config := jsonb_set(config, '{sound,volume}', setting_changes->'soundVolume', true); END IF;
  IF setting_changes ? 'arrivalChime' THEN config := jsonb_set(config, '{sound,arrivalChime}', setting_changes->'arrivalChime', true); END IF;
  IF setting_changes ? 'milestoneChime' THEN config := jsonb_set(config, '{sound,milestoneChime}', setting_changes->'milestoneChime', true); END IF;
  IF setting_changes ? 'sound' THEN config := jsonb_set(config, '{sound}', setting_changes->'sound', true); END IF;

  UPDATE mothers_love.settings
  SET mode = COALESCE(setting_changes->>'mode', mode),
      motion = COALESCE(setting_changes->>'motion', motion),
      pause_arrivals = COALESCE((setting_changes->>'pauseArrivals')::boolean, pause_arrivals),
      pause_rotation = COALESCE((setting_changes->>'pauseRotation')::boolean, pause_rotation),
      collection_open = CASE WHEN setting_changes ? 'collectionOpen' THEN (setting_changes->>'collectionOpen')::boolean ELSE collection_open END,
      low_activity_minutes = COALESCE((setting_changes->>'lowActivityMinutes')::integer, low_activity_minutes),
      reading_seconds = COALESCE((setting_changes->>'readingSeconds')::integer, reading_seconds),
      max_bubbles = COALESCE((setting_changes->>'maxBubbles')::integer, max_bubbles),
      show_trails = COALESCE((setting_changes->>'showTrails')::boolean, show_trails),
      show_constellations = COALESCE((setting_changes->>'showConstellations')::boolean, show_constellations),
      display_config = config,
      version = version + 1,
      updated_at = now_value
  WHERE singleton_id = true;

  INSERT INTO mothers_love.display_events (event_kind, payload) VALUES ('settings', mothers_love.ml_settings_json());
  RETURN jsonb_build_object('ok', true, 'settings', mothers_love.ml_settings_json());
END
$function$;

REVOKE ALL ON FUNCTION mothers_love.ml_patch_display_settings(jsonb) FROM PUBLIC;
DO $bridge_acl$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION mothers_love.ml_patch_display_settings(jsonb) FROM %I', role_name);
    END IF;
  END LOOP;
END
$bridge_acl$;
GRANT EXECUTE ON FUNCTION mothers_love.ml_patch_display_settings(jsonb) TO mothers_love_runtime;
