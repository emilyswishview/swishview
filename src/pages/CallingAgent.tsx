import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PhoneCall, Loader2, Eye, EyeOff, LogOut } from "lucide-react";
import { CALLING_AGENT_DISPLAY, isCallingAgent } from "@/config/callingAgents";

const CallingLeadsPanel = React.lazy(() => import("@/components/prospects/CallingLeadsPanel"));

const clearLocalAuth = () => {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("sb-") || k.includes("supabase.auth"))) localStorage.removeItem(k);
    }
  } catch {}
};

const CallingAgent = () => {
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agentEmail, setAgentEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const e = data.session?.user?.email || null;
      if (!cancelled) {
        setAgentEmail(isCallingAgent(e) ? e!.toLowerCase() : null);
        setChecking(false);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      const e = sess?.user?.email || null;
      setAgentEmail(isCallingAgent(e) ? e!.toLowerCase() : null);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const trimmed = email.trim().toLowerCase();
      if (!isCallingAgent(trimmed)) throw new Error("This account is not authorised for calling leads.");
      try { await supabase.auth.signOut({ scope: "local" } as any); } catch {}
      clearLocalAuth();
      const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (error) throw error;
      setAgentEmail(trimmed);
      toast({ title: `Welcome, ${CALLING_AGENT_DISPLAY[trimmed] || trimmed}` });
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setAgentEmail(null);
    clearLocalAuth();
    try { await supabase.auth.signOut({ scope: "local" } as any); } catch {}
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!agentEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <PhoneCall className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Calling Leads Access</CardTitle>
            <CardDescription>Sign in to see the leads assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ca-email">Email</Label>
                <Input id="ca-email" type="email" autoComplete="email" placeholder="you@swishview.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ca-password">Password</Label>
                <div className="relative">
                  <Input id="ca-password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                    className="pr-10" value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Access is restricted to calling agents.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-sm font-semibold leading-tight">My Calling Leads</h1>
              <p className="text-xs text-muted-foreground">{CALLING_AGENT_DISPLAY[agentEmail] || agentEmail}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">
        <React.Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading leads…</div>}>
          <CallingLeadsPanel canDelete={false} isAdmin={false} currentEmail={agentEmail} />
        </React.Suspense>
      </main>
    </div>
  );
};

export default CallingAgent;
