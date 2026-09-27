import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => { // v2
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email.endsWith("@swishview.com")) {
      return new Response(JSON.stringify({ error: "Only @swishview.com emails are allowed." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // If user already exists, try to update password instead (helps seed admin)
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
    if (existing) {
      // Only allow self-reset for the well-known admin seed email, otherwise reject
      if (email === "emilyadmin@swishview.com") {
        await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
        return new Response(JSON.stringify({ ok: true, updated: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Account already exists. Please sign in." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Create failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
