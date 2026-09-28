import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/looseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Search, Mail, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BounceRow {
  id: string;
  sender: string;
  recipient: string | null;
  subject: string | null;
  reason: string | null;
  smtp_code: string | null;
  bounce_type: string | null;
  gmail_message_id: string;
  received_at: string | null;
  raw_snippet: string | null;
  created_at: string;
}

const SENDERS = [
  "amelia@swishview.com","emily.j@swishview.com","emily@swishview.com",
  "grace@swishview.com","irene@swishview.com",
  "mia.brooks@swishview.com","rachel@swishview.com","scarlett.l@swishview.com",
  "sophie@swishview.com",
  "amelia@swishview.email","grace@swishview.email","noelle@swishview.email",
  "serena@swishview.email","sophie@swishview.email",
];

const PAGE_SIZE = 100;

export default function BouncedEmailsPanel() {
  const { toast } = useToast();
  const [sender, setSender] = useState<string>("amelia@swishview.email");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<BounceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [sender, debounced]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let q = supabase
          .from("prospect_email_bounces")
          .select("*", { count: "exact" })
          .order("received_at", { ascending: false, nullsFirst: false })
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
        if (sender !== "__all__") q = q.eq("sender", sender);
        if (debounced) {
          const term = `%${debounced}%`;
          q = q.or(`recipient.ilike.${term},subject.ilike.${term},reason.ilike.${term}`);
        }
        const { data, error, count } = await q;
        if (cancelled) return;
        if (error) {
          toast({ title: "Failed to load bounces", description: error.message, variant: "destructive" });
          setRows([]); setTotal(0);
        } else {
          setRows((data || []) as BounceRow[]);
          setTotal(count || 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sender, debounced, page, toast]);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const body: any = { days: 7, max: 2000, removeFromProspects: true };
      if (sender !== "__all__") body.sender = sender;
      const { data, error } = await supabase.functions.invoke("sync-email-bounces", { body });
      if (error) throw error;
      const t = (data as any)?.totals;
      toast({
        title: "Bounce sync complete",
        description: t
          ? `Scanned ${t.scanned}, saved ${t.saved}${typeof t.bannedProspects === "number" ? `, banned ${t.bannedProspects} prospects` : ""}`
          : "Done",
      });
      // refresh
      setPage(0);
      setDebounced(d => d); // trigger
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold">Bounced Emails</span>

        <select
          value={sender}
          onChange={e => setSender(e.target.value)}
          className="h-8 text-xs rounded border border-border bg-background px-2"
        >
          <option value="__all__">All senders</option>
          {SENDERS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search recipient, subject, reason…"
            className="h-8 text-xs pl-7 w-72"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {loading ? "Loading…" : `${total.toLocaleString()} bounce${total === 1 ? "" : "s"}`}
          </span>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={syncNow} disabled={syncing}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto thin-scrollbar">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              <th className="border border-border px-2 py-1.5 text-left font-semibold w-44">Received</th>
              <th className="border border-border px-2 py-1.5 text-left font-semibold w-56">Sender</th>
              <th className="border border-border px-2 py-1.5 text-left font-semibold w-64">Recipient</th>
              <th className="border border-border px-2 py-1.5 text-left font-semibold w-20">Type</th>
              <th className="border border-border px-2 py-1.5 text-left font-semibold w-20">Code</th>
              <th className="border border-border px-2 py-1.5 text-left font-semibold">Reason</th>
              <th className="border border-border px-2 py-1.5 text-left font-semibold w-72">Original subject</th>
              <th className="border border-border px-2 py-1.5 text-center font-semibold w-12">↗</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground text-xs">
                  No bounces found. Click <span className="font-medium">Sync now</span> to pull the latest Mailer-Daemon messages from Gmail.
                </td>
              </tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-accent/30">
                <td className="border border-border px-2 py-1.5 whitespace-nowrap text-[11px]">
                  {r.received_at ? new Date(r.received_at).toLocaleString(undefined, { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td className="border border-border px-2 py-1.5 truncate text-[11px]">{r.sender}</td>
                <td className="border border-border px-2 py-1.5 truncate text-[11px] font-medium">{r.recipient || <span className="text-muted-foreground">—</span>}</td>
                <td className="border border-border px-2 py-1.5">
                  {r.bounce_type === "hard" && <span className="px-1.5 py-0.5 rounded text-[10px] bg-destructive/15 text-destructive">hard</span>}
                  {r.bounce_type === "soft" && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400">soft</span>}
                  {(!r.bounce_type || r.bounce_type === "unknown") && <span className="text-muted-foreground text-[10px]">—</span>}
                </td>
                <td className="border border-border px-2 py-1.5 text-[11px] font-mono">{r.smtp_code || "—"}</td>
                <td className="border border-border px-2 py-1.5 text-[11px]" title={r.reason || ""}>
                  <div className="line-clamp-2">{r.reason || <span className="text-muted-foreground">—</span>}</div>
                </td>
                <td className="border border-border px-2 py-1.5 truncate text-[11px] text-muted-foreground">{r.subject || "—"}</td>
                <td className="border border-border px-2 py-1.5 text-center">
                  <a
                    href={`https://mail.google.com/mail/u/${encodeURIComponent(r.sender)}/#all/${r.gmail_message_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-muted-foreground hover:text-foreground"
                    title="Open in Gmail"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-border bg-muted/30 text-xs">
          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</Button>
          <span className="text-muted-foreground">Page {page + 1} / {maxPage + 1}</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={page >= maxPage} onClick={() => setPage(p => Math.min(maxPage, p + 1))}>Next</Button>
        </div>
      )}
    </div>
  );
}
