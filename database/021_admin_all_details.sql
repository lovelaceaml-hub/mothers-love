-- 021: an administrator sees every detail of a recognition (Plan 18 Section C;
-- Anthony, 2026-11-11: "Do everything else").
--
-- mothers_love.ml_admin_recognition is the projection behind the admin list, the admin
-- detail page and the reply to every admin action. It gains three fields:
--   updatedAt   when the row last changed
--   heartCount  every like on this recognition, whatever its status
--   audit       the admin actions still on record for it, newest first, at most 50:
--               action, reason, outcome, time, the version it produced and the acting
--               administrator's current role (never an identifier). The audit table
--               keeps 30 days, so older actions are not listed.
--
-- Nothing else changes: no table, index, grant, signature, public projection, expiry
-- rule or health check. The function is reached only through public.ml_api's admin
-- actions, which authorize every call. Public reads use ml_public_recognition and are
-- untouched. The admin screens work before and after this migration: without it they
-- say that likes and history are not available yet.
--
-- Rollback (the 001 definition):
--   CREATE OR REPLACE FUNCTION mothers_love.ml_admin_recognition(rec mothers_love.recognitions)
--   RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
--     SELECT mothers_love.ml_public_recognition(rec) || jsonb_build_object('submittedName', rec.submitted_name, 'reason', rec.reason_category)
--   $$;
BEGIN;

DO $admin_all_details_preflight$
DECLARE
  current_definition text;
BEGIN
  IF pg_catalog.to_regprocedure('mothers_love.ml_admin_recognition(mothers_love.recognitions)') IS NULL THEN
    RAISE EXCEPTION 'mothers_love.ml_admin_recognition(mothers_love.recognitions) is missing';
  END IF;
  IF pg_catalog.to_regclass('mothers_love.recognition_reactions') IS NULL
     OR pg_catalog.to_regclass('mothers_love.admin_audit') IS NULL
     OR pg_catalog.to_regclass('mothers_love.admin_memberships') IS NULL THEN
    RAISE EXCEPTION 'a table this projection reads is missing';
  END IF;
  SELECT pg_catalog.pg_get_functiondef('mothers_love.ml_admin_recognition(mothers_love.recognitions)'::regprocedure)
  INTO current_definition;
  IF current_definition LIKE '%heartCount%' THEN
    RAISE EXCEPTION 'migration 021 is already applied';
  END IF;
  IF current_definition NOT LIKE '%''submittedName'', rec.submitted_name, ''reason'', rec.reason_category%' THEN
    RAISE EXCEPTION 'ml_admin_recognition precondition changed';
  END IF;
END
$admin_all_details_preflight$;

CREATE OR REPLACE FUNCTION mothers_love.ml_admin_recognition(rec mothers_love.recognitions)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT mothers_love.ml_public_recognition(rec) || jsonb_build_object(
    'submittedName', rec.submitted_name,
    'reason', rec.reason_category,
    'updatedAt', rec.updated_at,
    'heartCount', (
      SELECT count(*)
      FROM mothers_love.recognition_reactions AS reaction
      WHERE reaction.recognition_id = rec.id
    ),
    'audit', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'action', entry.action_category,
          'reason', entry.reason_category,
          'outcome', entry.outcome,
          'at', entry.created_at,
          'version', entry.version,
          'actorRole', entry.actor_role
        )
        ORDER BY entry.created_at DESC, entry.id DESC
      )
      FROM (
        SELECT audit.id, audit.action_category, audit.reason_category, audit.outcome, audit.created_at,
               audit.metadata->'version' AS version,
               (SELECT membership.role FROM mothers_love.admin_memberships AS membership
                WHERE membership.user_id = audit.actor_user_id) AS actor_role
        FROM mothers_love.admin_audit AS audit
        WHERE audit.target_id = rec.id
        ORDER BY audit.created_at DESC, audit.id DESC
        LIMIT 50
      ) AS entry
    ), '[]'::jsonb)
  )
$$;

DO $admin_all_details_postflight$
DECLARE
  updated_definition text;
BEGIN
  SELECT pg_catalog.pg_get_functiondef('mothers_love.ml_admin_recognition(mothers_love.recognitions)'::regprocedure)
  INTO updated_definition;
  IF updated_definition NOT LIKE '%heartCount%' OR updated_definition NOT LIKE '%actorRole%' THEN
    RAISE EXCEPTION 'ml_admin_recognition was not replaced';
  END IF;
END
$admin_all_details_postflight$;

COMMIT;
