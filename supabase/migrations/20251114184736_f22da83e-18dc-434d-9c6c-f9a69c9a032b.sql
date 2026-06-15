-- Add creator about page fields to blog_authors
ALTER TABLE blog_authors 
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS page_title text,
ADD COLUMN IF NOT EXISTS about_content text;

COMMENT ON COLUMN blog_authors.banner_url IS 'Banner image URL for creator landing page';
COMMENT ON COLUMN blog_authors.page_title IS 'Title/headline for creator about section';
COMMENT ON COLUMN blog_authors.about_content IS 'Rich HTML content describing the creator';