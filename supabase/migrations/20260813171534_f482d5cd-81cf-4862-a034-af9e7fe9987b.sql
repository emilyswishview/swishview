UPDATE auth.users
SET encrypted_password = crypt('swishprospects', gen_salt('bf')),
    updated_at = now(),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE lower(email) = 'serena@swishview.com';