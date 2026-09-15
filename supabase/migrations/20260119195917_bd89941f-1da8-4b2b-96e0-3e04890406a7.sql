-- Add comprehensive email tracking fields to email_tracker_logs
ALTER TABLE public.email_tracker_logs 
ADD COLUMN IF NOT EXISTS cc_recipients TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS bcc_recipients TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attachment_names TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS attachment_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS attachment_total_size_bytes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS client_type TEXT,
ADD COLUMN IF NOT EXISTS device_type TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS message_size_bytes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS thread_id TEXT,
ADD COLUMN IF NOT EXISTS in_reply_to TEXT,
ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS spam_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS is_phishing_suspect BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_spam BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_status TEXT,
ADD COLUMN IF NOT EXISTS bounce_reason TEXT,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS forwarded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS source_folder TEXT,
ADD COLUMN IF NOT EXISTS destination_folder TEXT,
ADD COLUMN IF NOT EXISTS action_type TEXT,
ADD COLUMN IF NOT EXISTS actor_ip TEXT,
ADD COLUMN IF NOT EXISTS actor_device_id TEXT,
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS raw_event_data JSONB;

-- Create index for faster queries on new fields
CREATE INDEX IF NOT EXISTS idx_email_tracker_logs_thread_id ON public.email_tracker_logs(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_tracker_logs_event_type ON public.email_tracker_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_tracker_logs_has_attachments ON public.email_tracker_logs(has_attachments);
CREATE INDEX IF NOT EXISTS idx_email_tracker_logs_delivery_status ON public.email_tracker_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_tracker_logs_ip_address ON public.email_tracker_logs(ip_address);

-- Add more employee tracking fields
ALTER TABLE public.email_tracker_employees
ADD COLUMN IF NOT EXISTS total_attachments_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_data_sent_bytes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_response_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS most_active_hour INTEGER,
ADD COLUMN IF NOT EXISTS most_active_day TEXT,
ADD COLUMN IF NOT EXISTS unique_threads INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_rate_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS forward_rate_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS common_labels TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS devices_used TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ip_addresses_used TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS locations_used TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS suspicious_activity_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_suspicious_activity_at TIMESTAMP WITH TIME ZONE;

-- Create table for detailed email events (read, reply, forward, delete, etc.)
CREATE TABLE IF NOT EXISTS public.email_tracker_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  event_type TEXT NOT NULL, -- read, reply, forward, delete, archive, label_add, label_remove, move, etc.
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  device_type TEXT,
  user_agent TEXT,
  location_city TEXT,
  location_country TEXT,
  additional_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create table for email threads
CREATE TABLE IF NOT EXISTS public.email_tracker_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL UNIQUE,
  subject TEXT,
  participants TEXT[] DEFAULT '{}',
  message_count INTEGER DEFAULT 1,
  first_message_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  is_external_thread BOOLEAN DEFAULT false,
  external_domains TEXT[] DEFAULT '{}',
  total_size_bytes BIGINT DEFAULT 0,
  attachment_count INTEGER DEFAULT 0,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create table for attachment tracking
CREATE TABLE IF NOT EXISTS public.email_tracker_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_extension TEXT,
  file_size_bytes BIGINT DEFAULT 0,
  is_encrypted BOOLEAN DEFAULT false,
  hash_value TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create table for hourly activity patterns
CREATE TABLE IF NOT EXISTS public.email_tracker_hourly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  hour_of_day INTEGER NOT NULL,
  employee_email TEXT,
  emails_sent INTEGER DEFAULT 0,
  emails_received INTEGER DEFAULT 0,
  emails_read INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  attachments_sent INTEGER DEFAULT 0,
  data_sent_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(stat_date, hour_of_day, employee_email)
);

-- Create table for domain communication patterns
CREATE TABLE IF NOT EXISTS public.email_tracker_domain_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email TEXT NOT NULL,
  domain TEXT NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_received INTEGER DEFAULT 0,
  last_communication_at TIMESTAMP WITH TIME ZONE,
  first_communication_at TIMESTAMP WITH TIME ZONE,
  is_internal BOOLEAN DEFAULT false,
  avg_response_time_minutes INTEGER,
  total_data_exchanged_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(employee_email, domain)
);

-- Create table for security alerts
CREATE TABLE IF NOT EXISTS public.email_tracker_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- suspicious_login, unusual_volume, external_forward, sensitive_data, etc.
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  title TEXT NOT NULL,
  description TEXT,
  related_message_id TEXT,
  related_data JSONB,
  status TEXT DEFAULT 'open', -- open, investigating, resolved, dismissed
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_email_tracker_events_message_id ON public.email_tracker_events(message_id);
CREATE INDEX IF NOT EXISTS idx_email_tracker_events_employee ON public.email_tracker_events(employee_email);
CREATE INDEX IF NOT EXISTS idx_email_tracker_events_type ON public.email_tracker_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_tracker_events_time ON public.email_tracker_events(event_time);
CREATE INDEX IF NOT EXISTS idx_email_tracker_attachments_message ON public.email_tracker_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_email_tracker_attachments_employee ON public.email_tracker_attachments(employee_email);
CREATE INDEX IF NOT EXISTS idx_email_tracker_hourly_date ON public.email_tracker_hourly_stats(stat_date);
CREATE INDEX IF NOT EXISTS idx_email_tracker_domain_employee ON public.email_tracker_domain_stats(employee_email);
CREATE INDEX IF NOT EXISTS idx_email_tracker_alerts_employee ON public.email_tracker_alerts(employee_email);
CREATE INDEX IF NOT EXISTS idx_email_tracker_alerts_status ON public.email_tracker_alerts(status);

-- Enable RLS on new tables
ALTER TABLE public.email_tracker_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracker_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracker_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracker_hourly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracker_domain_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracker_alerts ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies for new tables
CREATE POLICY "Admin access for email_tracker_events" ON public.email_tracker_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access for email_tracker_threads" ON public.email_tracker_threads FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access for email_tracker_attachments" ON public.email_tracker_attachments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access for email_tracker_hourly_stats" ON public.email_tracker_hourly_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access for email_tracker_domain_stats" ON public.email_tracker_domain_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access for email_tracker_alerts" ON public.email_tracker_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);