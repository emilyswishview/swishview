// Chunked, self-chaining Gmail sync.
// Returns 202 immediately, runs in background via EdgeRuntime.waitUntil,
// and self-invokes to continue until everything is ingested.
//
// Body params (all optional):
//   { users?: string[], pageToken?: string, mode?: "initial" | "incremental" }
//
// Strategy:
//   - Initial run picks all domain users with no prior sync (employees.last_email_sent_at is null).
//   - Incremental run fetches only messages newer than the user's last known sent_at.
//   - Each invocation runs at most ~25s of work, then chains itself for the next batch.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIME_BUDGET_MS = 25_000;       // leave headroom under the 30s edge function limit
const PER_USER_MSG_LIMIT = 200;      // messages per user per invocation
const PROCESS_BATCH = 25;            // concurrent message fetches

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const serviceAccountKey = Deno.env.get("GOOGLE_WORKSPACE_SERVICE_ACCOUNT_KEY");
  const adminEmail = Deno.env.get("GOOGLE_WORKSPACE_ADMIN_EMAIL");

  if (!serviceAccountKey || !adminEmail) {
    return new Response(JSON.stringify({
      success: false,
      error: "Google Workspace credentials not configured",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let credentials: any;
  try { credentials = JSON.parse(serviceAccountKey); }
  catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid service account key format" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const domain = adminEmail.split("@")[1];

  let body: any = {};
  try { body = await req.json(); } catch {}

  // Fire-and-forget background processing
  const work = runSync({
    supabase, credentials, adminEmail, domain,
    users: Array.isArray(body.users) ? body.users : undefined,
    pageToken: typeof body.pageToken === "string" ? body.pageToken : undefined,
    mailbox: body.mailbox === "inbox" || body.mailbox === "sent" ? body.mailbox : undefined,
    force: body.force === true,
    requestUrl: req.url,
    serviceRoleKey: supabaseKey,
  }).catch((err) => {
    console.error("background sync error:", err);
  });

  // @ts-ignore  -- EdgeRuntime is provided by Supabase Edge runtime
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(work);
  }

  return new Response(JSON.stringify({
    accepted: true,
    message: "Sync running in background. Re-invoke or wait; it self-chains until complete.",
    domain,
    scoped: body.users || "all-users",
  }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

async function runSync(opts: {
  supabase: any; credentials: any; adminEmail: string; domain: string;
  users?: string[]; pageToken?: string; mailbox?: "sent" | "inbox"; force?: boolean; requestUrl: string; serviceRoleKey: string;
}) {
  const { supabase, credentials, adminEmail, domain, users: scopedUsers, pageToken: initialPageToken, mailbox: initialMailbox, force, requestUrl, serviceRoleKey } = opts;
  const started = Date.now();
  const timeLeft = () => TIME_BUDGET_MS - (Date.now() - started);

  await supabase.from("email_tracker_sync_config").upsert({
    domain, sync_status: "syncing", updated_at: new Date().toISOString(),
  }, { onConflict: "domain" });

  // Resolve users to process this invocation
  let usersToProcess: string[];
  if (scopedUsers && scopedUsers.length) {
    usersToProcess = scopedUsers;
  } else {
    const adminToken = await getAccessToken(credentials, adminEmail, [
      "https://www.googleapis.com/auth/admin.directory.user.readonly",
    ]);
    if (!adminToken) {
      await supabase.from("email_tracker_sync_config").upsert({
        domain, sync_status: "error", last_error: "Failed to get admin access token",
        updated_at: new Date().toISOString(),
      }, { onConflict: "domain" });
      return;
    }
    const resp = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users?domain=${domain}&maxResults=500`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Directory API failed:", text);
      await supabase.from("email_tracker_sync_config").upsert({
        domain, sync_status: "error", last_error: `Directory ${resp.status}`,
        updated_at: new Date().toISOString(),
      }, { onConflict: "domain" });
      return;
    }
    const data = await resp.json();
    usersToProcess = ((data.users || []) as any[]).map(u => u.primaryEmail).filter(Boolean);

    // Sort: never-synced users first, then by oldest last_email_sent_at
    const { data: emp } = await supabase
      .from("email_tracker_employees")
      .select("email,last_email_sent_at");
    const empMap = new Map<string, string | null>((emp || []).map((e: any) => [e.email, e.last_email_sent_at]));
    usersToProcess.sort((a, b) => {
      const aT = empMap.get(a);
      const bT = empMap.get(b);
      if (!aT && bT) return -1;
      if (aT && !bT) return 1;
      if (!aT && !bT) return 0;
      return (aT! < bT! ? -1 : 1);
    });
  }

  const remainingUsers: string[] = [];
  let continuationPageToken: string | undefined = initialPageToken;
  let continuationUser: string | undefined;
  let nextMailbox: "sent" | "inbox" | undefined;
  let totalProcessed = 0;

  for (let i = 0; i < usersToProcess.length; i++) {
    const userEmail = usersToProcess[i];
    if (!userEmail) continue;
    if (timeLeft() < 4000) {
      remainingUsers.push(...usersToProcess.slice(i));
      break;
    }

    const userToken = await getAccessToken(credentials, userEmail, [
      "https://www.googleapis.com/auth/gmail.readonly",
    ]);
    if (!userToken) {
      console.error(`no token for ${userEmail}`);
      continue;
    }

    const { data: empRow } = await supabase
      .from("email_tracker_employees")
      .select("last_email_sent_at,last_email_received_at")
      .eq("email", userEmail)
      .maybeSingle();
    const lastSent = force ? undefined : (empRow?.last_email_sent_at as string | undefined);
    const lastRecv = force ? undefined : (empRow?.last_email_received_at as string | undefined);

    // Continuation: only the first user this invocation can resume mid-mailbox
    const isResumingUser = (i === 0 && initialMailbox && initialPageToken);
    const startMailbox: "sent" | "inbox" = isResumingUser && initialMailbox === "inbox" ? "inbox" : "sent";

    // 1) SENT mailbox (unless we're resuming directly in inbox)
    if (startMailbox === "sent") {
      const sentToken = isResumingUser && initialMailbox === "sent" ? initialPageToken : undefined;
      const sentResult = await syncUserChunk({
        supabase, userEmail, accessToken: userToken, domain,
        afterISO: lastSent, pageToken: sentToken, mailbox: "sent",
        timeLeft,
      });
      totalProcessed += sentResult.processed;
      if (sentResult.nextPageToken) {
        remainingUsers.push(userEmail, ...usersToProcess.slice(i + 1));
        continuationPageToken = sentResult.nextPageToken;
        continuationUser = userEmail;
        nextMailbox = "sent";
        break;
      }
    }

    // 2) INBOX mailbox (so prospect replies are captured for /prospects conversations)
    if (timeLeft() < 4000) {
      remainingUsers.push(userEmail, ...usersToProcess.slice(i + 1));
      continuationPageToken = undefined;
      continuationUser = userEmail;
      nextMailbox = "inbox";
      break;
    }
    const inboxToken = isResumingUser && initialMailbox === "inbox" ? initialPageToken : undefined;
    const inboxResult = await syncUserChunk({
      supabase, userEmail, accessToken: userToken, domain,
      afterISO: lastRecv, pageToken: inboxToken, mailbox: "inbox",
      timeLeft,
    });
    totalProcessed += inboxResult.processed;
    if (inboxResult.nextPageToken) {
      remainingUsers.push(userEmail, ...usersToProcess.slice(i + 1));
      continuationPageToken = inboxResult.nextPageToken;
      continuationUser = userEmail;
      nextMailbox = "inbox";
      break;
    }

    await updateEmployeeStatsSingle(supabase, userEmail);
    continuationPageToken = undefined;
    continuationUser = undefined;
    nextMailbox = undefined;
  }

  // Persist incremental progress on the user we paused mid-way so
  // last_email_received_at / last_email_sent_at actually move forward
  // even if the chain dies before that user is "finished".
  if (continuationUser) {
    try { await updateEmployeeStatsSingle(supabase, continuationUser); } catch {}
  }

  // Chain if more to do
  if (remainingUsers.length > 0) {
    await supabase.from("email_tracker_sync_config").upsert({
      domain, sync_status: "syncing",
      last_error: `In progress: ${remainingUsers.length} users remaining, +${totalProcessed} this round`,
      updated_at: new Date().toISOString(),
    }, { onConflict: "domain" });

    fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
      },
      body: JSON.stringify({
        users: remainingUsers,
        pageToken: continuationPageToken,
        mailbox: nextMailbox,
        force,
      }),
    }).catch((e) => console.error("self-chain failed", e));
  } else {
    await updateDailyStats(supabase);
    await supabase.from("email_tracker_sync_config").upsert({
      domain,
      last_sync_at: new Date().toISOString(),
      sync_status: "success",
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "domain" });
  }
}

async function syncUserChunk(opts: {
  supabase: any; userEmail: string; accessToken: string; domain: string;
  afterISO?: string; pageToken?: string; mailbox?: "sent" | "inbox"; timeLeft: () => number;
}): Promise<{ processed: number; nextPageToken?: string }> {
  const { supabase, userEmail, accessToken, domain, afterISO, pageToken, timeLeft } = opts;
  const mailbox: "sent" | "inbox" = opts.mailbox || "sent";

  let q = "";
  if (afterISO) {
    const epochSec = Math.floor(new Date(afterISO).getTime() / 1000);
    if (!isNaN(epochSec)) q = `after:${epochSec}`;
  }

  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("labelIds", mailbox === "inbox" ? "INBOX" : "SENT");
  listUrl.searchParams.set("maxResults", String(PER_USER_MSG_LIMIT));
  if (q) listUrl.searchParams.set("q", q);
  if (pageToken) listUrl.searchParams.set("pageToken", pageToken);

  const listResp = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listResp.ok) {
    console.error(`gmail list ${mailbox} ${userEmail}:`, await listResp.text());
    return { processed: 0 };
  }
  const listData = await listResp.json();
  const messages: { id: string }[] = listData.messages || [];
  const nextPageToken: string | undefined = listData.nextPageToken;

  let processed = 0;
  for (let i = 0; i < messages.length; i += PROCESS_BATCH) {
    if (timeLeft() < 3000) {
      return { processed, nextPageToken: pageToken || nextPageToken };
    }
    const batch = messages.slice(i, i + PROCESS_BATCH);
    const results = await Promise.allSettled(
      batch.map(m => processMessage(supabase, userEmail, accessToken, m.id, domain, mailbox))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.processed) processed++;
    }
  }

  return { processed, nextPageToken };
}

async function processMessage(
  supabase: any, userEmail: string, accessToken: string,
  messageId: string, domain: string, mailbox: "sent" | "inbox" = "sent",
): Promise<{ processed: boolean }> {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}` +
      `?format=metadata&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Bcc` +
      `&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Message-Id` +
      `&metadataHeaders=From&metadataHeaders=Content-Type`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!resp.ok) return { processed: false };
    const m = await resp.json();
    const headers = m.payload?.headers || [];
    const getH = (n: string) => headers.find((h: any) => h.name.toLowerCase() === n.toLowerCase())?.value || "";

    const fromHeader = getH("From");
    const fromR = parseEmails(fromHeader);
    const to = getH("To"), cc = getH("Cc"), bcc = getH("Bcc");
    const subject = getH("Subject"), date = getH("Date");
    const gmailMessageId = getH("Message-Id") || messageId;
    const toR = parseEmails(to), ccR = parseEmails(cc), bccR = parseEmails(bcc);

    let sentAt: string;
    try { sentAt = new Date(date).toISOString(); }
    catch { sentAt = new Date(parseInt(m.internalDate)).toISOString(); }

    const attachmentNames: string[] = [], attachmentTypes: string[] = [];
    let attachSize = 0;
    for (const p of (m.payload?.parts || [])) {
      if (p.filename && p.filename.length) {
        attachmentNames.push(p.filename);
        attachmentTypes.push(p.mimeType || "");
        attachSize += p.body?.size || 0;
      }
    }

    let logRecipients: string[];
    let logRecipientDomains: string[];
    let logIsExternal: boolean;
    let eventType: string;
    let deliveryStatus: string;

    if (mailbox === "inbox") {
      // Skip mailbox-owner copies of their own sent mail that also live in INBOX
      const sender = (fromR[0] || "").toLowerCase();
      if (!sender || sender === userEmail.toLowerCase()) return { processed: false };
      // Store the external sender under `recipients` so prospect-conversation
      // queries (recipients.cs.{prospectEmail}) match inbound replies too.
      logRecipients = [sender];
      logRecipientDomains = [sender.split("@")[1]].filter(Boolean);
      logIsExternal = (sender.split("@")[1] || "") !== domain;
      eventType = "received";
      deliveryStatus = "received";
    } else {
      logRecipients = toR;
      const all = [...toR, ...ccR, ...bccR];
      logRecipientDomains = all.map(r => r.split("@")[1]).filter(Boolean);
      logIsExternal = logRecipientDomains.some(d => d !== domain);
      eventType = "sent";
      deliveryStatus = "sent";
    }

    const { error } = await supabase.from("email_tracker_logs").upsert({
      message_id: gmailMessageId,
      employee_email: userEmail,
      recipients: logRecipients,
      recipient_domains: logRecipientDomains,
      subject: (subject || "").substring(0, 500),
      is_external: logIsExternal,
      sent_at: sentAt,
      cc_recipients: ccR,
      bcc_recipients: bccR,
      attachment_count: attachmentNames.length,
      attachment_names: attachmentNames,
      attachment_types: attachmentTypes,
      attachment_total_size_bytes: attachSize,
      has_attachments: attachmentNames.length > 0,
      message_size_bytes: m.sizeEstimate || 0,
      thread_id: m.threadId || "",
      labels: m.labelIds || [],
      event_type: eventType,
      delivery_status: deliveryStatus,
    }, { onConflict: "message_id", ignoreDuplicates: false });
    if (error && error.code !== "23505") return { processed: false };
    return { processed: true };
  } catch (e) {
    console.error("processMessage", messageId, e);
    return { processed: false };
  }
}

function parseEmails(headerValue: string): string[] {
  if (!headerValue) return [];
  const out: string[] = [];
  for (const part of headerValue.split(",")) {
    const t = part.trim();
    const m = t.match(/<([^>]+)>/);
    if (m) out.push(m[1].toLowerCase());
    else if (t.includes("@")) out.push(t.toLowerCase());
  }
  return out;
}

async function updateEmployeeStatsSingle(supabase: any, email: string) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthStart = new Date(now.getTime() - 30 * 86400000).toISOString();
    const counts = async (gte?: string, eq?: [string, any]) => {
      let q: any = supabase.from("email_tracker_logs").select("*", { count: "exact", head: true }).eq("employee_email", email);
      if (gte) q = q.gte("sent_at", gte);
      if (eq) q = q.eq(eq[0], eq[1]);
      const { count } = await q;
      return count || 0;
    };
    const [today, week, month, total, external] = await Promise.all([
      counts(todayStart), counts(weekStart), counts(monthStart), counts(), counts(undefined, ["is_external", true]),
    ]);
    const { data: lastSent } = await supabase.from("email_tracker_logs")
      .select("sent_at").eq("employee_email", email).eq("event_type", "sent")
      .order("sent_at", { ascending: false }).limit(1).maybeSingle();
    const { data: lastRecv } = await supabase.from("email_tracker_logs")
      .select("sent_at").eq("employee_email", email).eq("event_type", "received")
      .order("sent_at", { ascending: false }).limit(1).maybeSingle();
    await supabase.from("email_tracker_employees").upsert({
      email,
      emails_sent_today: today, emails_sent_week: week, emails_sent_month: month,
      external_email_percent: total > 0 ? Math.round((external / total) * 100) : 0,
      last_email_sent_at: lastSent?.sent_at || null,
      last_email_received_at: lastRecv?.sent_at || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" });
  } catch (e) { console.error("updateEmployeeStatsSingle", email, e); }
}

async function updateDailyStats(supabase: any) {
  try {
    const today = new Date();
    const dStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const dEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    const { count: tot } = await supabase.from("email_tracker_logs").select("*", { count: "exact", head: true }).gte("sent_at", dStart).lt("sent_at", dEnd);
    const { count: ext } = await supabase.from("email_tracker_logs").select("*", { count: "exact", head: true }).gte("sent_at", dStart).lt("sent_at", dEnd).eq("is_external", true);
    await supabase.from("email_tracker_daily_stats").upsert({
      stat_date: today.toISOString().slice(0, 10),
      total_emails: tot || 0, external_emails: ext || 0, internal_emails: (tot || 0) - (ext || 0),
      updated_at: new Date().toISOString(),
    }, { onConflict: "stat_date" });
  } catch (e) { console.error("updateDailyStats", e); }
}

// ---------- Google JWT helpers ----------
async function getAccessToken(credentials: any, impersonateEmail: string, scopes: string[]): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const jwt = await signJWT(
      { alg: "RS256", typ: "JWT" },
      { iss: credentials.client_email, sub: impersonateEmail, scope: scopes.join(" "),
        aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 },
      credentials.private_key
    );
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    });
    const d = await r.json();
    if (!d.access_token) { console.error("token err", impersonateEmail, d); return null; }
    return d.access_token;
  } catch (e) { console.error("token", impersonateEmail, e); return null; }
}

async function signJWT(header: any, payload: any, privateKeyPem: string): Promise<string> {
  const enc = new TextEncoder();
  const b64 = (o: any) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const input = `${b64(header)}.${b64(payload)}`;
  const pem = privateKeyPem.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  const bin = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", bin, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(input));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${input}.${sigB64}`;
}
