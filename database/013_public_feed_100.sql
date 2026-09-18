-- Expand only the public recognition feed page from 50 to 100 eligible records.
-- The public projection, privacy checks, expiry, ordering, and runtime-only ACL stay unchanged.
DO $public_feed_100_migration$
DECLARE
  current_definition text;
  updated_definition text;
BEGIN
  IF pg_catalog.to_regprocedure('public.ml_public_feed()') IS NULL THEN
    RAISE EXCEPTION 'public.ml_public_feed() is missing';
  END IF;

  SELECT pg_catalog.pg_get_functiondef('public.ml_public_feed()'::regprocedure)
  INTO current_definition;

  IF (SELECT count(*) FROM regexp_matches(current_definition, 'LIMIT 50', 'g')) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'public feed limit precondition changed';
  END IF;

  updated_definition := replace(current_definition, 'LIMIT 50', 'LIMIT 100');
  EXECUTE updated_definition;

  IF pg_catalog.pg_get_functiondef('public.ml_public_feed()'::regprocedure) NOT LIKE '%LIMIT 100%' THEN
    RAISE EXCEPTION 'public feed limit was not updated';
  END IF;
END
$public_feed_100_migration$;
