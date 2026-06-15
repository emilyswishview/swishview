-- Step 1: Rename campaigns table to promotions
ALTER TABLE campaigns RENAME TO promotions;

-- Step 2: Update enum values
ALTER TYPE campaign_status RENAME TO promotion_status;

-- Step 3: Add new fields to promotions table for channel optimization
ALTER TABLE promotions ADD COLUMN promotion_type TEXT DEFAULT 'video' CHECK (promotion_type IN ('video', 'channel'));
ALTER TABLE promotions ADD COLUMN channel_url TEXT;
ALTER TABLE promotions ADD COLUMN channel_total_views BIGINT DEFAULT 0;
ALTER TABLE promotions ADD COLUMN channel_total_subscribers INTEGER DEFAULT 0;
ALTER TABLE promotions ADD COLUMN account_manager TEXT CHECK (account_manager IN ('Ashley', 'Daisy', 'Sophie'));
ALTER TABLE promotions ADD COLUMN channel_starting_views BIGINT DEFAULT 0;
ALTER TABLE promotions ADD COLUMN channel_current_views BIGINT DEFAULT 0;
ALTER TABLE promotions ADD COLUMN channel_starting_subscribers INTEGER DEFAULT 0;
ALTER TABLE promotions ADD COLUMN channel_current_subscribers INTEGER DEFAULT 0;
ALTER TABLE promotions ADD COLUMN channel_ctr DECIMAL(5,2) DEFAULT 0;
ALTER TABLE promotions ADD COLUMN engagement_rate DECIMAL(5,2) DEFAULT 0;

-- Step 4: Create promo codes table
CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    max_usage INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 5: Create promotion_promo_codes junction table for tracking usage
CREATE TABLE promotion_promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
    discount_applied DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(promotion_id, promo_code_id)
);

-- Step 6: Enable RLS on new tables
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_promo_codes ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for promo codes
CREATE POLICY "Users can view active promo codes" ON promo_codes
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage promo codes" ON promo_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Step 8: Create RLS policies for promotion_promo_codes
CREATE POLICY "Users can view their own promo code usage" ON promotion_promo_codes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM promotions 
            WHERE promotions.id = promotion_promo_codes.promotion_id 
            AND promotions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own promo code usage" ON promotion_promo_codes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM promotions 
            WHERE promotions.id = promotion_promo_codes.promotion_id 
            AND promotions.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all promo code usage" ON promotion_promo_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Step 9: Insert predefined promo codes
INSERT INTO promo_codes (code, discount_amount) VALUES
    ('SV50X9KQ', 50.00),
    ('SWV100A7MZ', 100.00),
    ('SV150PQ8R', 150.00),
    ('SWISH200L4TN', 200.00),
    ('SV250ZX7H', 250.00),
    ('SWV300B2YQ', 300.00),
    ('SV350R9WF', 350.00),
    ('SWISH400M6JK', 400.00),
    ('SV450H2DP', 450.00),
    ('SWV500Q8NZ', 500.00);

-- Step 10: Update payments table to reference promotions
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_campaign_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_promotion_id_fkey 
    FOREIGN KEY (campaign_id) REFERENCES promotions(id);

-- Step 11: Update campaign_analytics table
ALTER TABLE campaign_analytics RENAME TO promotion_analytics;
ALTER TABLE promotion_analytics DROP CONSTRAINT IF EXISTS campaign_analytics_campaign_id_fkey;
ALTER TABLE promotion_analytics ADD CONSTRAINT promotion_analytics_promotion_id_fkey 
    FOREIGN KEY (campaign_id) REFERENCES promotions(id);

-- Step 12: Update RLS policies to reference promotions
DROP POLICY IF EXISTS "Users can view own campaign analytics" ON promotion_analytics;
DROP POLICY IF EXISTS "Admins can view all analytics" ON promotion_analytics;

CREATE POLICY "Users can view own promotion analytics" ON promotion_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM promotions
            WHERE promotions.id = promotion_analytics.campaign_id 
            AND promotions.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all promotion analytics" ON promotion_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Step 13: Create YouTube channel analytics edge function helper table
CREATE TABLE youtube_channel_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_url TEXT UNIQUE NOT NULL,
    channel_id TEXT,
    total_views BIGINT DEFAULT 0,
    total_subscribers INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE youtube_channel_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view channel cache" ON youtube_channel_cache
    FOR SELECT USING (true);

CREATE POLICY "Edge functions can manage channel cache" ON youtube_channel_cache
    FOR ALL USING (true);

-- Step 14: Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();