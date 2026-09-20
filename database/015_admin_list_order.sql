-- 015: admin list in the order submissions came in (Anthony, 2026-09-20).
-- The admin_list action of public.ml_api now accepts payload "sort":
-- 'oldest' returns recognitions in arrival order (created_at ascending),
-- anything else keeps the existing newest-first order. The response also
-- carries "sort" ('oldest' or 'newest') so the admin screen can label the
-- list truthfully before and after this migration is applied.
-- Same guarded text-replacement shape as migration 013. Additive: no table,
-- grant, function signature, projection, expiry rule or health check changes.
DO $admin_list_order_migration$
DECLARE
  current_definition text;
  updated_definition text;
BEGIN
  IF pg_catalog.to_regprocedure('public.ml_api(text, jsonb)') IS NULL THEN
    RAISE EXCEPTION 'public.ml_api(text, jsonb) is missing';
  END IF;

  SELECT pg_catalog.pg_get_functiondef('public.ml_api(text, jsonb)'::regprocedure)
  INTO current_definition;

  IF (SELECT count(*) FROM regexp_matches(current_definition, 'jsonb_agg\(mothers_love\.ml_admin_recognition\(page_rec\) ORDER BY page_rec\.created_at DESC\)', 'g')) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'admin_list aggregate order precondition changed';
  END IF;
  IF (SELECT count(*) FROM regexp_matches(current_definition, 'ORDER BY r\.created_at DESC\s+OFFSET page_number \* page_size LIMIT page_size', 'g')) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'admin_list page order precondition changed';
  END IF;
  IF (SELECT count(*) FROM regexp_matches(current_definition, 'RETURN jsonb_build_object\(''ok'', true, ''items'', items, ''total'', total_count\);', 'g')) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'admin_list return precondition changed';
  END IF;

  updated_definition := replace(
    current_definition,
    'jsonb_agg(mothers_love.ml_admin_recognition(page_rec) ORDER BY page_rec.created_at DESC)',
    'jsonb_agg(mothers_love.ml_admin_recognition(page_rec) ORDER BY CASE WHEN (payload->>''sort'') = ''oldest'' THEN page_rec.created_at END ASC, page_rec.created_at DESC, page_rec.id)'
  );
  updated_definition := regexp_replace(
    updated_definition,
    'ORDER BY r\.created_at DESC(\s+OFFSET page_number \* page_size LIMIT page_size)',
    'ORDER BY CASE WHEN (payload->>''sort'') = ''oldest'' THEN r.created_at END ASC, r.created_at DESC, r.id\1'
  );
  updated_definition := replace(
    updated_definition,
    'RETURN jsonb_build_object(''ok'', true, ''items'', items, ''total'', total_count);',
    'RETURN jsonb_build_object(''ok'', true, ''items'', items, ''total'', total_count, ''sort'', CASE WHEN (payload->>''sort'') = ''oldest'' THEN ''oldest'' ELSE ''newest'' END);'
  );
  EXECUTE updated_definition;

  SELECT pg_catalog.pg_get_functiondef('public.ml_api(text, jsonb)'::regprocedure)
  INTO updated_definition;
  IF updated_definition NOT LIKE '%''sort'', CASE WHEN (payload->>''sort'') = ''oldest'' THEN ''oldest'' ELSE ''newest'' END%' THEN
    RAISE EXCEPTION 'admin_list sort echo was not installed';
  END IF;
  IF (SELECT count(*) FROM regexp_matches(updated_definition, 'THEN r\.created_at END ASC, r\.created_at DESC, r\.id\s+OFFSET page_number \* page_size LIMIT page_size', 'g')) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'admin_list page order was not installed';
  END IF;
END
$admin_list_order_migration$;
