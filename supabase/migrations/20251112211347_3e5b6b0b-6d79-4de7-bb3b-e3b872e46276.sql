-- Add missing fields to blog_authors table
ALTER TABLE blog_authors 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS channel_url text,
ADD COLUMN IF NOT EXISTS subscribers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS short_bio text;

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name text) 
RETURNS text AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(trim(name), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing creators with slugs if they don't have one
UPDATE blog_authors 
SET slug = generate_slug(name)
WHERE slug IS NULL;

-- Trigger to auto-generate slug for new creators
CREATE OR REPLACE FUNCTION auto_generate_creator_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_creator_slug ON blog_authors;
CREATE TRIGGER trigger_auto_generate_creator_slug
  BEFORE INSERT OR UPDATE ON blog_authors
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_creator_slug();

-- Update existing blog_posts with creator data from blog_authors
UPDATE blog_posts bp
SET 
  creator_name = ba.name,
  creator_slug = ba.slug,
  creator_profile_image = ba.profile_image_url,
  creator_short_bio = COALESCE(ba.short_bio, ba.bio),
  creator_channel_url = ba.channel_url,
  creator_subscribers = ba.subscribers
FROM blog_authors ba
WHERE bp.author_id = ba.id;