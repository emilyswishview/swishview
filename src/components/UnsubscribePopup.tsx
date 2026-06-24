import React, { useEffect, useState } from "react";
import { X, Check, MailX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Renders a small bottom-right card when the URL contains
 * `?unsubscribe=<base64url-email>` (the link we add to outreach email footers).
 * Confirming POSTs the token to the prospect-unsubscribe edge function which
 * marks the matching prospects row as `data.unsubscribed = true`.
 */
const b64urlDecode = (s: string): string => {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return "";
  }
};

const UnsubscribePopup: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("unsubscribe");
    if (!t) return;
    const decoded = b64urlDecode(t);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded)) return;
    setToken(t);
    setEmail(decoded);
    setOpen(true);
  }, []);

  const close = () => {
    setOpen(false);
    // Clean the URL so the popup doesn't reappear on refresh.
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("unsubscribe");
      window.history.replaceState({}, "", u.pathname + (u.search ? u.search : "") + u.hash);
    } catch { /* noop */ }
  };

  const confirm = async () => {
    setStatus("loading");
    setErrMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("prospect-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.error || "Unsubscribe failed");
      setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setErrMsg(e?.message || "Something went wrong");
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Unsubscribe from Swish View emails"
      className="fixed bottom-4 right-4 z-[100] w-[min(360px,calc(100vw-2rem))] rounded-xl border border-border bg-background shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute top-2 right-2 p-1 rounded hover:bg-accent text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <MailX className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          {status === "done" ? (
            <>
              <div className="text-sm font-semibold flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-600" />
                You're unsubscribed
              </div>
              <p className="text-xs text-muted-foreground mt-1 break-all">
                {email} won't receive outreach from Swish View anymore.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={close}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Continue browsing →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold">Unsubscribe from Swish View</div>
              <p className="text-xs text-muted-foreground mt-1 break-all">
                Confirm and we'll stop sending outreach to <span className="font-medium text-foreground">{email}</span>.
              </p>
              {status === "error" && (
                <p className="text-xs text-destructive mt-2">{errMsg}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={confirm}
                  disabled={status === "loading"}
                  className="text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {status === "loading" ? "Unsubscribing…" : "Confirm unsubscribe"}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="text-xs font-medium px-3 py-1.5 rounded-md hover:bg-accent text-muted-foreground"
                >
                  Keep me subscribed
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnsubscribePopup;
