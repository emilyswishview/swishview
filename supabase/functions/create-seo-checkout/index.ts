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
    console.log("Starting create-seo-checkout function");
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Authenticating user...");
    
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      console.error("User authentication error:", userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = data.user;
    if (!user?.email) {
      console.error("User not authenticated or no email");
      throw new Error("User not authenticated or email not available");
    }

    console.log("User authenticated:", user.email);

    // Get request body
    const requestBody = await req.json();
    console.log("Request body:", requestBody);
    
    const { planId, amount, planName, returnUrl, promoCode, discount } = requestBody;

    if (!planId || !amount || !planName) {
      throw new Error("Missing required parameters: planId, amount, or planName");
    }

    // Verify the SEO plan exists
    const { data: seoPlan, error: planError } = await supabaseClient
      .from('seo_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !seoPlan) {
      throw new Error("Invalid SEO plan selected");
    }

    // Check if Stripe key exists
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not found in environment");
      throw new Error("Stripe configuration missing");
    }

    console.log("Initializing Stripe...");
    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    console.log("Checking for existing customer...");
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    } else {
      console.log("No existing customer found");
    }

    console.log("Creating checkout session...");
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `SEO Optimization: ${planName}`,
              description: "YouTube SEO Optimization - Monthly Subscription",
            },
            unit_amount: amount, // Amount in cents
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${returnUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?payment=cancelled`,
      metadata: {
        planId: planId,
        userId: user.id,
        serviceType: 'seo_optimization',
        promoCode: promoCode || '',
        discount: discount?.toString() || '0'
      },
    });

    console.log("Checkout session created:", session.id);

    // Create SEO purchase record
    const { error: purchaseError } = await supabaseClient
      .from('seo_purchases')
      .insert([{
        user_id: user.id,
        seo_plan_id: planId,
        stripe_session_id: session.id,
        amount: amount / 100, // Convert back from cents
        status: 'pending',
        promo_code_used: promoCode || null,
        discount_applied: discount || 0
      }]);

    if (purchaseError) {
      console.error("Error creating SEO purchase record:", purchaseError);
      // Don't throw here as Stripe session is already created
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in create-seo-checkout:", error);
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