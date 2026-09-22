ALTER TABLE public.calling_leads
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS alt_email text,
  ADD COLUMN IF NOT EXISTS channel_joined text,
  ADD COLUMN IF NOT EXISTS lead_status text,
  ADD COLUMN IF NOT EXISTS sales_rep text,
  ADD COLUMN IF NOT EXISTS email_shared text,
  ADD COLUMN IF NOT EXISTS roadmap text,
  ADD COLUMN IF NOT EXISTS payment_link_shared text,
  ADD COLUMN IF NOT EXISTS payment_amount text,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS comment text;