
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS assigned_sender TEXT;
CREATE INDEX IF NOT EXISTS prospects_assigned_sender_idx ON public.prospects (assigned_sender);

-- Round-robin backfill across the 10 active mailboxes
WITH senders AS (
  SELECT unnest(ARRAY[
    'amanda@swishview.com','amelia@swishview.com','ashley@swishview.com',
    'daisy@swishview.com','elsa@swishview.com','emily@swishview.com',
    'emily.j@swishview.com','grace@swishview.com','hazel@swishview.com',
    'kelly@swishview.com'
  ]) AS email, generate_series(0,9) AS idx
),
ranked AS (
  SELECT id, (row_number() OVER (ORDER BY created_at, id) - 1) % 10 AS rr
  FROM public.prospects
)
UPDATE public.prospects p
SET assigned_sender = s.email
FROM ranked r, senders s
WHERE p.id = r.id AND s.idx = r.rr AND (p.assigned_sender IS NULL OR p.assigned_sender = '');

-- Trigger: assign least-loaded mailbox on insert if unset
CREATE OR REPLACE FUNCTION public.prospects_assign_sender()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sender TEXT;
BEGIN
  IF NEW.assigned_sender IS NOT NULL AND NEW.assigned_sender <> '' THEN
    RETURN NEW;
  END IF;
  WITH senders AS (
    SELECT unnest(ARRAY[
      'amanda@swishview.com','amelia@swishview.com','ashley@swishview.com',
      'daisy@swishview.com','elsa@swishview.com','emily@swishview.com',
      'emily.j@swishview.com','grace@swishview.com','hazel@swishview.com',
      'kelly@swishview.com'
    ]) AS email
  ),
  counts AS (
    SELECT s.email, COALESCE(c.n, 0) AS n
    FROM senders s
    LEFT JOIN (
      SELECT assigned_sender AS email, COUNT(*) AS n
      FROM public.prospects
      WHERE assigned_sender IS NOT NULL
      GROUP BY assigned_sender
    ) c ON c.email = s.email
  )
  SELECT email INTO v_sender FROM counts ORDER BY n ASC, email ASC LIMIT 1;
  NEW.assigned_sender := v_sender;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospects_assign_sender_trg ON public.prospects;
CREATE TRIGGER prospects_assign_sender_trg
BEFORE INSERT ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.prospects_assign_sender();
