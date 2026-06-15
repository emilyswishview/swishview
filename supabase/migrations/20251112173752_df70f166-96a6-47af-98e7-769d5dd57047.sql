-- Add creator fields to blog_posts table
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS creator_slug TEXT,
ADD COLUMN IF NOT EXISTS creator_channel_url TEXT,
ADD COLUMN IF NOT EXISTS creator_profile_image TEXT,
ADD COLUMN IF NOT EXISTS creator_email TEXT,
ADD COLUMN IF NOT EXISTS creator_short_bio TEXT,
ADD COLUMN IF NOT EXISTS creator_subscribers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS featured_youtube_url TEXT,
ADD COLUMN IF NOT EXISTS hero_media_type TEXT DEFAULT 'image',
ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
ADD COLUMN IF NOT EXISTS hero_image_alt TEXT,
ADD COLUMN IF NOT EXISTS hero_image_caption TEXT,
ADD COLUMN IF NOT EXISTS hero_video_url TEXT,
ADD COLUMN IF NOT EXISTS pull_quote TEXT,
ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Start Your Campaign',
ADD COLUMN IF NOT EXISTS cta_url TEXT DEFAULT '/create-campaign',
ADD COLUMN IF NOT EXISTS cta_style TEXT DEFAULT 'button',
ADD COLUMN IF NOT EXISTS additional_videos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS insight_boxes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS oembed_embeds JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS related_posts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS create_child_video_pages BOOLEAN DEFAULT false;

-- Create index on creator_slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_creator_slug ON blog_posts(creator_slug);

-- Update slug to be unique
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug_unique ON blog_posts(slug);