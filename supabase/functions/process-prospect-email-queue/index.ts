// Background worker for the prospect outreach queue.
// Triggered every minute by pg_cron. Picks up due jobs, marks them
// 'processing', invokes send-prospect-reply, then marks them 'sent' or
// 'error'. Caps work per invocation so the cron stays cheap.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_PER_RUN = 200;         // hard cap per invocation
const STALE_PROCESSING_MIN = 10; // recover jobs stuck in 'processing'

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // 1) Recover any jobs stuck in 'processing' (function crashed mid-send)
  const staleCutoff = new Date(Date.now() - STALE_PROCESSING_MIN * 60_000).toISOString();
  await sb
    .from("prospect_email_jobs")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt("updated_at", staleCutoff);

  // 2) Claim due pending jobs (small batch, oldest first)
  const nowIso = new Date().toISOString();
  const { data: due, error: dueErr } = await sb
    .from("prospect_email_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(MAX_PER_RUN);

  if (dueErr) {
    return json({ ok: false, error: dueErr.message }, 500);
  }
  if (!due?.length) {
    return json({ ok: true, processed: 0 });
  }

  // --- Sender pause check only (no daily caps -- user wants continuous send) -----
  // Caps used to defer everything past N/day to tomorrow 00:00 UTC which made the
  // queue look stuck for 15h+. We now only honor an explicit `paused` flag.
  const senders = Array.from(new Set(due.map(j => (j.from_email || "").toLowerCase()).filter(Boolean)));
  const { data: cfgRows } = await sb
    .from("prospect_sender_config")
    .select("sender_email, paused")
    .in("sender_email", senders);
  const pausedSet = new Set((cfgRows || []).filter(r => r.paused).map(r => r.sender_email));

  const allowed: typeof due = [];
  const deferred: { id: string; reason: string }[] = [];
  for (const j of due) {
    const s = (j.from_email || "").toLowerCase();
    if (pausedSet.has(s)) { deferred.push({ id: j.id, reason: "sender paused" }); continue; }
    allowed.push(j);
  }
  if (deferred.length) {
    // Just leave them pending; flip status to 'paused' so the UI shows it clearly
    await sb.from("prospect_email_jobs")
      .update({ status: "paused", last_error: "sender paused" })
      .in("id", deferred.map(d => d.id));
  }
  if (!allowed.length) {
    return json({ ok: true, processed: 0, deferred: deferred.length });
  }


  const ids = allowed.map(j => j.id);
  await sb.from("prospect_email_jobs").update({ status: "processing" }).in("id", ids);

  let sent = 0, failed = 0;
  const errors: any[] = [];

  for (const job of allowed) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-prospect-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE}`,
          "apikey": SERVICE_ROLE,
        },
        body: JSON.stringify({
          to: job.to_email,
          cc: job.cc || undefined,
          bcc: job.bcc || undefined,
          subject: job.subject,
          text: job.body_text,
          fromEmail: job.from_email,
          fromName: job.from_name || undefined,
          replyTo: job.reply_to || undefined,
        }),
      });
      const out = await resp.json().catch(() => ({}));
      if (!resp.ok || out?.error) {
        throw new Error(out?.error || `send failed (${resp.status})`);
      }
      await sb.from("prospect_email_jobs").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        message_id: out?.id || out?.messageId || null,
        attempts: (job.attempts || 0) + 1,
        last_error: null,
      }).eq("id", job.id);
      sent++;
    } catch (e: any) {
      const attempts = (job.attempts || 0) + 1;
      // up to 3 attempts with exponential backoff (2/10/30 min)
      const backoffMin = attempts === 1 ? 2 : attempts === 2 ? 10 : 30;
      const giveUp = attempts >= 3;
      await sb.from("prospect_email_jobs").update({
        status: giveUp ? "error" : "pending",
        attempts,
        last_error: e?.message || String(e),
        scheduled_at: giveUp
          ? job.scheduled_at
          : new Date(Date.now() + backoffMin * 60_000).toISOString(),
      }).eq("id", job.id);
      failed++;
      errors.push({ id: job.id, error: e?.message || String(e) });
    }
  }

  return json({ ok: true, processed: allowed.length, sent, failed, deferred: deferred.length, errors });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
