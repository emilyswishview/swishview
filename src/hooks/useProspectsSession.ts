import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/looseClient";

export const PROSPECTS_SESSION_TOKEN_KEY = "prospects_session_token";
export const PROSPECTS_ADMIN_EMAIL = "emilyadmin@swishview.com";

// Hard whitelist — only these three accounts may access /prospects.
export const PROSPECTS_ALLOWED_EMAILS = [
  "emilyadmin@swishview.com",
  "serena@swishview.com",
  "hazel@swishview.com",
  "sales1@swishview.com",
  "sales2@swishview.com",
  "sales3@swishview.com",
] as const;

// Display labels shown only inside the /prospects UI (never in outbound email).
// Outbound emails always sign off with the display name of the FROM sender mailbox.
export const PROSPECTS_USER_DISPLAY: Record<string, string> = {
  "emilyadmin@swishview.com": "Emily (Admin)",
  "serena@swishview.com": "Serena",
  "hazel@swishview.com": "Hazel",
  "sales1@swishview.com": "Sales 1",
  "sales2@swishview.com": "Sales 2",
  "sales3@swishview.com": "Sales 3",
};

// Sender mailboxes each logged-in user is allowed to send from.
// Admin can use any sender from DEFAULT_SENDERS; reps are restricted.
export const PROSPECTS_ALLOWED_SENDERS: Record<string, string[]> = {
  "serena@swishview.com": ["serena@swishview.com", "ashley@swishview.com"],
  "hazel@swishview.com":  ["hazel@swishview.com",  "rachel@swishview.email"],
  "sales1@swishview.com": ["sales1@swishview.com", "amelia@swishview.com", "grace@swishview.com"],
  "sales2@swishview.com": ["sales2@swishview.com", "emily@swishview.com",  "sophie@swishview.com"],
  "sales3@swishview.com": ["sales3@swishview.com", "rachel@swishview.com", "irene@swishview.com"],
};

// Round-robin assignment buckets: every non-banned lead is split equally
// between these three sales accounts.
export const PROSPECTS_SALES_ACCOUNTS = [
  "sales1@swishview.com",
  "sales2@swishview.com",
  "sales3@swishview.com",
] as const;

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

// Sales-rep default permissions: view list, send/bulk-send emails,
// edit status & notes, run YouTube sync. No delete/ban/export.
export const SALES_REP_PERMS: EmployeePermissions = {
  can_edit: true, can_create: false, can_delete: false,
  can_send: true, can_sync: true, can_ban: false, can_export: false,
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
  if (!(PROSPECTS_ALLOWED_EMAILS as readonly string[]).includes(e)) return null;
  if (e === PROSPECTS_ADMIN_EMAIL) return "admin";
  return "employee";
}

export function useProspectsSession(): ProspectsSession {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const emailRef = useRef<string | null>(null);
  const [role, setRole] = useState<ProspectsRole>(null);
  const [perms, setPerms] = useState<EmployeePermissions>(SALES_REP_PERMS);

  const signOut = async () => {
    // Clear local state FIRST so the UI reacts instantly even if the
    // network signOut call is slow or hangs (common on flaky connections).
    try { localStorage.removeItem(PROSPECTS_SESSION_TOKEN_KEY); } catch {}
    try {
      // Best-effort: clear every Supabase auth key from localStorage so a
      // stale token can't re-authenticate us on the next page load.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("sb-") || k.includes("supabase.auth"))) localStorage.removeItem(k);
      }
    } catch {}
    setUserId(null); setEmail(null); setRole(null);
    emailRef.current = null;
    navigate("/prospects-login", { replace: true });
    // Fire-and-forget the server sign-out with a short timeout so a hung
    // request never blocks the user from leaving the page.
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" } as any),
        new Promise((res) => setTimeout(res, 1500)),
      ]);
    } catch {}
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
      emailRef.current = sess.user.email ?? null;
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
      if (data) setPerms({ ...SALES_REP_PERMS, ...(data as any) });
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
      else if (!ok) { setTimeout(() => { supabase.auth.signOut(); navigate("/prospects-login"); }, 0); }
      else setTimeout(() => { loadPerms(); }, 0);
    });

    // Force sign-out helper used by every revocation path below.
    const forceOut = async () => {
      try { await supabase.auth.signOut(); } catch {}
      navigate("/prospects-login");
    };

    // Verify the current session is still valid on the server. Do not force a
    // token refresh on a timer: rotating the refresh token every few seconds can
    // race with sign-in/auto-refresh and falsely log out a valid admin session.
    const verify = async () => {
      try {
        const { data: cur } = await supabase.auth.getSession();
        if (!cur.session) { await forceOut(); return; }
        const { data: u, error: uErr } = await supabase.auth.getUser();
        if (uErr || !u.user || !deriveProspectsRole(u.user.email)) {
          const msg = String(uErr?.message || "").toLowerCase();
          // Network/transient auth endpoint errors should not destroy a valid
          // local session. Only force out on clear invalid-session responses.
          if (!uErr || msg.includes("jwt") || msg.includes("session") || msg.includes("invalid") || msg.includes("expired")) {
            await forceOut();
          }
        }
      } catch {}
    };

    // Slow safety poll — realtime handles password-reset revocation instantly.
    const poll = setInterval(verify, 60000);
    // Re-check the instant the tab regains focus / becomes visible.
    const onFocus = () => { verify(); };
    const onVisible = () => { if (document.visibilityState === "visible") verify(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    // Realtime: the admin reset-password edge function broadcasts on the
    // "prospects-auth" topic. Any device currently signed in as the target
    // email signs itself out within milliseconds.
    const channel = supabase.channel("prospects-auth")
      .on("broadcast", { event: "password-reset" }, (msg) => {
        const targetEmail = String((msg as any)?.payload?.email || "").toLowerCase();
        const mine = (emailRef.current || "").toLowerCase();
        if (targetEmail && mine && targetEmail === mine) {
          forceOut();
        } else {
          // Still verify — covers the case where local `email` state was stale.
          verify();
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [navigate]);

  const isAdmin = role === "admin";
  return { loading, userId, email, role, isAdmin, perms: isAdmin ? ALL_PERMS : perms, signOut };
}
