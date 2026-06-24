
CREATE OR REPLACE FUNCTION public.prospects_assign_sender()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender TEXT;
BEGIN
  IF NEW.assigned_sender IS NOT NULL AND NEW.assigned_sender <> '' THEN
    RETURN NEW;
  END IF;
  WITH senders AS (
    SELECT unnest(ARRAY[
      'amelia@swishview.com','ashley@swishview.com','daisy@swishview.com',
      'emily.j@swishview.com','emily@swishview.com','grace@swishview.com',
      'hazel@swishview.com','irene@swishview.com','mia.brooks@swishview.com',
      'rachel@swishview.com','scarlett.l@swishview.com','scarlett@swishview.com',
      'serena@swishview.com','sophie@swishview.com',
      'amelia@swishview.email','grace@swishview.email','jasmine@swishview.email',
      'rachel@swishview.email','serena@swishview.email','sophie@swishview.email'
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
$function$;

-- Re-distribute existing prospects evenly across all 20 mailboxes
WITH senders AS (
  SELECT unnest(ARRAY[
    'amelia@swishview.com','ashley@swishview.com','daisy@swishview.com',
    'emily.j@swishview.com','emily@swishview.com','grace@swishview.com',
    'hazel@swishview.com','irene@swishview.com','mia.brooks@swishview.com',
    'rachel@swishview.com','scarlett.l@swishview.com','scarlett@swishview.com',
    'serena@swishview.com','sophie@swishview.com',
    'amelia@swishview.email','grace@swishview.email','jasmine@swishview.email',
    'rachel@swishview.email','serena@swishview.email','sophie@swishview.email'
  ]) AS email,
  generate_series(0, 19) AS idx
),
ranked AS (
  SELECT id,
    (row_number() OVER (ORDER BY created_at, id) - 1) % 20 AS rr
  FROM public.prospects
)
UPDATE public.prospects p
SET assigned_sender = s.email
FROM ranked r, senders s
WHERE p.id = r.id AND s.idx = r.rr;
