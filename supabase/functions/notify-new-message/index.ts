import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MessagePayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    full_name: string;
    email: string;
    subject: string;
    message: string;
    created_at: string;
  };
  schema: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: MessagePayload = await req.json();
    
    console.log("Received webhook payload:", JSON.stringify(payload, null, 2));

    // Extract message data from the payload
    const { record } = payload;
    
    if (!record) {
      console.error("No record found in payload");
      return new Response(
        JSON.stringify({ error: "No record found in payload" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { full_name, email, subject, message, created_at } = record;
    
    // Format timestamp
    const formattedDate = new Date(created_at).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    });

    console.log("Sending notification email for message from:", full_name, email);

    // Send email notification to both addresses
    const emailResponse = await resend.emails.send({
      from: "SwishView Notifications <support@swishview.com>",
      to: ["emily@swishview.com", "abhi.rishoo2003@gmail.com"],
      subject: `📬 New Contact Message: ${subject || "No Subject"}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
                📬 New Contact Message
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
                Someone reached out through the contact form
              </p>
            </div>
            
            <div style="background-color: white; border-radius: 0 0 12px 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #fef3c7; border-left: 4px solid #f97316; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #92400e; font-weight: 500;">
                  ⏰ Received: ${formattedDate}
                </p>
              </div>
              
              <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Sender Information
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 100px;">Name:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${full_name || "Not provided"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <a href="mailto:${email}" style="color: #f97316; text-decoration: none; font-weight: 500;">${email || "Not provided"}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Subject:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${subject || "No subject"}</td>
                  </tr>
                </table>
              </div>
              
              <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Message Content
                </h3>
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                  <p style="margin: 0; color: #374151; line-height: 1.6; white-space: pre-wrap;">${message || "No message content"}</p>
                </div>
              </div>
              
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || "Your message to SwishView")}" 
                   style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Reply to ${full_name || "Sender"}
                </a>
              </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">This is an automated notification from SwishView</p>
              <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} SwishView. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-new-message function:", error);
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
