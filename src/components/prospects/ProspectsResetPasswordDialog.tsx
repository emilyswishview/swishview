import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PROSPECTS_ALLOWED_EMAILS, PROSPECTS_USER_DISPLAY } from "@/hooks/useProspectsSession";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function ProspectsResetPasswordDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState<string>(PROSPECTS_ALLOWED_EMAILS[0]);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("prospects-admin-reset-password", {
        body: { email, password },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Password reset", description: `Updated password for ${email}.` });
      setPassword("");
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Reset password
          </DialogTitle>
          <DialogDescription>Admin-only. Set a new password for an authorised account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-user">User</Label>
            <select
              id="reset-user"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {PROSPECTS_ALLOWED_EMAILS.map((e) => (
                <option key={e} value={e}>{PROSPECTS_USER_DISPLAY[e] || e} — {e}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-pw">New password</Label>
            <div className="relative">
              <Input
                id="reset-pw"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
