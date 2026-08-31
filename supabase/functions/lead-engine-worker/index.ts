// Lead engine worker — one tick of the discovery loop.
// Invoked every minute by pg_cron (lead-engine-tick) and on demand from the UI.
//
// Tick order:
//   lock → recover leases → target check → refill frontier
//   → search jobs (search.list + channels.list qualification)
//   → contact jobs (quota-free scraping, bulk upserts, calling_leads flow)
//   → yield/market stats + adaptive priority → unlock

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  svc, workerId, getSettings, pauseEngine, ytApi, allProjectsExhausted,
  scoreChannel, commercialIntent, monetizationLikelihood, normalizePhone, classifyPhone,
  normalizeEmail, normalizeQuery, searchSignature, pageFingerprint, cors, json, type Sb,
} from "../_shared/engine.ts";
import { extractChannelContacts } from "../_shared/channelContact.ts";

const LOCK = "lead-engine-worker";

const NICHE_SEED = [
  "digital marketing agency", "real estate agent", "fitness coach", "business coach",
  "dentist clinic", "law firm", "interior designer", "wedding photographer",
  "travel agency", "online course creator", "ecommerce store owner", "restaurant owner",
  "personal finance advisor", "yoga studio", "salon and spa", "car dealership",
  "immigration consultant", "study abroad consultant", "stock market trainer", "startup founder",
];

const INTENTS: Record<string, string[]> = {
  channel: ["{n}"],
  commercial: ["{n} business enquiry", "{n} contact number"],
  creator: ["{n} channel", "best {n} youtuber"],
  video: ["{n} tips", "{n} services"],
  scale: ["{n} near me", "{n} 2026"],
};

type Ctx = { sb: Sb; worker: string; cfg: any; log: string[] };

// ───────────────────────────────────────────────── frontier

async function refillFrontier(ctx: Ctx) {
  const { sb, cfg } = ctx;
  const { count: queued } = await sb.from("discovery_jobs")
    .select("id", { count: "exact", head: true })
    .eq("job_type", "search").in("status", ["queued", "retry"]);
  if ((queued || 0) >= 20) return;

  const niches: string[] = (cfg.niches?.length ? cfg.niches : NICHE_SEED);
  const markets = cfg.markets as { region: string; language: string }[];
  const strategies: string[] = cfg.strategies;
  const orders: string[] = cfg.orders;

  const rows: any[] = [];
  for (const niche of niches) {
    for (const market of markets) {
      for (const strategy of strategies) {
        for (const tmpl of INTENTS[strategy] || ["{n}"]) {
          const query = tmpl.replace("{n}", niche);
          for (const order of orders) {
            const sig = searchSignature({
              query, region: market.region, language: market.language, order, strategy,
            });
            rows.push({
              search_signature: sig, niche, query, normalized_query: normalizeQuery(query),
              intent: strategy, region_code: market.region, language: market.language,
              order_type: order, strategy, status: "new",
              priority: 50 + (strategy === "commercial" ? 20 : 0) + (order === "relevance" ? 5 : 0),
            });
          }
        }
      }
    }
  }
  // chunked idempotent insert — search_signature is UNIQUE
  for (let i = 0; i < rows.length; i += 500) {
    await sb.from("search_segments").upsert(rows.slice(i, i + 500), { onConflict: "search_signature", ignoreDuplicates: true });
  }

  // enqueue jobs for the highest-priority open segments
  const { data: segs } = await sb.from("search_segments")
    .select("id,priority,search_signature,page_token")
    .in("status", ["new", "active", "productive"])
    .order("priority", { ascending: false })
    .order("last_searched_at", { ascending: true, nullsFirst: true })
    .limit(40);

  const jobs = (segs || []).map((s: any) => ({
    job_type: "search",
    priority: s.priority,
    payload: { segment_id: s.id },
    dedupe_key: `search:${pageFingerprint(s.search_signature, s.page_token)}`,
  }));
  if (jobs.length) {
    await sb.from("discovery_jobs").upsert(jobs, { onConflict: "dedupe_key", ignoreDuplicates: true });
  }
  ctx.log.push(`frontier refilled: ${rows.length} segments known, ${jobs.length} search jobs queued`);
}

// ───────────────────────────────────────────────── search job

async function finishJob(sb: Sb, id: string, ok: boolean, error?: string, retryInSec = 0) {
  if (ok) {
    await sb.from("discovery_jobs").update({ status: "completed", completed_at: new Date().toISOString(), last_error: null }).eq("id", id);
  } else if (retryInSec > 0) {
    await sb.from("discovery_jobs").update({
      status: "retry", last_error: error?.slice(0, 500) ?? null,
      worker_id: null, locked_at: null, lock_expires_at: null,
      next_run_at: new Date(Date.now() + retryInSec * 1000).toISOString(),
    }).eq("id", id);
  } else {
    await sb.from("discovery_jobs").update({ status: "failed", last_error: error?.slice(0, 500) ?? null, completed_at: new Date().toISOString() }).eq("id", id);
  }
}

async function runSearchJob(ctx: Ctx, job: any): Promise<{ exhausted?: boolean }> {
  const { sb, cfg, worker } = ctx;
  const segId = job.payload?.segment_id;
  const { data: seg } = await sb.from("search_segments").select("*").eq("id", segId).maybeSingle();
  if (!seg) { await finishJob(sb, job.id, true); return {}; }

  const fingerprint = pageFingerprint(seg.search_signature, seg.page_token);
  const { data: sj, error: sjErr } = await sb.from("search_jobs").insert({
    segment_id: seg.id, search_signature: seg.search_signature, page_fingerprint: fingerprint,
    query: seg.query, region_code: seg.region_code, language: seg.language,
    order_type: seg.order_type, strategy: seg.strategy, page_token: seg.page_token,
  }).select("id").maybeSingle();
  if (sjErr) {
    // page already executed — never repeat a search
    ctx.log.push(`skip duplicate page ${fingerprint}`);
    await finishJob(sb, job.id, true);
    return {};
  }

  const isVideo = seg.strategy === "video";
  const res = await ytApi(sb, "search", {
    part: "snippet",
    q: seg.query,
    type: isVideo ? "video" : "channel",
    maxResults: 50,
    order: seg.order_type,
    regionCode: seg.region_code || undefined,
    relevanceLanguage: seg.language || undefined,
    pageToken: seg.page_token || undefined,
  }, { search: 1, units: 100 }, { worker, jobId: job.id, signature: seg.search_signature });

  if (!res.ok) {
    await sb.from("search_jobs").update({ status: "failed", last_error: res.error, completed_at: new Date().toISOString() }).eq("id", sj!.id);
    await sb.from("search_segments").update({ error_count: seg.error_count + 1, last_error: res.error }).eq("id", seg.id);
    if (res.quotaExhausted) { await finishJob(sb, job.id, false, res.error, 1800); return { exhausted: true }; }
    await finishJob(sb, job.id, false, res.error, 600);
    return {};
  }

  const items = res.body?.items || [];
  const ids: string[] = Array.from(new Set(items
    .map((it: any) => (isVideo ? it.snippet?.channelId : it.id?.channelId))
    .filter((v: any) => typeof v === "string" && /^UC[\w-]{22}$/.test(v))));
  const nextToken: string | null = res.body?.nextPageToken || null;

  let qualified = 0;
  let unique = 0;
  let duplicates = 0;

  if (ids.length) {
    const { data: known } = await sb.from("youtube_channels").select("channel_id").in("channel_id", ids);
    const knownSet = new Set((known || []).map((k: any) => k.channel_id));
    duplicates = knownSet.size;
    unique = ids.length - duplicates;

    const det = await ytApi(sb, "channels", {
      part: "snippet,statistics,contentDetails",
      id: ids.join(","),
      maxResults: 50,
    }, { search: 0, units: 1 }, { worker, jobId: job.id, signature: seg.search_signature });

    if (det.ok) {
      const minSubs = Number(cfg.minSubscribers || 0);
      const minScore = Number(cfg.minLeadScore || 0);
      const upserts: any[] = [];
      const sources: any[] = [];
      const contactJobs: any[] = [];

      for (const c of det.body?.items || []) {
        const subs = Number(c.statistics?.subscriberCount || 0);
        const views = Number(c.statistics?.viewCount || 0);
        const videos = Number(c.statistics?.videoCount || 0);
        const input = {
          channel_id: c.id,
          title: c.snippet?.title || "",
          description: c.snippet?.description || "",
          subscriber_count: subs, total_views: views, video_count: videos,
          channel_created_at: c.snippet?.publishedAt || null,
          country: c.snippet?.country || null,
        };
        const sc = scoreChannel(input, cfg.weights);
        const passes = subs >= minSubs && sc.score >= minScore;
        upserts.push({
          channel_id: c.id,
          title: input.title,
          url: `https://www.youtube.com/channel/${c.id}`,
          custom_url: c.snippet?.customUrl || null,
          description: (input.description || "").slice(0, 4000),
          thumbnail: c.snippet?.thumbnails?.medium?.url || c.snippet?.thumbnails?.default?.url || null,
          subscriber_count: subs, total_views: views, video_count: videos,
          country: input.country, language: seg.language || null,
          channel_created_at: input.channel_created_at,
          commercial_intent_score: commercialIntent(input),
          monetization_likelihood: monetizationLikelihood(input),
          lead_score: sc.score, priority_band: sc.band,
          qualification_status: passes ? "qualified" : "rejected",
          last_seen_at: new Date().toISOString(),
          last_enriched_at: new Date().toISOString(),
        });
        sources.push({
          channel_id: c.id, keyword: seg.query, search_signature: seg.search_signature,
          region: seg.region_code, language: seg.language, discovery_strategy: seg.strategy,
        });
        if (passes && !knownSet.has(c.id)) {
          qualified++;
          contactJobs.push({
            job_type: "contact",
            priority: sc.score,
            payload: { channel_id: c.id, custom_url: c.snippet?.customUrl || "", keyword: seg.query, band: sc.band },
            dedupe_key: `contact:${c.id}`,
          });
        }
      }

      if (upserts.length) await sb.from("youtube_channels").upsert(upserts, { onConflict: "channel_id" });
      if (sources.length) await sb.from("youtube_channel_sources").upsert(sources, { onConflict: "channel_id,search_signature", ignoreDuplicates: true });
      if (contactJobs.length) await sb.from("discovery_jobs").upsert(contactJobs, { onConflict: "dedupe_key", ignoreDuplicates: true });
    }
  }

  const pages = seg.pages_completed + 1;
  const yieldRate = ids.length ? qualified / ids.length : 0;
  const status = !nextToken ? "exhausted" : yieldRate >= 0.25 ? "productive" : yieldRate <= 0.05 && pages >= 3 ? "low_yield" : "active";
  const priority = Math.max(5, Math.min(100, seg.priority + (yieldRate >= 0.25 ? 8 : yieldRate <= 0.05 ? -12 : -2)));

  await sb.from("search_segments").update({
    page_token: nextToken, pages_completed: pages,
    channels_found: seg.channels_found + ids.length,
    unique_channels: seg.unique_channels + unique,
    qualified_channels: seg.qualified_channels + qualified,
    duplicate_count: seg.duplicate_count + duplicates,
    quota_cost: seg.quota_cost + 101,
    status, priority, last_searched_at: new Date().toISOString(), last_error: null,
  }).eq("id", seg.id);

  await sb.from("search_jobs").update({
    status: "completed", channels_discovered: ids.length, quota_cost: 101,
    completed_at: new Date().toISOString(),
  }).eq("id", sj!.id);

  await bumpMarket(sb, seg, { unique, qualified, quota: 101 });
  await finishJob(sb, job.id, true);
  ctx.log.push(`search "${seg.query}" [${seg.region_code}/${seg.order_type}] → ${ids.length} channels, ${unique} new, ${qualified} qualified`);
  return {};
}

async function bumpMarket(sb: Sb, seg: any, d: { unique: number; qualified: number; quota: number; contacts?: number; phones?: number }) {
  const key = { region: seg.region_code || "", language: seg.language || "", niche: seg.niche || "" };
  const { data: cur } = await sb.from("market_performance").select("*")
    .eq("region", key.region).eq("language", key.language).eq("niche", key.niche).maybeSingle();
  const searches = (cur?.searches || 0) + 1;
  const unique_channels = (cur?.unique_channels || 0) + d.unique;
  const qualified_leads = (cur?.qualified_leads || 0) + d.qualified;
  const contacts = (cur?.contacts || 0) + (d.contacts || 0);
  const phones = (cur?.phones || 0) + (d.phones || 0);
  await sb.from("market_performance").upsert({
    ...key, searches, unique_channels, qualified_leads, contacts, phones,
    quota_cost: (cur?.quota_cost || 0) + d.quota,
    lead_yield: searches ? qualified_leads / searches : 0,
    contact_yield: qualified_leads ? phones / qualified_leads : 0,
    status: "active", last_searched_at: new Date().toISOString(),
  }, { onConflict: "region,language,niche" });
}

// ───────────────────────────────────────────────── contact job

async function runContactJob(ctx: Ctx, job: any) {
  const { sb } = ctx;
  const channelId = job.payload?.channel_id;
  if (!channelId) { await finishJob(sb, job.id, true); return; }

  const { data: ch } = await sb.from("youtube_channels").select("*").eq("channel_id", channelId).maybeSingle();
  if (!ch) { await finishJob(sb, job.id, true); return; }

  await sb.from("youtube_channels").update({ qualification_status: "processing", attempts: (ch.attempts || 0) + 1 }).eq("channel_id", channelId);

  let found = 0;
  let phoneSaved: string | null = null;
  try {
    const { contacts } = await extractChannelContacts(channelId, ch.custom_url || job.payload?.custom_url || "", { deep: ch.lead_score >= 60 });
    for (const hit of contacts) {
      if (hit.type === "phone") {
        const norm = normalizePhone(hit.value);
        if (!norm) continue;
        const row = {
          channel_id: channelId, contact_type: "phone", contact_value: hit.value,
          normalized_value: norm.normalized, phone_class: classifyPhone(norm.normalized, hit.context),
          country_code: norm.country, confidence: hit.sourceType === "about" ? 85 : hit.sourceType === "website" ? 70 : 60,
          source_url: hit.sourceUrl, source_type: hit.sourceType,
        };
        const { data: ins, error } = await sb.from("lead_contacts").insert(row).select("id").maybeSingle();
        if (ins?.id) {
          found++; phoneSaved = norm.normalized;
          await sb.from("lead_contact_links").upsert({ contact_id: ins.id, channel_id: channelId }, { onConflict: "contact_id,channel_id", ignoreDuplicates: true });
        } else if (error && /duplicate|23505/i.test(`${error.code} ${error.message}`)) {
          // same phone already known — record the relationship instead of a new row
          const { data: existing } = await sb.from("lead_contacts").select("id")
            .eq("contact_type", "phone").eq("normalized_value", norm.normalized).maybeSingle();
          if (existing?.id) {
            await sb.from("lead_contact_links").upsert({ contact_id: existing.id, channel_id: channelId }, { onConflict: "contact_id,channel_id", ignoreDuplicates: true });
          }
          phoneSaved = phoneSaved || norm.normalized;
        }
      } else {
        const value = hit.type === "email" ? normalizeEmail(hit.value) : hit.value;
        await sb.from("lead_contacts").upsert({
          channel_id: channelId, contact_type: hit.type, contact_value: hit.value,
          normalized_value: value, confidence: 60, source_url: hit.sourceUrl, source_type: hit.sourceType,
        }, { onConflict: "channel_id,contact_type,normalized_value", ignoreDuplicates: true });
        found++;
      }
    }
  } catch (e) {
    await sb.from("youtube_channels").update({ qualification_status: "retry", last_error: String((e as Error).message).slice(0, 400) }).eq("channel_id", channelId);
    await finishJob(sb, job.id, false, (e as Error).message, 900);
    return;
  }

  const rescored = scoreChannel({
    channel_id: channelId, title: ch.title, description: ch.description,
    subscriber_count: ch.subscriber_count, total_views: ch.total_views, video_count: ch.video_count,
    hasContact: !!phoneSaved,
  }, ctx.cfg.weights);

  await sb.from("youtube_channels").update({
    qualification_status: phoneSaved ? "contact_found" : found ? "enriched" : "qualified",
    lead_score: rescored.score, priority_band: rescored.band,
    last_enriched_at: new Date().toISOString(), last_error: null,
  }).eq("channel_id", channelId);

  // Push phone leads straight into the calling list
  if (phoneSaved) {
    await sb.from("calling_leads").upsert({
      channel_id: channelId,
      channel_name: ch.title,
      channel_link: ch.url || `https://www.youtube.com/channel/${channelId}`,
      thumbnail: ch.thumbnail,
      phone: phoneSaved,
      subscribers: ch.subscriber_count || 0,
      total_views: ch.total_views || 0,
      country: ch.country,
      keyword: job.payload?.keyword || "",
      source: "lead-engine",
      call_status: "new",
    }, { onConflict: "channel_link", ignoreDuplicates: true });
  }

  await finishJob(sb, job.id, true);
  ctx.log.push(`contact ${ch.title || channelId} → ${phoneSaved ? phoneSaved : found ? `${found} contacts` : "none"}`);
}

// ───────────────────────────────────────────────── tick

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = svc();
  const worker = workerId();
  const log: string[] = [];

  try {
    const { data: gotLock } = await sb.rpc("acquire_engine_lock", { _name: LOCK, _worker: worker, _seconds: 110 });
    if (!gotLock) return json({ ok: true, skipped: "another worker holds the lock" });

    const { data: recovered } = await sb.rpc("recover_expired_jobs");
    if (recovered) log.push(`recovered ${recovered} expired job lease(s)`);

    const settings = await getSettings(sb);
    const cfg = settings.config;
    const ctx: Ctx = { sb, worker, cfg, log };

    let body: any = {};
    try { body = await req.json(); } catch { /* cron sends no body */ }
    const manual = !!body?.manual || body?.source === "manual";

    if (!settings.autopilot && !manual) {
      await sb.rpc("release_engine_lock", { _name: LOCK, _worker: worker });
      return json({ ok: true, idle: true, reason: settings.paused_reason || "autopilot off" });
    }

    // target check
    const { count: leadCount } = await sb.from("youtube_channels")
      .select("channel_id", { count: "exact", head: true }).eq("qualification_status", "contact_found");
    if ((leadCount || 0) >= settings.target_leads) {
      await pauseEngine(sb, `target of ${settings.target_leads} leads reached`);
      await sb.rpc("release_engine_lock", { _name: LOCK, _worker: worker });
      return json({ ok: true, paused: "target reached", leads: leadCount });
    }

    await refillFrontier(ctx);

    // search jobs
    let exhausted = false;
    const { data: searchJobs } = await sb.rpc("claim_jobs", {
      _worker: worker, _job_type: "search",
      _limit: Number(cfg.maxSearchJobsPerTick || 2), _lease_seconds: 180,
    });
    for (const job of searchJobs || []) {
      const r = await runSearchJob(ctx, job);
      if (r.exhausted) { exhausted = true; break; }
    }

    if (exhausted && await allProjectsExhausted(sb)) {
      await pauseEngine(sb, "all YouTube API projects are out of daily quota — resumes after the Pacific-midnight reset");
      log.push("autopilot paused: every API project is exhausted");
    }

    // contact jobs (quota-free, run concurrently)
    const { data: contactJobs } = await sb.rpc("claim_jobs", {
      _worker: worker, _job_type: "contact",
      _limit: Number(cfg.maxContactJobsPerTick || 12), _lease_seconds: 240,
    });
    const queue = [...(contactJobs || [])];
    const lanes = Math.min(Number(cfg.contactConcurrency || 6), Math.max(1, queue.length));
    await Promise.all(Array.from({ length: lanes }, async () => {
      while (queue.length) {
        const job = queue.shift();
        if (!job) break;
        try { await runContactJob(ctx, job); }
        catch (e) { await finishJob(sb, job.id, false, (e as Error).message, 900); }
      }
    }));

    await sb.rpc("release_engine_lock", { _name: LOCK, _worker: worker });
    return json({
      ok: true,
      worker,
      leads: leadCount || 0,
      target: settings.target_leads,
      searchJobs: (searchJobs || []).length,
      contactJobs: (contactJobs || []).length,
      log,
    });
  } catch (e) {
    console.error("tick failed", e);
    try { await sb.rpc("release_engine_lock", { _name: LOCK, _worker: worker }); } catch { /* ignore */ }
    return json({ ok: false, error: (e as Error).message, stack: (e as Error).stack, log }, 500);
  }
});
