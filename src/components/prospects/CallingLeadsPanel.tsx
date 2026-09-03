import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/looseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, RefreshCw, Search, PhoneCall, ExternalLink, Download, Trash2, Copy,
  MessageCircle, Wand2, X, Eye, EyeOff, Users, DownloadCloud,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyzePhone } from "@/utils/phoneFormat";
import { PROSPECTS_ALLOWED_EMAILS, PROSPECTS_ADMIN_EMAIL } from "@/hooks/useProspectsSession";
import { CALLING_AGENT_EMAILS } from "@/config/callingAgents";

export interface CallingLead {
  id: string;
  channel_id: string | null;
  channel_name: string;
  channel_link: string;
  thumbnail: string | null;
  phone: string;
  subscribers: number | null;
  total_views: number | null;
  country: string | null;
  keyword: string | null;
  source: string;
  call_status: string;
  call_notes: string | null;
  last_called_at: string | null;
  assigned_to: string | null;
  created_at: string;
}

const PAGE_SIZES = [50, 100, 200, 500, 1000];

const ASSIGNEES = [
  ...CALLING_AGENT_EMAILS,
  ...PROSPECTS_ALLOWED_EMAILS.filter(e => e !== PROSPECTS_ADMIN_EMAIL),
];

export const CALL_STATUSES = [
  "new",
  "queued",
  "calling",
  "connected",
  "callback",
  "not reachable",
  "wrong number",
  "not interested",
  "interested",
  "converted",
];

const statusClass = (s: string) => {
  switch (s) {
    case "connected":
    case "interested": return "bg-green-500/15 text-green-700 dark:text-green-400";
    case "converted": return "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400";
    case "callback": return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "calling":
    case "queued": return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "wrong number":
    case "not reachable":
    case "not interested": return "bg-destructive/15 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
};

const maskNumber = (v: string) => {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "•••• ••••";
  return `•••• •••• ${digits.slice(-2)}`;
};

function PhoneCell({
  lead,
  masked,
  revealed,
  onReveal,
}: {
  lead: CallingLead;
  masked: boolean;
  revealed: boolean;
  onReveal: () => void;
}) {
  const { toast } = useToast();
  const info = analyzePhone(lead.phone, lead.country);
  const display = info.international || lead.phone;
  const hidden = masked && !revealed;

  if (hidden) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-muted-foreground">{maskNumber(lead.phone)}</span>
        <button
          className="opacity-60 hover:opacity-100"
          title="Reveal number (one at a time)"
          onClick={onReveal}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {info.flag && (
        <span
          title={`${info.country || ""}${info.callingCode ? ` (+${info.callingCode})` : ""}`}
          className="text-[13px] leading-none"
        >
          {info.flag}
        </span>
      )}
      <a href={info.e164 ? `tel:${info.e164}` : `tel:${lead.phone}`} className="font-mono hover:underline">
        {display}
      </a>
      {info.country && (
        <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">{info.country}</span>
      )}
      {!info.valid && lead.phone && (
        <span className="rounded bg-destructive/15 px-1 text-[10px] text-destructive">?</span>
      )}
      {!masked && (
        <button
          className="opacity-50 hover:opacity-100"
          title="Copy number"
          onClick={() => { navigator.clipboard.writeText(info.e164 || lead.phone); toast({ title: "Copied" }); }}
        >
          <Copy className="h-3 w-3" />
        </button>
      )}
      {info.whatsappUrl && (
        <a
          href={info.whatsappUrl}
          target="_blank"
          rel="noreferrer"
          title="WhatsApp"
          className="text-green-600 opacity-70 hover:opacity-100"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </a>
      )}
      {masked && (
        <button className="opacity-60 hover:opacity-100" title="Hide number" onClick={onReveal}>
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function CallingLeadsPanel({
  canDelete = false,
  isAdmin = false,
  currentEmail = null,
}: {
  canDelete?: boolean;
  isAdmin?: boolean;
  currentEmail?: string | null;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<CallingLead[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [minSubs, setMinSubs] = useState("");
  const [country, setCountry] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState<"subs" | "views" | "name">("subs");
  const [pageSize, setPageSize] = useState<number>(() => Number(localStorage.getItem("calling.pageSize")) || 100);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [reload, setReload] = useState(0);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState<string>(ASSIGNEES[0] || "");

  const me = (currentEmail || "").toLowerCase();
  const masked = !isAdmin;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [debounced, status, minSubs, country, assignee, source, sort, pageSize]);

  useEffect(() => { localStorage.setItem("calling.pageSize", String(pageSize)); }, [pageSize]);

  // Distinct sources for the source filter.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("calling_leads").select("source").limit(5000);
      const uniq = Array.from(new Set((data || []).map((r: any) => r.source).filter(Boolean))).sort();
      setSources(uniq as string[]);
    })();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error, count } = await buildFilteredQuery()
          .range(page * pageSize, page * pageSize + pageSize - 1);
        if (cancelled) return;
        if (error) throw error;
        setRows((data || []) as CallingLead[]);
        if (typeof count === "number") setTotal(count);
      } catch (e: any) {
        if (!cancelled) toast({ title: "Load failed", description: e?.message, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, pageSize, debounced, status, source, sort, minSubs, country, assignee, reload, isAdmin, me, toast]);

  const patch = async (id: string, values: Partial<CallingLead>) => {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...values } as CallingLead : r)));
    const { error } = await supabase.from("calling_leads").update(values).eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("calling_leads").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    setRows(rs => rs.filter(r => r.id !== id));
  };

  // Pull every prospect that already has a phone number into the calling list.
  const importFromProspects = async () => {
    setImporting(true);
    try {
      const existing = new Set<string>();
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase
          .from("calling_leads")
          .select("channel_link,phone")
          .range(from, from + 999);
        (data || []).forEach((r: any) => {
          if (r.channel_link) existing.add(String(r.channel_link).toLowerCase());
          if (r.phone) existing.add(String(r.phone).replace(/\D/g, ""));
        });
        if (!data || data.length < 1000) break;
      }

      const toInsert: any[] = [];
      for (let from = 0; ; from += 500) {
        const { data, error } = await supabase
          .from("prospects")
          .select("id,data,channel_link,assigned_sender,is_banned")
          .eq("is_banned", false)
          .range(from, from + 499);
        if (error) throw error;
        (data || []).forEach((r: any) => {
          const d = r.data || {};
          const phone = String(d.phone || "").trim();
          if (!phone || phone.toUpperCase() === "NONE") return;
          const link = String(d.channelLink || r.channel_link || "").trim();
          const digits = phone.replace(/\D/g, "");
          if (!link || existing.has(link.toLowerCase()) || existing.has(digits)) return;
          existing.add(link.toLowerCase());
          existing.add(digits);
          toInsert.push({
            channel_id: d.channelId || null,
            channel_name: d.channelName || d.clientName || "Unknown",
            channel_link: link,
            thumbnail: d.thumbnail || null,
            phone,
            subscribers: Number(String(d.subscribersLive || d.subscribers || "").replace(/\D/g, "")) || 0,
            total_views: Number(String(d.totalViews || "").replace(/\D/g, "")) || 0,
            country: d.country || null,
            keyword: d.email || d.niche || null,
            source: "prospects",
            call_status: "new",
            assigned_to: (r.assigned_sender || "").toLowerCase() || null,
          });
        });
        if (!data || data.length < 500) break;
      }

      if (!toInsert.length) {
        toast({ title: "Nothing new to import", description: "All prospect numbers are already in the calling list." });
        return;
      }

      let inserted = 0;
      for (let i = 0; i < toInsert.length; i += 200) {
        const chunk = toInsert.slice(i, i + 200);
        const { error } = await supabase.from("calling_leads").insert(chunk);
        if (!error) { inserted += chunk.length; continue; }
        // Fall back to row-by-row so a single duplicate doesn't kill the batch.
        for (const row of chunk) {
          const { error: e2 } = await supabase.from("calling_leads").insert(row);
          if (!e2) inserted++;
        }
      }
      toast({ title: "Imported", description: `${inserted} prospect lead(s) added to Calling.` });
      setReload(n => n + 1);
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const assignSelected = async () => {
    const ids = Array.from(selected);
    if (!ids.length || !bulkAssignee) return;
    const { error } = await supabase
      .from("calling_leads")
      .update({ assigned_to: bulkAssignee })
      .in("id", ids);
    if (error) return toast({ title: "Assign failed", description: error.message, variant: "destructive" });
    setRows(rs => rs.map(r => (selected.has(r.id) ? { ...r, assigned_to: bulkAssignee } : r)));
    setSelected(new Set());
    toast({ title: "Assigned", description: `${ids.length} lead(s) → ${bulkAssignee}` });
  };

  // Split every lead evenly between the calling agents (half each).
  const distributeEvenly = async () => {
    try {
      const agents = [...CALLING_AGENT_EMAILS];
      const { data, error } = await supabase
        .from("calling_leads")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(50000);
      if (error) throw error;
      const ids = (data || []).map((r: any) => r.id);
      if (!ids.length) return toast({ title: "Nothing to distribute" });
      const buckets: Record<string, string[]> = {};
      agents.forEach(a => { buckets[a] = []; });
      ids.forEach((id, i) => buckets[agents[i % agents.length]].push(id));
      for (const [ownerEmail, list] of Object.entries(buckets)) {
        for (let i = 0; i < list.length; i += 200) {
          await supabase
            .from("calling_leads")
            .update({ assigned_to: ownerEmail })
            .in("id", list.slice(i, i + 200));
        }
      }
      toast({ title: "Distributed", description: `${ids.length} lead(s) split evenly across ${agents.length} callers.` });
      setReload(n => n + 1);
    } catch (e: any) {
      toast({ title: "Distribute failed", description: e?.message, variant: "destructive" });
    }
  };

  // Build the filtered query without pagination — reused for the table and export.
  const buildFilteredQuery = () => {
    const orderCol =
      sort === "views" ? "total_views" : sort === "name" ? "channel_name" : "subscribers";
    let q = supabase
      .from("calling_leads")
      .select("*", { count: "exact" })
      .order(orderCol, { ascending: sort === "name" });
    if (status !== "all") q = q.eq("call_status", status);
    if (source !== "all") q = q.eq("source", source);
    if (minSubs) q = q.gte("subscribers", Number(minSubs) || 0);
    if (country.trim()) q = q.ilike("country", `%${country.trim()}%`);
    if (!isAdmin && me) q = q.eq("assigned_to", me);
    else if (assignee === "unassigned") q = q.is("assigned_to", null);
    else if (assignee !== "all") q = q.eq("assigned_to", assignee);
    if (debounced) {
      const s = debounced.replace(/,/g, " ");
      q = q.or(
        `channel_name.ilike.%${s}%,phone.ilike.%${s}%,keyword.ilike.%${s}%,channel_link.ilike.%${s}%`,
      );
    }
    return q;
  };

  const escapeCsv = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v).replace(/\r?\n/g, " ");
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const exportCsv = async (onlySelected = false) => {
    setExporting(true);
    try {
      const allRows: CallingLead[] = [];
      const chunk = 1000;
      if (onlySelected) {
        const ids = Array.from(selected);
        for (let i = 0; i < ids.length; i += chunk) {
          const { data, error } = await supabase
            .from("calling_leads")
            .select("*")
            .in("id", ids.slice(i, i + chunk));
          if (error) throw error;
          allRows.push(...((data ?? []) as CallingLead[]));
        }
      } else {
        for (let from = 0; ; from += chunk) {
          const { data, error } = await buildFilteredQuery().range(from, from + chunk - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          allRows.push(...(data as CallingLead[]));
          if (data.length < chunk) break;
        }
      }
      const headers = ["Channel Name", "Channel Link", "Phone", "Subscribers", "Views", "Country", "Keyword", "Source", "Status", "Assigned To", "Notes", "Last Called At"];
      const lines = [
        headers.join(","),
        ...allRows.map(r =>
          headers.map((_, i) => {
            const vals = [
              r.channel_name, r.channel_link, r.phone, r.subscribers ?? "", r.total_views ?? "", r.country ?? "", r.keyword ?? "", r.source, r.call_status, r.assigned_to ?? "", r.call_notes ?? "", r.last_called_at ?? "",
            ];
            return escapeCsv(vals[i]);
          }).join(","),
        ),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calling-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: `${allRows.length} lead(s) downloaded.` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };


  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    rows.forEach(r => { byStatus[r.call_status] = (byStatus[r.call_status] || 0) + 1; });
    return byStatus;
  }, [rows]);

  const colCount = isAdmin ? 11 : 9;

  return (
    <div className="w-full h-[calc(100vh-180px)] flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <PhoneCall className="h-4 w-4 text-primary" /> Calling leads
          <span className="text-xs font-normal text-muted-foreground">{total.toLocaleString()} total</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, keyword…"
            className="h-8 pl-7 w-56 text-xs"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="all">All statuses</option>
          {CALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {isAdmin && (
          <select
            value={assignee}
            onChange={e => setAssignee(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <Input
          value={minSubs}
          onChange={e => setMinSubs(e.target.value.replace(/\D/g, ""))}
          placeholder="Min subs"
          className="h-8 w-24 text-xs"
        />
        <Input
          value={country}
          onChange={e => setCountry(e.target.value)}
          placeholder="Country"
          className="h-8 w-24 text-xs"
        />
        <select
          value={source}
          onChange={e => setSource(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="all">All sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as typeof sort)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="subs">Most subscribers</option>
          <option value="views">Most views</option>
          <option value="name">Channel name (A–Z)</option>
        </select>

        <select
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={() => setReload(n => n + 1)}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
        </Button>
        {isAdmin && (
          <>
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={importFromProspects} disabled={importing}>
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
              Import prospects with phone
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={() => exportCsv(false)} disabled={exporting}>
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export {total.toLocaleString()} leads
            </Button>
            {selected.size > 0 && (
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={() => exportCsv(true)} disabled={exporting}>
                <Download className="h-3.5 w-3.5" /> Export {selected.size} selected
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={distributeEvenly}>
              <Users className="h-3.5 w-3.5" /> Distribute evenly
            </Button>
          </>
        )}
        <div className="text-[11px] text-muted-foreground">
          {Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join(" · ")}
        </div>
      </div>

      {isAdmin && selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
          <span>{selected.size} selected</span>
          <select
            value={bulkAssignee}
            onChange={e => setBulkAssignee(e.target.value)}
            className="h-7 rounded-md border border-border bg-background px-2 text-xs"
          >
            {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <Button size="sm" className="h-6 text-[11px]" onClick={assignSelected}>Assign</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => exportCsv(true)} disabled={exporting}>
            <Download className="h-3.5 w-3.5" /> Export selected
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="min-h-0 flex-1 border border-border rounded-lg overflow-hidden">
        <div className="h-full overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                {isAdmin && (
                  <th className="p-2 w-8">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())}
                    />
                  </th>
                )}
                <th className="text-left p-2 font-medium">Channel</th>
                <th className="text-left p-2 font-medium">Phone</th>
                <th className="text-left p-2 font-medium">Subs</th>
                <th className="text-left p-2 font-medium">Views</th>
                <th className="text-left p-2 font-medium">Country</th>
                <th className="text-left p-2 font-medium">Source</th>
                {isAdmin && <th className="text-left p-2 font-medium">Assigned to</th>}
                <th className="text-left p-2 font-medium">Status</th>
                <th className="text-left p-2 font-medium">Notes</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr><td colSpan={colCount} className="p-8 text-center text-muted-foreground">
                  {isAdmin
                    ? <>No calling leads yet — import prospects with phone numbers above, or run the <a href="/phone" className="underline">/phone</a> tool.</>
                    : "No leads assigned to you yet."}
                </td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                  {isAdmin && (
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={e => setSelected(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(r.id); else next.delete(r.id);
                          return next;
                        })}
                      />
                    </td>
                  )}
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {r.thumbnail
                        ? <img
                            src={r.thumbnail}
                            alt={r.channel_name || "Channel thumbnail"}
                            className="h-11 w-11 rounded-md object-cover border border-border shrink-0"
                            loading="lazy"
                          />
                        : <div className="h-11 w-11 rounded-md bg-muted shrink-0" />}
                      <div className="min-w-0">
                        <a href={r.channel_link} target="_blank" rel="noreferrer" className="font-medium hover:underline flex items-center gap-1">
                          {r.channel_name || "Unknown"} <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                        {r.keyword && <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">{r.keyword}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <PhoneCell
                      lead={r}
                      masked={masked}
                      revealed={revealedId === r.id}
                      onReveal={() => setRevealedId(id => (id === r.id ? null : r.id))}
                    />
                  </td>
                  <td className="p-2">{(r.subscribers ?? 0).toLocaleString()}</td>
                  <td className="p-2">{(r.total_views ?? 0).toLocaleString()}</td>
                  <td className="p-2">{r.country || "—"}</td>
                  <td className="p-2 text-muted-foreground">{r.source || "—"}</td>
                  {isAdmin && (
                    <td className="p-2">
                      <select
                        value={r.assigned_to || ""}
                        onChange={e => patch(r.id, { assigned_to: e.target.value || null })}
                        className="h-6 rounded border border-border bg-background px-1 text-[11px]"
                      >
                        <option value="">Unassigned</option>
                        {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </td>
                  )}
                  <td className="p-2">
                    <select
                      value={r.call_status}
                      onChange={e => patch(r.id, {
                        call_status: e.target.value,
                        last_called_at: ["connected", "calling", "not reachable"].includes(e.target.value)
                          ? new Date().toISOString()
                          : r.last_called_at,
                      })}
                      className={`h-6 rounded px-1.5 text-[11px] border-0 ${statusClass(r.call_status)}`}
                    >
                      {CALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <Input
                      defaultValue={r.call_notes || ""}
                      onBlur={e => { if (e.target.value !== (r.call_notes || "")) patch(r.id, { call_notes: e.target.value }); }}
                      placeholder="Call notes…"
                      className="h-7 text-xs min-w-[160px]"
                    />
                  </td>
                  <td className="p-2">
                    {canDelete && (
                      <button className="text-destructive/70 hover:text-destructive" title="Delete" onClick={() => remove(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > pageSize && (() => {
        const pageCount = Math.max(1, Math.ceil(total / pageSize));
        const windowStart = Math.max(0, Math.min(page - 2, pageCount - 5));
        const numbers = Array.from({ length: Math.min(5, pageCount) }, (_, i) => windowStart + i);
        return (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
            <span>
              Showing {page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)} of {total.toLocaleString()} ·
              page {page + 1} of {pageCount}
            </span>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" className="h-6 text-[11px]" disabled={page === 0} onClick={() => setPage(0)}>« First</Button>
              <Button size="sm" variant="outline" className="h-6 text-[11px]" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
              {numbers.map(n => (
                <Button
                  key={n}
                  size="sm"
                  variant={n === page ? "default" : "outline"}
                  className="h-6 w-6 p-0 text-[11px]"
                  onClick={() => setPage(n)}
                >
                  {n + 1}
                </Button>
              ))}
              <Button size="sm" variant="outline" className="h-6 text-[11px]" disabled={page + 1 >= pageCount} onClick={() => setPage(p => p + 1)}>Next</Button>
              <Button size="sm" variant="outline" className="h-6 text-[11px]" disabled={page + 1 >= pageCount} onClick={() => setPage(pageCount - 1)}>Last »</Button>
              <Input
                className="h-6 w-16 text-[11px]"
                placeholder="Go to"
                inputMode="numeric"
                onKeyDown={e => {
                  if (e.key !== "Enter") return;
                  const n = Number((e.target as HTMLInputElement).value);
                  if (n >= 1 && n <= pageCount) setPage(n - 1);
                }}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
