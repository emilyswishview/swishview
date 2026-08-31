import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  userEmail: string;
  userName: string;
  subject: string;
  message: string;
  requestType: string;
  requestId?: string;
  attachmentUrls?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userEmail, 
      userName, 
      subject, 
      message, 
      requestType,
      requestId,
      attachmentUrls = []
    }: SupportEmailRequest = await req.json();

    console.log("Sending support email:", { userEmail, userName, subject, requestType, requestId, attachmentCount: attachmentUrls.length });

    // Format request type for better readability
    const formatRequestType = (type: string) => {
      switch (type) {
        case 'channel_report':
          return 'Channel Report Request';
        case 'support_request':
          return 'Support Request';
        case 'general':
          return 'General Request';
        case 'campaign_creation':
          return 'Campaign Creation Help';
        case 'seo_service':
          return 'SEO Service Request';
        default:
          return 'Support Request';
      }
    };

    const emailResponse = await resend.emails.send({
      from: "SwishView Support <onboarding@resend.dev>",
      to: ["support@swishview.com", "emily@swishview.com"],
      reply_to: userEmail,
      subject: `[${formatRequestType(requestType)}] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            ${formatRequestType(requestType)}
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Request Details</h3>
            <p><strong>From:</strong> ${userName} (${userEmail})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Type:</strong> ${formatRequestType(requestType)}</p>
            ${requestId ? `<p><strong>Request ID:</strong> ${requestId}</p>` : ''}
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
            <h3 style="color: #495057; margin-top: 0;">Message</h3>
            <p style="line-height: 1.6; color: #212529;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          
          ${attachmentUrls.length > 0 ? `
            <div style="background-color: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Attachments</h3>
              <p style="color: #6c757d; margin-bottom: 10px;">
                ${attachmentUrls.length} file(s) attached to this request. Access them through the admin panel.
              </p>
              <ul style="margin: 0; padding-left: 20px;">
                ${attachmentUrls.map(url => `<li style="color: #495057;">${url.split('/').pop()}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; color: #6c757d; font-size: 14px;">
            <p>This email was sent from the SwishView support system.</p>
            <p>Please respond to this request through the admin panel or by replying to this email.</p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-support-email function:", error);
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