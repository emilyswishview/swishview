import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// View-only /prospects account.
const ACCOUNT = { email: "marcus@swishview.com", password: "marcus.b82" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let found: any = null;
    for (let page = 1; page <= 30 && !found; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const users = data?.users || [];
      found = users.find((u: any) => (u.email || "").toLowerCase() === ACCOUNT.email) || null;
      if (users.length < 200) break;
    }

    let status: string;
    if (found) {
      const { error } = await admin.auth.admin.updateUserById(found.id, {
        password: ACCOUNT.password,
        email_confirm: true,
      });
      status = error ? `update failed: ${error.message}` : "password updated";
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: ACCOUNT.email,
        password: ACCOUNT.password,
        email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      found = created.user;
      status = "created";
    }

    // View-only account: never holds an app role.
    if (found?.id) await admin.from("user_roles").delete().eq("user_id", found.id);

    return json({ ok: true, email: ACCOUNT.email, status });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
