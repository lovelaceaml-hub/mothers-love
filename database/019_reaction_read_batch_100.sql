-- REVIEW DRAFT: raises only the anonymous reaction read batch cap from 30 to 100.
-- The function's validation, cookie hash, eligibility rules, output order,
-- SECURITY DEFINER boundary, owner, search_path, and grants stay unchanged.
-- Create/replace is guarded by the exact prior cap and fails closed on drift.
-- This file has not been run; compare the live function definition first.

DO $reaction_read_batch_100$
DECLARE
  current_definition text;
  updated_definition text;
  security_definer boolean;
  function_config text[];
BEGIN
  IF pg_catalog.to_regprocedure('public.ml_reactions_get(jsonb,text)') IS NULL THEN
    RAISE EXCEPTION 'public.ml_reactions_get(jsonb,text) is missing';
  END IF;

  SELECT p.prosecdef, p.proconfig
  INTO security_definer, function_config
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.ml_reactions_get(jsonb,text)'::pg_catalog.regprocedure;
  IF security_definer IS DISTINCT FROM true
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.unnest(COALESCE(function_config, ARRAY[]::text[])) AS config(value)
       WHERE pg_catalog.replace(config.value, ' ', '') IN ('search_path=', $$search_path=""$$, $$search_path=''$$)
     ) THEN
    RAISE EXCEPTION 'reaction getter security precondition changed';
  END IF;

  SELECT pg_catalog.pg_get_functiondef('public.ml_reactions_get(jsonb,text)'::pg_catalog.regprocedure)
  INTO current_definition;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.regexp_matches(current_definition, 'NOT BETWEEN 1 AND 30', 'g')) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'reaction getter batch cap precondition changed';
  END IF;

  updated_definition := pg_catalog.replace(current_definition, 'NOT BETWEEN 1 AND 30', 'NOT BETWEEN 1 AND 100');
  EXECUTE updated_definition;

  IF pg_catalog.pg_get_functiondef('public.ml_reactions_get(jsonb,text)'::pg_catalog.regprocedure) NOT LIKE '%NOT BETWEEN 1 AND 100%' THEN
    RAISE EXCEPTION 'reaction getter batch cap was not updated';
  END IF;
END
$reaction_read_batch_100$;
