import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured. Please enable Lovable AI." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: "Please provide a prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating thumbnail with prompt:", prompt.slice(0, 100));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: `Generate a YouTube thumbnail image: ${prompt}`
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `AI gateway error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("API Response structure:", Object.keys(data));
    
    // Extract image from response
    let imageUrl = null;
    
    // Check for images array in message
    if (data.choices?.[0]?.message?.images?.[0]) {
      const img = data.choices[0].message.images[0];
      if (img.image_url?.url) {
        imageUrl = img.image_url.url;
      } else if (img.inline_data) {
        imageUrl = `data:${img.inline_data.mime_type || "image/png"};base64,${img.inline_data.data}`;
      }
    }
    
    // Check if content is base64 image
    if (!imageUrl) {
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.startsWith("data:image")) {
        imageUrl = content;
      }
    }

    if (!imageUrl) {
      console.error("No image in response. Full response:", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "No image generated from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Thumbnail generated successfully");
    return new Response(
      JSON.stringify({ image: imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-thumbnail:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
