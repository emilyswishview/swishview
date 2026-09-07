
-- Create contact_messages table to store contact form submissions
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (optional, but good practice)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert contact messages (public contact form)
CREATE POLICY "Anyone can submit contact messages" 
  ON public.contact_messages 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy to allow only admins to view contact messages (you can adjust this based on your needs)
CREATE POLICY "Admins can view contact messages" 
  ON public.contact_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
