-- Insert IRENESEO promo code with $300 discount
INSERT INTO public.promo_codes (code, discount_amount, is_active)
VALUES ('IRENESEO', 300.00, true)
ON CONFLICT (code) DO UPDATE
SET discount_amount = 300.00,
    is_active = true,
    updated_at = now();