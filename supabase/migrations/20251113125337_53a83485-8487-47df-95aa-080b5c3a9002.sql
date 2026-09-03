-- Add trigger to auto-generate slug for blog_authors
CREATE TRIGGER set_blog_author_slug
  BEFORE INSERT OR UPDATE ON public.blog_authors
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_creator_slug();