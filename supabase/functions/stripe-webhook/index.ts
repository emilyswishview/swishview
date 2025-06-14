
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      
      const campaignId = session.metadata?.campaignId;
      const userId = session.metadata?.userId;
      
      if (campaignId && userId) {
        try {
          // Create payment record
          const { error: paymentError } = await supabase
            .from("payments")
            .insert([{
              campaign_id: campaignId,
              user_id: userId,
              amount: (session.amount_total || 0) / 100, // Convert from cents
              status: "completed",
              stripe_payment_intent_id: session.payment_intent as string,
            }]);

          if (paymentError) {
            console.error("Payment insert error:", paymentError);
          }

          // Update campaign status to active
          const { error: campaignError } = await supabase
            .from("campaigns")
            .update({ status: "active" })
            .eq("id", campaignId);

          if (campaignError) {
            console.error("Campaign update error:", campaignError);
          }

          console.log(`Payment processed for campaign ${campaignId}`);
        } catch (error) {
          console.error("Error processing payment:", error);
        }
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
