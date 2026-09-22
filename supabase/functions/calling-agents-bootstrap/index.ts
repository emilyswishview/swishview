import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AGENTS = [
  { email: "swishviewsales1@swishview.com", password: "pizza@1298" },
  { email: "swishviewsales2@swishview.com", password: "burger@1299" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const results: Record<string, string> = {};

    for (const a of AGENTS) {
      // Find existing user by email (paginate defensively).
      let found: any = null;
      for (let page = 1; page <= 20 && !found; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        const users = data?.users || [];
        found = users.find((u: any) => (u.email || "").toLowerCase() === a.email) || null;
        if (users.length < 200) break;
      }

      if (found) {
        const { error } = await admin.auth.admin.updateUserById(found.id, {
          password: a.password,
          email_confirm: true,
        });
        results[a.email] = error ? `update failed: ${error.message}` : "password updated";
      } else {
        const { data: created, error } = await admin.auth.admin.createUser({
          email: a.email,
          password: a.password,
          email_confirm: true,
        });
        if (error) { results[a.email] = `create failed: ${error.message}`; continue; }
        found = created.user;
        results[a.email] = "created";
      }

      // Calling agents must never hold an app role (no admin surface access).
      if (found?.id) await admin.from("user_roles").delete().eq("user_id", found.id);
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

// redeploy trigger
