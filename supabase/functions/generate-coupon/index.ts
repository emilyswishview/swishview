import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Simple email sender using fetch instead of npm package
async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return null;
  }
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SwishView <noreply@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  
  return response.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a unique coupon code
function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SEO';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting generate-coupon function");

    // Use service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const requestBody = await req.json();
    const { userId, seoPurchaseId, userEmail, planName } = requestBody;

    if (!userId || !seoPurchaseId || !userEmail) {
      throw new Error("Missing required parameters");
    }

    console.log("Generating coupon for user:", userEmail);

    // Generate unique coupon code
    let couponCode = generateCouponCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const { data: existing, error: checkError } = await supabaseClient
        .from('coupons')
        .select('id')
        .eq('code', couponCode)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // No existing coupon found, code is unique
        break;
      }

      if (existing) {
        // Code exists, generate a new one
        couponCode = generateCouponCode();
        attempts++;
      } else {
        break;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique coupon code");
    }

    // Set expiration date (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Create coupon record
    const { data: coupon, error: couponError } = await supabaseClient
      .from('coupons')
      .insert([{
        user_id: userId,
        seo_purchase_id: seoPurchaseId,
        code: couponCode,
        amount: 250.00,
        status: 'active',
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();

    if (couponError) {
      console.error("Error creating coupon:", couponError);
      throw new Error("Failed to create coupon");
    }

    console.log("Coupon created:", coupon.code);

    // Update SEO purchase to mark coupon as generated
    const { error: updateError } = await supabaseClient
      .from('seo_purchases')
      .update({ coupon_generated: true })
      .eq('id', seoPurchaseId);

    if (updateError) {
      console.error("Error updating SEO purchase:", updateError);
    }

    // Send email notification
    try {
      const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin-bottom: 10px;">🎉 Congratulations!</h1>
              <p style="color: #666; font-size: 18px;">Your SEO Optimization purchase includes a special bonus!</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
              <h2 style="margin: 0 0 10px 0; font-size: 24px;">$250 Bonus Coupon</h2>
              <div style="background: white; color: #333; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">
                ${coupon.code}
              </div>
              <p style="margin: 0; opacity: 0.9;">Use this code for your next video promotion campaign!</p>
            </div>

            <div style="background: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 30px;">
              <h3 style="color: #333; margin-top: 0;">How to use your coupon:</h3>
              <ul style="color: #666; line-height: 1.6;">
                <li>Go to your SwishView dashboard</li>
                <li>Create a new video promotion campaign</li>
                <li>Enter the coupon code during checkout</li>
                <li>Enjoy $250 off your campaign cost!</li>
              </ul>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
              <p style="margin: 0; color: #92400e; font-weight: 500;">
                ⏰ Your coupon expires on ${expiresAt.toLocaleDateString()}
              </p>
            </div>

            <div style="text-align: center;">
              <p style="color: #666; margin-bottom: 20px;">Thank you for choosing our SEO Optimization service for <strong>${planName}</strong>!</p>
              <a href="${Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").replace(".supabase.co", "")}/dashboard" 
                 style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>

            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                SwishView - YouTube Growth Made Simple
              </p>
            </div>
          </div>
        `;
      
      const emailResponse = await sendEmail(userEmail, "🎉 Your $250 Bonus Coupon is Ready!", emailHtml);
      console.log("Email sent successfully:", emailResponse);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
    }

    // Create notification for the user
    try {
      const { error: notificationError } = await supabaseClient
        .from('notifications')
        .insert([{
          user_id: userId,
          title: '🎉 Bonus Coupon Generated!',
          message: `Your $250 bonus coupon "${coupon.code}" is ready to use! Check your email for details.`,
          type: 'success'
        }]);

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }
    } catch (notificationError) {
      console.error("Error with notification:", notificationError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        coupon: {
          code: coupon.code,
          amount: coupon.amount,
          expires_at: coupon.expires_at
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in generate-coupon:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unexpected error occurred",
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});