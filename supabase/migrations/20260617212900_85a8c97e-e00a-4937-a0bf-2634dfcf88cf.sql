UPDATE public.prospects
SET last_fetched_at = NULL,
    data = (data - 'lastSyncError' - 'syncAttempts')
WHERE (data->>'lastSyncError') IS NOT NULL;