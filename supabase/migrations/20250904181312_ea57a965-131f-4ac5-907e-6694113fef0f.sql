-- Create table for manual SEO analytics entries
CREATE TABLE IF NOT EXISTS public.seo_analytics_manual_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('daily', 'weekly')),
  subscribers_count INTEGER DEFAULT 0,
  views_count BIGINT DEFAULT 0,
  watch_time_hours INTEGER DEFAULT 0,
  starting_date DATE,
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date, entry_type)
);

-- Create table for admin messages to users
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.seo_analytics_manual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for seo_analytics_manual_entries
CREATE POLICY "Admins can manage all manual entries" 
ON public.seo_analytics_manual_entries 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Users can view their own manual entries" 
ON public.seo_analytics_manual_entries 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- RLS policies for admin_messages  
CREATE POLICY "Admins can manage all admin messages" 
ON public.admin_messages 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Users can view their own admin messages" 
ON public.admin_messages 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update read status of their messages" 
ON public.admin_messages 
FOR UPDATE 
USING (user_id = auth.uid());

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_seo_analytics_manual_entries_updated_at
BEFORE UPDATE ON public.seo_analytics_manual_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_messages_updated_at
BEFORE UPDATE ON public.admin_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_seo_manual_entries_user_date ON public.seo_analytics_manual_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_admin_messages_user_read ON public.admin_messages(user_id, read);