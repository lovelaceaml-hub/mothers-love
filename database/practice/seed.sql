-- Made-up records for a practice database (Plan 34 Section F). Every name and message
-- here is fictional and generated; nothing comes from the real campaign.
-- Run only through scripts/practice-database.sh, which builds the database first and
-- refuses any database that is not marked as a practice database.
\set ON_ERROR_STOP on
BEGIN;

DO $practice_guard$
BEGIN
  IF pg_catalog.obj_description('mothers_love'::regnamespace, 'pg_namespace') IS DISTINCT FROM 'practice database: fictional records only' THEN
    RAISE EXCEPTION 'this is not a practice database (schema marker missing)';
  END IF;
  IF EXISTS (SELECT 1 FROM mothers_love.recognitions) THEN
    RAISE EXCEPTION 'the practice database already holds records; rebuild it with --reset';
  END IF;
END
$practice_guard$;

-- The TV read only answers when the QR address is the campaign's own form, so a practice
-- TV shows a QR code that opens the real form. Never scan it to send a test.
UPDATE mothers_love.settings
SET mode = 'normal', collection_open = true, last_cleanup_at = clock_timestamp(),
    submission_url = 'https://mothers-love.vercel.app/recognize';
UPDATE mothers_love.color_polish_presentation SET enabled = true;

WITH names AS (
  SELECT ARRAY['Avery','Jordan','Riley','Morgan','Casey','Quinn','Harper','Rowan','Sage','Emery','Dakota','Finley'] AS first,
         ARRAY['A.','B.','C.','D.','E.','F.','G.','H.'] AS last,
         ARRAY[
           'Thank you for staying after to help put the chairs away.',
           'You noticed I was having a hard week and brought me soup. It meant so much.',
           'Thank you for listening without hurrying me.',
           'You gave up your seat with a smile. I saw it, and it made my day.',
           'Thank you for the ride home in the rain 🌧️ and for the good conversation.',
           'You said sorry first. That took courage, and it changed the whole day.',
           'Gracias por tu paciencia y tu sonrisa. 고맙습니다. Thank you!',
           'You cheered for everyone at practice, even when you were tired.'
         ] AS messages
)
INSERT INTO mothers_love.recognitions
  (id, submitted_name, recipient, message, status, reason_category, created_at, first_published_at, expires_at, featured)
SELECT
  ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'Practice Sender ' || n,
  names.first[1 + (n % 12)] || ' ' || names.last[1 + (n % 8)],
  CASE
    WHEN n % 20 = 0 THEN rtrim(repeat(names.messages[1 + (n % 8)] || ' ', 6))
    ELSE names.messages[1 + (n % 8)]
  END,
  CASE WHEN n <= 54 THEN 'published' WHEN n <= 57 THEN 'held' WHEN n <= 59 THEN 'hidden' ELSE 'invalid' END,
  CASE WHEN n <= 54 THEN NULL WHEN n <= 57 THEN 'safety' WHEN n <= 59 THEN 'privacy' ELSE 'spam' END,
  clock_timestamp() - n * interval '7 hours',
  CASE WHEN n <= 54 OR n BETWEEN 58 AND 59 THEN clock_timestamp() - n * interval '7 hours' + interval '1 minute' END,
  clock_timestamp() + interval '100 years',
  n = 3
FROM generate_series(1, 60) AS n, names;

INSERT INTO mothers_love.recognition_expressions (recognition_id, expression_id)
SELECT r.id, e.expression_id
FROM mothers_love.recognitions AS r
CROSS JOIN LATERAL (
  SELECT DISTINCT expression_id
  FROM (VALUES
    (1 + (right(r.id::text, 4)::integer % 9)),
    (1 + ((right(r.id::text, 4)::integer * 4) % 9))
  ) AS picked(expression_id)
) AS e;

INSERT INTO mothers_love.recognition_reactions (recognition_id, visitor_hash)
SELECT r.id, lpad(to_hex(right(r.id::text, 4)::integer * 1000 + k), 64, '0')
FROM mothers_love.recognitions AS r
CROSS JOIN LATERAL generate_series(1, (right(r.id::text, 4)::integer * 7) % 23) AS k
WHERE r.status = 'published';

INSERT INTO mothers_love.contribution_state (recognition_id, period_start, contribution)
SELECT r.id,
       (r.first_published_at AT TIME ZONE 'America/Los_Angeles')::date,
       mothers_love.ml_expression_vector((
         SELECT jsonb_agg(re.expression_id ORDER BY re.expression_id)
         FROM mothers_love.recognition_expressions AS re WHERE re.recognition_id = r.id
       ))
FROM mothers_love.recognitions AS r
WHERE r.status IN ('published', 'hidden');

INSERT INTO mothers_love.daily_aggregates (period_start, period_end, recognitions, expression_counts, expression_total)
SELECT days.day, days.day, days.recognitions,
       ARRAY(
         SELECT (SELECT count(*)
                 FROM mothers_love.recognition_expressions AS re
                 JOIN mothers_love.contribution_state AS cs ON cs.recognition_id = re.recognition_id
                 WHERE cs.period_start = days.day AND re.expression_id = slot)::integer
         FROM generate_series(1, 9) AS slot
         ORDER BY slot
       ),
       (SELECT count(*)
        FROM mothers_love.recognition_expressions AS re
        JOIN mothers_love.contribution_state AS cs ON cs.recognition_id = re.recognition_id
        WHERE cs.period_start = days.day)::integer
FROM (
  SELECT cs.period_start AS day, count(*)::integer AS recognitions
  FROM mothers_love.contribution_state AS cs
  GROUP BY cs.period_start
) AS days;

INSERT INTO mothers_love.display_events (recognition_id, event_kind, recognition_version, payload, expires_at)
SELECT r.id, 'published', r.version, mothers_love.ml_public_recognition(r), clock_timestamp() + interval '7 days'
FROM mothers_love.recognitions AS r
WHERE r.status = 'published'
ORDER BY r.first_published_at;

COMMIT;

SELECT status, count(*) AS recognitions FROM mothers_love.recognitions GROUP BY status ORDER BY status;
SELECT count(*) AS hearts FROM mothers_love.recognition_reactions;
