import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = ["emily@swishview.com", "abhi.rishoo2003@gmail.com"];

interface ActivityNotification {
  type: 
    | "new_signup" 
    | "contact_message" 
    | "seo_purchase" 
    | "campaign_created" 
    | "payment_completed"
    | "user_request"
    | "newsletter_subscription"
    | "boost_attempt"
    | "audit_attempt"
    | "tracker_report";
  data: Record<string, any>;
}

const getEmailContent = (type: string, data: Record<string, any>) => {
  const baseStyles = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;

  switch (type) {
    case "new_signup":
      return {
        subject: "🎉 New User Signup on SwishView",
        category: "User Registration",
        emoji: "🎉",
        color: "#10B981",
        html: `
          <div style="${baseStyles}">
            <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New User Signup!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #10B981; margin-top: 0;">User Registration Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10B981;">
                <p style="margin: 10px 0;"><strong>📧 Email:</strong> ${data.email || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>👤 Name:</strong> ${data.full_name || "Not provided"}</p>
                <p style="margin: 10px 0;"><strong>🔐 Auth Method:</strong> ${data.auth_method || "Email/Password"}</p>
                <p style="margin: 10px 0;"><strong>📅 Signed Up:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                A new user has registered on SwishView. You may want to reach out and welcome them!
              </p>
            </div>
          </div>
        `,
      };

    case "contact_message":
      return {
        subject: `📬 New Contact Message: ${data.subject || "No Subject"}`,
        category: "Contact Form",
        emoji: "📬",
        color: "#3B82F6",
        html: `
          <div style="${baseStyles}">
            <div style="background: linear-gradient(135deg, #3B82F6, #2563EB); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📬 New Contact Message!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #3B82F6; margin-top: 0;">Message Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3B82F6;">
                <p style="margin: 10px 0;"><strong>👤 From:</strong> ${data.full_name || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>📧 Email:</strong> ${data.email || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>📋 Subject:</strong> ${data.subject || "No Subject"}</p>
                <p style="margin: 10px 0;"><strong>💬 Message:</strong></p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 10px;">
                  ${(data.message || "No message").replace(/\n/g, "<br>")}
                </div>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Please respond to this inquiry within 12-24 hours.
              </p>
            </div>
          </div>
        `,
      };

    case "seo_purchase":
      return {
        subject: `💰 New SEO Purchase - $${data.amount || 0}`,
        category: "SEO Purchase",
        emoji: "💰",
        color: "#F59E0B",
        html: `
          <div style="${baseStyles}">
            <div style="background: linear-gradient(135deg, #F59E0B, #D97706); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">💰 New SEO Purchase!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #F59E0B; margin-top: 0;">Purchase Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B;">
                <p style="margin: 10px 0;"><strong>👤 User:</strong> ${data.user_email || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>📦 Plan:</strong> ${data.plan_name || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>💵 Amount:</strong> $${data.amount || 0}</p>
                <p style="margin: 10px 0;"><strong>🔗 Channel URL:</strong> ${data.channel_url || "Not provided"}</p>
                <p style="margin: 10px 0;"><strong>📅 Purchased:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Please assign a manager and begin the SEO campaign setup.
              </p>
            </div>
          </div>
        `,
      };

    case "campaign_created":
      return {
        subject: `🚀 New Campaign Created: ${data.title || "Untitled"}`,
        category: "Campaign",
        emoji: "🚀",
        color: "#8B5CF6",
        html: `
          <div style="${baseStyles}">
            <div style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🚀 New Campaign Created!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #8B5CF6; margin-top: 0;">Campaign Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #8B5CF6;">
                <p style="margin: 10px 0;"><strong>📝 Title:</strong> ${data.title || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>👤 User:</strong> ${data.user_email || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>💵 Budget:</strong> $${data.budget || 0}</p>
                <p style="margin: 10px 0;"><strong>🎯 Target Views:</strong> ${data.target_views?.toLocaleString() || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>🔗 Video URL:</strong> ${data.youtube_video_url || "N/A"}</p>
              </div>
            </div>
          </div>
        `,
      };

    case "payment_completed":
      return {
        subject: `✅ Payment Completed - $${data.amount || 0}`,
        category: "Payment",
        emoji: "✅",
        color: "#059669",
        html: `
          <div style="${baseStyles}">
            <div style="background: linear-gradient(135deg, #059669, #047857); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">✅ Payment Completed!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #059669; margin-top: 0;">Payment Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #059669;">
                <p style="margin: 10px 0;"><strong>👤 User:</strong> ${data.user_email || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>💵 Amount:</strong> $${data.amount || 0}</p>
                <p style="margin: 10px 0;"><strong>📦 Campaign:</strong> ${data.campaign_title || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>🔖 Status:</strong> ${data.status || "completed"}</p>
              </div>
            </div>
          </div>
        `,
      };

    case "user_request":
      return {
        subject: `📋 New User Request: ${data.subject || "Support Request"}`,
        category: "User Request",
        emoji: "📋",
        color: "#EC4899",
        html: `
          <div style="${baseStyles}">
            <div style="background: linear-gradient(135deg, #EC4899, #DB2777); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📋 New User Request!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #EC4899; margin-top: 0;">Request Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #EC4899;">
                <p style="margin: 10px 0;"><strong>👤 User:</strong> ${data.user_email || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>📋 Type:</strong> ${data.request_type || "General"}</p>
                <p style="margin: 10px 0;"><strong>📝 Subject:</strong> ${data.subject || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>💬 Message:</strong></p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 10px;">
                  ${(data.message || "No message").replace(/\n/g, "<br>")}
                </div>
              </div>
            </div>
          </div>
        `,
      };

    case "newsletter_subscription":
      return {
        subject: "📰 New Newsletter Subscription",
        category: "Newsletter",
        emoji: "📰",
        color: "#6366F1",
        html: `
          <div style="${baseStyles}">
            <div style="background: linear-gradient(135deg, #6366F1, #4F46E5); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📰 New Newsletter Subscriber!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #6366F1; margin-top: 0;">Subscription Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6366F1;">
                <p style="margin: 10px 0;"><strong>📧 Email:</strong> ${data.email || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>📅 Subscribed:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                A new user has subscribed to the SwishView newsletter!
              </p>
            </div>
          </div>
        `,
      };

    case "boost_attempt":
      return {
        subject: `⚡ Boost Attempt - ${data.name || data.email || "Unknown"} - $${data.amount || 0}`,
        category: "Boost Attempt",
        emoji: "⚡",
        color: "#EF4444",
        html: `
          <div style="${baseStyles}">
            <div style="background: linear-gradient(135deg, #EF4444, #DC2626); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⚡ New Boost Attempt!</h1>
              <p style="color: #fecaca; margin: 5px 0 0; font-size: 14px;">A potential client is trying to purchase — follow up if payment fails!</p>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #EF4444; margin-top: 0;">Client Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #EF4444;">
                <p style="margin: 10px 0;"><strong>👤 Name:</strong> ${data.name || "Not provided"}</p>
                <p style="margin: 10px 0;"><strong>📧 Email:</strong> ${data.email || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>🔗 Channel:</strong> ${data.channelUrl || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>💵 Amount:</strong> $${data.amount || 0}</p>
                <p style="margin: 10px 0;"><strong>👁️ Est. Views:</strong> ${data.minViews?.toLocaleString() || 0} — ${data.maxViews?.toLocaleString() || 0}</p>
                <p style="margin: 10px 0;"><strong>📅 Attempted:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <div style="background: #FEF2F2; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #FECACA;">
                <p style="color: #991B1B; font-weight: bold; margin: 0 0 5px;">⚠️ Action Required</p>
                <p style="color: #7F1D1D; margin: 0; font-size: 14px;">
                  This client is being redirected to payment. If they don't complete checkout, reach out to them at <strong>${data.email}</strong> to assist and guide them through the process.
                </p>
              </div>
            </div>
          </div>
        `,
      };

    case "audit_attempt":
      return {
        subject: `🔍 Channel Audit Attempt - ${data.email || "Unknown"}`,
        category: "Audit Attempt",
        emoji: "🔍",
        color: "#F59E0B",
        html: `
          <div style="${baseStyles}">
            <div style="background: linear-gradient(135deg, #F59E0B, #D97706); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🔍 Channel Audit Purchase Attempt!</h1>
              <p style="color: #fef3c7; margin: 5px 0 0; font-size: 14px;">A user is trying to buy a channel audit — follow up if payment fails!</p>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #F59E0B; margin-top: 0;">Client Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B;">
                <p style="margin: 10px 0;"><strong>📧 Email:</strong> ${data.email || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>🔗 Channel:</strong> ${data.channelUrl || "N/A"}</p>
                <p style="margin: 10px 0;"><strong>💵 Amount:</strong> $${data.amount || 0}</p>
                <p style="margin: 10px 0;"><strong>📅 Attempted:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <div style="background: #FFFBEB; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #FDE68A;">
                <p style="color: #92400E; font-weight: bold; margin: 0 0 5px;">⚠️ Action Required</p>
                <p style="color: #78350F; margin: 0; font-size: 14px;">
                  This client is being redirected to payment. If they don't complete checkout, reach out at <strong>${data.email}</strong> to guide them.
                </p>
              </div>
            </div>
          </div>
        `,
      };

    case "tracker_report": {
      const metricRow = (label: string, value: any) => `
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600; color: #374151;">${label}</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #111827;">${value ?? 0}</td>
        </tr>
      `;
      const attachmentsHtml = Array.isArray(data.attachment_urls) && data.attachment_urls.length
        ? `<p style="margin: 15px 0 5px;"><strong>📎 Attachments:</strong></p><ul style="margin: 0; padding-left: 20px;">${data.attachment_urls.map((u: string) => `<li><a href="${u}" style="color:#0EA5E9;">${u}</a></li>`).join("")}</ul>`
        : "";
      return {
        subject: `${data.is_edit ? "✏️ Tracker Report Edited" : "📝 New Tracker Report"} - ${data.user_name || data.user_email} (${data.report_date})`,
        category: "Tracker Report",
        emoji: "📝",
        color: "#0EA5E9",
        html: `
          <div style="${baseStyles}">
            <div style="background: linear-gradient(135deg, #0EA5E9, #0284C7); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${data.is_edit ? "✏️ Tracker Report Edited" : "📝 New Tracker Report Submitted"}</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #0EA5E9;">
                <p style="margin: 5px 0;"><strong>👤 User:</strong> ${data.user_name || "N/A"} (${data.user_email || "N/A"})</p>
                <p style="margin: 5px 0;"><strong>📅 Report Date:</strong> ${data.report_date || "N/A"}</p>
                <p style="margin: 5px 0;"><strong>🕒 Submitted:</strong> ${new Date().toLocaleString()}</p>
                ${data.is_edit ? `<p style="margin: 5px 0; color: #D97706;"><strong>⚠ Edit #${data.edited_count}</strong></p>` : ""}
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
                  ${metricRow("📧 Emails Sent", data.emails_sent)}
                  ${metricRow("💰 Sales", data.sales_numbers)}
                  ${metricRow("📞 Calls Made", data.calls_made)}
                  ${metricRow("👥 Meetings", data.meetings_attended)}
                  ${metricRow("✅ Tasks Completed", data.tasks_completed)}
                  ${metricRow("🎯 Leads Generated", data.leads_generated)}
                  ${metricRow("🔄 Follow-ups", data.follow_ups_done)}
                  ${metricRow("📚 Blogs Created", data.blogs_created)}
                  ${metricRow("😊 Mood Rating", data.mood_rating)}
                </table>
                ${data.blockers ? `<p style="margin: 15px 0 5px;"><strong>🚧 Blockers:</strong></p><div style="background: #FEF2F2; padding: 12px; border-radius: 6px; color: #7F1D1D;">${String(data.blockers).replace(/\n/g, "<br>")}</div>` : ""}
                ${data.additional_notes ? `<p style="margin: 15px 0 5px;"><strong>📝 Notes:</strong></p><div style="background: #F3F4F6; padding: 12px; border-radius: 6px;">${String(data.additional_notes).replace(/\n/g, "<br>")}</div>` : ""}
                ${attachmentsHtml}
              </div>
            </div>
          </div>
        `,
      };
    }

    default:
      return {
        subject: "📢 SwishView Activity Notification",
        category: "General",
        emoji: "📢",
        color: "#6B7280",
        html: `
          <div style="${baseStyles}">
            <div style="background: linear-gradient(135deg, #6B7280, #4B5563); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📢 Activity Notification</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #6B7280; margin-top: 0;">Activity Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6B7280;">
                <pre style="white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</pre>
              </div>
            </div>
          </div>
        `,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data }: ActivityNotification = await req.json();

    console.log(`Processing ${type} notification:`, data);

    const emailContent = getEmailContent(type, data);

    const emailResponse = await resend.emails.send({
      from: "SwishView Notifications <support@swishview.com>",
      to: ADMIN_EMAILS,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-user-activity function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
