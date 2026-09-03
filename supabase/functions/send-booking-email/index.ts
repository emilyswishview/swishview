 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { Resend } from "npm:resend@2.0.0";
 
 const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
 const SUPPORT_EMAIL = "support@swishview.com";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface BookingRequest {
   clientName: string;
   clientEmail: string;
   clientPhone?: string;
   selectedManager: string;
   duration: string;
   projectDetails?: string;
 }
 
 const handler = async (req: Request): Promise<Response> => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { 
       clientName, 
       clientEmail, 
       clientPhone, 
       selectedManager, 
       duration, 
       projectDetails 
     }: BookingRequest = await req.json();
 
     console.log("Sending booking email to support:", { clientName, clientEmail, selectedManager, duration });
 
     const currentDate = new Date().toLocaleString('en-US', { 
       weekday: 'long', 
       year: 'numeric', 
       month: 'long', 
       day: 'numeric',
       hour: '2-digit',
       minute: '2-digit'
     });
 
     const projectDetailsHtml = projectDetails 
       ? `<div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dee2e6;">
           <h3 style="color: #495057; margin-top: 0;">Project Details</h3>
           <p style="line-height: 1.6; color: #212529;">${projectDetails.replace(/\n/g, '<br>')}</p>
         </div>`
       : '';
 
     // Send notification to support team at SwishView
     const emailResponse = await resend.emails.send({
       from: "SwishView Bookings <support@swishview.com>",
       to: [SUPPORT_EMAIL],
       replyTo: clientEmail,
       subject: `🔔 New Project Booking Request - ${clientName}`,
       html: `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
           <div style="background-color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
             <h1 style="color: #fff; margin: 0; font-size: 24px;">SwishView</h1>
           </div>
           
           <div style="background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-top: none;">
             <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px; margin-top: 0;">
               New Project Booking Request
             </h2>
             
             <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
               Received on ${currentDate}
             </p>
             
             <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dee2e6;">
               <h3 style="color: #495057; margin-top: 0;">Client Information</h3>
               <p><strong>Name:</strong> ${clientName}</p>
               <p><strong>Email:</strong> <a href="mailto:${clientEmail}" style="color: #007bff;">${clientEmail}</a></p>
               ${clientPhone ? `<p><strong>Phone:</strong> ${clientPhone}</p>` : ''}
             </div>
             
             <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dee2e6;">
               <h3 style="color: #495057; margin-top: 0;">Booking Details</h3>
               <p><strong>Selected Growth Manager:</strong> ${selectedManager}</p>
               <p><strong>Project Duration:</strong> ${duration}</p>
             </div>
             
             ${projectDetailsHtml}
             
             <div style="background-color: #000; color: #fff; padding: 15px 20px; border-radius: 8px; margin-top: 20px;">
               <p style="margin: 0; font-weight: bold;">⏰ Action Required</p>
               <p style="margin: 8px 0 0 0;">Please reach out to the client within 24 hours to discuss their project.</p>
             </div>
           </div>
           
           <div style="text-align: center; padding: 15px; color: #6c757d; font-size: 12px;">
             <p style="margin: 0;">This booking request was submitted through the SwishView website.</p>
           </div>
         </div>
       `,
     });
 
     console.log("Support notification sent:", emailResponse);
 
     // Send confirmation email to client
     const clientEmailResponse = await resend.emails.send({
       from: "SwishView <noreply@swishview.com>",
       to: [clientEmail],
       subject: "We've Received Your Project Booking Request!",
       html: `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
           <div style="background-color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
             <h1 style="color: #fff; margin: 0; font-size: 24px;">SwishView</h1>
           </div>
           
           <div style="background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-top: none;">
             <h2 style="color: #333; margin-top: 0;">Thank You, ${clientName}!</h2>
             
             <p style="font-size: 16px; line-height: 1.6;">We've received your project booking request and our team will connect with you soon.</p>
             
             <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dee2e6;">
               <h3 style="color: #495057; margin-top: 0;">Your Booking Summary</h3>
               <p><strong>Selected Growth Manager:</strong> ${selectedManager}</p>
               <p><strong>Project Duration:</strong> ${duration}</p>
             </div>
             
             <p style="font-size: 16px; line-height: 1.6;">One of our team members will reach out to you within 24 hours to discuss the next steps and answer any questions you may have.</p>
             
             <p style="font-size: 16px; line-height: 1.6;">Best regards,<br><strong>The SwishView Team</strong></p>
           </div>
           
           <div style="text-align: center; padding: 15px; color: #6c757d; font-size: 12px;">
             <p style="margin: 0;">© ${new Date().getFullYear()} SwishView. All rights reserved.</p>
           </div>
         </div>
       `,
     });
 
     console.log("Client confirmation sent:", clientEmailResponse);
     console.log("All booking emails sent successfully");
 
     return new Response(JSON.stringify({ success: true }), {
       status: 200,
       headers: { "Content-Type": "application/json", ...corsHeaders },
     });
   } catch (error: any) {
     console.error("Error in send-booking-email function:", error);
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