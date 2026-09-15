// Bulk phone-number discovery for /prospects.
//
// Walks every prospect row that does not yet have a phone number and tries to
// find one from the channel's YouTube data (description, keywords, recent
// video descriptions, About-page scrape). When nothing is found the column is
// set to "NONE" so the row is not retried forever.
//
// Self-chunking: when the wall-clock budget is used up it re-invokes itself so
// the whole database gets processed across multiple invocations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CONCURRENCY = 10;
const MAX_WALL_MS = 90_000;
const FETCH_PAGE = 300;
const YT_TIMEOUT_MS = 45_000;

async function runPool<T>(items: T[], worker: (it: T) => Promise<any>, concurrency: number) {
  let idx = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (idx < items.length) {
        const i = idx++;
        try { await worker(items[i]); } catch {}
      }
    }),
  );
}

function hasPhone(data: any): boolean {
  const p = String(data?.phone || "").trim();
  return !!p; // "NONE" counts as processed
}

async function findPhone(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), YT_TIMEOUT_MS);
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/youtube-channel-info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "apikey": SERVICE_ROLE,
      },
      body: JSON.stringify({ channelUrl: url, includeVideos: true, maxVideos: 6, phoneOnly: true }),
      signal: ctrl.signal,
    });
    if (!resp.ok) return "";
    const yt = await resp.json().catch(() => null);
    if (!yt || yt.error) return "";
    return String(yt.phone || "").trim();
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

async function selfInvoke(force: boolean, ownerSenders: string[] | null) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/prospects-find-phones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "apikey": SERVICE_ROLE,
      },
      body: JSON.stringify({ continuation: true, force, ownerSenders }),
    });
  } catch (e) {
    console.error("selfInvoke failed", e);
  }
}

async function run(force: boolean, ownerSenders: string[] | null) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = Date.now();
  let scanned = 0;
  let found = 0;
  let none = 0;

  while (true) {
    if (Date.now() - startedAt > MAX_WALL_MS) {
      console.log(`[phones] wall-time reached scanned=${scanned} found=${found} none=${none}; continuing`);
      await selfInvoke(force, ownerSenders);
      return { scanned, found, none, continued: true };
    }

    let q: any = supabase
      .from("prospects")
      .select("id,data,channel_link,assigned_sender")
      .neq("channel_link", "")
      .not("channel_link", "is", null)
      .eq("is_banned", false)
      .limit(FETCH_PAGE);
    if (ownerSenders?.length) q = q.in("assigned_sender", ownerSenders);
    if (!force) q = q.or("data->>phone.is.null,data->>phone.eq.");

    const { data: rows, error } = await q;
    if (error) { console.error("[phones] fetch failed", error); break; }
    if (!rows?.length) break;

    const todo = force ? rows : rows.filter((r: any) => !hasPhone(r.data));
    if (!todo.length) break;

    await runPool(todo, async (row: any) => {
      const url = row.data?.channelLink || row.channel_link || "";
      scanned++;
      const phone = url ? await findPhone(url) : "";
      if (phone) found++; else none++;
      await supabase
        .from("prospects")
        .update({
          data: {
            ...(row.data || {}),
            phone: phone || "NONE",
            phoneCheckedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
        .eq("id", row.id);
    }, CONCURRENCY);

    if (force) break; // forced re-scan handles one page per invocation
  }

  console.log(`[phones] done scanned=${scanned} found=${found} none=${none}`);
  return { scanned, found, none, continued: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    let body: any = {};
    try { body = await req.json(); } catch {}
    const force = !!body?.force;
    const ownerSenders: string[] | null = Array.isArray(body?.ownerSenders)
      ? body.ownerSenders.map((s: any) => String(s).toLowerCase().trim()).filter(Boolean)
      : null;

    // @ts-ignore EdgeRuntime
    (globalThis as any).EdgeRuntime?.waitUntil(run(force, ownerSenders));

    return new Response(JSON.stringify({ ok: true, started: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
