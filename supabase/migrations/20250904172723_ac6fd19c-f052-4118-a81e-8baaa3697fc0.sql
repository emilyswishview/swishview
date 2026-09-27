-- Create table for recent activities
CREATE TABLE IF NOT EXISTS public.recent_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_text TEXT NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recent_activities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all activities" 
ON public.recent_activities 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
));

CREATE POLICY "Users can view their own activities" 
ON public.recent_activities 
FOR SELECT 
USING (user_id = auth.uid());

-- Add trigger for timestamps
CREATE TRIGGER update_recent_activities_updated_at
BEFORE UPDATE ON public.recent_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();