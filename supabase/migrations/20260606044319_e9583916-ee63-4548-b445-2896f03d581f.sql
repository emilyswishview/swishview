CREATE INDEX IF NOT EXISTS idx_prospects_auto_discovered_expr_created
ON public.prospects ((COALESCE((data->>'autoDiscovered')::boolean, false)), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_tracker_logs_recipients_gin
ON public.email_tracker_logs USING gin (recipients);

CREATE INDEX IF NOT EXISTS idx_email_tracker_logs_employee_lower
ON public.email_tracker_logs (lower(employee_email));

ANALYZE public.prospects;
ANALYZE public.email_tracker_logs;