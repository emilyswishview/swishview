import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const PROSPECTS_SESSION_TOKEN_KEY = "prospects_session_token";
export const PROSPECTS_ADMIN_EMAIL = "emilyadmin@swishview.com";

export type ProspectsRole = "admin" | "employee" | null;

export interface ProspectsSession {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: ProspectsRole;
  isAdmin: boolean;
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
      setLoading(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      const ok = apply(sess);
      if (!sess?.user) navigate("/prospects-login");
      else if (!ok) { supabase.auth.signOut(); navigate("/prospects-login"); }
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [navigate]);

  return { loading, userId, email, role, isAdmin: role === "admin", signOut };
}
