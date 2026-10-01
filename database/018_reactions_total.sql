-- Campaign-wide likes total for the TV header. The TV only holds the latest 100
-- recognitions, so adding up their likes made the header count drop whenever an
-- older recognition left that set. This read-only function returns one number:
-- every like on every published, unexpired recognition. Hidden and invalidated
-- recognitions are not counted. It returns no ids, names or messages, and keeps
-- the same mode and purge checks and runtime-only ACL as the other public reads.
-- Additive only: rollback is DROP FUNCTION public.ml_reactions_total();
DO $reactions_total_migration$
BEGIN
  IF pg_catalog.to_regclass('mothers_love.recognition_reactions') IS NULL THEN
    RAISE EXCEPTION 'mothers_love.recognition_reactions is missing';
  END IF;
  IF pg_catalog.to_regprocedure('public.ml_reactions_total()') IS NOT NULL THEN
    RAISE EXCEPTION 'public.ml_reactions_total() already exists';
  END IF;

  EXECUTE $function_definition$
    CREATE FUNCTION public.ml_reactions_total()
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = ''
    AS $function$
    DECLARE
      now_value timestamptz := clock_timestamp();
      mode_value text;
      total_value bigint;
    BEGIN
      SELECT s.mode
      INTO mode_value
      FROM mothers_love.settings AS s
      WHERE s.singleton_id = true;

      IF NOT FOUND OR NOT mothers_love.ml_purge_healthy(now_value) THEN
        RETURN jsonb_build_object('ok', false, 'status', 503, 'code', 'UNAVAILABLE');
      END IF;

      IF mode_value = 'neutral' THEN
        RETURN jsonb_build_object('ok', true, 'total', 0);
      END IF;

      SELECT count(*)
      INTO total_value
      FROM mothers_love.recognition_reactions AS reaction
      JOIN mothers_love.recognitions AS recognition
        ON recognition.id = reaction.recognition_id
      WHERE recognition.status = 'published'
        AND recognition.expires_at > now_value;

      RETURN jsonb_build_object('ok', true, 'total', total_value);
    END
    $function$;
  $function_definition$;
END
$reactions_total_migration$;

REVOKE ALL ON FUNCTION public.ml_reactions_total() FROM PUBLIC;
DO $reactions_total_acl$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.ml_reactions_total() FROM %I', role_name);
    END IF;
  END LOOP;
END
$reactions_total_acl$;
GRANT EXECUTE ON FUNCTION public.ml_reactions_total() TO mothers_love_runtime;
