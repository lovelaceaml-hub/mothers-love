-- REVIEW DRAFT: raises only the anonymous reaction read batch cap from 30 to 100.
-- The function's validation, cookie hash, eligibility rules, output order,
-- SECURITY DEFINER boundary, owner, search_path, and grants stay unchanged.
-- Create/replace is guarded by the exact prior cap and fails closed on drift.
-- Do not apply this source file alone. Use the prepared transaction wrapper
-- in docs/runs/2026-10-11-cpu-fix/research/019-release-paste.sql to record its
-- hash in the campaign ledger atomically after live preflight.

DO $reaction_read_batch_100$
DECLARE
  current_definition text;
  updated_definition text;
  security_definer boolean;
  function_config text[];
  function_owner oid;
  function_acl pg_catalog.aclitem[];
  original_function_config text[];
  original_function_owner oid;
  original_function_acl pg_catalog.aclitem[];
  runtime_role oid;
BEGIN
  IF pg_catalog.to_regprocedure('public.ml_reactions_get(jsonb,text)') IS NULL THEN
    RAISE EXCEPTION 'public.ml_reactions_get(jsonb,text) is missing';
  END IF;

  runtime_role := pg_catalog.to_regrole('mothers_love_runtime')::oid;
  IF runtime_role IS NULL THEN
    RAISE EXCEPTION 'mothers_love_runtime role is missing';
  END IF;

  SELECT p.prosecdef, p.proconfig, p.proowner, p.proacl
  INTO security_definer, function_config, function_owner, function_acl
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.ml_reactions_get(jsonb,text)'::pg_catalog.regprocedure;
  IF security_definer IS DISTINCT FROM true
     OR function_owner IS DISTINCT FROM 'postgres'::pg_catalog.regrole::oid
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.unnest(COALESCE(function_config, ARRAY[]::text[])) AS config(value)
       WHERE pg_catalog.replace(config.value, ' ', '') IN ('search_path=', $$search_path=""$$, $$search_path=''$$)
     )
     OR NOT pg_catalog.has_function_privilege(runtime_role, 'public.ml_reactions_get(jsonb,text)'::pg_catalog.regprocedure, 'EXECUTE')
     OR EXISTS (
       SELECT 1
       FROM pg_catalog.aclexplode(COALESCE(function_acl, pg_catalog.acldefault('f', function_owner))) AS acl_entry
       WHERE acl_entry.privilege_type <> 'EXECUTE'
         OR (acl_entry.grantee <> function_owner AND acl_entry.grantee <> runtime_role)
         OR (acl_entry.grantee = runtime_role AND acl_entry.is_grantable)
     ) THEN
    RAISE EXCEPTION 'reaction getter security or ACL precondition changed';
  END IF;
  original_function_config := function_config;
  original_function_owner := function_owner;
  original_function_acl := function_acl;

  SELECT pg_catalog.pg_get_functiondef('public.ml_reactions_get(jsonb,text)'::pg_catalog.regprocedure)
  INTO current_definition;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.regexp_matches(current_definition, 'NOT BETWEEN 1 AND 30', 'g')) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'reaction getter batch cap precondition changed';
  END IF;

  updated_definition := pg_catalog.replace(current_definition, 'NOT BETWEEN 1 AND 30', 'NOT BETWEEN 1 AND 100');
  EXECUTE updated_definition;

  SELECT p.prosecdef, p.proconfig, p.proowner, p.proacl
  INTO security_definer, function_config, function_owner, function_acl
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.ml_reactions_get(jsonb,text)'::pg_catalog.regprocedure;
  IF pg_catalog.pg_get_functiondef('public.ml_reactions_get(jsonb,text)'::pg_catalog.regprocedure) NOT LIKE '%NOT BETWEEN 1 AND 100%'
     OR security_definer IS DISTINCT FROM true
     OR function_config IS DISTINCT FROM original_function_config
     OR function_owner IS DISTINCT FROM original_function_owner
     OR function_acl IS DISTINCT FROM original_function_acl THEN
    RAISE EXCEPTION 'reaction getter postcondition or security preservation failed';
  END IF;
END
$reaction_read_batch_100$;
