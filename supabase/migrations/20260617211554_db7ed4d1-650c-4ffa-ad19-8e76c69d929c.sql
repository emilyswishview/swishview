UPDATE prospects
SET last_fetched_at = NULL,
    data = data - 'lastSyncError'
WHERE data->>'lastSyncError' IN ('Failed to send a request to the Edge Function', 'Edge Function returned a non-2xx status code');