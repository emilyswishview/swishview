// Shared runtime for the YouTube lead-discovery engine.
//
// Provides:
//   • service-role Supabase client
//   • quota-aware YouTube API router across the 7 API projects
//     (reserve → call → classify 403/429 → mark exhausted/cooldown → next project)
//   • lead scoring / qualification
//   • contact normalization + classification
//
// Schema lives in scripts/lead_engine.sql.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { YOUTUBE_API_KEYS as FILE_KEYS } from "./ytKeyList.ts";

export type Sb = SupabaseClient<any, "public", any>;

export const SEARCH_COST = 100;
export const LIST_COST = 1;

export function svc(): Sb {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function workerId(): string {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Resolve an api project's key from env, with sensible fallbacks. */
export function apiKeyFor(secretName: string): string {
  const direct = Deno.env.get(secretName);
  if (direct && direct.trim()) return direct.trim();
  // YOUTUBE_API_KEY_1 falls back to the legacy YOUTUBE_API_KEY secret
  if (/_1$/.test(secretName)) {
    const legacy = Deno.env.get("YOUTUBE_API_KEY");
    if (legacy && legacy.trim()) return legacy.trim();
  }
  // Final fallback: the checked-in key list (YOUTUBE_API_KEY_<n> → nth key).
  const m = /_(\d+)$/.exec(secretName);
  if (m) {
    const k = FILE_KEYS[Number(m[1]) - 1];
    if (k && k.trim()) return k.trim();
  }
  return "";
}


export type EngineSettings = {
  autopilot: boolean;
  paused_reason: string | null;
  target_leads: number;
  config: Record<string, any>;
};

const DEFAULT_CONFIG = {
  niches: [] as string[],
  markets: [{ region: "US", language: "en" }],
  strategies: ["channel", "video", "commercial", "creator", "scale"],
  orders: ["relevance", "viewCount"],
  minSubscribers: 1000,
  minRecentViews: 0,
  minLeadScore: 25,
  maxSearchJobsPerTick: 2,
  maxContactJobsPerTick: 12,
  contactConcurrency: 6,
  weights: { audience: 25, activity: 20, views: 20, commercial: 15, contact: 10, monetization: 10 },
};

export async function getSettings(sb: Sb): Promise<EngineSettings> {
  const { data } = await sb.from("engine_settings").select("*").eq("id", 1).maybeSingle();
  const cfg = { ...DEFAULT_CONFIG, ...(data?.config || {}) };
  if (!Array.isArray(cfg.markets) || !cfg.markets.length) cfg.markets = DEFAULT_CONFIG.markets;
  return {
    autopilot: !!data?.autopilot,
    paused_reason: data?.paused_reason ?? null,
    target_leads: Number(data?.target_leads || 20000),
    config: cfg,
  };
}

export async function pauseEngine(sb: Sb, reason: string) {
  await sb.from("engine_settings")
    .update({ autopilot: false, paused_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", 1);
}

// ───────────────────────────────────────────────── quota-aware API router

type CallResult = { ok: boolean; status: number; body: any; error?: string; projectId?: string };

function classify(status: number, body: any): "daily" | "rate" | "key" | "other" {
  const reasons = (body?.error?.errors || []).map((e: any) => String(e.reason || ""));
  const msg = String(body?.error?.message || "");
  if (reasons.some((r: string) => /quotaExceeded|dailyLimitExceeded/i.test(r))) return "daily";
  if (status === 429 || reasons.some((r: string) => /rateLimitExceeded|userRateLimitExceeded/i.test(r))) return "rate";
  if (reasons.some((r: string) => /keyInvalid|keyExpired|ipRefererBlocked|accessNotConfigured/i.test(r))) return "key";
  if (status === 403 && /quota/i.test(msg)) return "daily";
  if (status === 400 || status === 403) return "key";
  return "other";
}

export type QuotaState = { exhausted: boolean };

/**
 * Call a YouTube Data API endpoint through the quota router.
 * `cost.search` counts search.list calls, `cost.units` counts read units.
 */
export async function ytApi(
  sb: Sb,
  endpoint: string,
  params: Record<string, string | number | undefined>,
  cost: { search: number; units: number },
  meta: { worker: string; jobId?: string; signature?: string; channelId?: string } = { worker: "" },
): Promise<CallResult & { quotaExhausted?: boolean }> {
  let attempts = 0;
  let lastErr = "";
  let sawExhaustion = false;

  while (attempts < 8) {
    attempts++;
    const { data: reserved, error: rErr } = await sb.rpc("reserve_api_quota", {
      _search_calls: cost.search,
      _read_units: cost.units,
    });
    if (rErr) return { ok: false, status: 0, body: null, error: rErr.message };
    const slot = Array.isArray(reserved) ? reserved[0] : reserved;
    if (!slot?.project_id) {
      return { ok: false, status: 429, body: null, error: lastErr || "no API quota available", quotaExhausted: true };
    }

    const key = apiKeyFor(slot.secret_name);
    if (!key) {
      await sb.rpc("release_api_quota", { _project: slot.project_id, _search_calls: cost.search, _read_units: cost.units });
      await sb.rpc("mark_api_project", { _project: slot.project_id, _status: "error", _cooldown_seconds: 3600 });
      lastErr = `missing secret ${slot.secret_name}`;
      continue;
    }

    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    qs.set("key", key);
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${qs.toString()}`;

    const t0 = Date.now();
    let status = 0;
    let body: any = null;
    try {
      const r = await fetch(url);
      status = r.status;
      body = await r.json().catch(() => ({}));
    } catch (e) {
      lastErr = (e as Error).message;
    }

    const logUsage = (success: boolean, error?: string) =>
      sb.from("api_usage").insert({
        project_id: slot.project_id,
        endpoint,
        quota_cost: cost.units,
        success,
        error: error ?? null,
        job_id: meta.jobId ?? null,
        search_signature: meta.signature ?? null,
        channel_id: meta.channelId ?? null,
        duration_ms: Date.now() - t0,
        worker_id: meta.worker || null,
      });

    if (status >= 200 && status < 300 && body) {
      await Promise.all([
        logUsage(true),
        sb.rpc("mark_api_project", { _project: slot.project_id, _status: "healthy", _cooldown_seconds: 0 }),
      ]);
      return { ok: true, status, body, projectId: slot.project_id };
    }

    const kind = status ? classify(status, body) : "other";
    lastErr = body?.error?.message || lastErr || `HTTP ${status}`;
    await logUsage(false, lastErr);
    // refund the reservation — the call did not consume real quota when it failed early
    if (kind !== "daily") {
      await sb.rpc("release_api_quota", { _project: slot.project_id, _search_calls: cost.search, _read_units: cost.units });
    }

    if (kind === "daily") {
      sawExhaustion = true;
      await sb.rpc("mark_api_project", { _project: slot.project_id, _status: "exhausted", _cooldown_seconds: 0 });
      continue;
    }
    if (kind === "rate") {
      await sb.rpc("mark_api_project", { _project: slot.project_id, _status: "cooling", _cooldown_seconds: 120 });
      continue;
    }
    if (kind === "key") {
      await sb.rpc("mark_api_project", { _project: slot.project_id, _status: "error", _cooldown_seconds: 900 });
      // A 400 is usually a bad request, not a bad key — do not burn every project.
      if (status === 400) return { ok: false, status, body, error: lastErr };
      continue;
    }
    // transient/network — try again with another project
  }

  return { ok: false, status: 0, body: null, error: lastErr || "api router exhausted", quotaExhausted: sawExhaustion };
}

/** True when every enabled project is out of quota for the day. */
export async function allProjectsExhausted(sb: Sb): Promise<boolean> {
  const { data } = await sb.from("youtube_api_projects").select("enabled,health_status,search_calls_used,search_calls_limit").eq("enabled", true);
  if (!data?.length) return true;
  return data.every((p: any) => p.health_status === "exhausted" || p.search_calls_used >= p.search_calls_limit);
}

// ───────────────────────────────────────────────── scoring

const COMMERCIAL_RE =
  /(business|enquir|inquir|contact|book(ing)?|sponsor|collab|brand|agency|course|coaching|consult|shop|store|buy|order|price|pricing|hire|service|clinic|academy|studio|marketing|whatsapp|call us|dm for)/i;

export type ChannelInput = {
  channel_id: string;
  title?: string;
  description?: string;
  subscriber_count?: number;
  total_views?: number;
  video_count?: number;
  last_upload_at?: string | null;
  channel_created_at?: string | null;
  country?: string | null;
  hasContact?: boolean;
};

export function commercialIntent(ch: ChannelInput): number {
  const text = `${ch.title || ""}\n${ch.description || ""}`;
  const hits = (text.match(COMMERCIAL_RE) || []).length;
  const distinct = new Set((text.toLowerCase().match(COMMERCIAL_RE) || []).map((s) => s.toLowerCase())).size;
  return Math.min(100, hits * 12 + distinct * 8);
}

export function monetizationLikelihood(ch: ChannelInput): "High" | "Medium" | "Low" {
  const subs = ch.subscriber_count || 0;
  const views = ch.total_views || 0;
  if (subs >= 100_000 || views >= 10_000_000) return "High";
  if (subs >= 10_000 || views >= 500_000) return "Medium";
  return "Low";
}

export function scoreChannel(ch: ChannelInput, weights: Record<string, number>) {
  const w = { audience: 25, activity: 20, views: 20, commercial: 15, contact: 10, monetization: 10, ...(weights || {}) };
  const subs = ch.subscriber_count || 0;
  const views = ch.total_views || 0;
  const videos = ch.video_count || 0;

  const audience = Math.min(1, Math.log10(Math.max(subs, 1)) / 6);          // 1M subs ⇒ 1
  const viewScore = Math.min(1, Math.log10(Math.max(views, 1)) / 8);        // 100M views ⇒ 1
  const daysSinceUpload = ch.last_upload_at
    ? (Date.now() - new Date(ch.last_upload_at).getTime()) / 86_400_000
    : 400;
  const activity = daysSinceUpload <= 14 ? 1 : daysSinceUpload <= 45 ? 0.75 : daysSinceUpload <= 120 ? 0.4 : daysSinceUpload <= 365 ? 0.15 : 0;
  const volume = Math.min(1, videos / 200);
  const commercial = commercialIntent(ch) / 100;
  const contact = ch.hasContact ? 1 : 0;
  const mon = monetizationLikelihood(ch);
  const monScore = mon === "High" ? 1 : mon === "Medium" ? 0.6 : 0.2;

  const raw =
    audience * w.audience +
    activity * (w.activity * 0.75) + volume * (w.activity * 0.25) +
    viewScore * w.views +
    commercial * w.commercial +
    contact * w.contact +
    monScore * w.monetization;

  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const band = score >= 80 ? "A+" : score >= 65 ? "A" : score >= 50 ? "B" : score >= 35 ? "C" : "D";
  return { score, band, commercial: commercialIntent(ch), monetization: mon };
}

// ───────────────────────────────────────────────── contacts

const CALLING_CODES = ["1", "7", "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49",
  "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86", "90", "91", "92", "93",
  "94", "95", "98", "212", "213", "216", "218", "220", "233", "234", "249", "251", "254", "255", "256", "260", "263", "351", "352", "353",
  "354", "355", "358", "359", "370", "371", "372", "380", "381", "385", "386", "420", "421", "852", "853", "855", "856", "880", "886",
  "960", "961", "962", "963", "964", "965", "966", "968", "971", "972", "973", "974", "975", "976", "977", "992", "994", "995", "998"];

export function normalizePhone(raw: string, hintCountryCode?: string): { normalized: string; country: string | null } | null {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return null;
  const hadPlus = String(raw).trim().startsWith("+");
  if (!hadPlus && d.length > 10 && d.startsWith("00")) d = d.slice(2);
  if (d.length < 8 || d.length > 15) return null;
  if (/^(\d)\1+$/.test(d)) return null;

  let e164 = hadPlus || d.length > 11 ? d : null;
  if (!e164 && hintCountryCode) e164 = `${hintCountryCode}${d.replace(/^0+/, "")}`;
  if (!e164) e164 = d;

  const cc = CALLING_CODES
    .filter((c) => e164!.startsWith(c))
    .sort((a, b) => b.length - a.length)[0] || null;

  return { normalized: `+${e164}`, country: cc };
}

export function classifyPhone(normalized: string, context: string): "business" | "mobile" | "office" | "unknown" {
  const ctx = (context || "").toLowerCase();
  if (/whatsapp|wa\.me|mobile|cell/.test(ctx)) return "mobile";
  if (/office|landline|reception|hotline|helpline/.test(ctx)) return "office";
  if (/business|enquir|inquir|booking|sales|support|contact/.test(ctx)) return "business";
  return "unknown";
}

export function normalizeEmail(v: string): string {
  return String(v || "").trim().toLowerCase();
}

export function normalizeQuery(q: string): string {
  return String(q || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function searchSignature(parts: {
  query: string; region: string; language: string; order: string; strategy: string;
}): string {
  return [normalizeQuery(parts.query), parts.region || "-", parts.language || "-", parts.order, parts.strategy].join("|");
}

export function pageFingerprint(signature: string, pageToken: string | null): string {
  return `${signature}#${pageToken || "p0"}`;
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
