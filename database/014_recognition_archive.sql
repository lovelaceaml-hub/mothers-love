-- 014: keep every recognition permanently (Anthony, 2026-09-18).
-- The 168 hour cleanup still takes a recognition off the home page, the TV and
-- the working admin list, but it now copies the full record into a permanent
-- archive first, so no submission is ever lost. Additive: no existing table,
-- public function, grant or health check changes shape.

CREATE TABLE IF NOT EXISTS mothers_love.recognitions_archive (
  id uuid PRIMARY KEY,
  submitted_name text NOT NULL,
  recipient text NOT NULL,
  message text NOT NULL,
  status text NOT NULL,
  reason_category text,
  created_at timestamptz NOT NULL,
  first_published_at timestamptz,
  expires_at timestamptz NOT NULL,
  version integer NOT NULL,
  featured boolean NOT NULL,
  updated_at timestamptz NOT NULL,
  expression_ids smallint[] NOT NULL DEFAULT '{}',
  heart_count integer NOT NULL DEFAULT 0,
  archived_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS recognitions_archive_created_idx ON mothers_love.recognitions_archive (created_at DESC);

ALTER TABLE mothers_love.recognitions_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE mothers_love.recognitions_archive FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE mothers_love.recognitions_archive FROM PUBLIC;

CREATE OR REPLACE FUNCTION mothers_love.purge_expired()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER VOLATILE SET search_path = '' AS $function$
DECLARE
  removed integer;
  now_value timestamptz := clock_timestamp();
BEGIN
  INSERT INTO mothers_love.recognitions_archive (
    id, submitted_name, recipient, message, status, reason_category, created_at,
    first_published_at, expires_at, version, featured, updated_at, expression_ids, heart_count, archived_at
  )
  SELECT
    r.id, r.submitted_name, r.recipient, r.message, r.status, r.reason_category, r.created_at,
    r.first_published_at, r.expires_at, r.version, r.featured, r.updated_at,
    COALESCE((SELECT array_agg(e.expression_id ORDER BY e.expression_id) FROM mothers_love.recognition_expressions e WHERE e.recognition_id = r.id), '{}'),
    (SELECT count(*)::integer FROM mothers_love.recognition_reactions x WHERE x.recognition_id = r.id),
    now_value
  FROM mothers_love.recognitions r
  WHERE r.expires_at <= now_value
  ON CONFLICT (id) DO NOTHING;

  UPDATE mothers_love.admin_audit aa SET target_id = NULL WHERE aa.target_id IN (SELECT r.id FROM mothers_love.recognitions r WHERE r.expires_at <= now_value);
  -- Only rows already safe in the archive are removed.
  DELETE FROM mothers_love.recognitions r WHERE r.expires_at <= now_value
    AND EXISTS (SELECT 1 FROM mothers_love.recognitions_archive a WHERE a.id = r.id);
  GET DIAGNOSTICS removed = ROW_COUNT;
  DELETE FROM mothers_love.idempotency_keys WHERE expires_at <= now_value;
  DELETE FROM mothers_love.display_events WHERE expires_at IS NOT NULL AND expires_at <= now_value;
  DELETE FROM mothers_love.rate_limits WHERE expires_at <= now_value;
  DELETE FROM mothers_love.campaign_invitations WHERE expires_at <= now_value OR used_at <= now_value - interval '30 days';
  DELETE FROM mothers_love.admin_audit WHERE expires_at <= now_value;
  UPDATE mothers_love.settings SET last_cleanup_at = now_value, overdue_purge_count = 0, updated_at = now_value WHERE singleton_id = true;
  RETURN jsonb_build_object('ok', true, 'removed', removed, 'at', now_value);
END
$function$;
