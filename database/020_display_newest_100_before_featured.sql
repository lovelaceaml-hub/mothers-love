-- REVIEW DRAFT: narrows the TV display candidate set to the newest 100 eligible
-- recognitions before the selected rows are ordered by featured status.
--
-- Production read-only verification is still required before this is run. The
-- connected Supabase project list did not include a Mothers Love project, so
-- this draft is based on the repository's
-- database/007_public_display_revision.sql definition and must be compared
-- with pg_get_functiondef('public.ml_public_display_snapshot(text)') in the
-- actual project. The guards below fail closed unless both candidate queries
-- still have the exact expected newest/featured/LIMIT 1000 shape.
--
-- Replaces only public.ml_public_display_snapshot(text). Both the public item
-- projection and delta-arrival membership use the same newest-100 set. The
-- final item output remains featured-first, then newest-first. No table, row,
-- index, grant, setting, or other function is changed; CREATE OR REPLACE keeps
-- the existing owner and access list.

DO $display_newest_100_before_featured$
DECLARE
  current_definition text;
  color_polish_definition text;
  updated_definition text;
  selection_pattern constant text := $pattern$ORDER BY[[:space:]]+\(r\.featured AND \(r\.feature_until IS NULL OR r\.feature_until > now_value\)\) DESC,[[:space:]]+r\.first_published_at DESC,[[:space:]]+r\.id DESC[[:space:]]+LIMIT 1000$pattern$;
  newest_order_pattern constant text := $pattern$ORDER BY r\.first_published_at DESC, r\.id DESC LIMIT 100$pattern$;
  security_definer boolean;
  function_config text[];
BEGIN
  IF pg_catalog.to_regprocedure('public.ml_public_display_snapshot(text)') IS NULL THEN
    RAISE EXCEPTION 'public.ml_public_display_snapshot(text) is missing';
  END IF;
  IF pg_catalog.to_regprocedure('public.ml_color_polish_snapshot(text)') IS NULL THEN
    RAISE EXCEPTION 'public.ml_color_polish_snapshot(text) is missing';
  END IF;
  SELECT pg_catalog.pg_get_functiondef('public.ml_color_polish_snapshot(text)'::pg_catalog.regprocedure)
  INTO color_polish_definition;
  IF pg_catalog.strpos(color_polish_definition, 'public.ml_public_display_snapshot(after_cursor)') = 0 THEN
    RAISE EXCEPTION 'color polish snapshot dependency precondition changed';
  END IF;

  SELECT p.prosecdef, p.proconfig
  INTO security_definer, function_config
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.ml_public_display_snapshot(text)'::pg_catalog.regprocedure;
  IF security_definer IS DISTINCT FROM true
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.unnest(COALESCE(function_config, ARRAY[]::text[])) AS config(value)
       WHERE pg_catalog.replace(config.value, ' ', '') IN ('search_path=', $$search_path=""$$, $$search_path=''$$)
     ) THEN
    RAISE EXCEPTION 'public display snapshot security precondition changed';
  END IF;

  SELECT pg_catalog.pg_get_functiondef('public.ml_public_display_snapshot(text)'::pg_catalog.regprocedure)
  INTO current_definition;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.regexp_matches(current_definition, selection_pattern, 'g')) IS DISTINCT FROM 2
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.regexp_matches(current_definition, 'ORDER BY selected\.featured DESC, selected\.first_published_at DESC, selected\.id DESC', 'g')) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'public display newest/featured selection precondition changed';
  END IF;

  updated_definition := pg_catalog.regexp_replace(
    current_definition,
    selection_pattern,
    'ORDER BY r.first_published_at DESC, r.id DESC LIMIT 100',
    'g'
  );
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.regexp_matches(updated_definition, newest_order_pattern, 'g')) IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'public display newest-100 candidate replacement failed';
  END IF;
  EXECUTE updated_definition;

  SELECT pg_catalog.pg_get_functiondef('public.ml_public_display_snapshot(text)'::pg_catalog.regprocedure)
  INTO updated_definition;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.regexp_matches(updated_definition, newest_order_pattern, 'g')) IS DISTINCT FROM 2
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.regexp_matches(updated_definition, selection_pattern, 'g')) IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'public display newest-100 postcondition failed';
  END IF;
END
$display_newest_100_before_featured$;
