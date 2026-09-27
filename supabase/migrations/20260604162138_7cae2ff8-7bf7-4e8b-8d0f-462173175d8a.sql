ALTER TABLE public.email_tracker_employees
ADD COLUMN IF NOT EXISTS last_email_received_at timestamp with time zone;