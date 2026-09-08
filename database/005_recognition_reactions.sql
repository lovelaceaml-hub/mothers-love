-- Additive, campaign-only anonymous reaction support.
-- Existing migrations and bridge functions remain unchanged.

CREATE TABLE IF NOT EXISTS mothers_love.recognition_reactions (
  recognition_id uuid NOT NULL REFERENCES mothers_love.recognitions(id) ON DELETE CASCADE,
  visitor_hash text NOT NULL CHECK (visitor_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (recognition_id, visitor_hash)
);

ALTER TABLE mothers_love.recognition_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mothers_love.recognition_reactions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE mothers_love.recognition_reactions FROM PUBLIC;

DO $reaction_table_acl$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role', 'mothers_love_runtime'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE mothers_love.recognition_reactions FROM %I', role_name);
    END IF;
  END LOOP;
END
$reaction_table_acl$;

CREATE FUNCTION public.ml_reactions_get(requested_ids jsonb, p_visitor_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $function$
DECLARE
  now_value timestamptz := clock_timestamp();
  mode_value text;
  ids uuid[] := ARRAY[]::uuid[];
  item_value text;
  item_id uuid;
  result jsonb;
BEGIN
  IF requested_ids IS NULL
     OR jsonb_typeof(requested_ids) <> 'array'
     OR p_visitor_hash IS NULL
     OR p_visitor_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;

  IF COALESCE(jsonb_array_length(requested_ids), 0) NOT BETWEEN 1 AND 30 THEN
    RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;

  FOR item_value IN SELECT value FROM jsonb_array_elements_text(requested_ids) AS values(value) LOOP
    IF item_value IS NULL OR item_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
    END IF;
    item_id := item_value::uuid;
    IF item_id = ANY(ids) THEN
      RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
    END IF;
    ids := array_append(ids, item_id);
  END LOOP;

  SELECT s.mode
  INTO mode_value
  FROM mothers_love.settings AS s
  WHERE s.singleton_id = true;

  IF NOT FOUND OR NOT mothers_love.ml_purge_healthy(now_value) THEN
    RETURN jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
  END IF;

  IF mode_value = 'neutral' THEN
    RETURN jsonb_build_object('ok', true, 'items', '[]'::jsonb);
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', eligible.recognition_id::text,
        'count', eligible.reaction_count,
        'liked', eligible.visitor_liked
      )
      ORDER BY eligible.request_order
    ),
    '[]'::jsonb
  )
  INTO result
  FROM (
    SELECT
      requested.id AS recognition_id,
      requested.request_order,
      count(reaction.recognition_id)::integer AS reaction_count,
      COALESCE(bool_or(reaction.visitor_hash = p_visitor_hash), false) AS visitor_liked
    FROM unnest(ids) WITH ORDINALITY AS requested(id, request_order)
    JOIN mothers_love.recognitions AS recognition
      ON recognition.id = requested.id
     AND recognition.status = 'published'
     AND recognition.expires_at > now_value
    LEFT JOIN mothers_love.recognition_reactions AS reaction
      ON reaction.recognition_id = recognition.id
    GROUP BY requested.id, requested.request_order
  ) AS eligible;

  RETURN jsonb_build_object('ok', true, 'items', result);
END
$function$;

CREATE FUNCTION public.ml_reactions_set(
  p_recognition_id uuid,
  p_visitor_hash text,
  desired_liked boolean,
  p_rate_ip text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $function$
DECLARE
  now_value timestamptz := clock_timestamp();
  now_minute timestamptz;
  recognition_row mothers_love.recognitions%ROWTYPE;
  settings_row mothers_love.settings%ROWTYPE;
  current_count integer;
  ip_hash text;
BEGIN
  IF p_recognition_id IS NULL
     OR p_visitor_hash IS NULL
     OR p_visitor_hash !~ '^[0-9a-f]{64}$'
     OR p_rate_ip IS NULL
     OR btrim(p_rate_ip) = ''
     OR length(p_rate_ip) > 128
     OR desired_liked IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_REQUEST');
  END IF;

  -- Purge deletes a recognition before it updates settings. The unlocked
  -- health precheck, recognition lock, then settings share lock keeps this
  -- function in the same lock order without a setter/purge deadlock.
  IF NOT EXISTS (SELECT 1 FROM mothers_love.settings AS s WHERE s.singleton_id = true)
     OR NOT mothers_love.ml_purge_healthy(now_value) THEN
    RETURN jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
  END IF;

  SELECT r.*
  INTO recognition_row
  FROM mothers_love.recognitions AS r
  WHERE r.id = p_recognition_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 404, 'code', 'NOT_FOUND');
  END IF;

  SELECT s.*
  INTO settings_row
  FROM mothers_love.settings AS s
  WHERE s.singleton_id = true
  FOR SHARE;

  now_value := clock_timestamp();

  IF settings_row.singleton_id IS DISTINCT FROM true
     OR settings_row.mode = 'neutral'
     OR NOT mothers_love.ml_purge_healthy(now_value) THEN
    RETURN jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
  END IF;

  IF recognition_row.status <> 'published'
     OR recognition_row.expires_at <= now_value THEN
    RETURN jsonb_build_object('ok', false, 'status', 404, 'code', 'NOT_FOUND');
  END IF;

  now_minute := date_trunc('minute', now_value);
  ip_hash := mothers_love.ml_hash(btrim(p_rate_ip));

  INSERT INTO mothers_love.rate_limits (scope, key_hash, window_start, count, expires_at)
  VALUES ('reaction_ip', ip_hash, now_minute, 1, now_value + interval '24 hours')
  ON CONFLICT (scope, key_hash, window_start)
  DO UPDATE SET count = mothers_love.rate_limits.count + 1
  RETURNING count INTO current_count;
  IF current_count > 120 THEN
    RETURN jsonb_build_object('ok', false, 'status', 429, 'code', 'THROTTLED', 'retryAfter', 60);
  END IF;

  INSERT INTO mothers_love.rate_limits (scope, key_hash, window_start, count, expires_at)
  VALUES ('reaction_browser', p_visitor_hash, now_minute, 1, now_value + interval '24 hours')
  ON CONFLICT (scope, key_hash, window_start)
  DO UPDATE SET count = mothers_love.rate_limits.count + 1
  RETURNING count INTO current_count;
  IF current_count > 30 THEN
    RETURN jsonb_build_object('ok', false, 'status', 429, 'code', 'THROTTLED', 'retryAfter', 60);
  END IF;

  IF desired_liked THEN
    INSERT INTO mothers_love.recognition_reactions (recognition_id, visitor_hash)
    VALUES (recognition_row.id, p_visitor_hash)
    ON CONFLICT (recognition_id, visitor_hash) DO NOTHING;
  ELSE
    DELETE FROM mothers_love.recognition_reactions AS reaction
    WHERE reaction.recognition_id = recognition_row.id
      AND reaction.visitor_hash = p_visitor_hash;
  END IF;

  SELECT count(*)::integer
  INTO current_count
  FROM mothers_love.recognition_reactions AS reaction
  WHERE reaction.recognition_id = recognition_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', recognition_row.id::text,
    'count', current_count,
    'liked', desired_liked
  );
END
$function$;

REVOKE ALL ON FUNCTION public.ml_reactions_get(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ml_reactions_set(uuid, text, boolean, text) FROM PUBLIC;

DO $reaction_function_acl$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.ml_reactions_get(jsonb, text) FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON FUNCTION public.ml_reactions_set(uuid, text, boolean, text) FROM %I', role_name);
    END IF;
  END LOOP;
END
$reaction_function_acl$;

GRANT EXECUTE ON FUNCTION public.ml_reactions_get(jsonb, text) TO mothers_love_runtime;
GRANT EXECUTE ON FUNCTION public.ml_reactions_set(uuid, text, boolean, text) TO mothers_love_runtime;
