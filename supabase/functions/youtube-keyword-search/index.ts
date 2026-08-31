// Keyword -> YouTube channel discovery for the /phone tool.
// Returns a de-duplicated list of channels matching the given keywords,
// enriched with subscriber / view counts so the caller can filter before
// running the (much slower) phone scrape.
//
// Quota notes: search.list costs 100 units per call regardless of maxResults,
// so we ALWAYS request maxResults=50 (2 units per channel instead of 20 when
// callers ask for 5). channels.list enrichment is 1 unit per 50 ids.
// Keys are pooled across multiple Google Cloud projects (see _shared/ytKeys.ts).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ytFetch, ytKeyStats, ytErrorMessage } from "../_shared/ytKeys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const keywords: string[] = Array.isArray(body?.keywords)
      ? body.keywords.map((k: any) => String(k).trim()).filter(Boolean)
      : String(body?.query || "")
          .split(/[,\n]/)
          .map((k) => k.trim())
          .filter(Boolean);

    if (!keywords.length) throw new Error("Provide at least one keyword");

    // search.list is billed per CALL (100 units), not per result — so always
    // pull the maximum page size to get the cheapest cost per channel.
    const perKeyword = 50;
    const pages = Math.min(20, Math.max(1, Number(body?.pages) || 1));
    const regionCode = body?.regionCode ? String(body.regionCode) : "";
    const relevanceLanguage = body?.relevanceLanguage ? String(body.relevanceLanguage) : "";
    const publishedAfter = body?.publishedAfter ? String(body.publishedAfter) : "";
    const enrich = body?.enrich !== false;
    const order = ["relevance", "viewCount", "date", "videoCount"].includes(String(body?.order))
      ? String(body.order)
      : "relevance";
    // Channel ids the caller already has — never return them again.
    const exclude = new Set(
      (Array.isArray(body?.exclude) ? body.exclude : []).map((s: any) => String(s)),
    );
    // Resume tokens from a previous call: { [keyword]: pageToken }
    const resumeTokens: Record<string, string> = body?.pageTokens && typeof body.pageTokens === "object"
      ? body.pageTokens
      : {};

    const stats0 = ytKeyStats();
    if (!stats0.total) throw new Error("YouTube API key not configured");

    const seen = new Map<string, any>();
    const perKeywordStats: any[] = [];
    const nextPageTokens: Record<string, string> = {};
    let units = 0;
    let quotaHit = false;

    for (const kw of keywords.slice(0, 20)) {
      if (quotaHit) { nextPageTokens[kw] = resumeTokens[kw] || ""; continue; }
      let token: string | undefined = resumeTokens[kw] || undefined;
      let added = 0;
      let errored: string | null = null;

      for (let p = 0; p < pages; p++) {
        const url = new URL("https://www.googleapis.com/youtube/v3/search");
        url.searchParams.set("part", "snippet");
        url.searchParams.set("type", "channel");
        url.searchParams.set("maxResults", String(perKeyword));
        url.searchParams.set("q", kw);
        url.searchParams.set("order", order);
        // Trim the payload to only what we use.
        url.searchParams.set(
          "fields",
          "nextPageToken,items(id/channelId,snippet(channelId,channelTitle,title,description,thumbnails/default/url))",
        );
        if (regionCode) url.searchParams.set("regionCode", regionCode);
        if (relevanceLanguage) url.searchParams.set("relevanceLanguage", relevanceLanguage);
        if (publishedAfter) url.searchParams.set("publishedAfter", publishedAfter);
        if (token) url.searchParams.set("pageToken", token);

        const res = await ytFetch(url.toString());
        units += 100;
        if (!res.ok) {
          errored = ytErrorMessage(res);
          if (res.quotaExhausted) quotaHit = true;
          break;
        }
        const j = res.body;
        for (const item of j.items || []) {
          const id = item?.snippet?.channelId || item?.id?.channelId;
          if (!id || seen.has(id) || exclude.has(id)) continue;
          seen.set(id, {
            channelId: id,
            title: item?.snippet?.channelTitle || item?.snippet?.title || "",
            description: item?.snippet?.description || "",
            thumbnail: item?.snippet?.thumbnails?.default?.url || "",
            url: `https://www.youtube.com/channel/${id}`,
            keyword: kw,
          });
          added++;
        }
        token = j.nextPageToken || undefined;
        if (!token) break;
      }

      if (token) nextPageTokens[kw] = token;
      perKeywordStats.push({ keyword: kw, found: added, ...(errored ? { error: errored } : {}) });
    }

    // Enrich with statistics (50 ids per request = 1 unit) so the client can
    // filter by subscriber count / country without scraping each channel.
    const ids = Array.from(seen.keys());
    if (enrich && !quotaHit) {
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const url = new URL("https://www.googleapis.com/youtube/v3/channels");
        url.searchParams.set("part", "statistics,snippet");
        url.searchParams.set("id", chunk.join(","));
        url.searchParams.set(
          "fields",
          "items(id,statistics(subscriberCount,viewCount,videoCount),snippet(country,publishedAt,customUrl))",
        );
        const res = await ytFetch(url.toString());
        units += 1;
        if (!res.ok) { if (res.quotaExhausted) quotaHit = true; continue; }
        for (const item of res.body.items || []) {
          const row = seen.get(item.id);
          if (!row) continue;
          row.subscribers = Number(item?.statistics?.subscriberCount) || 0;
          row.totalViews = Number(item?.statistics?.viewCount) || 0;
          row.videoCount = Number(item?.statistics?.videoCount) || 0;
          row.country = item?.snippet?.country || "";
          row.publishedAt = item?.snippet?.publishedAt || "";
          if (item?.snippet?.customUrl) row.url = `https://www.youtube.com/${item.snippet.customUrl}`;
        }
      }
    }

    const stats = ytKeyStats();
    return new Response(
      JSON.stringify({
        channels: Array.from(seen.values()),
        perKeyword: perKeywordStats,
        pageTokens: nextPageTokens,
        hasMore: Object.keys(nextPageTokens).length > 0,
        quotaExhausted: quotaHit,
        unitsUsed: units,
        keys: stats,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, keys: ytKeyStats() }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
