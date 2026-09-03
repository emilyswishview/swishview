import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Universal SwishView consultation meeting link (Google Meet).
// Set the UNIVERSAL_MEETING_LINK secret to the team's permanent Meet room URL.
// A placeholder like `meet.google.com/swishview-consult` is NOT a real code and
// will show "Invalid video call name" — always configure a real room here.
const UNIVERSAL_MEETING_LINK =
  Deno.env.get("UNIVERSAL_MEETING_LINK") || "";

const TEAM_RECIPIENTS = [
  "amelia@swishview.com",
  "support@swishview.com",
  "rachel@swishview.com",
  "emily@swishview.com",
  "chris@swishview.com",
  "swishviewsupport@swishview.com",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConsultBookingRequest {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  channelUrl?: string;
  preferredDate: string;   // pre-formatted in client's timezone
  preferredTime: string;   // pre-formatted in client's timezone
  clientTimezone?: string; // IANA name, informational
  istTime?: string;        // internal reference for our team
  isoStart?: string;       // ISO instant of the slot
  notes?: string;
}

const row = (label: string, value?: string) =>
  value
    ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:120px;">${label}</td><td style="padding:6px 0;color:#111;font-size:14px;font-weight:500;">${value}</td></tr>`
    : "";

const clientTemplate = (opts: {
  name: string;
  dateStr: string;
  timeStr: string;
  tz?: string;
  meetLink: string;
}) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f7;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%);padding:36px;text-align:center;">
      <img src="https://swishview.com/swishview-logo.png" alt="SwishView" width="140" style="display:block;margin:0 auto 14px;max-width:140px;height:auto;" />
      <div style="color:#f97316;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:8px;">SwishView</div>
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Your consultation is confirmed</h1>
    </div>

    <div style="padding:36px;">
      <p style="font-size:16px;color:#111;line-height:1.6;margin:0 0 8px;">Hi ${opts.name.split(" ")[0] || "there"},</p>
      <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 28px;">
        Thanks for booking a call with SwishView. Here are your meeting details — save this email or add it to your calendar.
      </p>

      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;background:#fafafa;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#f97316;font-weight:700;margin-bottom:10px;">Meeting</div>
        <div style="font-size:20px;color:#111;font-weight:600;margin-bottom:4px;">${opts.dateStr}</div>
        <div style="font-size:18px;color:#111;">${opts.timeStr}</div>
        ${opts.tz ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">${opts.tz}</div>` : ""}
      </div>

      <div style="text-align:center;margin:32px 0;">
        <a href="${opts.meetLink}" style="display:inline-block;background:#f97316;color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 4px 14px rgba(249,115,22,0.35);">
          Join Google Meet
        </a>
        <div style="font-size:12px;color:#9ca3af;margin-top:12px;word-break:break-all;">${opts.meetLink}</div>
      </div>

      <div style="border-top:1px solid #e5e7eb;padding-top:24px;margin-top:16px;">
        <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 8px;">
          Your SEO strategist will join right on time. Come with your channel URL and any questions — we'll do the rest.
        </p>
        <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0;">
          Need to reschedule? Just reply to this email.
        </p>
      </div>
    </div>
    <div style="padding:20px;text-align:center;background:#fafafa;border-top:1px solid #e5e7eb;">
      <div style="font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} SwishView · Real growth, real strategy.</div>
    </div>
  </div>
</div>
`;

const teamTemplate = (opts: {
  name: string;
  email: string;
  phone?: string;
  channel?: string;
  dateStr: string;
  timeStr: string;
  tz?: string;
  istTime?: string;
  notes?: string;
  meetLink: string;
}) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f7;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="background:#0a0a0a;padding:28px 32px;">
      <div style="color:#f97316;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">SwishView · New Booking</div>
      <h1 style="color:#fff;margin:6px 0 0;font-size:22px;font-weight:700;">${opts.name} booked a consultation</h1>
    </div>
    <div style="padding:32px;">
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px;background:#fafafa;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#f97316;font-weight:700;margin-bottom:8px;">When</div>
        <div style="font-size:18px;color:#111;font-weight:600;">${opts.dateStr} · ${opts.timeStr}</div>
        ${opts.tz ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">Client TZ: ${opts.tz}</div>` : ""}
        ${opts.istTime ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">IST reference: ${opts.istTime}</div>` : ""}
      </div>

      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:10px;">Client</div>
        <table style="width:100%;border-collapse:collapse;">
          ${row("Name", opts.name)}
          ${row("Email", `<a href="mailto:${opts.email}" style="color:#f97316;text-decoration:none;">${opts.email}</a>`)}
          ${row("Phone", opts.phone)}
          ${row("Channel", opts.channel ? `<a href="${opts.channel}" style="color:#f97316;text-decoration:none;">${opts.channel}</a>` : "")}
        </table>
      </div>

      ${opts.notes ? `
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:8px;">Notes</div>
        <div style="font-size:14px;color:#333;line-height:1.6;">${opts.notes.replace(/\n/g, "<br>")}</div>
      </div>` : ""}

      <div style="background:#0a0a0a;color:#fff;padding:18px;border-radius:12px;text-align:center;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#f97316;font-weight:700;margin-bottom:6px;">Google Meet</div>
        <a href="${opts.meetLink}" style="color:#fff;font-size:14px;text-decoration:none;">${opts.meetLink}</a>
      </div>
    </div>
  </div>
</div>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ConsultBookingRequest = await req.json();
    const {
      clientName,
      clientEmail,
      clientPhone,
      channelUrl,
      preferredDate,
      preferredTime,
      clientTimezone,
      istTime,
      isoStart,
      notes,
    } = body;

    if (!clientName || !clientEmail || !preferredDate || !preferredTime) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const meetLink = UNIVERSAL_MEETING_LINK;

    // Team notification
    const teamRes = await resend.emails.send({
      from: "SwishView Bookings <support@swishview.com>",
      to: TEAM_RECIPIENTS,
      replyTo: clientEmail,
      subject: `🗓 New Consultation — ${clientName} · ${preferredDate} ${preferredTime}`,
      html: teamTemplate({
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        channel: channelUrl,
        dateStr: preferredDate,
        timeStr: preferredTime,
        tz: clientTimezone,
        istTime,
        notes,
        meetLink,
      }),
    });

    // Client confirmation
    const clientRes = await resend.emails.send({
      from: "SwishView <growth@swishview.com>",
      to: [clientEmail],
      replyTo: "growth@swishview.com",
      subject: "Your SwishView consultation is confirmed",

      html: clientTemplate({
        name: clientName,
        dateStr: preferredDate,
        timeStr: preferredTime,
        tz: clientTimezone,
        meetLink,
      }),
    });

    console.log("Consultation emails sent", {
      team: (teamRes as any)?.data?.id,
      client: (clientRes as any)?.data?.id,
      isoStart,
    });

    return new Response(
      JSON.stringify({ success: true, meetingLink: meetLink }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error) {
    console.error("send-consultation-booking error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
