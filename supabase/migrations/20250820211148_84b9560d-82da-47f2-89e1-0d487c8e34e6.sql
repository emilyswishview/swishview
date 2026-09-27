-- Create notifications table for user notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  read BOOLEAN DEFAULT false,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

-- Edge functions can insert notifications
CREATE POLICY "Edge functions can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Add stripe_invoice_id to payments table to track invoices
ALTER TABLE public.payments 
ADD COLUMN stripe_invoice_id TEXT,
ADD COLUMN invoice_url TEXT,
ADD COLUMN invoice_pdf_url TEXT;

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();