CREATE INDEX IF NOT EXISTS idx_prospects_manual_json_created_at
ON public.prospects (created_at DESC)
WHERE ((data->>'autoDiscovered') IS NULL OR (data->>'autoDiscovered') <> 'true');

CREATE INDEX IF NOT EXISTS idx_prospects_discovered_json_created_at
ON public.prospects (created_at DESC)
WHERE (data->>'autoDiscovered') = 'true';

ANALYZE public.prospects;