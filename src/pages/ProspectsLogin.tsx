import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Lock, Upload, UserPlus, Database, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PROSPECTS_SESSION_TOKEN_KEY } from "@/hooks/useProspectsSession";
import * as XLSX from "xlsx";
import prospectsSeed from "@/data/prospectsSeed.json";

// Legacy export kept for compatibility with imports elsewhere
export const PROSPECTS_SESSION_KEY = "swishview_prospects_session";

const ProspectsLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bootMode, setBootMode] = useState<"loading" | "signin" | "bootstrap" | "authed">("loading");
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [role, setRole] = useState<"admin" | "employee" | null>(null);

  // Sign-in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Bootstrap admin
  const [bsEmail, setBsEmail] = useState("");
  const [bsPass, setBsPass] = useState("");

  // Add employee
  const [empEmail, setEmpEmail] = useState("");
  const [empPass, setEmpPass] = useState("");

  // Import progress
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

  const checkAdminExists = async () => {
    const { count } = await supabase.from("user_roles" as any).select("id", { head: true, count: "exact" }).eq("role", "admin");
    return (count ?? 0) > 0;
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUser({ id: data.session.user.id, email: data.session.user.email ?? null });
        const { data: r } = await supabase.from("user_roles" as any).select("role").eq("user_id", data.session.user.id).maybeSingle();
        setRole(((r as any)?.role as any) ?? null);
        setBootMode("authed");
      } else {
        const adminExists = await checkAdminExists();
        setBootMode(adminExists ? "signin" : "bootstrap");
      }
    })();
  }, []);

  const persistSessionToken = async (uid: string) => {
    const tok = crypto.randomUUID();
    localStorage.setItem(PROSPECTS_SESSION_TOKEN_KEY, tok);
    await supabase.from("user_roles" as any).update({ active_session_id: tok, last_seen_at: new Date().toISOString() }).eq("user_id", uid);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (!data.user) throw new Error("No user");
      const { data: r } = await supabase.from("user_roles" as any).select("role").eq("user_id", data.user.id).maybeSingle();
      if (!(r as any)?.role) {
        await supabase.auth.signOut();
        throw new Error("No role assigned. Contact admin.");
      }
      await persistSessionToken(data.user.id);
      toast({ title: "Welcome back" });
      navigate("/prospects");
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: bsEmail.trim(), password: bsPass,
        options: { emailRedirectTo: `${window.location.origin}/prospects-login` },
      });
      if (error) throw error;
      // Trigger auto-assigns admin role on insert
      if (data.session?.user) await persistSessionToken(data.session.user.id);
      toast({ title: "Admin created", description: "You can now sign in." });
      // Reload to either authed or signin
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Could not create admin", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("prospects-admin-create-user", {
        body: { email: empEmail.trim(), password: empPass, role: "employee" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Employee created", description: empEmail });
      setEmpEmail(""); setEmpPass("");
    } catch (err: any) {
      toast({ title: "Could not create employee", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const bulkInsertRows = async (rows: { email: string; channelLink: string }[]) => {
    setImporting(true);
    setImportProgress({ done: 0, total: rows.length });
    try {
      // Dedupe vs existing emails (case-insensitive)
      const emails = rows.map(r => r.email.toLowerCase());
      const existing = new Set<string>();
      const CHUNK_LOOKUP = 200;
      for (let i = 0; i < emails.length; i += CHUNK_LOOKUP) {
        const batch = emails.slice(i, i + CHUNK_LOOKUP);
        const { data } = await supabase.from("prospects").select("email").in("email", batch);
        (data || []).forEach((r: any) => r.email && existing.add(r.email.toLowerCase()));
      }
      const fresh = rows.filter(r => !existing.has(r.email.toLowerCase()));
      const CHUNK = 200;
      let done = 0;
      for (let i = 0; i < fresh.length; i += CHUNK) {
        const chunk = fresh.slice(i, i + CHUNK);
        const payload = chunk.map(r => ({
          email: r.email,
          channel_link: r.channelLink,
          data: {
            email: r.email,
            channelLink: r.channelLink,
            status: "NA",
            updatedAt: new Date().toISOString(),
          },
        }));
        const { error } = await supabase.from("prospects").insert(payload);
        if (error) throw error;
        done += chunk.length;
        setImportProgress({ done, total: fresh.length });
      }
      toast({ title: "Import complete", description: `${done} new prospects added (${rows.length - fresh.length} duplicates skipped).` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleImportSeed = async () => {
    if (!confirm(`Import ${(prospectsSeed as any[]).length} prospects from June 2026 seed?`)) return;
    await bulkInsertRows(prospectsSeed as any);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const rows: { email: string; channelLink: string }[] = [];
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        for (const r of json) {
          const email = String(r.Email ?? r.email ?? "").trim();
          const channel = String(r.Channel ?? r.channel ?? r.ChannelLink ?? r["Channel Link"] ?? "").trim();
          if (email && channel) rows.push({ email, channelLink: channel });
        }
      }
      if (!rows.length) { toast({ title: "No rows found", description: "Expected columns: Email, Channel", variant: "destructive" }); return; }
      await bulkInsertRows(rows);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  if (bootMode === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (bootMode === "authed" && user) {
    const isAdmin = role === "admin";
    return (
      <div className="min-h-screen bg-muted p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Prospects Access</CardTitle>
                <CardDescription>{user.email} · <span className="font-medium uppercase">{role || "no role"}</span></CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => navigate("/prospects")}>Open Prospects</Button>
                <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem(PROSPECTS_SESSION_TOKEN_KEY); window.location.reload(); }}>
                  <LogOut className="h-4 w-4 mr-1" /> Sign out
                </Button>
              </div>
            </CardHeader>
          </Card>

          {isAdmin && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4" /> Add Employee</CardTitle>
                  <CardDescription>Creates a sign-in for a team member with view + edit + send + sync permissions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddEmployee} className="grid md:grid-cols-3 gap-3">
                    <Input placeholder="employee@swishview.com" value={empEmail} onChange={e => setEmpEmail(e.target.value)} required />
                    <Input type="password" placeholder="Temporary password" value={empPass} onChange={e => setEmpPass(e.target.value)} required minLength={6} />
                    <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create employee"}</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" /> Import Seed Data (June 2026)</CardTitle>
                  <CardDescription>{(prospectsSeed as any[]).length} prospects from the latest sheet. Duplicates (by email) are skipped.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleImportSeed} disabled={importing}>
                    {importing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Importing {importProgress.done}/{importProgress.total}</> : "Import Seed Data"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4" /> Upload Prospects Sheet</CardTitle>
                  <CardDescription>Excel file with <code>Email</code> and <code>Channel</code> columns (all sheets are read).</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input type="file" accept=".xlsx,.xls,.csv" disabled={importing} onChange={e => {
                    const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = "";
                  }} />
                  {importing && <p className="text-xs text-muted-foreground mt-2">Importing… {importProgress.done}/{importProgress.total}</p>}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full"><Lock className="h-6 w-6 text-primary" /></div>
          </div>
          <CardTitle>Prospects Access</CardTitle>
          <CardDescription>{bootMode === "bootstrap" ? "Create the first admin account" : "Sign in to continue"}</CardDescription>
        </CardHeader>
        <CardContent>
          {bootMode === "bootstrap" ? (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <div className="space-y-2">
                <Label>Admin email</Label>
                <Input type="email" value={bsEmail} onChange={e => setBsEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={bsPass} onChange={e => setBsPass(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create admin"}
              </Button>
            </form>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-1"><TabsTrigger value="signin">Sign in</TabsTrigger></TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProspectsLogin;
