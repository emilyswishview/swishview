CREATE OR REPLACE FUNCTION public.prospects_dedupe_by_email()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH ranked AS (
    SELECT id,
           lower(btrim(email)) AS norm_email,
           ROW_NUMBER() OVER (
             PARTITION BY lower(btrim(email))
             ORDER BY 
               CASE WHEN channel_name IS NOT NULL AND channel_name <> '' THEN 1 ELSE 0 END DESC,
               CASE WHEN last_fetched_at IS NOT NULL THEN 1 ELSE 0 END DESC,
               last_fetched_at DESC NULLS LAST,
               created_at DESC
           ) AS rn
    FROM prospects
    WHERE email IS NOT NULL AND btrim(email) <> ''
  ),
  to_delete AS (
    SELECT id FROM ranked WHERE rn > 1
  ),
  del AS (
    DELETE FROM prospects WHERE id IN (SELECT id FROM to_delete)
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM del;
  RETURN COALESCE(deleted_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.prospects_dedupe_by_email() TO authenticated, service_role;