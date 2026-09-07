-- Fix existing published posts that don't have published_at set
UPDATE blog_posts 
SET published_at = created_at 
WHERE status = 'published' AND published_at IS NULL;