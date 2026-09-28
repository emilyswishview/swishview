
CREATE TABLE IF NOT EXISTS public.free_report_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  channel_url text NOT NULL,
  channel_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS free_report_requests_channel_key_idx ON public.free_report_requests (channel_key);

GRANT ALL ON public.free_report_requests TO service_role;
ALTER TABLE public.free_report_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages free report requests"
ON public.free_report_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.normalize_channel_key(_url text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(
           regexp_replace(lower(btrim(coalesce(_url, ''))), '^https?://', ''),
           '^www\.', ''
         )
$$;

CREATE OR REPLACE FUNCTION public.free_report_usage(_channel_url text)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _key text := public.normalize_channel_key(_channel_url);
  _used int;
BEGIN
  _key := regexp_replace(_key, '/+$', '');
  SELECT count(*) INTO _used FROM public.free_report_requests
    WHERE channel_key = _key AND is_paid = false;
  RETURN json_build_object('used', _used, 'remaining', greatest(2 - _used, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_free_report_request(_email text, _channel_url text, _phone text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _key text := regexp_replace(public.normalize_channel_key(_channel_url), '/+$', '');
  _used int;
  _id uuid;
BEGIN
  IF coalesce(btrim(_email), '') = '' OR coalesce(btrim(_channel_url), '') = '' THEN
    RETURN json_build_object('ok', false, 'reason', 'missing_fields');
  END IF;

  SELECT count(*) INTO _used FROM public.free_report_requests
    WHERE channel_key = _key AND is_paid = false;

  IF _used >= 2 THEN
    RETURN json_build_object('ok', false, 'reason', 'limit_reached', 'used', _used, 'remaining', 0);
  END IF;

  INSERT INTO public.free_report_requests (email, phone, channel_url, channel_key)
  VALUES (btrim(_email), nullif(btrim(coalesce(_phone,'')), ''), btrim(_channel_url), _key)
  RETURNING id INTO _id;

  RETURN json_build_object('ok', true, 'id', _id, 'used', _used + 1, 'remaining', greatest(2 - (_used + 1), 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.free_report_usage(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_free_report_request(text, text, text) TO anon, authenticated;
