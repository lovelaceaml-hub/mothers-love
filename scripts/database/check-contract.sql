-- Run only against the authorized campaign database by the root integration lane.
-- This query reads metadata and synthetic counters only.

SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS forced_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'mothers_love'
ORDER BY c.relname;

SELECT p.oid::regprocedure AS function_name,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       has_function_privilege('mothers_love_runtime', p.oid, 'EXECUTE') AS runtime_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('ml_api', 'ml_purge');

SELECT singleton_id, collection_open, version, last_cleanup_at, overdue_purge_count
FROM mothers_love.settings;

SELECT count(*) AS personal_rows FROM mothers_love.recognitions;
SELECT count(*) AS aggregate_rows FROM mothers_love.daily_aggregates;

