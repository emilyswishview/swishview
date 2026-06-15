
-- Create email_subscriptions table to store newsletter subscriptions
CREATE TABLE public.email_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert subscriptions (public newsletter form)
CREATE POLICY "Anyone can subscribe to newsletter" 
  ON public.email_subscriptions 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy to allow only admins to view subscriptions
CREATE POLICY "Admins can view email subscriptions" 
  ON public.email_subscriptions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
