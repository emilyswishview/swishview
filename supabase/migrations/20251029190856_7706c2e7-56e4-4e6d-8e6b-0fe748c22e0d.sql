-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Partners can view assigned clients campaigns" ON public.promotions;
DROP POLICY IF EXISTS "Partners can view assigned clients payments" ON public.payments;
DROP POLICY IF EXISTS "Partners can view assigned clients SEO analytics" ON public.seo_analytics;
DROP POLICY IF EXISTS "Partners can view assigned clients SEO history" ON public.seo_analytics_history;
DROP POLICY IF EXISTS "Partners can view assigned clients SEO purchases" ON public.seo_purchases;
DROP POLICY IF EXISTS "Partners can view assigned clients YouTube analytics" ON public.youtube_analytics_cache;
DROP POLICY IF EXISTS "Partners can view assigned clients promotion analytics" ON public.promotion_analytics;
DROP POLICY IF EXISTS "Partners can view assigned clients profiles" ON public.profiles;

-- Create security definer function to check if user is partner of a client
CREATE OR REPLACE FUNCTION public.is_partner_of_client(_partner_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_clients
    WHERE partner_id = _partner_id
      AND client_id = _client_id
  )
$$;

-- Create security definer function to check if user is partner of campaign owner
CREATE OR REPLACE FUNCTION public.is_partner_of_campaign(_partner_id uuid, _campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.promotions p
    JOIN public.partner_clients pc ON pc.client_id = p.user_id
    WHERE p.id = _campaign_id
      AND pc.partner_id = _partner_id
  )
$$;

-- Recreate policies using security definer functions

-- Promotions/Campaigns
CREATE POLICY "Partners can view assigned clients campaigns"
ON public.promotions
FOR SELECT
USING (public.is_partner_of_client(auth.uid(), user_id));

-- Payments
CREATE POLICY "Partners can view assigned clients payments"
ON public.payments
FOR SELECT
USING (public.is_partner_of_client(auth.uid(), user_id));

-- SEO Analytics
CREATE POLICY "Partners can view assigned clients SEO analytics"
ON public.seo_analytics
FOR SELECT
USING (public.is_partner_of_client(auth.uid(), user_id));

-- SEO Analytics History
CREATE POLICY "Partners can view assigned clients SEO history"
ON public.seo_analytics_history
FOR SELECT
USING (public.is_partner_of_client(auth.uid(), user_id));

-- SEO Purchases
CREATE POLICY "Partners can view assigned clients SEO purchases"
ON public.seo_purchases
FOR SELECT
USING (public.is_partner_of_client(auth.uid(), user_id));

-- YouTube Analytics Cache
CREATE POLICY "Partners can view assigned clients YouTube analytics"
ON public.youtube_analytics_cache
FOR SELECT
USING (public.is_partner_of_client(auth.uid(), user_id));

-- Promotion Analytics
CREATE POLICY "Partners can view assigned clients promotion analytics"
ON public.promotion_analytics
FOR SELECT
USING (public.is_partner_of_campaign(auth.uid(), campaign_id));

-- Profiles
CREATE POLICY "Partners can view assigned clients profiles"
ON public.profiles
FOR SELECT
USING (public.is_partner_of_client(auth.uid(), id));