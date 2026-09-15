-- Create SEO plans table
CREATE TABLE public.seo_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  duration_months INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  features TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert SEO plan options
INSERT INTO public.seo_plans (name, duration_months, price, description, features) VALUES
('SEO Optimization - 3 Months', 3, 750.00, 'Optimize your YouTube videos for maximum reach and discoverability', ARRAY['Video SEO audit', 'Keyword optimization', 'Thumbnail analysis', 'Title optimization', 'Description enhancement']),
('SEO Optimization - 6 Months', 6, 1400.00, 'Extended SEO optimization with ongoing monitoring', ARRAY['Video SEO audit', 'Keyword optimization', 'Thumbnail analysis', 'Title optimization', 'Description enhancement', 'Monthly performance reports']),
('SEO Optimization - 9 Months', 9, 2000.00, 'Comprehensive SEO strategy with advanced analytics', ARRAY['Video SEO audit', 'Keyword optimization', 'Thumbnail analysis', 'Title optimization', 'Description enhancement', 'Monthly performance reports', 'Advanced analytics dashboard']),
('SEO Optimization - 12 Months', 12, 2500.00, 'Complete SEO optimization package with priority support', ARRAY['Video SEO audit', 'Keyword optimization', 'Thumbnail analysis', 'Title optimization', 'Description enhancement', 'Monthly performance reports', 'Advanced analytics dashboard', 'Priority support', 'Custom strategy consultation']);

-- Create SEO purchases table
CREATE TABLE public.seo_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seo_plan_id UUID NOT NULL REFERENCES public.seo_plans(id),
  stripe_session_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  channel_url TEXT,
  coupon_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seo_purchase_id UUID REFERENCES public.seo_purchases(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 250.00,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.seo_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Policies for seo_plans (public read)
CREATE POLICY "Anyone can view SEO plans" ON public.seo_plans
FOR SELECT USING (true);

-- Policies for seo_purchases
CREATE POLICY "Users can view their own SEO purchases" ON public.seo_purchases
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own SEO purchases" ON public.seo_purchases
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Edge functions can update SEO purchases" ON public.seo_purchases
FOR UPDATE USING (true);

CREATE POLICY "Admins can view all SEO purchases" ON public.seo_purchases
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Policies for coupons
CREATE POLICY "Users can view their own coupons" ON public.coupons
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Edge functions can insert coupons" ON public.coupons
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own coupons" ON public.coupons
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all coupons" ON public.coupons
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Add triggers for updated_at columns
CREATE TRIGGER update_seo_plans_updated_at
BEFORE UPDATE ON public.seo_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seo_purchases_updated_at
BEFORE UPDATE ON public.seo_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();