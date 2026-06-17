// Sends prospect emails via Google Workspace Gmail API using domain-wide
// delegation (service account impersonates the chosen @swishview.com sender).
// This makes every send appear in that staff member's Gmail Sent folder and
// uses the real Workspace identity (proper DKIM/SPF) so inbox placement is
// much better than Resend's onboarding domain.
//
// Required: GOOGLE_WORKSPACE_SERVICE_ACCOUNT_KEY must have
// https://www.googleapis.com/auth/gmail.send authorised in Google Admin
// → Security → API controls → Domain-wide delegation.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReplyRequest {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;     // must be @swishview.com
  replyTo?: string;
  inReplyTo?: string;     // Message-ID we are replying to
  references?: string[];  // thread Message-IDs
}

// Accept either of our two Workspace domains so senders on @swishview.email
// (the secondary outreach domain) also work. Both have domain-wide delegation
// configured in Google Admin.
const isSwishview = (e: string) => /^[a-z0-9._+-]+@swishview\.(com|email)$/i.test(e.trim());

// NOTE: We intentionally do NOT insert zero-width spaces or other invisible
// characters. Modern spam filters (Gmail, Outlook, Proofpoint) treat
// invisible-character obfuscation as a strong spam signal, so "sprinkling"
// actually hurts inbox placement. Keep the body byte-for-byte clean.
const sprinkle = (s: string) => s;


const stripTags = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

// RFC 2047 encode for non-ASCII subjects / display names
const encHeader = (s: string) => {
  if (!s) return s;
  // only encode if there are non-ASCII chars
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return `=?UTF-8?B?${b64}?=`;
};

// Build the simplest possible Gmail message. For prospect outreach we prefer
// plain text because it is closest to a hand-typed Gmail compose and avoids
// bulk-mail fingerprints caused by app HTML wrappers/custom headers.
function buildMime(opts: {
  fromName: string;
  fromEmail: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
}): string {
  const boundary = "----=_Part_" + crypto.randomUUID().replace(/-/g, "");
  const fromHeader = `${encHeader(opts.fromName || opts.fromEmail.split("@")[0])} <${opts.fromEmail}>`;
  const date = new Date().toUTCString();

  const headers: string[] = [
    `From: ${fromHeader}`,
    `To: ${opts.to.join(", ")}`,
    ...(opts.cc?.length ? [`Cc: ${opts.cc.join(", ")}`] : []),
    ...(opts.bcc?.length ? [`Bcc: ${opts.bcc.join(", ")}`] : []),
    `Subject: ${encHeader(opts.subject)}`,
    `Date: ${date}`,
    `MIME-Version: 1.0`,
  ];
  // Deliverability hygiene: stable Message-ID using sender's domain so it
  // aligns with From/Return-Path, and RFC 8058 one-click List-Unsubscribe
  // so Gmail/Outlook surface a real unsubscribe link instead of "Report spam".
  const fromDomain = (opts.fromEmail.split("@")[1] || "swishview.com").toLowerCase();
  const msgId = `<${crypto.randomUUID()}@${fromDomain}>`;
  headers.push(`Message-ID: ${msgId}`);
  const unsubMail = `unsubscribe@${fromDomain}`;
  headers.push(`List-Unsubscribe: <mailto:${unsubMail}?subject=unsubscribe>`);
  headers.push(`List-Unsubscribe-Post: List-Unsubscribe=One-Click`);
  // Bulk-mail signals route Gmail to the Promotions tab instead of Spam/Primary.
  headers.push(`Precedence: bulk`);
  headers.push(`List-Id: SwishView Outreach <outreach.${fromDomain}>`);
  headers.push(`X-Auto-Response-Suppress: OOF, AutoReply`);
  headers.push(`X-Entity-Ref-ID: ${crypto.randomUUID()}`);
  if (opts.replyTo) headers.push(`Reply-To: ${opts.replyTo}`);
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references?.length) headers.push(`References: ${opts.references.join(" ")}`);

  if (!opts.html?.trim()) {
    return [
      headers.join("\r\n"),
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      sprinkle(opts.text),
      ``,
    ].join("\r\n");
  }

  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);


  const textPart = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    sprinkle(opts.text),
  ].join("\r\n");

  const htmlPart = [
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    opts.html,
  ].join("\r\n");

  return [
    headers.join("\r\n"),
    ``,
    textPart,
    ``,
    htmlPart,
    ``,
    `--${boundary}--`,
    ``,
  ].join("\r\n");
}

const b64url = (s: string) =>
  btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// --- Google JWT auth (same pattern as email-tracker-sync) --------------------
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

async function getAccessTokenAs(credentials: any, impersonate: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJWT(
    { alg: "RS256", typ: "JWT" },
    {
      iss: credentials.client_email,
      sub: impersonate,
      scope: "https://www.googleapis.com/auth/gmail.send",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    credentials.private_key,
  );
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const d = await r.json();
  if (!d.access_token) {
    throw new Error(
      `Google token error for ${impersonate}: ${JSON.stringify(d)}. ` +
      `Make sure the service account has domain-wide delegation for scope ` +
      `https://www.googleapis.com/auth/gmail.send`,
    );
  }
  return d.access_token;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: ReplyRequest = await req.json();
    const to = Array.isArray(body.to) ? body.to : [body.to];
    const cleanTo = to.map(t => (t || "").trim()).filter(Boolean);
    if (!cleanTo.length) throw new Error("Missing recipient");
    if (!body.subject?.trim()) throw new Error("Missing subject");
    if (!body.html?.trim() && !body.text?.trim()) throw new Error("Missing body");

    const requestedFrom = (body.fromEmail || "").trim().toLowerCase();
    if (!isSwishview(requestedFrom)) {
      throw new Error("fromEmail must be an @swishview.com or @swishview.email address");
    }

    const serviceAccountKey = Deno.env.get("GOOGLE_WORKSPACE_SERVICE_ACCOUNT_KEY");
    if (!serviceAccountKey) throw new Error("GOOGLE_WORKSPACE_SERVICE_ACCOUNT_KEY not configured");
    const credentials = JSON.parse(serviceAccountKey);

    const fromEmail = requestedFrom;
    const accessToken = await getAccessTokenAs(credentials, requestedFrom);

    // --- Inbox-placement sanitisation -------------------------------------
    const cleanSubject = body.subject
      .replace(/[\p{Extended_Pictographic}\u200D\uFE0F]/gu, "")
      .replace(/\s{2,}/g, " ")
      .trim() || "Quick note";

    const safeHtml = (body.html || "")
      .replace(/<img[^>]*(?:width\s*=\s*["']?1["']?|height\s*=\s*["']?1["']?)[^>]*>/gi, "")
      .replace(/<img[^>]*tracking[^>]*>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/(href=["'][^"']*?)([?&])utm_[^=]+=[^"'&]*/gi, "$1$2")
      .replace(/[?&]+(["'])/g, "$1");

    let text = (body.text?.trim() || stripTags(safeHtml || ""))
      .replace(/[\p{Extended_Pictographic}\u200D\uFE0F]/gu, "")
      .replace(/\r\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();

    // Defensive: if the draft pipeline ever leaks raw JSON / markdown fences
    // into the body, strip it before sending. Sending raw ```json {...}``` to
    // a prospect is a guaranteed spam folder + brand damage.
    if (/^\s*```/.test(text) || /^\s*\{[\s\S]*"body"\s*:/.test(text) || /---BODY---/.test(text)) {
      const bodyMatch = text.match(/"body"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"analysis"|\}\s*$)/);
      const markerMatch = text.match(/---BODY---\s*([\s\S]*?)\s*(?:---END---|$)/i);
      if (bodyMatch) {
        text = bodyMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\")
          .trim();
      } else if (markerMatch) {
        text = markerMatch[1].trim();
      } else {
        text = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
      }
    }

    // Collapse hard line breaks WITHIN paragraphs into single spaces so Gmail
    // can flow paragraphs to full width. Preserve blank-line paragraph breaks
    // and keep the sign-off block (short trailing lines after "Best,"/etc.)
    // on separate lines. Mirrors the client-side normalizeEmailBody.
    const unwrapParagraphs = (b: string) => {
      const s = (b || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const paras = s.split(/\n\s*\n+/);
      return paras.map(p => {
        const lines = p.split("\n").map(l => l.trim()).filter(Boolean);
        if (!lines.length) return "";
        const isSignoff = lines.length <= 6 &&
          /^(best|thanks|cheers|regards|warmly|sincerely|kind regards|with love)[^\n]*$/i.test(lines[0]);
        return isSignoff ? lines.join("\n") : lines.join(" ").replace(/[ \t]{2,}/g, " ");
      }).filter(Boolean).join("\n\n").trim();
    };
    text = unwrapParagraphs(text);

    // Build a minimal HTML alternative from the cleaned text so Gmail renders
    // paragraphs at full width instead of preserving plain-text wrapping.
    const escapeHtml = (s: string) => s
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Mobile-responsive, dark-mode-aware, lightweight HTML wrapper.
    // No images, no tracking pixels, no external CSS, no web fonts — keeps
    // the message small (good for spam scoring) and renders cleanly in every
    // major client including Gmail dark mode and Outlook.
    const textToHtml = (t: string) => {
      const paras = t.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
      const body = paras.map(p =>
        `<p style="margin:0 0 14px 0;padding:0;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`
      ).join("");
      return `<!DOCTYPE html><html lang="en"><head>`
        + `<meta charset="UTF-8">`
        + `<meta name="viewport" content="width=device-width,initial-scale=1">`
        + `<meta name="color-scheme" content="light dark">`
        + `<meta name="supported-color-schemes" content="light dark">`
        + `<title>${escapeHtml(cleanSubject)}</title>`
        + `<style>`
        + `body{margin:0;padding:0;background:#ffffff;color:#111111;}`
        + `@media (prefers-color-scheme: dark){body,.wrap{background:#0b0b0b !important;color:#e8e8e8 !important;}a{color:#8ab4ff !important;}}`
        + `@media only screen and (max-width:600px){.wrap{padding:16px !important;}}`
        + `</style></head>`
        + `<body><div class="wrap" style="width:100%;margin:0;padding:20px 24px;text-align:left;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111111;">`
        + body
        + `</div></body></html>`;
    };
    const htmlToSend = safeHtml.trim() && !body.text?.trim()
      ? safeHtml
      : textToHtml(text);

    const mime = buildMime({
      fromName: body.fromName || fromEmail.split("@")[0],
      fromEmail,
      to: cleanTo,
      cc: body.cc,
      bcc: body.bcc,
      subject: cleanSubject,
      html: htmlToSend,
      text,
      replyTo: body.replyTo || undefined,
      inReplyTo: body.inReplyTo || undefined,
      references: body.references || undefined,
    });

    const raw = b64url(mime);


    const gmailRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      },
    );

    const gmailData = await gmailRes.json();
    if (!gmailRes.ok) {
      console.error("gmail send error", gmailRes.status, gmailData);
      throw new Error(
        `Gmail send failed (${gmailRes.status}): ${gmailData?.error?.message || JSON.stringify(gmailData)}`,
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        provider: "gmail",
        from: fromEmail,
        gmail: gmailData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("send-prospect-reply error", e);
    // Always return 200 so the supabase client doesn't bubble up a generic
    // "non-2xx" error — the UI inspects { ok:false, error } to show a real
    // message and to enable per-row retry in bulk sends.
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
