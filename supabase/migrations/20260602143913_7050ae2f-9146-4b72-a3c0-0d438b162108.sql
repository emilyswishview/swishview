
CREATE POLICY "Allow authenticated manage blog authors"
ON public.blog_authors
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated manage blog posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
