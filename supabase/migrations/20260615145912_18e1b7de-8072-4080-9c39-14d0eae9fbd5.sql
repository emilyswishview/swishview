DO $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'emilyadmin@swishview.com') THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, aud, role
    ) VALUES (
      v_id, '00000000-0000-0000-0000-000000000000',
      'emilyadmin@swishview.com',
      crypt('emilyprospects', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name','Emily Admin'),
      now(), now(), '', 'authenticated', 'authenticated'
    );
  ELSE
    UPDATE auth.users
      SET encrypted_password = crypt('emilyprospects', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE email = 'emilyadmin@swishview.com';
  END IF;
END
$$;