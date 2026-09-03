CREATE OR REPLACE FUNCTION public.respace_prospect_queue(gap_seconds integer DEFAULT 120, start_offset_seconds integer DEFAULT 30)
RETURNS TABLE(sender text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH ordered AS (
    SELECT id,
           from_email,
           ROW_NUMBER() OVER (PARTITION BY from_email ORDER BY scheduled_at, created_at) - 1 AS idx
    FROM prospect_email_jobs
    WHERE status = 'pending'
  )
  UPDATE prospect_email_jobs j
  SET scheduled_at = now() + (start_offset_seconds || ' seconds')::interval + (o.idx * gap_seconds || ' seconds')::interval,
      updated_at = now()
  FROM ordered o
  WHERE j.id = o.id;

  RETURN QUERY
    SELECT from_email::text, COUNT(*)::bigint
    FROM prospect_email_jobs
    WHERE status = 'pending'
    GROUP BY from_email
    ORDER BY from_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respace_prospect_queue(integer, integer) TO authenticated, service_role;