import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const TEAM_RECIPIENTS = [
  "amelia@swishview.com",
  "support@swishview.com",
  "emily@swishview.com",
  "swishviewsupport@swishview.com",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CallbackRequestBody {
  full_name?: string;
  email?: string;
  phone?: string;
  phone_e164?: string | null;
  phone_region?: string | null;
  channel_url?: string | null;
  availability?: string | null;
  requirements?: string | null;
  timezone?: string | null;
}

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const row = (label: string, value?: string | null) =>
  value
    ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">${label}</td><td style="padding:6px 0;color:#111;font-size:14px;font-weight:500;">${value}</td></tr>`
    : "";

const teamTemplate = (b: CallbackRequestBody) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f7;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="background:#0a0a0a;padding:28px 32px;">
      <div style="color:#f97316;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">SwishView · Callback Request</div>
      <h1 style="color:#fff;margin:6px 0 0;font-size:22px;font-weight:700;">${esc(b.full_name)} wants a call back</h1>
    </div>
    <div style="padding:32px;">
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px;background:#fafafa;">
        <table style="width:100%;border-collapse:collapse;">
          ${row("Phone", `<a href="tel:${esc(b.phone_e164 || b.phone)}" style="color:#f97316;text-decoration:none;">${esc(b.phone_e164 || b.phone)}</a>`)}
          ${row("Region", esc(b.phone_region))}
          ${row("Availability", esc(b.availability))}
          ${row("Timezone", esc(b.timezone))}
        </table>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          ${row("Email", `<a href="mailto:${esc(b.email)}" style="color:#f97316;text-decoration:none;">${esc(b.email)}</a>`)}
          ${row("Channel", b.channel_url ? `<a href="${esc(b.channel_url)}" style="color:#f97316;text-decoration:none;">${esc(b.channel_url)}</a>` : "")}
        </table>
      </div>
      ${
        b.requirements
          ? `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:8px;">Requirements</div>
        <div style="font-size:14px;color:#333;line-height:1.6;">${esc(b.requirements).replace(/\n/g, "<br>")}</div>
      </div>`
          : ""
      }
    </div>
  </div>
</div>`;

const clientTemplate = (b: CallbackRequestBody) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f7;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%);padding:36px;text-align:center;">
      <div style="color:#f97316;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:8px;">SwishView</div>
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">We'll call you shortly</h1>
    </div>
    <div style="padding:36px;">
      <p style="font-size:16px;color:#111;margin:0 0 8px;">Hi ${esc(String(b.full_name || "there").split(" ")[0])},</p>
      <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 24px;">
        Thanks for the callback request. A SwishView growth manager will ring you on
        <strong>${esc(b.phone_e164 || b.phone)}</strong>${b.availability ? ` during <strong>${esc(b.availability)}</strong>` : ""}.
      </p>
      <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0;">
        Want to change the time or number? Just reply to this email.
      </p>
    </div>
    <div style="padding:20px;text-align:center;background:#fafafa;border-top:1px solid #e5e7eb;">
      <div style="font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} SwishView · Real growth, real strategy.</div>
    </div>
  </div>
</div>`;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CallbackRequestBody = await req.json();

    if (!body.full_name || !body.email || !body.phone) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const teamRes = await resend.emails.send({
      from: "SwishView Callbacks <support@swishview.com>",
      to: TEAM_RECIPIENTS,
      replyTo: body.email,
      subject: `📞 Callback request — ${body.full_name} · ${body.phone_e164 || body.phone}`,
      html: teamTemplate(body),
    });

    const clientRes = await resend.emails.send({
      from: "SwishView <growth@swishview.com>",
      to: [body.email],
      replyTo: "growth@swishview.com",
      subject: "We received your callback request",
      html: clientTemplate(body),
    });

    console.log("callback emails sent", {
      team: (teamRes as any)?.data?.id,
      client: (clientRes as any)?.data?.id,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("send-callback-request error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
