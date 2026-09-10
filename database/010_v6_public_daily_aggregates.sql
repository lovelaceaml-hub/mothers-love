-- V6 TV display support: expose only anonymous daily campaign aggregates.
-- No recognition IDs, names, messages, or admin fields cross this bridge.
CREATE OR REPLACE FUNCTION public.ml_public_display_daily_aggregates()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $function$
  SELECT COALESCE(pg_catalog.jsonb_agg(ordered.obj), '[]'::jsonb)
  FROM (
    SELECT pg_catalog.jsonb_build_object(
      'date', d.period_start,
      'recognitions', d.recognitions,
      'expressionCounts', pg_catalog.to_jsonb(d.expression_counts),
      'expressionTotal', d.expression_total
    ) AS obj
    FROM mothers_love.daily_aggregates AS d
    WHERE d.period_start BETWEEN
      (pg_catalog.date_trunc('month', pg_catalog.clock_timestamp() AT TIME ZONE 'America/Los_Angeles')::date - 14)
      AND (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Los_Angeles')::date
    ORDER BY d.period_start
  ) AS ordered
$function$;

REVOKE ALL ON FUNCTION public.ml_public_display_daily_aggregates() FROM PUBLIC;
DO $v6_daily_aggregate_acl$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION public.ml_public_display_daily_aggregates() FROM %I', role_name);
    END IF;
  END LOOP;
END
$v6_daily_aggregate_acl$;
GRANT EXECUTE ON FUNCTION public.ml_public_display_daily_aggregates() TO mothers_love_runtime;
