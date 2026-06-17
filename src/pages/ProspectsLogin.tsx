import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2 } from "lucide-react";
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
      const { data, error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (error) throw error;
      if (!data.user) throw new Error("No user");
      toast({ title: "Welcome back", description: `Signed in as ${role}.` });
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
              <Input id="password" type="password" autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)} required />
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
