-- Plan 08 production repair: the runtime role deliberately has no USAGE on
-- the private mothers_love schema. Keep that boundary intact and expose only
-- this narrow, allowlisted bridge through the already-used public schema.

CREATE OR REPLACE FUNCTION public.ml_display_settings_patch(payload jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT mothers_love.ml_patch_display_settings(payload)
$function$;

REVOKE ALL ON FUNCTION public.ml_display_settings_patch(jsonb) FROM PUBLIC;
DO $display_settings_bridge_acl$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION public.ml_display_settings_patch(jsonb) FROM %I', role_name);
    END IF;
  END LOOP;
END
$display_settings_bridge_acl$;
GRANT EXECUTE ON FUNCTION public.ml_display_settings_patch(jsonb) TO mothers_love_runtime;
