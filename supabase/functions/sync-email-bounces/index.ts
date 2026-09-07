// Sync Gmail bounce notifications (Mailer-Daemon / postmaster) into
// public.prospect_email_bounces for every Swishview outreach mailbox.
//
// Auth: Google Workspace service account with domain-wide delegation
//       (impersonates each sender mailbox using gmail.readonly scope).
//
// Invoke:  POST /functions/v1/sync-email-bounces
// Body:    { sender?: string, days?: number, max?: number }
//   sender: only sync that mailbox (default: all known senders)
//   days:   look-back window (default 14)
//   max:    max messages per mailbox (default 100)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// All Swishview outreach mailboxes (must match the SALES list in the UI).
const ALL_SENDERS = [
  "amelia@swishview.com","emily.j@swishview.com","emily@swishview.com",
  "grace@swishview.com","growth@swishview.com","irene@swishview.com",
  "mia.brooks@swishview.com","rachel@swishview.com","scarlett.l@swishview.com",
  "sophie@swishview.com",
  "amelia@swishview.email","grace@swishview.email","noelle@swishview.email",
  "serena@swishview.email","sophie@swishview.email",
];

// ---------- helpers ----------

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeToString(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function signJwt(
  serviceAccount: { client_email: string; private_key: string; token_uri: string },
  subject: string,
  scope: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    sub: subject,
    scope,
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: unknown) =>
    b64urlEncode(new TextEncoder().encode(JSON.stringify(o)));
  const signingInput = `${enc(header)}.${enc(claims)}`;

  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64urlEncode(sig)}`;
}

async function getAccessTokenFor(subject: string): Promise<string> {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON");
  const sa = JSON.parse(raw);
  const assertion = await signJwt(
    sa,
    subject,
    "https://www.googleapis.com/auth/gmail.readonly",
  );
  const resp = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(
      `Token exchange failed for ${subject}: ${resp.status} ${JSON.stringify(data)}`,
    );
  }
  return data.access_token as string;
}

// Recursively gather text/plain & text/html bodies from a Gmail message payload.
function collectText(payload: any, out: string[] = []): string[] {
  if (!payload) return out;
  if (payload.body?.data) {
    out.push(b64urlDecodeToString(payload.body.data));
  }
  if (Array.isArray(payload.parts)) {
    for (const p of payload.parts) collectText(p, out);
  }
  return out;
}

function headerOf(headers: any[], name: string): string {
  if (!Array.isArray(headers)) return "";
  const lower = name.toLowerCase();
  const h = headers.find((x) => (x.name || "").toLowerCase() === lower);
  return h?.value || "";
}

interface ParsedBounce {
  recipient: string | null;
  smtpCode: string | null;
  reason: string | null;
  bounceType: "hard" | "soft" | "unknown";
  subject: string | null;
  snippet: string;
}

function parseBounce(rawText: string, subject: string, snippet: string): ParsedBounce {
  const text = rawText || snippet || "";

  // Try DSN-style "Final-Recipient: rfc822; foo@bar.com"
  let recipient: string | null = null;
  const finalRcpt = text.match(/Final-Recipient:\s*(?:rfc822;\s*)?([^\s<>\n]+@[^\s<>\n]+)/i);
  if (finalRcpt) recipient = finalRcpt[1].trim().replace(/[.,;]$/, "");
  if (!recipient) {
    const original = text.match(/Original-Recipient:\s*(?:rfc822;\s*)?([^\s<>\n]+@[^\s<>\n]+)/i);
    if (original) recipient = original[1].trim().replace(/[.,;]$/, "");
  }
  if (!recipient) {
    // Fallback: any "<foo@bar>" near "could not be delivered"
    const m = text.match(/(?:to|recipient|address)[^@\n]{0,40}<?([\w.+-]+@[\w.-]+\.[a-z]{2,})>?/i);
    if (m) recipient = m[1];
  }
  if (!recipient) {
    const subjMatch = subject.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
    if (subjMatch) recipient = subjMatch[0];
  }

  // SMTP status code: 5.x.x or 4.x.x
  let smtpCode: string | null = null;
  const status = text.match(/Status:\s*(\d\.\d+\.\d+)/i);
  if (status) smtpCode = status[1];
  if (!smtpCode) {
    const inline = text.match(/\b([45]\.\d+\.\d+)\b/);
    if (inline) smtpCode = inline[1];
  }

  // Diagnostic / reason
  let reason: string | null = null;
  const diag = text.match(/Diagnostic-Code:\s*[^\n]+\n?(?:\s+[^\n]+\n?)*/i);
  if (diag) reason = diag[0].replace(/^Diagnostic-Code:\s*/i, "").replace(/\s+/g, " ").trim();
  if (!reason) {
    // Common Gmail bounce phrasings
    const m = text.match(/(?:The response (?:from|was)|because of|reason:)\s*([^\n]{5,300})/i);
    if (m) reason = m[1].trim();
  }
  if (!reason) {
    const m = text.match(/(?:550|552|553|554|421|450|451|452)[ -][^\n]{5,300}/);
    if (m) reason = m[0].trim();
  }
  if (!reason) reason = snippet?.slice(0, 280) || null;

  const bounceType: "hard" | "soft" | "unknown" =
    smtpCode?.startsWith("5") ? "hard" :
    smtpCode?.startsWith("4") ? "soft" : "unknown";

  // Try to recover the *original* outbound subject from the bounce body.
  let origSubject: string | null = null;
  const subjMatch = text.match(/^\s*Subject:\s*([^\n]+)/im);
  if (subjMatch) {
    const s = subjMatch[1].trim();
    // Skip the bounce's own subject line
    if (!/^(?:undelivered|delivery|mail delivery|failure)/i.test(s)) {
      origSubject = s;
    }
  }

  return {
    recipient: recipient ? recipient.toLowerCase() : null,
    smtpCode,
    reason: reason?.slice(0, 1000) || null,
    bounceType,
    subject: origSubject,
    snippet: snippet?.slice(0, 500) || "",
  };
}

async function gmailListMessages(token: string, q: string, max: number): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < max) {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("q", q);
    url.searchParams.set("maxResults", String(Math.min(100, max - ids.length)));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Gmail list failed: ${resp.status} ${body}`);
    }
    const data = await resp.json();
    for (const m of data.messages || []) ids.push(m.id);
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return ids;
}

async function gmailGetMessage(token: string, id: string): Promise<any> {
  const resp = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!resp.ok) throw new Error(`Gmail get failed: ${resp.status}`);
  return await resp.json();
}

async function syncSender(
  supabase: any,
  sender: string,
  days: number,
  max: number,
): Promise<{ sender: string; scanned: number; saved: number; errors: string[] }> {
  const errors: string[] = [];
  let saved = 0;
  let scanned = 0;
  try {
    const token = await getAccessTokenFor(sender);
    const q = `(from:mailer-daemon OR from:postmaster OR subject:"delivery status" OR subject:"undelivered" OR subject:"delivery failure") newer_than:${days}d`;
    const ids = await gmailListMessages(token, q, max);
    scanned = ids.length;

    const records: any[] = [];
    for (const id of ids) {
      try {
        const msg = await gmailGetMessage(token, id);
        const headers = msg.payload?.headers || [];
        const subject = headerOf(headers, "Subject");
        const dateHdr = headerOf(headers, "Date");
        const receivedAt = dateHdr ? new Date(dateHdr).toISOString() : null;
        const bodyText = collectText(msg.payload).join("\n");
        const parsed = parseBounce(bodyText, subject, msg.snippet || "");
        records.push({
          sender,
          recipient: parsed.recipient,
          subject: parsed.subject || subject || null,
          reason: parsed.reason,
          smtp_code: parsed.smtpCode,
          bounce_type: parsed.bounceType,
          gmail_message_id: msg.id,
          gmail_thread_id: msg.threadId || null,
          received_at: receivedAt,
          raw_snippet: parsed.snippet,
        });
      } catch (e) {
        errors.push(`msg ${id}: ${(e as Error).message}`);
      }
    }

    if (records.length > 0) {
      // Chunked upsert to keep payloads small.
      for (let i = 0; i < records.length; i += 100) {
        const chunk = records.slice(i, i + 100);
        const { error } = await supabase
          .from("prospect_email_bounces")
          .upsert(chunk, { onConflict: "sender,gmail_message_id", ignoreDuplicates: false });
        if (error) errors.push(`upsert: ${error.message}`);
        else saved += chunk.length;
      }
    }
  } catch (e) {
    errors.push((e as Error).message);
  }
  return { sender, scanned, saved, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const days = Math.max(1, Math.min(90, Number(body.days) || 7));
    const max = Math.max(1, Math.min(5000, Number(body.max) || 2000));
    const senders: string[] = body.sender ? [String(body.sender)] : ALL_SENDERS;
    const removeFromProspects = body.removeFromProspects !== false; // default true

    const results: any[] = [];
    // Sequential to keep per-mailbox auth + rate limits simple.
    for (const s of senders) {
      const r = await syncSender(supabase, s, days, max);
      results.push(r);
    }

    const totals = results.reduce(
      (a, r) => ({
        scanned: a.scanned + r.scanned,
        saved: a.saved + r.saved,
        errored: a.errored + (r.errors.length ? 1 : 0),
      }),
      { scanned: 0, saved: 0, errored: 0 },
    );

    // Ban prospects whose email hard-bounced in the look-back window.
    let bannedProspects = 0;
    let banError: string | undefined;
    if (removeFromProspects) {
      try {
        const sinceIso = new Date(Date.now() - days * 86400_000).toISOString();
        const { data: bounceRows } = await supabase
          .from("prospect_email_bounces")
          .select("recipient")
          .gte("received_at", sinceIso)
          .eq("bounce_type", "hard")
          .not("recipient", "is", null)
          .limit(10000);
        const emails = Array.from(new Set(
          (bounceRows || [])
            .map((r: any) => (r.recipient || "").toLowerCase().trim())
            .filter(Boolean),
        ));
        // PostgREST doesn't support .in() on a jsonb path reliably, so iterate.
        for (const em of emails) {
          const { data: upd, error: updErr } = await supabase
            .from("prospects")
            .update({ is_banned: true })
            .filter("data->>email", "eq", em)
            .select("id");
          if (!updErr) bannedProspects += (upd?.length || 0);
        }
      } catch (e) {
        banError = (e as Error).message;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, totals: { ...totals, bannedProspects, banError }, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
