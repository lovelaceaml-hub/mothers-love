-- Defense-in-depth parity patch for the reviewed public.ml_api function.
-- It changes only the SQL codepoint caps used by admin edits. HTTP validation
-- remains authoritative for grapheme limits and the 16 KiB request body.
DO $unicode_parity$
DECLARE
  definition text;
  submitted_old text := $fragment$char_length(COALESCE(fields->>'submittedName', rec.submitted_name)) > 320$fragment$;
  recipient_old text := $fragment$char_length(COALESCE(fields->>'recipient', rec.recipient)) > 320$fragment$;
  message_old text := $fragment$char_length(COALESCE(fields->>'message', rec.message)) > 2000$fragment$;
  submitted_new text := $fragment$char_length(COALESCE(fields->>'submittedName', rec.submitted_name)) > 16384$fragment$;
  recipient_new text := $fragment$char_length(COALESCE(fields->>'recipient', rec.recipient)) > 16384$fragment$;
  message_new text := $fragment$char_length(COALESCE(fields->>'message', rec.message)) > 16384$fragment$;
BEGIN
  SELECT pg_catalog.pg_get_functiondef('public.ml_api(text,jsonb)'::regprocedure) INTO definition;
  IF definition IS NULL THEN
    RAISE EXCEPTION 'public.ml_api(text,jsonb) is missing';
  END IF;
  IF (length(definition) - length(replace(definition, submitted_old, ''))) / length(submitted_old) IS DISTINCT FROM 1
     OR (length(definition) - length(replace(definition, recipient_old, ''))) / length(recipient_old) IS DISTINCT FROM 1
     OR (length(definition) - length(replace(definition, message_old, ''))) / length(message_old) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'public.ml_api edit cap fragments did not match exactly once';
  END IF;
  definition := replace(definition, submitted_old, submitted_new);
  definition := replace(definition, recipient_old, recipient_new);
  definition := replace(definition, message_old, message_new);
  EXECUTE definition;
END
$unicode_parity$;
