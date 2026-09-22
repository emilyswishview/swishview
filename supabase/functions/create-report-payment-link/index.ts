import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// IMPORTANT:
// This is a NEW lookup key because the old price was weekly.
// Stripe Prices are immutable, so we create/use a monthly price instead.
const PRICE_LOOKUP_KEY = "swishview_monthly_report_50";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
      throw new Error("Stripe configuration missing");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // ---------------------------------------------------------
    // 1. Find the MONTHLY $50 price
    // ---------------------------------------------------------

    let price: Stripe.Price | undefined;

    const existingPrices = await stripe.prices.list({
      lookup_keys: [PRICE_LOOKUP_KEY],
      active: true,
      limit: 1,
    });

    price = existingPrices.data[0];

    // ---------------------------------------------------------
    // 2. Create the monthly price if it doesn't exist
    // ---------------------------------------------------------

    if (!price) {
      // Create product
      const product = await stripe.products.create({
        name: "SwishView Weekly Channel Report",
        description:
          "Weekly YouTube channel performance report with growth insights and recommendations, delivered every week.",
      });

      // $50 MONTHLY subscription
      price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: 5000,

        // IMPORTANT:
        // Customer is billed monthly.
        // Your report can still be delivered weekly.
        recurring: {
          interval: "month",
        },

        lookup_key: PRICE_LOOKUP_KEY,
      });
    }

    // ---------------------------------------------------------
    // 3. Make sure we are actually using a MONTHLY price
    // ---------------------------------------------------------

    if (
      price.recurring?.interval !== "month" ||
      price.unit_amount !== 5000
    ) {
      throw new Error(
        "The SwishView subscription price is not configured as $50/month.",
      );
    }

    // ---------------------------------------------------------
    // 4. Find existing Payment Link for this monthly plan
    // ---------------------------------------------------------

    const links = await stripe.paymentLinks.list({
      active: true,
      limit: 100,
    });

    let link = links.data.find(
      (l) =>
        l.metadata?.lookup_key === PRICE_LOOKUP_KEY &&
        l.line_items?.data?.some(
          (item) => item.price?.id === price!.id,
        ),
    );

    // ---------------------------------------------------------
    // 5. Create Payment Link if needed
    // ---------------------------------------------------------

    if (!link) {
      link = await stripe.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],

        metadata: {
          lookup_key: PRICE_LOOKUP_KEY,
          plan: "weekly_report",
          billing_interval: "monthly",
          report_frequency: "weekly",
        },

        allow_promotion_codes: true,
      });
    }

    // ---------------------------------------------------------
    // 6. Return Payment Link
    // ---------------------------------------------------------

    return new Response(
      JSON.stringify({
        url: link.url,
        price_id: price.id,
        billing: "monthly",
        report_frequency: "weekly",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );
  } catch (error) {
    console.error("create-report-payment-link error:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      },
    );
  }
});