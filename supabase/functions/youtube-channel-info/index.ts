import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseChannelInput(input: string): { type: 'id' | 'handle' | 'username' | 'custom' | 'video'; value: string } | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^UC[\w-]{20,}$/.test(trimmed)) return { type: 'id', value: trimmed };

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, '');
    const parts = url.pathname.split('/').filter(Boolean);

    // Video URL forms → resolve to channel via videos.list
    if (host === 'youtu.be' && parts[0]) return { type: 'video', value: parts[0] };
    if (parts[0] === 'watch') {
      const v = url.searchParams.get('v');
      if (v) return { type: 'video', value: v };
    }
    if (parts[0] === 'shorts' && parts[1]) return { type: 'video', value: parts[1] };
    if (parts[0] === 'live' && parts[1]) return { type: 'video', value: parts[1] };
    if (parts[0] === 'embed' && parts[1]) return { type: 'video', value: parts[1] };

    if (parts.length === 0) return null;
    if (parts[0].startsWith('@')) return { type: 'handle', value: parts[0] };
    if (parts[0] === 'channel' && parts[1]) return { type: 'id', value: parts[1] };
    if (parts[0] === 'user' && parts[1]) return { type: 'username', value: parts[1] };
    if (parts[0] === 'c' && parts[1]) return { type: 'custom', value: parts[1] };
    if (parts[0].startsWith('@') === false && parts.length === 1) return { type: 'handle', value: `@${parts[0]}` };
  } catch {
    if (trimmed.startsWith('@')) return { type: 'handle', value: trimmed };
    return { type: 'custom', value: trimmed };
  }
  return null;
}

// ISO 8601 duration → readable (e.g. PT1H2M30S → 1:02:30)
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { channelUrl, includeVideos = true, maxVideos = 12 } = await req.json();
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) throw new Error('YouTube API key not configured');

    const parsed = parseChannelInput(channelUrl);
    if (!parsed) throw new Error('Could not parse channel URL');

    let channelId: string | null = null;

    if (parsed.type === 'id') {
      channelId = parsed.value;
    } else if (parsed.type === 'video') {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${parsed.value}&key=${YOUTUBE_API_KEY}`);
      const d = await r.json();
      if (d.items?.[0]?.snippet?.channelId) channelId = d.items[0].snippet.channelId;
    } else if (parsed.type === 'handle') {
      const handle = parsed.value.replace(/^@/, '');
      const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=@${handle}&key=${YOUTUBE_API_KEY}`);
      const d = await r.json();
      if (d.items?.[0]?.id) channelId = d.items[0].id;
    } else if (parsed.type === 'username') {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${parsed.value}&key=${YOUTUBE_API_KEY}`);
      const d = await r.json();
      if (d.items?.[0]?.id) channelId = d.items[0].id;
    }

    if (!channelId) {
      const q = encodeURIComponent(parsed.value);
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${q}&maxResults=1&key=${YOUTUBE_API_KEY}`);
      const d = await r.json();
      if (d.items?.[0]?.snippet?.channelId) channelId = d.items[0].snippet.channelId;
    }

    if (!channelId) throw new Error('Channel not found');

    const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails,topicDetails,status&id=${channelId}&key=${YOUTUBE_API_KEY}`);
    const d = await r.json();
    const ch = d.items?.[0];
    if (!ch) throw new Error('Channel data unavailable');

    const uploadsPlaylist = ch.contentDetails?.relatedPlaylists?.uploads;
    let recentVideos: any[] = [];
    let latestVideo: any = null;

    if (includeVideos && uploadsPlaylist) {
      try {
        const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&maxResults=${Math.min(50, maxVideos)}&playlistId=${uploadsPlaylist}&key=${YOUTUBE_API_KEY}`);
        const playlistData = await playlistRes.json();
        const videoIds = (playlistData.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);

        if (videoIds.length) {
          const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`);
          const videoData = await videoRes.json();
          recentVideos = (videoData.items || []).map((v: any) => ({
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
        }
      } catch (e) {
        console.error('Failed to fetch videos:', (e as Error).message);
      }
    }

    return new Response(JSON.stringify({
      channelId,
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
