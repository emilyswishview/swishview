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

  // Duplicate pressure across the frontier — how many discovered channels were already known.
  const { data: dupRows } = await sb.from("search_segments")
    .select("channels_found,unique_channels").gt("channels_found", 0).limit(5000);
  const seenTotal = (dupRows || []).reduce((s: number, r: any) => s + (r.channels_found || 0), 0);
  const uniqTotal = (dupRows || []).reduce((s: number, r: any) => s + (r.unique_channels || 0), 0);
  const dupRate = seenTotal ? Math.round(((seenTotal - uniqTotal) / seenTotal) * 100) : 0;

  // Progress tracks the actual deliverable: callable phone leads in the calling list.
  const target = Number(settings?.target_leads || 20000);
  return {
    ok: true,
    settings: {
      autopilot: !!settings?.autopilot,
      pausedReason: settings?.paused_reason ?? null,
      targetLeads: target,
      config: settings?.config || {},
      updatedAt: settings?.updated_at ?? null,
    },
    progress: {
      leads: callingLeads,
      target,
      pct: Math.min(100, Math.round((callingLeads / Math.max(1, target)) * 100)),
      channels, qualified, phones, emails, callingLeads, contactFound: leads,
    },
    frontier: { new: segNew, active: segActive, retired: segExhausted, dupRate },

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

// Live activity feed — derived from what the engine actually wrote to the database,
// so the dashboard can show real-time progress without a separate log table.
type Ev = { at: string; kind: string; level: "info" | "good" | "warn" | "error"; text: string };

async function logs(sb: Sb, limit = 80): Promise<Ev[]> {
  const since = new Date(Date.now() - 6 * 3600_000).toISOString();
  const [sj, uc, uu, dj, ee] = await Promise.all([
    // NOTE: search_jobs has no created_at column — it uses started_at.
    sb.from("search_jobs").select("query,region_code,order_type,status,channels_discovered,last_error,started_at,completed_at")
      .gte("started_at", since).order("started_at", { ascending: false }).limit(40),
    sb.from("lead_contacts").select("contact_type,contact_value,channel_id,source_type,created_at")
      .gte("created_at", since).order("created_at", { ascending: false }).limit(40),
    sb.from("api_usage").select("endpoint,success,quota_cost,error_type,error_message,created_at")
      .gte("created_at", since).eq("success", false).order("created_at", { ascending: false }).limit(20),
    sb.from("discovery_jobs").select("job_type,status,last_error,updated_at,created_at")
      .gte("created_at", since).in("status", ["failed", "dead_letter"]).order("created_at", { ascending: false }).limit(20),
    sb.from("engine_events").select("at,level,message,worker_id")
      .gte("at", since).order("at", { ascending: false }).limit(60),
  ]);

  const ev: Ev[] = [];
  for (const r of ee.data || []) {
    ev.push({
      at: r.at, kind: "worker",
      level: r.level === "error" ? "error" : "info",
      text: r.message,
    });
  }
  for (const r of sj.data || []) {
    ev.push({
      at: r.completed_at || r.started_at,
      kind: "search",
      level: r.status === "failed" ? "error" : "info",
      text: r.status === "failed"
        ? `search failed "${r.query}" [${r.region_code}] — ${String(r.last_error || "").slice(0, 120)}`
        : `searched "${r.query}" [${r.region_code}/${r.order_type}] → ${r.channels_discovered ?? 0} channels`,
    });
  }

  for (const r of uc.data || []) {
    ev.push({
      at: r.created_at, kind: r.contact_type, level: r.contact_type === "phone" ? "good" : "info",
      text: `${r.contact_type} found ${r.contact_value} (${r.source_type || "web"}) · ${r.channel_id}`,
    });
  }
  for (const r of uu.data || []) {
    ev.push({
      at: r.created_at, kind: "api", level: "warn",
      text: `API ${r.endpoint} failed (${r.error_type || "error"}) — ${String(r.error_message || "").slice(0, 120)}`,
    });
  }
  for (const r of dj.data || []) {
    ev.push({
      at: r.updated_at || r.created_at, kind: "job", level: "error",
      text: `${r.job_type} job ${r.status} — ${String(r.last_error || "").slice(0, 120)}`,
    });
  }
  return ev
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = svc();

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* GET / empty body → status */ }
    const action = String(body.action || "status");

    if (action === "status") {
      const [s, l] = await Promise.all([status(sb), logs(sb, Number(body.logLimit) || 60)]);
      return json({ ...s, logs: l });
    }
    if (action === "logs") return json({ ok: true, logs: await logs(sb, Number(body.limit) || 100) });


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
      // Fire the worker asynchronously: a full tick can run for minutes, far longer
      // than the UI is willing to wait. We only confirm the invocation started.
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/lead-engine-worker`;
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const kick = fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
        body: JSON.stringify({ source: "manual", manual: true }),
      }).catch((e) => console.error("worker kick failed", e?.message || e));

      // keep the invocation alive without blocking the response
      const rt = (globalThis as any).EdgeRuntime;
      if (rt?.waitUntil) rt.waitUntil(kick);

      // give it a moment so the first status refresh already shows the worker busy
      await Promise.race([kick, new Promise((r) => setTimeout(r, 2500))]);
      const [s, l] = await Promise.all([status(sb), logs(sb, 60)]);
      return json({ ok: true, tick: { started: true }, status: { ...s, logs: l } });

    }


    return json({ ok: false, error: `unknown action "${action}"` }, 400);
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
