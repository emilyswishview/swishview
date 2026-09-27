CREATE OR REPLACE FUNCTION public.respace_prospect_queue_random(
  min_gap_seconds integer DEFAULT 60,
  max_gap_seconds integer DEFAULT 180,
  start_offset_seconds integer DEFAULT 30
)
RETURNS TABLE(sender text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lo integer := GREATEST(5, LEAST(min_gap_seconds, max_gap_seconds));
  hi integer := GREATEST(min_gap_seconds, max_gap_seconds);
BEGIN
  WITH ordered AS (
    SELECT id,
           from_email,
           ROW_NUMBER() OVER (PARTITION BY from_email ORDER BY scheduled_at, created_at) - 1 AS idx
    FROM prospect_email_jobs
    WHERE status = 'pending'
  ),
  gaps AS (
    SELECT id, from_email, idx,
           (lo + floor(random() * (hi - lo + 1)))::int AS gap
    FROM ordered
  ),
  cumulative AS (
    SELECT id,
           SUM(gap) OVER (PARTITION BY from_email ORDER BY idx ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS offset_s
    FROM gaps
  )
  UPDATE prospect_email_jobs j
  SET scheduled_at = now() + (start_offset_seconds || ' seconds')::interval + (c.offset_s || ' seconds')::interval,
      updated_at = now()
  FROM cumulative c
  WHERE j.id = c.id;

  RETURN QUERY
    SELECT from_email::text, COUNT(*)::bigint
    FROM prospect_email_jobs
    WHERE status = 'pending'
    GROUP BY from_email
    ORDER BY from_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respace_prospect_queue_random(integer, integer, integer) TO authenticated, service_role;