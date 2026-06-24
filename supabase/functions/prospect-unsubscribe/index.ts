// Public, unauthenticated unsubscribe endpoint.
// The footer link in outreach emails points to
//   https://www.swishview.com/?unsubscribe=<base64url(email)>
// The Index page renders a small confirmation card and POSTs the token here.
// We mark every prospects row that matches the recipient address as
// `data.unsubscribed = true` so future sends are blocked.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const b64urlDecode = (s: string): string => {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    return atob(b64);
  } catch {
    return "";
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token") || "";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        token = (body?.token || token || "").toString();
      } catch { /* ignore */ }
    }
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "Missing token" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = b64urlDecode(token).trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid token" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET = preview only (don't mutate). POST = actually unsubscribe.
    if (req.method === "GET") {
      return new Response(JSON.stringify({ ok: true, email }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Find every prospects row whose recipient email matches (case-insensitive).
    const { data: matches } = await supabase
      .from("prospects")
      .select("id, data")
      .ilike("data->>email", email);

    const now = new Date().toISOString();
    let updated = 0;
    for (const row of matches || []) {
      const newData = { ...(row.data || {}), unsubscribed: true, unsubscribedAt: now };
      const { error } = await supabase
        .from("prospects")
        .update({ data: newData } as any)
        .eq("id", row.id);
      if (!error) updated++;
    }

    return new Response(JSON.stringify({ ok: true, email, updated }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("prospect-unsubscribe error", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
