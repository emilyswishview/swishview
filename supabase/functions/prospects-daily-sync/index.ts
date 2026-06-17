// Background sync for /prospects.
//
// Iterates every prospect row, fetches YouTube channel info via
// youtube-channel-info, appends a daily snapshot and updates fields.
//
// Key design points:
//  * Runs in EdgeRuntime.waitUntil so HTTP returns immediately.
//  * Processes rows in PARALLEL with bounded concurrency for speed.
//  * Self-chunks: when wall-time approaches the edge runtime limit it
//    re-invokes itself so the work keeps going across many invocations
//    until every row that has not been synced today is done.
//  * Also wakes up every minute (pg_cron also triggers it) so even if a
//    single invocation is killed, the next one resumes where the previous
//    left off (rows already synced today are skipped).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CONCURRENCY = 24;         // parallel YT lookups per chunk
const MAX_WALL_MS = 90_000;     // re-invoke self when this much time has passed
const FETCH_PAGE = 500;

const todayISO = () => new Date().toISOString().slice(0, 10);

function addSnapshot(existing: any[] = [], snap: any) {
  const filtered = (existing || []).filter((s: any) => s.date !== snap.date);
  return [...filtered, snap]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90);
}

async function processOne(supabase: any, row: any, force = false): Promise<boolean> {
  const data = row.data || {};
  const url: string = data.channelLink || row.channel_link || "";
  if (!url) return false;
  const today = todayISO();
  const missingChannelData = !row.channel_name || !data.channelName;
  if (
    !force &&
    !missingChannelData &&
    row.last_fetched_at &&
    String(row.last_fetched_at).slice(0, 10) === today
  ) {
    return false; // already synced today and has channel data
  }
  try {
    const { data: yt, error } = await supabase.functions.invoke("youtube-channel-info", {
      body: { channelUrl: url, includeVideos: true, maxVideos: 6 },
    });
    if (error || !yt || yt.error) {
      // Mark the attempt on BOTH the json blob AND the top-level last_fetched_at
      // so the pending-count query (which uses the top-level column) no longer
      // treats this row as "needs sync today". Otherwise broken links would
      // make the progress bar never reach 0.
      await supabase.from("prospects")
        .update({
          data: { ...data, lastFetchedAt: new Date().toISOString(), lastSyncError: (error?.message || yt?.error || "unknown") },
          last_fetched_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      return false;
    }

    const subs = Number(yt.subscribers) || 0;
    const views = Number(yt.totalViews) || 0;
    const lv = yt.latestVideo;
    const recent = (yt.recentVideos || []).slice(0, 3).map((v: any) => ({
      title: v.title || "",
      url: v.url || "",
      description: v.description || "",
    }));

    const updated = {
      ...data,
      channelName: yt.channelName || data.channelName,
      channelDescription: yt.description || data.channelDescription,
      country: yt.country || data.country,
      channelJoined: yt.publishedAt ? String(yt.publishedAt).slice(0, 10) : data.channelJoined,
      subscribersLive: subs ? String(subs) : data.subscribersLive,
      totalViews: views ? String(views) : data.totalViews,
      ytCapture: yt.thumbnail || data.ytCapture,
      snapshots: addSnapshot(data.snapshots, { date: today, subscribers: subs, totalViews: views }),
      lastVideoTitle: lv?.title || data.lastVideoTitle,
      lastVideoDate: lv?.publishedAt || data.lastVideoDate,
      lastVideoUrl: lv?.url || data.lastVideoUrl,
      lastVideoThumb: lv?.thumbnail || data.lastVideoThumb,
      lastVideoViews: lv?.viewCount != null ? String(lv.viewCount) : data.lastVideoViews,
      lastFetchedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recentVideos: recent.length ? recent : data.recentVideos,
      lastSyncError: null,
    };

    await supabase
      .from("prospects")
      .update({
        data: updated,
        channel_name: yt.channelName || row.channel_name || null,
        last_fetched_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    return true;
  } catch (e) {
    console.error("processOne failed", row.id, e);
    return false;
  }
}

// Parallel pool – process up to N rows in flight at once.
async function runPool<T>(items: T[], worker: (it: T) => Promise<any>, concurrency: number) {
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try { await worker(items[i]); } catch {}
    }
  });
  await Promise.all(workers);
}

// Map a logged-in email to all sender mailboxes that user owns.
function ownerSendersFor(email: string | null | undefined): string[] | null {
  if (!email) return null;
  const e = email.toLowerCase().trim();
  if (!e) return null;
  if (e === "serena@swishview.com") return ["serena@swishview.com", "ashley@swishview.com"];
  if (e === "hazel@swishview.com")  return ["hazel@swishview.com",  "rachel@swishview.email"];
  return [e];
}

async function selfInvoke(force: boolean, ownerSenders?: string[] | null) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/prospects-daily-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "apikey": SERVICE_ROLE,
      },
      body: JSON.stringify({ continuation: true, force, ownerSenders: ownerSenders || null }),
    });
  } catch (e) {
    console.error("selfInvoke failed", e);
  }
}

async function runSync(priorityIds: string[] = [], force = false, ownerSenders: string[] | null = null) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = Date.now();
  const today = todayISO();
  let processed = 0;
  let updated = 0;

  if (priorityIds.length) {
    let pq: any = supabase
      .from("prospects")
      .select("id,data,channel_link,last_fetched_at,channel_name,assigned_sender")
      .in("id", priorityIds);
    if (ownerSenders?.length) pq = pq.in("assigned_sender", ownerSenders);
    const { data: prio } = await pq;
    if (prio?.length) {
      await runPool(prio, async (row: any) => {
        processed++;
        if (await processOne(supabase, row, force)) updated++;
      }, CONCURRENCY);
    }
  }

  while (true) {
    if (Date.now() - startedAt > MAX_WALL_MS) {
      console.log(`[sync] wall-time reached, processed=${processed} updated=${updated}; re-invoking self`);
      await selfInvoke(force, ownerSenders);
      return { processed, updated, continued: true };
    }

    let q: any = supabase
      .from("prospects")
      .select("id,data,channel_link,last_fetched_at,channel_name,assigned_sender")
      .neq("channel_link", "")
      .not("channel_link", "is", null)
      .eq("is_banned", false)
      .order("last_fetched_at", { ascending: true, nullsFirst: true })
      .limit(FETCH_PAGE);
    if (ownerSenders?.length) q = q.in("assigned_sender", ownerSenders);
    if (!force) {
      q = q.or(`last_fetched_at.is.null,last_fetched_at.lt.${today}T00:00:00Z`);
    }
    const { data, error } = await q;
    if (error) { console.error("[sync] fetch failed", error); break; }
    if (!data?.length) break;

    try {
      await runPool(data, async (row: any) => {
        processed++;
        if (await processOne(supabase, row, force)) updated++;
      }, CONCURRENCY);
    } catch (e) {
      console.error("[sync] batch failed, continuing via self-invoke", e);
      await selfInvoke(force, ownerSenders);
      return { processed, updated, continued: true };
    }

    if (data.length < FETCH_PAGE) break;
  }

  console.log(`[sync] done processed=${processed} updated=${updated} in ${Math.round((Date.now()-startedAt)/1000)}s`);
  return { processed, updated, continued: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    let body: any = {};
    try { body = await req.json(); } catch {}
    const priorityIds: string[] = Array.isArray(body?.priorityIds) ? body.priorityIds : [];
    const force: boolean = !!body?.force;
    // Accept either explicit ownerSenders[] or legacy ownerEmail (string)
    let ownerSenders: string[] | null = Array.isArray(body?.ownerSenders)
      ? body.ownerSenders.map((s: any) => String(s).toLowerCase().trim()).filter(Boolean)
      : null;
    if (!ownerSenders && body?.ownerEmail) {
      ownerSenders = ownerSendersFor(String(body.ownerEmail));
    }

    // @ts-ignore EdgeRuntime
    (globalThis as any).EdgeRuntime?.waitUntil(runSync(priorityIds, force, ownerSenders));

    return new Response(JSON.stringify({ ok: true, started: true, priorityIds: priorityIds.length, ownerSenders }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
