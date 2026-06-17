-- Add columns that might not exist due to failed migration
ALTER TABLE public.seo_purchases ADD COLUMN IF NOT EXISTS assigned_manager text;
ALTER TABLE public.seo_purchases ADD COLUMN IF NOT EXISTS promo_code_used text;
ALTER TABLE public.seo_purchases ADD COLUMN IF NOT EXISTS discount_applied numeric DEFAULT 0;