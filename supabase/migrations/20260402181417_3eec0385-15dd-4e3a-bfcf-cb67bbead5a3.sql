
-- Create daily_reports table
CREATE TABLE public.daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_date DATE NOT NULL,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  sales_numbers INTEGER NOT NULL DEFAULT 0,
  additional_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_date)
);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily reports" ON public.daily_reports FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own daily reports" ON public.daily_reports FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own daily reports" ON public.daily_reports FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own daily reports" ON public.daily_reports FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all daily reports" ON public.daily_reports FOR ALL USING (get_current_user_role() = 'admin');

CREATE TRIGGER update_daily_reports_updated_at BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  leave_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('sick_leave', 'casual_leave', 'half_day')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, leave_date)
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leave requests" ON public.leave_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own leave requests" ON public.leave_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all leave requests" ON public.leave_requests FOR ALL USING (get_current_user_role() = 'admin');

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
