// Multi-project YouTube Data API key pool with smart, polite rotation.
//
// Where keys come from (all merged, de-duplicated, blanks ignored):
//   1. supabase/functions/_shared/ytKeyList.ts  ← just paste keys in that file
//   2. YOUTUBE_API_KEY               (primary secret)
//   3. YOUTUBE_API_KEY_2 ... _20     (extra project secrets)
//   4. YOUTUBE_API_KEYS              (comma/newline separated list)
//
// Rotation strategy (ytFetch):
//   • Least-recently-used first, so load is spread evenly instead of hammering
//     key #1 until it dies (that's what gets projects flagged).
//   • Per-key minimum spacing + tiny jitter → no burst from a single key.
//   • dailyLimit/quotaExceeded  → key parked until next Pacific midnight reset.
//   • rateLimitExceeded / 429   → short exponential cooldown (30s → 8min),
//     the key is reused afterwards instead of being written off.
//   • 5xx / network errors      → one retry on the same key, then next key.

import { YOUTUBE_API_KEYS as FILE_KEYS } from "./ytKeyList.ts";

type KeyState = {
  key: string;
  lastUsed: number;   // epoch ms
  cooldownUntil: number; // epoch ms — not usable before this
  softFails: number;  // consecutive rate-limit hits
  parked: boolean;    // daily quota exhausted
};

// Module-level memory survives across requests while the isolate is warm.
const states = new Map<string, KeyState>();

// Minimum gap between two calls made with the SAME key (ms). Keeps a single
// project from looking like a burst scraper.
const MIN_SPACING_MS = 120;
const JITTER_MS = 90;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Epoch ms of the next YouTube quota reset (midnight US/Pacific). */
function nextPacificMidnight(): number {
  const now = new Date();
  // Pacific is UTC-8 (PST) or UTC-7 (PDT); use -8 as the safe (later) reset.
  const pacificNow = new Date(now.getTime() - 8 * 60 * 60 * 1000);
  const next = Date.UTC(
    pacificNow.getUTCFullYear(),
    pacificNow.getUTCMonth(),
    pacificNow.getUTCDate() + 1,
    0, 0, 0, 0,
  );
  return next + 8 * 60 * 60 * 1000;
}

export function ytKeys(): string[] {
  const out: string[] = [];
  const push = (v?: string | null) => {
    for (const k of String(v || "").split(/[,\s]+/)) {
      const t = k.trim();
      if (t && !out.includes(t)) out.push(t);
    }
  };
  for (const k of FILE_KEYS) push(k);
  push(Deno.env.get("YOUTUBE_API_KEY"));
  for (let i = 2; i <= 20; i++) push(Deno.env.get(`YOUTUBE_API_KEY_${i}`));
  push(Deno.env.get("YOUTUBE_API_KEYS"));
  return out;
}

function stateOf(key: string): KeyState {
  let s = states.get(key);
  if (!s) {
    s = { key, lastUsed: 0, cooldownUntil: 0, softFails: 0, parked: false };
    states.set(key, s);
  }
  const now = Date.now();
  if (s.parked && s.cooldownUntil <= now) {
    s.parked = false;
    s.softFails = 0;
  }
  return s;
}

/** Keys ordered by usability: available first, least-recently-used first. */
function orderedKeys(): KeyState[] {
  const now = Date.now();
  const all = ytKeys().map(stateOf);
  const free = all.filter((s) => !s.parked && s.cooldownUntil <= now);
  const cooling = all.filter((s) => !s.parked && s.cooldownUntil > now);
  const parked = all.filter((s) => s.parked);
  const byLru = (a: KeyState, b: KeyState) => a.lastUsed - b.lastUsed;
  const bySoonest = (a: KeyState, b: KeyState) => a.cooldownUntil - b.cooldownUntil;
  // Cooling keys are still tried (after a wait) before giving up entirely;
  // parked (daily-quota) keys are the true last resort.
  return [...free.sort(byLru), ...cooling.sort(bySoonest), ...parked.sort(bySoonest)];
}

export function ytKeyStats() {
  const now = Date.now();
  const all = ytKeys().map(stateOf);
  return {
    total: all.length,
    available: all.filter((s) => !s.parked && s.cooldownUntil <= now).length,
    cooling: all.filter((s) => !s.parked && s.cooldownUntil > now).length,
    parked: all.filter((s) => s.parked).length,
  };
}

function classify(status: number, body: any): "daily" | "rate" | "other" {
  if (status !== 403 && status !== 429) return "other";
  const reasons = (body?.error?.errors || []).map((e: any) => String(e.reason || ""));
  const msg = String(body?.error?.message || "");
  if (reasons.some((r: string) => /quotaExceeded|dailyLimitExceeded/i.test(r))) return "daily";
  if (reasons.some((r: string) => /rateLimitExceeded|userRateLimitExceeded|backendError/i.test(r))) return "rate";
  if (status === 429) return "rate";
  if (/quota/i.test(msg)) return "daily";
  return "other";
}

/**
 * Fetch a YouTube Data API endpoint, rotating smartly through every key.
 * `url` must NOT contain the key param — it is appended per attempt.
 */
export async function ytFetch(
  url: string,
): Promise<{ ok: boolean; status: number; body: any; quotaExhausted?: boolean; keyIndex?: number }> {
  const pool = orderedKeys();
  if (!pool.length) throw new Error("No YouTube API key configured");

  let last: { status: number; body: any } | null = null;
  let sawDaily = false;

  for (let i = 0; i < pool.length; i++) {
    const s = pool[i];
    const now = Date.now();

    // Respect this key's cooldown, but never stall the whole request for long.
    const wait = Math.max(
      s.cooldownUntil - now,
      s.lastUsed + MIN_SPACING_MS - now,
    );
    if (wait > 0) {
      if (wait > 3000) continue; // too long — try another key first
      await sleep(wait + Math.floor(Math.random() * JITTER_MS));
    }

    const u = url + (url.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(s.key);
    s.lastUsed = Date.now();

    let r: Response | null = null;
    let netErr: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        r = await fetch(u);
        if (r.status >= 500 && attempt === 0) { await sleep(250 + Math.random() * 250); continue; }
        break;
      } catch (e) {
        netErr = (e as Error).message;
        if (attempt === 0) { await sleep(250); continue; }
      }
    }
    if (!r) { last = { status: 0, body: { error: { message: netErr || "network error" } } }; continue; }

    const body = await r.json().catch(() => ({}));

    if (r.ok) {
      s.softFails = 0;
      s.cooldownUntil = 0;
      return { ok: true, status: r.status, body, keyIndex: i };
    }

    const kind = classify(r.status, body);
    if (kind === "daily") {
      s.parked = true;
      s.cooldownUntil = nextPacificMidnight();
      sawDaily = true;
      last = { status: r.status, body };
      continue;
    }
    if (kind === "rate") {
      s.softFails = Math.min(s.softFails + 1, 5);
      // 30s, 60s, 2m, 4m, 8m
      s.cooldownUntil = Date.now() + 30_000 * Math.pow(2, s.softFails - 1);
      last = { status: r.status, body };
      continue;
    }

    // Real API error (bad request, key restriction, etc.) — surface it.
    return { ok: false, status: r.status, body, keyIndex: i };
  }

  return {
    ok: false,
    status: last?.status ?? 500,
    body: last?.body ?? {},
    quotaExhausted: sawDaily,
  };
}

export function ytErrorMessage(res: { status: number; body: any; quotaExhausted?: boolean }): string {
  const msg = res.body?.error?.message || `HTTP ${res.status}`;
  if (res.quotaExhausted) {
    const s = ytKeyStats();
    return `All ${s.total} YouTube API key(s) are unavailable right now (${s.parked} out of daily quota, ${s.cooling} cooling down). Add more keys in supabase/functions/_shared/ytKeyList.ts or as YOUTUBE_API_KEY_2, _3, … secrets. (${msg})`;
  }
  return msg;
}
