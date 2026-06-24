/**
 * Dynamic Sitemap Generator for SwishView
 * Generates XML sitemap for all creator pages and blog posts
 */

import { supabase } from '@/integrations/supabase/client';

interface SitemapURL {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export async function generateSitemap(): Promise<string> {
  const urls: SitemapURL[] = [];
  const baseUrl = 'https://www.swishview.com';

  // Static pages
  urls.push(
    { loc: baseUrl, changefreq: 'daily', priority: 1.0, lastmod: new Date().toISOString().split('T')[0] },
    { loc: `${baseUrl}/blogs`, changefreq: 'daily', priority: 0.9, lastmod: new Date().toISOString().split('T')[0] },
    { loc: `${baseUrl}/pricing`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${baseUrl}/product`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${baseUrl}/contact`, changefreq: 'monthly', priority: 0.6 }
  );

  try {
    // Fetch all creators
    const { data: creators, error: creatorsError } = await supabase
      .from('blog_authors')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false });

    if (!creatorsError && creators) {
      creators.forEach(creator => {
        urls.push({
          loc: `${baseUrl}/blogs/${creator.slug}`,
          changefreq: 'weekly',
          priority: 0.85,
          lastmod: creator.updated_at ? new Date(creator.updated_at).toISOString().split('T')[0] : undefined
        });
        // NOTE: /creator/:slug routes are 301-redirected to /blogs/:slug — do NOT include them in sitemap
      });
    }

    // Fetch all published blog posts
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('slug, creator_slug, updated_at, created_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (!postsError && posts) {
      posts.forEach(post => {
        if (post.creator_slug) {
          urls.push({
            loc: `${baseUrl}/blogs/${post.creator_slug}/${post.slug}`,
            changefreq: 'weekly',
            priority: 0.8,
            lastmod: post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : 
                     post.created_at ? new Date(post.created_at).toISOString().split('T')[0] : undefined
          });
        }
      });
    }

  } catch (error) {
    console.error('Error generating sitemap:', error);
  }

  // Generate XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
  xml += 'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" ';
  xml += 'xmlns:xhtml="http://www.w3.org/1999/xhtml" ';
  xml += 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ';
  xml += 'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

  urls.forEach(url => {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    if (url.lastmod) xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    if (url.changefreq) xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    if (url.priority !== undefined) xml += `    <priority>${url.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>';

  return xml;
}

/**
 * Save sitemap to public folder (for build-time generation)
 */
export async function saveSitemap() {
  const sitemap = await generateSitemap();
  
  // In a real implementation, you'd write this to public/sitemap.xml
  // For now, this function demonstrates the structure
  console.log('Sitemap generated:', sitemap.substring(0, 200) + '...');
  
  return sitemap;
}