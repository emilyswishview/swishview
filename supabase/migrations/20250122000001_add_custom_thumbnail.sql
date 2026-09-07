
-- Add custom_thumbnail column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS custom_thumbnail TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.custom_thumbnail IS 'URL of custom uploaded thumbnail when YouTube thumbnail is not available';
