-- Add slug field to blogs table for SEO-friendly URLs
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS slug text;

-- Add category field for better organization
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS category text DEFAULT 'YouTube Growth';

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);

-- Create index on published for faster filtering
CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs(published);

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_blog_slug(blog_title text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert title to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(blog_title, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check if slug exists and append number if needed
  WHILE EXISTS (SELECT 1 FROM blogs WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;