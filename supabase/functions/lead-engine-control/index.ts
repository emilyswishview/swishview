// Lead engine control plane — status metrics + start/stop/pause/resume/config/reset.
//
// POST { action: "status" | "start" | "stop" | "pause" | "resume" | "config" | "reset" | "tick" }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { svc, cors, json, apiKeyFor, type Sb } from "../_shared/engine.ts";

async function count(sb: Sb, table: string, build?: (q: any) => any): Promise<number> {
  let q = sb.from(table).select("*", { count: "exact", head: true });
  if (build) q = build(q);
  const { count: c } = await q;
  return c || 0;
}

async function status(sb: Sb) {
  const [{ data: settings }, { data: projects }, { data: recent }] = await Promise.all([
    sb.from("engine_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("youtube_api_projects").select("*").order("priority", { ascending: false }),
    sb.from("api_usage").select("success,quota_cost,created_at")
      .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
      .order("created_at", { ascending: false }).limit(2000),
  ]);

  const [
    leads, channels, qualified, phones, emails,
    queuedSearch, queuedContact, runningJobs, deadJobs,
    segNew, segActive, segExhausted, callingLeads,
  ] = await Promise.all([
    count(sb, "youtube_channels", (q) => q.eq("qualification_status", "contact_found")),
    count(sb, "youtube_channels"),
    count(sb, "youtube_channels", (q) => q.gte("lead_score", 50)),
    count(sb, "lead_contacts", (q) => q.eq("contact_type", "phone")),
    count(sb, "lead_contacts", (q) => q.eq("contact_type", "email")),
    count(sb, "discovery_jobs", (q) => q.eq("job_type", "search").in("status", ["queued", "retry"])),
    count(sb, "discovery_jobs", (q) => q.eq("job_type", "contact").in("status", ["queued", "retry"])),
    count(sb, "discovery_jobs", (q) => q.in("status", ["claimed", "running"])),
    count(sb, "discovery_jobs", (q) => q.in("status", ["dead_letter", "failed"])),
    count(sb, "search_segments", (q) => q.eq("status", "new")),
    count(sb, "search_segments", (q) => q.in("status", ["active", "productive"])),
    count(sb, "search_segments", (q) => q.in("status", ["exhausted", "low_yield", "blocked", "error"])),
    count(sb, "calling_leads"),
  ]);

  const bandRows = await Promise.all(
    ["A+", "A", "B", "C", "D"].map(async (b) => [b, await count(sb, "youtube_channels", (q) => q.eq("priority_band", b))] as const),
  );

  const { data: lock } = await sb.from("engine_locks").select("*").eq("name", "lead-engine-worker").maybeSingle();

  const usage = recent || [];
  const unitsToday = usage.reduce((s: number, r: any) => s + (r.quota_cost || 0), 0);
  const failures = usage.filter((r: any) => !r.success).length;
  const lastCallAt = usage[0]?.created_at || null;

  const health = (projects || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    secret: p.api_key_secret_name,
    hasKey: !!apiKeyFor(p.api_key_secret_name),
    enabled: p.enabled,
    status: p.health_status,
    searchUsed: p.search_calls_used,
    searchLimit: p.search_calls_limit,
    unitsUsed: p.read_units_used,
    unitsLimit: p.read_units_limit,
    cooldownUntil: p.cooldown_until,
    errors: p.error_count,
    lastUsedAt: p.last_used_at,
  }));

  return {
    ok: true,
    settings: {
      autopilot: !!settings?.autopilot,
      pausedReason: settings?.paused_reason ?? null,
      targetLeads: Number(settings?.target_leads || 20000),
      config: settings?.config || {},
      updatedAt: settings?.updated_at ?? null,
    },
    progress: {
      leads,
      target: Number(settings?.target_leads || 20000),
      pct: Math.min(100, Math.round((leads / Math.max(1, Number(settings?.target_leads || 20000))) * 100)),
      channels, qualified, phones, emails, callingLeads,
    },
    frontier: { new: segNew, active: segActive, retired: segExhausted },
    queue: { searchQueued: queuedSearch, contactQueued: queuedContact, running: runningJobs, dead: deadJobs },
    bands: Object.fromEntries(bandRows),
    api: {
      projects: health,
      keysConfigured: health.filter((p) => p.hasKey).length,
      available: health.filter((p) => p.enabled && p.hasKey && p.status !== "exhausted" && p.searchUsed < p.searchLimit).length,
      unitsToday, failures, lastCallAt,
    },
    worker: {
      locked: !!lock && new Date(lock.expires_at).getTime() > Date.now(),
      workerId: lock?.worker_id ?? null,
      lockExpiresAt: lock?.expires_at ?? null,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = svc();

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* GET / empty body → status */ }
    const action = String(body.action || "status");

    if (action === "status") return json(await status(sb));

    if (action === "start" || action === "resume") {
      await sb.from("engine_settings")
        .update({ autopilot: true, paused_reason: null, updated_at: new Date().toISOString() }).eq("id", 1);
      return json(await status(sb));
    }

    if (action === "stop" || action === "pause") {
      await sb.from("engine_settings")
        .update({ autopilot: false, paused_reason: body.reason || "paused manually", updated_at: new Date().toISOString() })
        .eq("id", 1);
      return json(await status(sb));
    }

    if (action === "config") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.targetLeads !== undefined) patch.target_leads = Math.max(1, Number(body.targetLeads) || 20000);
      if (body.config && typeof body.config === "object") {
        const { data: cur } = await sb.from("engine_settings").select("config").eq("id", 1).maybeSingle();
        patch.config = { ...(cur?.config || {}), ...body.config };
      }
      await sb.from("engine_settings").update(patch).eq("id", 1);
      return json(await status(sb));
    }

    if (action === "reset") {
      // force-release the worker lock, requeue stuck jobs, clear project cooldowns
      await sb.from("engine_locks").update({ expires_at: new Date(Date.now() - 1000).toISOString() })
        .eq("name", "lead-engine-worker");
      await sb.from("discovery_jobs")
        .update({ status: "queued", worker_id: null, locked_at: null, lock_expires_at: null, attempts: 0 })
        .in("status", ["claimed", "running", "retry", "failed"]);
      await sb.from("youtube_api_projects")
        .update({ health_status: "healthy", cooldown_until: null, error_count: 0 })
        .in("health_status", ["cooling", "error"]);
      if (body.resetQuota) {
        await sb.from("youtube_api_projects")
          .update({ search_calls_used: 0, read_units_used: 0, health_status: "healthy", cooldown_until: null })
          .eq("enabled", true);
      }
      return json(await status(sb));
    }

    if (action === "tick") {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/lead-engine-worker`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "manual" }),
      });
      const out = await r.json().catch(() => ({}));
      return json({ ok: r.ok, tick: out, status: await status(sb) });
    }

    return json({ ok: false, error: `unknown action "${action}"` }, 400);
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
