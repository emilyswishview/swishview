// Idempotent bootstrap of the three /prospects accounts.
// Safe to call any number of times. Creates the auth users (if missing),
// resets their passwords to the canonical values, and ensures correct roles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Spec = { email: string; password: string; role: "admin" | "employee" };

const ACCOUNTS: Spec[] = [
  { email: "emilyadmin@swishview.com", password: "emilyprospects", role: "admin" },
  { email: "serena@swishview.com",     password: "swishprospects19", role: "employee" },
  { email: "hazel@swishview.com",      password: "swishprospects19", role: "employee" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const results: any[] = [];

    for (const acc of ACCOUNTS) {
      // Find existing user by email
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list.data.users.find(u => (u.email || "").toLowerCase() === acc.email);

      let userId: string;
      if (existing) {
        userId = existing.id;
        await admin.auth.admin.updateUserById(userId, { password: acc.password, email_confirm: true });
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: acc.email, password: acc.password, email_confirm: true,
        });
        if (createErr || !created.user) {
          results.push({ email: acc.email, error: createErr?.message || "create failed" });
          continue;
        }
        userId = created.user.id;
      }

      // Reset roles: remove any rows then insert the correct one
      await admin.from("user_roles").delete().eq("user_id", userId);
      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role: acc.role });
      if (roleErr) {
        results.push({ email: acc.email, userId, error: roleErr.message });
        continue;
      }
      results.push({ email: acc.email, userId, role: acc.role, ok: true });
    }

    // Strip access from any other accounts (defence in depth)
    const list2 = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
    const allowed = new Set(ACCOUNTS.map(a => a.email));
    for (const u of list2.data.users) {
      if (!u.email) continue;
      if (allowed.has(u.email.toLowerCase())) continue;
      // Remove any prospects role rows for users not on the whitelist
      await admin.from("user_roles").delete().eq("user_id", u.id);
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
