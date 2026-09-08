-- Password-only campaign admin policy patch.
-- Existing tables, Auth configuration, roles, grants, and migration 001 remain unchanged.
-- The legacy require_aal2 argument stays in ml_authorize for signature compatibility,
-- but it is intentionally ignored after the campaign MFA policy change.
DO $password_only_admin$
DECLARE
  authorize_definition text;
  api_definition text;
  authorize_old text := $fragment$IF require_aal2 AND actor_role = 'owner' AND NOT actor_aal2 THEN RETURN jsonb_build_object('ok', false, 'status', 403, 'code', 'MFA_REQUIRED'); END IF;$fragment$;
  api_old text := $fragment$RETURN auth_result || jsonb_build_object('needsMfa', auth_result->>'role' = 'owner' AND NOT COALESCE((payload #>> '{actor,aal2}')::boolean, false));$fragment$;
  authorize_new text := $fragment$-- require_aal2 remains in the signature for compatibility; campaign MFA is disabled by policy.$fragment$;
  api_new text := $fragment$RETURN auth_result || jsonb_build_object('needsMfa', false);$fragment$;
  authorize_oid oid;
  api_oid oid;
  authorize_owner_before oid;
  authorize_owner_after oid;
  api_owner_before oid;
  api_owner_after oid;
  authorize_acl_before aclitem[];
  authorize_acl_after aclitem[];
  api_acl_before aclitem[];
  api_acl_after aclitem[];
BEGIN
  SELECT p.oid, p.proowner, p.proacl, pg_catalog.pg_get_functiondef(p.oid)
    INTO authorize_oid, authorize_owner_before, authorize_acl_before, authorize_definition
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'mothers_love'
    AND p.oid = 'mothers_love.ml_authorize(jsonb,text,boolean)'::regprocedure;
  IF authorize_definition IS NULL THEN
    RAISE EXCEPTION 'mothers_love.ml_authorize(jsonb,text,boolean) is missing';
  END IF;
  IF (length(authorize_definition) - length(replace(authorize_definition, authorize_old, ''))) / length(authorize_old) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'ml_authorize AAL2 guard did not match exactly once';
  END IF;
  authorize_definition := replace(authorize_definition, authorize_old, authorize_new);
  EXECUTE authorize_definition;
  SELECT p.proowner, p.proacl INTO authorize_owner_after, authorize_acl_after
  FROM pg_catalog.pg_proc p WHERE p.oid = authorize_oid;
  IF authorize_owner_after IS DISTINCT FROM authorize_owner_before OR authorize_acl_after IS DISTINCT FROM authorize_acl_before THEN
    RAISE EXCEPTION 'ml_authorize owner or ACL changed';
  END IF;

  SELECT p.oid, p.proowner, p.proacl, pg_catalog.pg_get_functiondef(p.oid)
    INTO api_oid, api_owner_before, api_acl_before, api_definition
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.oid = 'public.ml_api(text,jsonb)'::regprocedure;
  IF api_definition IS NULL THEN
    RAISE EXCEPTION 'public.ml_api(text,jsonb) is missing';
  END IF;
  IF (length(api_definition) - length(replace(api_definition, api_old, ''))) / length(api_old) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'ml_api admin_session MFA response did not match exactly once';
  END IF;
  api_definition := replace(api_definition, api_old, api_new);
  EXECUTE api_definition;
  SELECT p.proowner, p.proacl INTO api_owner_after, api_acl_after
  FROM pg_catalog.pg_proc p WHERE p.oid = api_oid;
  IF api_owner_after IS DISTINCT FROM api_owner_before OR api_acl_after IS DISTINCT FROM api_acl_before THEN
    RAISE EXCEPTION 'ml_api owner or ACL changed';
  END IF;
END
$password_only_admin$;
