-- Run before and after the concurrent index build. This reads metadata only.
SELECT
  index_class.oid IS NOT NULL AS exists,
  i.indisready AS ready,
  i.indisvalid AS valid,
  pg_catalog.pg_get_indexdef(i.indexrelid) AS definition
FROM pg_catalog.pg_class AS table_class
JOIN pg_catalog.pg_namespace AS table_schema ON table_schema.oid = table_class.relnamespace
LEFT JOIN pg_catalog.pg_class AS index_class
  ON index_class.relnamespace = table_schema.oid
  AND index_class.relname = 'recognitions_display_latest_idx'
LEFT JOIN pg_catalog.pg_index AS i
  ON i.indexrelid = index_class.oid
  AND i.indrelid = table_class.oid
WHERE table_schema.nspname = 'mothers_love'
  AND table_class.relname = 'recognitions';
