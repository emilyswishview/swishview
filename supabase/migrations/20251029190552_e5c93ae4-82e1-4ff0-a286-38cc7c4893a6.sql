-- Allow partners to view their assigned clients' promotions/campaigns
CREATE POLICY "Partners can view assigned clients campaigns"
ON public.promotions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_clients
    WHERE partner_clients.partner_id = auth.uid()
    AND partner_clients.client_id = promotions.user_id
  )
);

-- Allow partners to view their assigned clients' payments
CREATE POLICY "Partners can view assigned clients payments"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_clients
    WHERE partner_clients.partner_id = auth.uid()
    AND partner_clients.client_id = payments.user_id
  )
);

-- Allow partners to view their assigned clients' SEO analytics
CREATE POLICY "Partners can view assigned clients SEO analytics"
ON public.seo_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_clients
    WHERE partner_clients.partner_id = auth.uid()
    AND partner_clients.client_id = seo_analytics.user_id
  )
);

-- Allow partners to view their assigned clients' SEO analytics history
CREATE POLICY "Partners can view assigned clients SEO history"
ON public.seo_analytics_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_clients
    WHERE partner_clients.partner_id = auth.uid()
    AND partner_clients.client_id = seo_analytics_history.user_id
  )
);

-- Allow partners to view their assigned clients' SEO purchases
CREATE POLICY "Partners can view assigned clients SEO purchases"
ON public.seo_purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_clients
    WHERE partner_clients.partner_id = auth.uid()
    AND partner_clients.client_id = seo_purchases.user_id
  )
);

-- Allow partners to view their assigned clients' YouTube analytics cache
CREATE POLICY "Partners can view assigned clients YouTube analytics"
ON public.youtube_analytics_cache
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_clients
    WHERE partner_clients.partner_id = auth.uid()
    AND partner_clients.client_id = youtube_analytics_cache.user_id
  )
);

-- Allow partners to view their assigned clients' promotion analytics
CREATE POLICY "Partners can view assigned clients promotion analytics"
ON public.promotion_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.promotions
    JOIN public.partner_clients ON partner_clients.client_id = promotions.user_id
    WHERE partner_clients.partner_id = auth.uid()
    AND promotions.id = promotion_analytics.campaign_id
  )
);

-- Allow partners to view their assigned clients' profiles
CREATE POLICY "Partners can view assigned clients profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_clients
    WHERE partner_clients.partner_id = auth.uid()
    AND partner_clients.client_id = profiles.id
  )
);