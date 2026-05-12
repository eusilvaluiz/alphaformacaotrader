import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    // Validate caller and check admin role
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { action, user_id, email, password, banned } = body ?? {};

    if (action === "list") {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const users = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        banned_until: (u as any).banned_until ?? null,
      }));
      return json({ users });
    }

    if (!user_id || typeof user_id !== "string") return json({ error: "user_id required" }, 400);
    if (user_id === userData.user.id && (action === "delete" || action === "set-banned")) {
      return json({ error: "Você não pode aplicar essa ação na sua própria conta" }, 400);
    }

    if (action === "update-email") {
      if (!email || typeof email !== "string") return json({ error: "email required" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { email, email_confirm: true });
      if (error) throw error;
      await admin.from("profiles").update({ email }).eq("user_id", user_id);
      return json({ ok: true });
    }

    if (action === "update-password") {
      if (!password || typeof password !== "string" || password.length < 6)
        return json({ error: "password min 6 chars" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "set-banned") {
      const ban_duration = banned ? "876000h" : "none"; // ~100 years vs unban
      const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration } as any);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      await admin.from("profiles").delete().eq("user_id", user_id);
      await admin.from("user_roles").delete().eq("user_id", user_id);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    return json({ error: message }, 500);
  }
});
