
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PayPal API configuration
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com"; // Use https://api-m.paypal.com for production

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting create-paypal-order function");
    
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
    
    const { campaignId, amount, campaignTitle, returnUrl } = requestBody;

    if (!campaignId || !amount || !campaignTitle) {
      throw new Error("Missing required parameters: campaignId, amount, or campaignTitle");
    }

    // Validate PayPal credentials
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("PayPal credentials not configured");
    }

    // Get PayPal access token
    console.log("Getting PayPal access token...");
    const authResponse = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET)}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error("PayPal auth error:", errorText);
      throw new Error("Failed to get PayPal access token");
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    console.log("Creating PayPal order...");
    // Create PayPal order
    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: "USD",
            value: amount.toString()
          },
          description: `Campaign: ${campaignTitle}`
        }],
        application_context: {
          return_url: `${returnUrl}?payment=success`,
          cancel_url: `${returnUrl}?payment=cancelled`,
          brand_name: "Swish View",
          user_action: "PAY_NOW"
        }
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      console.error("PayPal order creation failed:", errorData);
      throw new Error("Failed to create PayPal order");
    }

    const orderData = await orderResponse.json();
    console.log("PayPal order created:", orderData.id);

    // Get approval URL
    const approvalUrl = orderData.links.find((link: any) => link.rel === "approve")?.href;

    return new Response(
      JSON.stringify({ 
        orderId: orderData.id,
        approvalUrl: approvalUrl 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in create-paypal-order:", error);
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
