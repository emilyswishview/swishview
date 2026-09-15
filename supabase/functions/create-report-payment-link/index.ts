import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_LOOKUP_KEY = "swishview_weekly_report_50";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe configuration missing");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Reuse the existing $50 weekly report price if it already exists.
    let price: Stripe.Price | undefined;
    const existingPrices = await stripe.prices.list({
      lookup_keys: [PRICE_LOOKUP_KEY],
      active: true,
      limit: 1,
    });
    price = existingPrices.data[0];

    if (!price) {
      const product = await stripe.products.create({
        name: "SwishView Weekly Channel Report",
        description:
          "Weekly YouTube channel performance report with growth insights and recommendations, delivered every week.",
      });

      price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: 5000,
        recurring: { interval: "week" },
        lookup_key: PRICE_LOOKUP_KEY,
      });
    }

    // Reuse an existing payment link for this price when possible.
    const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
    let link = links.data.find(
      (l) => l.metadata?.lookup_key === PRICE_LOOKUP_KEY,
    );

    if (!link) {
      link = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { lookup_key: PRICE_LOOKUP_KEY, plan: "weekly_report" },
        allow_promotion_codes: true,
      });
    }

    return new Response(JSON.stringify({ url: link.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-report-payment-link error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Unexpected error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
