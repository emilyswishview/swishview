import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deriveProspectsRole } from "@/hooks/useProspectsSession";

// Legacy export kept for compatibility
export const PROSPECTS_SESSION_KEY = "swishview_prospects_session";

const ProspectsLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const role = deriveProspectsRole(data.session?.user?.email);
      if (data.session?.user && role) {
        navigate("/prospects");
        return;
      }
      if (data.session?.user && !role) {
        await supabase.auth.signOut();
      }
      setChecking(false);
    })();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const trimmed = email.trim().toLowerCase();
      const role = deriveProspectsRole(trimmed);
      if (!role) {
        throw new Error("This account is not authorised for /prospects.");
      }
      let { data, error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      // One-time admin password rotation: if emilyadmin sign-in fails with the new password,
      // ask the bootstrap/signup function to reset and try again.
      if (error && trimmed === "emilyadmin@swishview.com") {
        try {
          await supabase.functions.invoke("prospects-signup", {
            body: { email: trimmed, password },
          });
          const retry = await supabase.auth.signInWithPassword({ email: trimmed, password });
          data = retry.data; error = retry.error;
        } catch {}
      }
      if (error) throw error;
      if (!data.user) throw new Error("No user");
      const SALES_REP_NAMES: Record<string, string> = {
        "serena@swishview.com": "Adarsh",
        "hazel@swishview.com": "Shivam",
      };
      const repName = SALES_REP_NAMES[trimmed];
      const displayLabel = role === "admin"
        ? "Admin"
        : `Sales Representative${repName ? " " + repName : ""}`;
      toast({ title: `Welcome back, ${displayLabel}` });
      navigate("/prospects");
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Prospects Access</CardTitle>
          <CardDescription>Sign in with your authorised SwishView account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@swishview.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)} required className="pr-10" />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Access is restricted. Contact the administrator if you need an account.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProspectsLogin;
