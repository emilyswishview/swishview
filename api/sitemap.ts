// Vercel serverless function – serves a real XML sitemap to Google
// Available at https://www.swishview.com/sitemap.xml
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nuxixhoogohqligzgbdm.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eGl4aG9vZ29ocWxpZ3pnYmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MDI4NTgsImV4cCI6MjA2NDA3ODg1OH0.SWNqG4qtcgs3zmMOh-89RSTA7nAXdcNbWpFjDYCUCSQ';

const BASE = 'https://www.swishview.com';

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export default async function handler(_req: any, res: any) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  type Url = { loc: string; lastmod?: string; changefreq?: string; priority?: number };
  const urls: Url[] = [
    { loc: `${BASE}/`, changefreq: 'daily', priority: 1.0 },
    { loc: `${BASE}/blogs`, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE}/pricing`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE}/product`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE}/channel-growth`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE}/videopromotion`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE}/channeloptimization`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE}/channelaudit`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE}/whyswishview`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE}/reviews`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE}/about`, changefreq: 'monthly', priority: 0.6 },
    { loc: `${BASE}/contact`, changefreq: 'monthly', priority: 0.6 },
    { loc: `${BASE}/privacy-policy`, changefreq: 'yearly', priority: 0.3 },
    { loc: `${BASE}/terms-conditions`, changefreq: 'yearly', priority: 0.3 },
    { loc: `${BASE}/refund-policy`, changefreq: 'yearly', priority: 0.3 },
  ];

  try {
    // Only published posts belong in the sitemap
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, creator_slug, updated_at, created_at')
      .eq('status', 'published')
      .not('creator_slug', 'is', null);

    const creatorsWithPublished = new Set<string>();

    posts?.forEach((p: any) => {
      creatorsWithPublished.add(p.creator_slug);
      const src = p.updated_at || p.created_at;
      urls.push({
        loc: `${BASE}/blogs/${p.creator_slug}/${p.slug}`,
        lastmod: src ? new Date(src).toISOString().split('T')[0] : undefined,
        changefreq: 'weekly',
        priority: 0.8,
      });
    });

    // Creator pages are indexable only while they have published posts
    if (creatorsWithPublished.size > 0) {
      const { data: creators } = await supabase
        .from('blog_authors')
        .select('slug, updated_at')
        .not('slug', 'is', null);

      creators?.forEach((c: any) => {
        if (!creatorsWithPublished.has(c.slug)) return;
        urls.push({
          loc: `${BASE}/blogs/${c.slug}`,
          lastmod: c.updated_at ? new Date(c.updated_at).toISOString().split('T')[0] : undefined,
          changefreq: 'weekly',
          priority: 0.85,
        });
      });
    }
  } catch (e) {
    console.error('sitemap supabase error', e);
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n` +
          (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
          (u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>\n` : '') +
          (u.priority !== undefined ? `    <priority>${u.priority}</priority>\n` : '') +
          `  </url>`
      )
      .join('\n') +
    `\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
