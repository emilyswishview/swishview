// Vercel Edge Middleware – routes search engine bots through Prerender.io
// so they receive fully-rendered HTML for every SPA route (blogs, creators, etc.)
import { next } from '@vercel/edge';

export const config = {
  matcher: [
    // Run on everything EXCEPT static assets, API routes, sitemap and verification files
    '/((?!api/|_next/|_vercel/|assets/|lovable-uploads/|favicon\\.ico|robots\\.txt|sitemap\\.xml|googleeb739b9bd7520d4d\\.html|.*\\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf|map|xml|txt|json)).*)',
  ],
};

const BOT_USER_AGENTS = [
  'googlebot',
  'google-inspectiontool',
  'bingbot',
  'yandex',
  'baiduspider',
  'duckduckbot',
  'slurp',
  'sogou',
  'exabot',
  'facebot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'pinterestbot',
  'developers.google.com/+/web/snippet',
  'slackbot',
  'vkshare',
  'w3c_validator',
  'redditbot',
  'applebot',
  'whatsapp',
  'flipboard',
  'tumblr',
  'bitlybot',
  'skypeuripreview',
  'nuzzel',
  'discordbot',
  'google page speed',
  'qwantify',
  'chrome-lighthouse',
  'telegrambot',
  'integration-test',
];

const PRERENDER_TOKEN = '97BLwSFfhitDTlMioqxt';
const PRERENDER_HOST = 'service.prerender.io';

export default async function middleware(req: Request) {
  const url = new URL(req.url);
  const ua = (req.headers.get('user-agent') || '').toLowerCase();
  const queryKeys = new Set(url.searchParams.keys());

  const isBot = BOT_USER_AGENTS.some((b) => ua.includes(b));
  const hasEscapedFragment = queryKeys.has('_escaped_fragment_');
  const hasPrerenderQuery = url.searchParams.get('prerender') === '1';

  if (!isBot && !hasEscapedFragment && !hasPrerenderQuery) {
    return next();
  }

  // Build absolute URL for prerender (force https + apex/www host as visited)
  const target = `${url.protocol}//${url.host}${url.pathname}${url.search}`;
  const prerenderUrl = `https://${PRERENDER_HOST}/${target}`;

  try {
    const prerenderRes = await fetch(prerenderUrl, {
      headers: {
        'X-Prerender-Token': PRERENDER_TOKEN,
        'User-Agent': req.headers.get('user-agent') || 'Prerender',
      },
      redirect: 'manual',
    });

    // Strip hop-by-hop headers
    const headers = new Headers(prerenderRes.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');
    headers.delete('transfer-encoding');
    headers.set('x-prerendered', 'true');

    return new Response(prerenderRes.body, {
      status: prerenderRes.status,
      headers,
    });
  } catch (err) {
    // On any failure, fall back to the SPA so users/bots still get something
    return next();
  }
}
