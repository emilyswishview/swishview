-- Email Tracker Database Schema

-- Table for storing employee information (aggregated from email logs)
CREATE TABLE public.email_tracker_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  department TEXT,
  emails_sent_today INTEGER DEFAULT 0,
  emails_sent_week INTEGER DEFAULT 0,
  emails_sent_month INTEGER DEFAULT 0,
  unique_recipients INTEGER DEFAULT 0,
  top_recipient TEXT,
  external_email_percent NUMERIC(5,2) DEFAULT 0,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table for storing individual email logs
CREATE TABLE public.email_tracker_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL UNIQUE,
  employee_email TEXT NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  recipient_domains TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT,
  is_external BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table for daily aggregated statistics
CREATE TABLE public.email_tracker_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL UNIQUE,
  total_emails INTEGER DEFAULT 0,
  unique_senders INTEGER DEFAULT 0,
  unique_recipients INTEGER DEFAULT 0,
  internal_emails INTEGER DEFAULT 0,
  external_emails INTEGER DEFAULT 0,
  alert_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table for storing sync configuration and status
CREATE TABLE public.email_tracker_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'idle',
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for fast queries
CREATE INDEX idx_email_tracker_logs_employee ON public.email_tracker_logs(employee_email);
CREATE INDEX idx_email_tracker_logs_sent_at ON public.email_tracker_logs(sent_at DESC);
CREATE INDEX idx_email_tracker_logs_is_external ON public.email_tracker_logs(is_external);
CREATE INDEX idx_email_tracker_logs_message_id ON public.email_tracker_logs(message_id);
CREATE INDEX idx_email_tracker_daily_stats_date ON public.email_tracker_daily_stats(stat_date DESC);
CREATE INDEX idx_email_tracker_employees_email ON public.email_tracker_employees(email);
CREATE INDEX idx_email_tracker_employees_last_sent ON public.email_tracker_employees(last_email_sent_at DESC);

-- Enable RLS
ALTER TABLE public.email_tracker_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracker_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracker_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracker_sync_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admins can manage email tracker employees"
ON public.email_tracker_employees
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage email tracker logs"
ON public.email_tracker_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage email tracker daily stats"
ON public.email_tracker_daily_stats
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage email tracker sync config"
ON public.email_tracker_sync_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions policy for sync operations
CREATE POLICY "Edge functions can manage email tracker employees"
ON public.email_tracker_employees
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Edge functions can manage email tracker logs"
ON public.email_tracker_logs
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Edge functions can manage email tracker daily stats"
ON public.email_tracker_daily_stats
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Edge functions can manage email tracker sync config"
ON public.email_tracker_sync_config
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger to update timestamps
CREATE TRIGGER update_email_tracker_employees_updated_at
BEFORE UPDATE ON public.email_tracker_employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_tracker_daily_stats_updated_at
BEFORE UPDATE ON public.email_tracker_daily_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_tracker_sync_config_updated_at
BEFORE UPDATE ON public.email_tracker_sync_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();