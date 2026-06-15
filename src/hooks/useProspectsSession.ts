import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const PROSPECTS_SESSION_TOKEN_KEY = "prospects_session_token";
export const PROSPECTS_ADMIN_EMAIL = "emilyadmin@swishview.com";

export type ProspectsRole = "admin" | "employee" | null;

export interface EmployeePermissions {
  can_edit: boolean;
  can_create: boolean;
  can_delete: boolean;
  can_send: boolean;
  can_sync: boolean;
  can_ban: boolean;
  can_export: boolean;
}

export const READ_ONLY_PERMS: EmployeePermissions = {
  can_edit: false, can_create: false, can_delete: false,
  can_send: false, can_sync: false, can_ban: false, can_export: false,
};

export const ALL_PERMS: EmployeePermissions = {
  can_edit: true, can_create: true, can_delete: true,
  can_send: true, can_sync: true, can_ban: true, can_export: true,
};

export interface ProspectsSession {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: ProspectsRole;
  isAdmin: boolean;
  perms: EmployeePermissions;
  signOut: () => Promise<void>;
}

export function deriveProspectsRole(email: string | null | undefined): ProspectsRole {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  if (e === PROSPECTS_ADMIN_EMAIL) return "admin";
  if (e.endsWith("@swishview.com")) return "employee";
  return null;
}

export function useProspectsSession(): ProspectsSession {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<ProspectsRole>(null);
  const [perms, setPerms] = useState<EmployeePermissions>(READ_ONLY_PERMS);

  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
    localStorage.removeItem(PROSPECTS_SESSION_TOKEN_KEY);
    navigate("/prospects-login");
  };

  useEffect(() => {
    let cancelled = false;

    const apply = (sess: any) => {
      if (!sess?.user) {
        setUserId(null); setEmail(null); setRole(null);
        return false;
      }
      const r = deriveProspectsRole(sess.user.email);
      setUserId(sess.user.id);
      setEmail(sess.user.email ?? null);
      setRole(r);
      return !!r;
    };

    const loadPerms = async () => {
      const { data } = await supabase
        .from("prospects_employee_permissions" as any)
        .select("can_edit, can_create, can_delete, can_send, can_sync, can_ban, can_export")
        .eq("id", 1)
        .maybeSingle();
      if (cancelled) return;
      if (data) setPerms({ ...READ_ONLY_PERMS, ...(data as any) });
    };

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const ok = apply(data.session);
      if (!data.session?.user) {
        setLoading(false);
        navigate("/prospects-login");
        return;
      }
      if (!ok) {
        await supabase.auth.signOut();
        setLoading(false);
        navigate("/prospects-login");
        return;
      }
      await loadPerms();
      setLoading(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      const ok = apply(sess);
      if (!sess?.user) navigate("/prospects-login");
      else if (!ok) { supabase.auth.signOut(); navigate("/prospects-login"); }
      else loadPerms();
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [navigate]);

  const isAdmin = role === "admin";
  return { loading, userId, email, role, isAdmin, perms: isAdmin ? ALL_PERMS : perms, signOut };
}
