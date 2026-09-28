ALTER TABLE public.free_report_requests
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS full_name text;

CREATE INDEX IF NOT EXISTS free_report_requests_user_id_idx ON public.free_report_requests (user_id);

GRANT SELECT, INSERT ON public.free_report_requests TO authenticated;

DROP POLICY IF EXISTS "users view own free report requests" ON public.free_report_requests;
CREATE POLICY "users view own free report requests"
ON public.free_report_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP FUNCTION IF EXISTS public.submit_free_report_request(text, text, text);

CREATE OR REPLACE FUNCTION public.submit_free_report_request(_email text, _channel_url text, _phone text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _key text := regexp_replace(public.normalize_channel_key(_channel_url), '/+$', '');
  _used int;
  _id uuid;
  _uid uuid := auth.uid();
  _name text;
  _mail text := btrim(coalesce(_email, ''));
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'auth_required');
  END IF;

  IF _mail = '' OR coalesce(btrim(_channel_url), '') = '' THEN
    RETURN json_build_object('ok', false, 'reason', 'missing_fields');
  END IF;

  SELECT coalesce(p.full_name, p.email), coalesce(nullif(_mail, ''), p.email)
    INTO _name, _mail
    FROM public.profiles p WHERE p.id = _uid;

  SELECT count(*) INTO _used FROM public.free_report_requests
    WHERE channel_key = _key AND is_paid = false;

  IF _used >= 2 THEN
    RETURN json_build_object('ok', false, 'reason', 'limit_reached', 'used', _used, 'remaining', 0);
  END IF;

  INSERT INTO public.free_report_requests (email, phone, channel_url, channel_key, user_id, full_name)
  VALUES (_mail, nullif(btrim(coalesce(_phone,'')), ''), btrim(_channel_url), _key, _uid, _name)
  RETURNING id INTO _id;

  INSERT INTO public.contact_messages (full_name, email, subject, message)
  VALUES (
    coalesce(_name, _mail),
    _mail,
    'Free Report Request',
    'Free YouTube channel report requested.' || chr(10) ||
    'Channel: ' || btrim(_channel_url) || chr(10) ||
    'Phone: ' || coalesce(nullif(btrim(coalesce(_phone,'')), ''), 'not provided') || chr(10) ||
    'Request ID: ' || _id::text
  );

  RETURN json_build_object('ok', true, 'id', _id, 'used', _used + 1, 'remaining', greatest(2 - (_used + 1), 0), 'name', _name, 'email', _mail);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_free_report_request(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_free_report_request(text, text, text) TO authenticated;