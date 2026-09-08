-- pgTAP/transaction fixture for an authorized isolated database run.
-- This file is intentionally not invoked by Vitest or against production.
BEGIN;
SELECT plan(8);
SELECT has_schema('mothers_love', 'campaign schema exists');
SELECT has_table('mothers_love', 'daily_aggregates', 'anonymous aggregate table exists');
SELECT has_function('public', 'ml_api', ARRAY['text', 'jsonb'], 'public bridge exists');
SELECT has_function('public', 'ml_purge', ARRAY[]::text[], 'purge bridge exists');
SELECT function_privs_are('public', 'ml_api', ARRAY['text', 'jsonb'], 'anon', ARRAY[]::text[], 'anon has no bridge execute');
SELECT function_privs_are('public', 'ml_api', ARRAY['text', 'jsonb'], 'authenticated', ARRAY[]::text[], 'authenticated has no bridge execute');
SELECT function_privs_are('public', 'ml_purge', ARRAY[]::text[], 'anon', ARRAY[]::text[], 'anon has no purge execute');
SELECT finish();
ROLLBACK;

