import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting create-audit-checkout function");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const requestBody = await req.json();
    console.log("Request body:", requestBody);
    
    const { channelUrl, email, amount, returnUrl } = requestBody;

    if (!channelUrl || !email || !amount) {
      throw new Error("Missing required parameters: channelUrl, email, or amount");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Create audit submission record
    const { data: auditSubmission, error: auditError } = await supabaseClient
      .from("audit_submissions")
      .insert([{
        channel_url: channelUrl,
        email: email,
        amount: amount / 100, // Convert cents to dollars
        status: 'pending'
      }])
      .select()
      .single();

    if (auditError) {
      console.error("Error creating audit submission:", auditError);
      throw new Error(`Failed to create audit submission: ${auditError.message}`);
    }

    console.log("Audit submission created:", auditSubmission.id);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not found in environment");
      throw new Error("Stripe configuration missing");
    }

    console.log("Initializing Stripe...");
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check for existing customer
    console.log("Checking for existing customer...");
    const customers = await stripe.customers.list({ 
      email: email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    }

    console.log("Creating checkout session...");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "YouTube Channel Audit — Monthly Subscription",
              description: "Monthly Performance Checkup with personalized improvement report",
            },
            unit_amount: amount,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${returnUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?audit=cancelled`,
      metadata: {
        auditSubmissionId: auditSubmission.id,
        channelUrl: channelUrl,
        email: email,
        serviceType: 'instant_audit',
      },
    });

    console.log("Checkout session created:", session.id);

    // Update audit submission with stripe session ID
    await supabaseClient
      .from("audit_submissions")
      .update({ stripe_session_id: session.id })
      .eq("id", auditSubmission.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in create-audit-checkout:", error);
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