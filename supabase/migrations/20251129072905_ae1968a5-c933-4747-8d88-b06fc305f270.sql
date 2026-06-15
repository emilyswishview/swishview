-- Add tags column to thumbnail_history if it doesn't exist
ALTER TABLE public.thumbnail_history 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add index for tags search if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_thumbnail_history_tags ON public.thumbnail_history USING GIN(tags);