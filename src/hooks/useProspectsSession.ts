import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const PROSPECTS_SESSION_TOKEN_KEY = "prospects_session_token";

export type ProspectsRole = "admin" | "employee" | null;

export interface ProspectsSession {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: ProspectsRole;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

export function useProspectsSession(): ProspectsSession {
  const navigate = useNavigate();
  const { toast } = useToast();
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

    const loadRole = async (uid: string) => {
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role, active_session_id")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      const d = data as { role?: ProspectsRole; active_session_id?: string | null } | null;
      const r = (d?.role as ProspectsRole) || null;
      setRole(r);
      const localTok = localStorage.getItem(PROSPECTS_SESSION_TOKEN_KEY);
      if (d?.active_session_id && localTok && d.active_session_id !== localTok) {
        toast({ title: "Signed in elsewhere", description: "This device was signed out.", variant: "destructive" });
        await signOut();
      }
    };

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;
      if (!sess?.user) {
        if (!cancelled) { setLoading(false); navigate("/prospects-login"); }
        return;
      }
      if (cancelled) return;
      setUserId(sess.user.id);
      setEmail(sess.user.email ?? null);
      await loadRole(sess.user.id);
      setLoading(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      if (!sess?.user) {
        setUserId(null); setEmail(null); setRole(null);
        navigate("/prospects-login");
      } else {
        setUserId(sess.user.id);
        setEmail(sess.user.email ?? null);
        loadRole(sess.user.id);
      }
    });

    // Poll single-device token
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return;
      const { data: row } = await supabase
        .from("user_roles" as any)
        .select("active_session_id")
        .eq("user_id", uid)
        .maybeSingle();
      const r = row as { active_session_id?: string | null } | null;
      const localTok = localStorage.getItem(PROSPECTS_SESSION_TOKEN_KEY);
      if (r?.active_session_id && localTok && r.active_session_id !== localTok) {
        toast({ title: "Signed in elsewhere", description: "This device was signed out.", variant: "destructive" });
        await signOut();
      }
    }, 20000);

    return () => { cancelled = true; sub.subscription.unsubscribe(); clearInterval(interval); };
  }, [navigate, toast]);

  return { loading, userId, email, role, isAdmin: role === "admin", signOut };
}
