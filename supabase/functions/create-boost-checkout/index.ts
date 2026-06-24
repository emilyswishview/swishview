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
    const { amount, email, name, channelUrl, minViews, maxViews } = await req.json();

    if (!amount || amount < 50 || !email || !channelUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields or amount below minimum ($50)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe configuration missing");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Create a one-time checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Channel Boost Package",
              description: `${minViews.toLocaleString()} – ${maxViews.toLocaleString()} views • Video promotion • Blog creation • Channel growth`,
            },
            unit_amount: Math.round(amount * 100), // cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "boost",
        email,
        name: name || "",
        channelUrl,
        amount: amount.toString(),
        minViews: minViews.toString(),
        maxViews: maxViews.toString(),
      },
      success_url: `${req.headers.get("origin") || "https://swishview.lovable.app"}/success?session_id={CHECKOUT_SESSION_ID}&type=boost`,
      cancel_url: `${req.headers.get("origin") || "https://swishview.lovable.app"}/boost`,
    });

    // Auto-create a promotion record in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Check if user exists, if not we'll create the promotion without user_id linkage
    // The promotion will be linked later when they create an account or admin assigns it
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      await supabaseAdmin.from("promotions").insert({
        user_id: existingProfile.id,
        title: `Channel Boost – ${name || email}`,
        youtube_video_url: channelUrl,
        channel_url: channelUrl,
        target_views: maxViews,
        budget: amount,
        promotion_type: "channel",
        status: "pending",
        starting_views: 0,
        current_views: 0,
      });
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Boost checkout error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
