-- Allow anonymous insert/update/delete on blog_authors for blogs-management page
CREATE POLICY "Allow anonymous manage blog authors"
ON public.blog_authors FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous insert/update/delete on blog_posts for blogs-management page
CREATE POLICY "Allow anonymous manage blog posts"
ON public.blog_posts FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous manage blog_videos
CREATE POLICY "Allow anonymous manage blog videos"
ON public.blog_videos FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous manage blog_categories
CREATE POLICY "Allow anonymous manage blog categories"
ON public.blog_categories FOR ALL
TO anon
USING (true)
WITH CHECK (true);