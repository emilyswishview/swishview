import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/looseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Download, Search, Users, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SignupRow {
  id: string;
  email: string;
  full_name: string | null;
  channel_name: string | null;
  channel_url: string | null;
  phone_number: string | null;
  location: string | null;
  created_at: string | null;
}

interface MessageRow {
  id: string;
  full_name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
}

const fmt = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const toCsv = (rows: Record<string, any>[]) => {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
};

const download = (name: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const UserUpdate = () => {
  const { toast } = useToast();
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p, error: pe }, { data: m, error: me }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,email,full_name,channel_name,channel_url,phone_number,location,created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("contact_messages")
          .select("id,full_name,email,subject,message,created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);
      if (pe) throw pe;
      if (me) throw me;
      setSignups((p as SignupRow[]) || []);
      setMessages((m as MessageRow[]) || []);
    } catch (e: any) {
      toast({
        title: "Could not load data",
        description: String(e?.message || e).slice(0, 200),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const term = q.trim().toLowerCase();
  const filteredSignups = useMemo(
    () =>
      !term
        ? signups
        : signups.filter((r) =>
            [r.email, r.full_name, r.channel_name, r.channel_url, r.phone_number, r.location]
              .join(" ")
              .toLowerCase()
              .includes(term)
          ),
    [signups, term]
  );
  const filteredMessages = useMemo(
    () =>
      !term
        ? messages
        : messages.filter((r) =>
            [r.email, r.full_name, r.subject, r.message].join(" ").toLowerCase().includes(term)
          ),
    [messages, term]
  );

  const todayCount = (rows: { created_at: string | null }[]) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return rows.filter((r) => r.created_at && new Date(r.created_at) >= start).length;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">User Updates</h1>
            <p className="text-muted-foreground text-sm">
              Every signup and contact message on SwishView, newest first.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Total signups", value: signups.length, icon: Users },
            { label: "Signups today", value: todayCount(signups), icon: Users },
            { label: "Total messages", value: messages.length, icon: MessageSquare },
            { label: "Messages today", value: todayCount(messages), icon: MessageSquare },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <s.icon className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-semibold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, email, channel or message…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <Tabs defaultValue="signups">
          <TabsList>
            <TabsTrigger value="signups">Signups ({filteredSignups.length})</TabsTrigger>
            <TabsTrigger value="messages">Messages ({filteredMessages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="signups">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Registered users</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => download("signups.csv", toCsv(filteredSignups))}
                  disabled={!filteredSignups.length}
                >
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      {["#", "Name", "Email", "Channel", "Phone", "Location", "Signed up"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSignups.map((r, i) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2">{r.full_name || "—"}</td>
                        <td className="px-3 py-2">{r.email}</td>
                        <td className="px-3 py-2">
                          {r.channel_url ? (
                            <a href={r.channel_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {r.channel_name || r.channel_url}
                            </a>
                          ) : (
                            r.channel_name || "—"
                          )}
                        </td>
                        <td className="px-3 py-2">{r.phone_number || "—"}</td>
                        <td className="px-3 py-2">{r.location || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2">{fmt(r.created_at)}</td>
                      </tr>
                    ))}
                    {!loading && !filteredSignups.length && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                          No signups found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Contact messages</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => download("messages.csv", toCsv(filteredMessages))}
                  disabled={!filteredMessages.length}
                >
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      {["#", "Name", "Email", "Subject", "Message", "Received"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMessages.map((r, i) => (
                      <tr key={r.id} className="border-t align-top">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2">{r.full_name}</td>
                        <td className="px-3 py-2">
                          <a href={`mailto:${r.email}`} className="text-primary hover:underline">
                            {r.email}
                          </a>
                        </td>
                        <td className="px-3 py-2">{r.subject || "—"}</td>
                        <td className="max-w-md whitespace-pre-wrap px-3 py-2">{r.message}</td>
                        <td className="whitespace-nowrap px-3 py-2">{fmt(r.created_at)}</td>
                      </tr>
                    ))}
                    {!loading && !filteredMessages.length && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                          No messages found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserUpdate;
