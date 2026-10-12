-- Run only after the preflight confirms that the index is absent.
-- Execute through a direct PostgreSQL session in autocommit mode, outside any
-- migration wrapper or BEGIN block. If interrupted, inspect the index state
-- before retrying; do not use IF NOT EXISTS to hide an invalid build.
\set ON_ERROR_STOP on
SET lock_timeout = '2s';
SET statement_timeout = '5min';
CREATE INDEX CONCURRENTLY recognitions_display_latest_idx
ON mothers_love.recognitions (first_published_at DESC, id DESC)
WHERE status = 'published' AND first_published_at IS NOT NULL;
RESET statement_timeout;
RESET lock_timeout;
