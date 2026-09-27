
-- Ensure serena and hazel can log in with a known password.
-- Reset serena password and create hazel if missing.

UPDATE auth.users
SET encrypted_password = crypt('swishprospects', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'serena@swishview.com';

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'hazel@swishview.com', crypt('swishprospects', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'hazel@swishview.com');

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', u.email, now(), now(), now()
FROM auth.users u
WHERE u.email = 'hazel@swishview.com'
  AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email');
