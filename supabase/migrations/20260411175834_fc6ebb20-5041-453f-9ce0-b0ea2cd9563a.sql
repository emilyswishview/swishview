CREATE OR REPLACE FUNCTION public.is_swishview_staff(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND (
        p.role = 'admin'::user_role
        OR lower(p.email) LIKE '%@swishview.com'
        OR public.has_role(_user_id, 'admin'::app_role)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_management_users()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  channel_name text,
  channel_url text,
  created_at timestamp with time zone,
  campaign_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.channel_name,
    p.channel_url,
    p.created_at,
    COUNT(pr.id)::bigint AS campaign_count
  FROM public.profiles p
  LEFT JOIN public.promotions pr ON pr.user_id = p.id
  WHERE public.is_swishview_staff(auth.uid())
    AND NOT public.is_swishview_staff(p.id)
  GROUP BY p.id, p.email, p.full_name, p.channel_name, p.channel_url, p.created_at
  ORDER BY (COUNT(pr.id) > 0) DESC, COALESCE(NULLIF(p.full_name, ''), p.email);
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_management_client(_client_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  channel_name text,
  channel_url text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.channel_name,
    p.channel_url,
    p.created_at
  FROM public.profiles p
  WHERE public.is_swishview_staff(auth.uid())
    AND p.id = _client_id
  LIMIT 1;
$$;

DROP POLICY IF EXISTS "SwishView staff can view all campaigns" ON public.promotions;
CREATE POLICY "SwishView staff can view all campaigns"
ON public.promotions
FOR SELECT
TO authenticated
USING (public.is_swishview_staff(auth.uid()));

DROP POLICY IF EXISTS "SwishView staff can create campaigns" ON public.promotions;
CREATE POLICY "SwishView staff can create campaigns"
ON public.promotions
FOR INSERT
TO authenticated
WITH CHECK (public.is_swishview_staff(auth.uid()));

DROP POLICY IF EXISTS "SwishView staff can update campaigns" ON public.promotions;
CREATE POLICY "SwishView staff can update campaigns"
ON public.promotions
FOR UPDATE
TO authenticated
USING (public.is_swishview_staff(auth.uid()))
WITH CHECK (public.is_swishview_staff(auth.uid()));

DROP POLICY IF EXISTS "SwishView staff can view all payments" ON public.payments;
CREATE POLICY "SwishView staff can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (public.is_swishview_staff(auth.uid()));

DROP POLICY IF EXISTS "SwishView staff can create payments" ON public.payments;
CREATE POLICY "SwishView staff can create payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (public.is_swishview_staff(auth.uid()));

DROP POLICY IF EXISTS "SwishView staff can update payments" ON public.payments;
CREATE POLICY "SwishView staff can update payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (public.is_swishview_staff(auth.uid()))
WITH CHECK (public.is_swishview_staff(auth.uid()));

DROP POLICY IF EXISTS "SwishView staff can delete payments" ON public.payments;
CREATE POLICY "SwishView staff can delete payments"
ON public.payments
FOR DELETE
TO authenticated
USING (public.is_swishview_staff(auth.uid()));