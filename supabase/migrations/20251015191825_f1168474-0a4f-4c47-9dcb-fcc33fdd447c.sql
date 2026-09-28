-- Create audit_submissions table for instant channel audits
CREATE TABLE IF NOT EXISTS public.audit_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_url TEXT NOT NULL,
  email TEXT NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 29.00,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_submissions ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to insert audit submissions
CREATE POLICY "Edge functions can insert audit submissions"
  ON public.audit_submissions
  FOR INSERT
  WITH CHECK (true);

-- Allow edge functions to update audit submissions
CREATE POLICY "Edge functions can update audit submissions"
  ON public.audit_submissions
  FOR UPDATE
  USING (true);

-- Admins can view all audit submissions
CREATE POLICY "Admins can view all audit submissions"
  ON public.audit_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_audit_submissions_updated_at
  BEFORE UPDATE ON public.audit_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();