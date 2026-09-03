
ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS calls_made integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS meetings_attended integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tasks_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_generated integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS follow_ups_done integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_worked numeric(4,2) DEFAULT 8.0,
ADD COLUMN IF NOT EXISTS mood_rating integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS blockers text;
