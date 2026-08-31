-- Sync existing blog posts with their authors' current profile images
UPDATE blog_posts bp
SET creator_profile_image = ba.profile_image_url
FROM blog_authors ba
WHERE bp.author_id = ba.id
  AND (bp.creator_profile_image IS DISTINCT FROM ba.profile_image_url);