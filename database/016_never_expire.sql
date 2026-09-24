-- 016: keep recognitions indefinitely (Anthony, 2026-09-23).
-- New and existing recognition rows receive a far-future expiry; archived rows
-- return to the live table with their expressions. Idempotency keys and display
-- events keep their 168 hour lifetime. A paused cleanup job no longer closes
-- collection when no recognition is overdue. Archived heart counts cannot be
-- rebuilt from anonymous visitor rows; each restored row gets its contribution record back.
-- The coordinator inserts the application ledger row at apply time.
-- A second run fails the guarded API anchor check and rolls back atomically.
BEGIN;

DO $never_expire_migration$
DECLARE
  current_definition text;
  updated_definition text;
  recognition_anchor constant text := $anchor$CASE WHEN hold THEN NULL ELSE now_value END, expires_value)$anchor$;
  recognition_replacement constant text := $anchor$CASE WHEN hold THEN NULL ELSE now_value END, now_value + interval '100 years')$anchor$;
  event_anchor constant text := $anchor$mothers_love.ml_public_recognition(rec), rec.expires_at);$anchor$;
  event_replacement constant text := $anchor$mothers_love.ml_public_recognition(rec), LEAST(rec.expires_at, now_value + interval '168 hours'));$anchor$;
BEGIN
  IF pg_catalog.to_regprocedure('public.ml_api(text, jsonb)') IS NULL THEN
    RAISE EXCEPTION 'public.ml_api(text, jsonb) is missing';
  END IF;
  SELECT pg_catalog.pg_get_functiondef('public.ml_api(text, jsonb)'::regprocedure)
  INTO current_definition;
  IF (length(current_definition) - length(replace(current_definition, recognition_anchor, ''))) / length(recognition_anchor) <> 1 THEN
    RAISE EXCEPTION 'recognition insert expiry anchor must occur exactly once';
  END IF;
  IF (length(current_definition) - length(replace(current_definition, event_anchor, ''))) / length(event_anchor) <> 1 THEN
    RAISE EXCEPTION 'admin display event expiry anchor must occur exactly once';
  END IF;
  updated_definition := replace(current_definition, recognition_anchor, recognition_replacement);
  updated_definition := replace(updated_definition, event_anchor, event_replacement);
  EXECUTE updated_definition;
  SELECT pg_catalog.pg_get_functiondef('public.ml_api(text, jsonb)'::regprocedure)
  INTO updated_definition;
  IF (length(updated_definition) - length(replace(updated_definition, recognition_replacement, ''))) / length(recognition_replacement) <> 1
     OR (length(updated_definition) - length(replace(updated_definition, event_replacement, ''))) / length(event_replacement) <> 1 THEN
    RAISE EXCEPTION 'never-expire API replacements were not installed';
  END IF;
END
$never_expire_migration$;

CREATE OR REPLACE FUNCTION mothers_love.ml_purge_healthy(check_at timestamptz)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM mothers_love.recognitions r
    WHERE r.expires_at <= check_at - interval '2 minutes'
  )
$$;

UPDATE mothers_love.recognitions
SET expires_at = now() + interval '100 years',
    feature_until = CASE WHEN featured AND feature_until IS NOT NULL THEN now() + interval '100 years' ELSE feature_until END
WHERE expires_at < now() + interval '99 years';

WITH restored AS (
  INSERT INTO mothers_love.recognitions (
    id, submitted_name, recipient, message, status, reason_category, created_at,
    first_published_at, expires_at, version, featured, feature_until, updated_at
  )
  SELECT a.id, a.submitted_name, a.recipient, a.message, a.status, a.reason_category,
         a.created_at, a.first_published_at, now() + interval '100 years',
         a.version, false, NULL, a.updated_at
  FROM mothers_love.recognitions_archive a
  WHERE NOT EXISTS (SELECT 1 FROM mothers_love.recognitions r WHERE r.id = a.id)
  RETURNING id, status, first_published_at
), restored_expressions AS (
  INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id)
  SELECT restored.id, expression_id.value::smallint
  FROM restored
  JOIN mothers_love.recognitions_archive a ON a.id = restored.id
  CROSS JOIN LATERAL unnest(a.expression_ids) AS expression_id(value)
  ON CONFLICT DO NOTHING
  RETURNING recognition_id
)
-- Archiving cascaded away each row's contribution record while the daily
-- aggregates kept counting it. Rebuild it as public.ml_api stores it, so a
-- later hide, restore, edit or invalidate reverses once and never double counts:
-- published or hidden after publication counts its expressions in the Los
-- Angeles publication day; held and invalid rows count nothing.
INSERT INTO mothers_love.contribution_state (recognition_id, period_start, contribution)
SELECT restored.id,
       CASE WHEN restored.first_published_at IS NULL THEN NULL
            ELSE (restored.first_published_at AT TIME ZONE 'America/Los_Angeles')::date END,
       CASE WHEN restored.status IN ('published', 'hidden') AND restored.first_published_at IS NOT NULL
            THEN mothers_love.ml_expression_vector(pg_catalog.to_jsonb(a.expression_ids))
            ELSE mothers_love.ml_zero_vector() END
FROM restored
JOIN mothers_love.recognitions_archive a ON a.id = restored.id
ON CONFLICT (recognition_id) DO NOTHING;

COMMIT;
