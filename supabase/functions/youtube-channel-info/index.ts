import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractPhone, extractPhoneLoose, textFromYouTubeHtml, externalLinksFromYouTubeHtml, textFromHtml } from "../_shared/phone.ts";
import { ytFetch, ytKeyStats, ytErrorMessage } from "../_shared/ytKeys.ts";


const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function getText(url: string, timeoutMs = 10_000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'en-US,en;q=0.9',
        // Bypass the EU consent interstitial that hides channel descriptions.
        'Cookie': 'CONSENT=YES+cb; SOCS=CAI',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!r.ok) return "";
    const ct = r.headers.get('content-type') || '';
    if (ct && !/text|html|json|xml/i.test(ct)) return "";
    return await r.text();
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

// YouTube's own web client API — returns the About panel (description, links,
// business email prompt) as JSON even when the HTML page is consent-walled.
// Costs zero Data API quota.
const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
async function innertubeAbout(channelId: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const r = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${INNERTUBE_KEY}&prettyPrint=false`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: '2.20240401.00.00', hl: 'en', gl: 'US' } },
        browseId: channelId,
        params: 'EgVhYm91dPIGBAoCEgA%3D',
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) return "";
    return await r.text();
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

// Free video-description mining via the public RSS feed (no API quota).
// Many creators only put their number in video descriptions.
async function phoneFromRss(channelId: string): Promise<string> {
  const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, 9000);
  if (!xml) return "";
  // <media:description> is included in the feed itself — check that first.
  const descs = Array.from(xml.matchAll(/<media:description>([\s\S]*?)<\/media:description>/g))
    .map((m) => m[1]);
  const fromFeed = extractPhone(descs.join('\n'));
  if (fromFeed) return fromFeed;

  const ids = Array.from(xml.matchAll(/<yt:videoId>([\w-]{11})<\/yt:videoId>/g)).map((m) => m[1]).slice(0, 6);
  for (const id of ids) {
    const html = await getText(`https://www.youtube.com/watch?v=${id}&hl=en`, 9000);
    if (!html) continue;
    const phone = extractPhone(textFromYouTubeHtml(html));
    if (phone) return phone;
  }
  return "";
}

// Scrape the channel's About page for contact info (phone / whatsapp) and
// collect the external links the creator published so we can crawl those too.
async function scrapeChannelContact(
  channelId: string,
  customUrl: string,
): Promise<{ phone: string; links: string[] }> {
  const handle = (customUrl || "").replace(/^\/?@?/, "");
  const urls = [
    `https://www.youtube.com/channel/${channelId}/about?hl=en&persist_hl=1`,
    handle ? `https://www.youtube.com/@${handle}/about?hl=en&persist_hl=1` : "",
    `https://www.youtube.com/channel/${channelId}?hl=en`,
    handle ? `https://www.youtube.com/@${handle}?hl=en` : "",
  ].filter(Boolean);

  const links = new Set<string>();

  // 1) InnerTube JSON About panel (most reliable, no consent wall).
  const it = await innertubeAbout(channelId);
  if (it) {
    externalLinksFromYouTubeHtml(it).forEach((l) => links.add(l));
    const phone = extractPhone(textFromYouTubeHtml(it));
    if (phone) return { phone, links: Array.from(links) };
  }

  // 2) Plain HTML about/home pages.
  for (const u of urls) {
    const html = await getText(u);
    if (!html) continue;
    externalLinksFromYouTubeHtml(html).forEach((l) => links.add(l));
    const phone = extractPhone(textFromYouTubeHtml(html));
    if (phone) return { phone, links: Array.from(links) };
  }
  return { phone: "", links: Array.from(links) };
}

// Crawl the creator's own website (plus obvious contact pages) for a number.
async function phoneFromLinks(links: string[]): Promise<string> {
  const candidates: string[] = [];
  for (const l of links.slice(0, 6)) {
    candidates.push(l);
    try {
      const u = new URL(l);
      if (u.pathname === "/" || u.pathname === "") {
        candidates.push(
          `${u.origin}/contact`, `${u.origin}/contact-us`, `${u.origin}/about`,
          `${u.origin}/about-us`, `${u.origin}/support`, `${u.origin}/pages/contact`,
        );
      }
    } catch { /* ignore */ }
  }
  const seen = new Set<string>();
  for (const c of candidates.slice(0, 18)) {
    if (seen.has(c)) continue;
    seen.add(c);
    const html = await getText(c, 8000);
    if (!html) continue;
    const phone = extractPhone(textFromHtml(html));
    if (phone) return phone;
  }
  return "";
}



const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function fmtDuration(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '';
  const h = parseInt(m[1] || '0');
  const min = parseInt(m[2] || '0');
  const s = parseInt(m[3] || '0');
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${min}:${String(s).padStart(2, '0')}`;
}

// Resolve any YouTube channel URL/handle/id to a channel ID via HTML scrape.
// This avoids the YouTube Data API's flaky forHandle / search quota-heavy paths.
async function resolveChannelIdViaHtml(input: string): Promise<string | null> {
  if (/^UC[\w-]{22}$/.test(input.trim())) return input.trim();

  // Normalize to a canonical youtube.com URL
  let url = input.trim();
  if (!url.startsWith('http')) {
    if (url.startsWith('@')) url = `https://www.youtube.com/${url}`;
    else if (/^UC[\w-]{22}$/.test(url)) url = `https://www.youtube.com/channel/${url}`;
    else url = `https://www.youtube.com/@${url.replace(/^\/+/, '')}`;
  }

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (!r.ok) return null;
    const html = await r.text();
    const m =
      html.match(/"channelId":"(UC[\w-]{22})"/) ||
      html.match(/<meta itemprop="channelId" content="(UC[\w-]{22})">/) ||
      html.match(/\/channel\/(UC[\w-]{22})/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const {
      channelUrl,
      includeVideos = true,
      maxVideos = 12,
      // Phone-scrape mode: skip video API calls unless the cheap sources
      // (description / keywords / title / About page / linked site) fail.
      phoneOnly = false,
    } = await req.json();
    if (!channelUrl) throw new Error('channelUrl is required');
    if (!ytKeyStats().total) throw new Error('YouTube API key not configured');

    const channelId = await resolveChannelIdViaHtml(channelUrl);
    if (!channelId) throw new Error('Could not resolve channel ID from URL');

    // 1 unit
    const chRes = await ytFetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails,topicDetails,status&id=${channelId}`,
    );
    if (!chRes.ok) throw new Error(ytErrorMessage(chRes));
    const chData = chRes.body;
    const ch = chData.items?.[0];
    if (!ch) throw new Error('Channel data unavailable');

    const uploadsPlaylist = ch.contentDetails?.relatedPlaylists?.uploads;
    let recentVideos: any[] = [];
    let latestVideo: any = null;

    // 1 unit (playlistItems) + 1 unit (videos)
    const loadVideos = async (limit: number) => {
      if (!uploadsPlaylist || recentVideos.length) return;
      try {
        const playlistRes = await ytFetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&maxResults=${Math.min(50, limit)}&playlistId=${uploadsPlaylist}`,
        );
        if (!playlistRes.ok) return;
        const videoIds = (playlistRes.body.items || [])
          .map((i: any) => i.contentDetails?.videoId).filter(Boolean);
        if (!videoIds.length) return;
        const videoRes = await ytFetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}`,
        );
        if (!videoRes.ok) return;
        recentVideos = (videoRes.body.items || []).map((v: any) => ({
          videoId: v.id,
          title: v.snippet?.title || '',
          description: v.snippet?.description || '',
          publishedAt: v.snippet?.publishedAt || '',
          thumbnail:
            v.snippet?.thumbnails?.maxres?.url ||
            v.snippet?.thumbnails?.standard?.url ||
            v.snippet?.thumbnails?.high?.url ||
            v.snippet?.thumbnails?.medium?.url ||
            v.snippet?.thumbnails?.default?.url || '',
          url: `https://www.youtube.com/watch?v=${v.id}`,
          duration: fmtDuration(v.contentDetails?.duration || ''),
          viewCount: parseInt(v.statistics?.viewCount || '0'),
          likeCount: parseInt(v.statistics?.likeCount || '0'),
          commentCount: parseInt(v.statistics?.commentCount || '0'),
          tags: v.snippet?.tags || [],
        })).sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        latestVideo = recentVideos[0] || null;
      } catch (e) {
        console.error('Failed to fetch videos:', (e as Error).message);
      }
    };

    if (includeVideos && !phoneOnly) await loadVideos(maxVideos);

    // ---- Contact phone discovery -------------------------------------------
    // Cheapest sources first (0 extra quota): channel description + keywords,
    // channel title, About-page HTML scrape, linked website / linktree.
    // Video descriptions (2 units) are only fetched as a last resort.
    let phone = extractPhone(
      ch.snippet?.description || '',
      ch.brandingSettings?.channel?.keywords || '',
      ...recentVideos.map((v: any) => v.description || ''),
    );
    if (!phone) phone = extractPhoneLoose(ch.snippet?.title || '');
    let externalLinks: string[] = [];
    if (!phone) {
      const scraped = await scrapeChannelContact(channelId, ch.snippet?.customUrl || '');
      phone = scraped.phone;
      externalLinks = scraped.links;
    }
    // Free (no-quota) video-description mining via the RSS feed + watch pages.
    if (!phone) phone = await phoneFromRss(channelId);
    if (!phone && externalLinks.length) phone = await phoneFromLinks(externalLinks);
    if (!phone && includeVideos && phoneOnly) {
      // Free sources came up empty — now spend the 2 units on video descriptions.
      await loadVideos(Math.min(maxVideos, 10));
      phone = extractPhone(...recentVideos.map((v: any) => v.description || ''));
    }
    // Very last resort: a bare digit run in the channel description/keywords.
    if (!phone) {
      phone = extractPhoneLoose(
        ch.snippet?.description || '',
        ch.brandingSettings?.channel?.keywords || '',
      );
    }



    return new Response(JSON.stringify({
      channelId,
      phone: phone || '',
      externalLinks,



      channelName: ch.snippet?.title,
      description: ch.snippet?.description || '',
      country: ch.snippet?.country || ch.brandingSettings?.channel?.country || '',
      customUrl: ch.snippet?.customUrl || '',
      publishedAt: ch.snippet?.publishedAt || '',
      keywords: ch.brandingSettings?.channel?.keywords || '',
      subscribers: parseInt(ch.statistics?.subscriberCount || '0'),
      hiddenSubscriberCount: !!ch.statistics?.hiddenSubscriberCount,
      totalViews: parseInt(ch.statistics?.viewCount || '0'),
      videoCount: parseInt(ch.statistics?.videoCount || '0'),
      thumbnail: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url,
      banner: ch.brandingSettings?.image?.bannerExternalUrl || '',
      topicCategories: ch.topicDetails?.topicCategories || [],
      madeForKids: ch.status?.madeForKids ?? null,
      privacyStatus: ch.status?.privacyStatus || '',
      uploadsPlaylist,
      latestVideo,
      recentVideos,
      fetchedAt: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
