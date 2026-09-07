-- Create storage bucket for request attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('request-attachments', 'request-attachments', false);

-- Create RLS policies for request attachments
CREATE POLICY "Users can upload their own request attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'request-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own request attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'request-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all request attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'request-attachments' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Add attachment_urls column to notifications table for storing file references
ALTER TABLE notifications ADD COLUMN attachment_urls TEXT[];

-- Create user_requests table for better request management
CREATE TABLE public.user_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  attachment_urls TEXT[],
  admin_response TEXT,
  responded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_requests
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for user_requests
CREATE POLICY "Users can view their own requests" 
ON public.user_requests 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own requests" 
ON public.user_requests 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all requests" 
ON public.user_requests 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Add trigger for updated_at
CREATE TRIGGER update_user_requests_updated_at
BEFORE UPDATE ON public.user_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();