import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/looseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Loader2, RefreshCw, Search, PhoneCall, ExternalLink, Download, Trash2, Copy,
  MessageCircle, Eye, EyeOff, Users, DownloadCloud, Filter, ArrowUp, ArrowDown,
  Sparkles, ClipboardCopy, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  email?: string | null;
  subscribers: number | null;
  total_views: number | null;
  country: string | null;
  language?: string | null;
  keyword: string | null;
  description?: string | null;
  last_video_title?: string | null;
  last_video_date?: string | null;
  last_video_url?: string | null;
  source: string;
  call_status: string;
  call_notes: string | null;
  last_called_at: string | null;
  assigned_to: string | null;
  client_name?: string | null;
  alt_email?: string | null;
  channel_joined?: string | null;
  lead_status?: string | null;
  sales_rep?: string | null;
  email_shared?: string | null;
  roadmap?: string | null;
  payment_link_shared?: string | null;
  payment_amount?: string | null;
  payment_status?: string | null;
  product_name?: string | null;
  duration?: string | null;
  comment?: string | null;
  created_at: string;
}

const PAGE_SIZES = [50, 100, 200, 500, 1000];

const ASSIGNEES = [
  ...CALLING_AGENT_EMAILS,
  ...PROSPECTS_ALLOWED_EMAILS.filter(e => e !== PROSPECTS_ADMIN_EMAIL),
];

const SALES_REPS = [
  "", "sales1@swishview.com", "sales2@swishview.com", "sales3@swishview.com",
  "amelia@swishview.com", "emily.j@swishview.com", "emily@swishview.com",
  "grace@swishview.com", "irene@swishview.com", "mia.brooks@swishview.com",
  "rachel@swishview.com", "scarlett.l@swishview.com", "sophie@swishview.com",
];

const PROSPECT_STATUSES = ["NA", "Interested", "Negotiating", "Closed Won", "Closed Lost", "Follow-up", "No Response"];
const PRODUCTS = ["", "SEO", "Viral", "Video editing", "Other"];

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
  const digits = (v || "").replace(/\D/g, "");
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

  if (!lead.phone) return <span className="px-1 text-muted-foreground">—</span>;

  if (hidden) {
    return (
      <div className="flex items-center gap-1.5 px-1">
        <span className="font-mono text-muted-foreground">{maskNumber(lead.phone)}</span>
        <button className="opacity-60 hover:opacity-100" title="Reveal number" onClick={onReveal}>
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-1">
      {info.flag && (
        <span
          title={`${info.country || ""}${info.callingCode ? ` (+${info.callingCode})` : ""}`}
          className="text-[13px] leading-none"
        >
          {info.flag}
        </span>
      )}
      <a href={info.e164 ? `tel:${info.e164}` : `tel:${lead.phone}`} className="font-mono hover:underline truncate">
        {display}
      </a>
      {!info.valid && lead.phone && (
        <span className="rounded bg-destructive/15 px-1 text-[10px] text-destructive">?</span>
      )}
      <button
        className="opacity-50 hover:opacity-100"
        title="Copy number"
        onClick={() => { navigator.clipboard.writeText(info.e164 || lead.phone); toast({ title: "Copied" }); }}
      >
        <Copy className="h-3 w-3" />
      </button>
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

const maskEmail = (v: string) => {
  const [u, d] = v.split("@");
  if (!d) return "•••••";
  return `${(u || "").slice(0, 2)}•••@${d}`;
};

function EmailCell({
  value,
  masked,
  revealed,
  onReveal,
  onChange,
}: {
  value: string | null | undefined;
  masked: boolean;
  revealed: boolean;
  onReveal: () => void;
  onChange: (v: string) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  useEffect(() => setDraft(value || ""), [value]);
  const text = (value || "").trim();

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft.trim() !== text) onChange(draft.trim()); }}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-full h-7 px-1 bg-transparent border-0 outline-none focus:bg-accent text-xs"
      />
    );
  }

  return (
    <div className="flex items-center gap-1 h-7 px-1">
      <span
        className="flex-1 truncate select-text"
        title={text || "Double-click to edit"}
        onDoubleClick={() => setEditing(true)}
      >
        {text ? (masked && !revealed ? maskEmail(text) : text) : <span className="text-muted-foreground">—</span>}
      </span>
      {text && (
        <>
          {masked && (
            <button className="opacity-60 hover:opacity-100" title={revealed ? "Hide" : "Show"} onClick={onReveal}>
              {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          )}
          <button
            className="opacity-50 hover:opacity-100"
            title="Copy email"
            onClick={() => { navigator.clipboard.writeText(text); toast({ title: "Copied" }); }}
          >
            <Copy className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}

const fmtDate = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

// ─────────────────────────────── columns

type ColType = "image" | "text" | "email" | "phone" | "url" | "select" | "number" | "date" | "video";

interface CallColumn {
  key: string;
  label: string;
  width: number;
  type: ColType;
  options?: string[];
  auto?: boolean;
  adminOnly?: boolean;
}

const COLUMNS: CallColumn[] = [
  { key: "thumbnail", label: "YT Thumb", width: 90, type: "image", auto: true },
  { key: "email", label: "Email", width: 280, type: "email" },
  { key: "client_name", label: "Client Name", width: 200, type: "text" },
  { key: "channel_name", label: "Channel Name", width: 230, type: "text", auto: true },
  { key: "channel_link", label: "YT Channel URL", width: 300, type: "url" },
  { key: "phone", label: "Phone", width: 210, type: "phone" },
  { key: "call_status", label: "Call Status", width: 150, type: "select", options: CALL_STATUSES },
  { key: "lead_status", label: "Status", width: 150, type: "select", options: PROSPECT_STATUSES },
  { key: "assigned_to", label: "Assigned To", width: 220, type: "select", options: ["", ...ASSIGNEES], adminOnly: true },
  { key: "sales_rep", label: "Sales Rep", width: 220, type: "select", options: SALES_REPS },
  { key: "subscribers", label: "Subscribers", width: 130, type: "number", auto: true },
  { key: "total_views", label: "Total Views", width: 140, type: "number", auto: true },
  { key: "lastVideo", label: "Last Video", width: 340, type: "video", auto: true },
  { key: "country", label: "Country", width: 120, type: "text", auto: true },
  { key: "language", label: "Language", width: 120, type: "text", auto: true },
  { key: "channel_joined", label: "Joined", width: 130, type: "date", auto: true },
  { key: "alt_email", label: "Alt Email", width: 260, type: "email" },
  { key: "keyword", label: "Niche", width: 160, type: "text" },
  { key: "description", label: "Description", width: 380, type: "text", auto: true },
  { key: "email_shared", label: "Email Shared", width: 130, type: "select", options: ["", "Yes", "No"] },
  { key: "roadmap", label: "Roadmap", width: 170, type: "text" },
  { key: "payment_link_shared", label: "Pay Link Shared", width: 150, type: "select", options: ["", "Yes", "No"] },
  { key: "product_name", label: "Product Pitching", width: 160, type: "select", options: PRODUCTS },
  { key: "duration", label: "Duration", width: 140, type: "text" },
  { key: "payment_amount", label: "Amount", width: 130, type: "number" },
  { key: "payment_status", label: "Payment Status", width: 150, type: "select", options: PROSPECT_STATUSES },
  { key: "source", label: "Source", width: 130, type: "text", auto: true },
  { key: "last_called_at", label: "Last Called", width: 140, type: "date", auto: true },
  { key: "call_notes", label: "Call Notes", width: 340, type: "text" },
  { key: "comment", label: "Comment", width: 340, type: "text" },
];

type ColFilter = {
  search?: string;
  values?: string[];
  min?: string;
  max?: string;
  sort?: "asc" | "desc";
};

const cellText = (row: CallingLead, key: string): string => {
  if (key === "lastVideo") return row.last_video_title || "";
  if (key === "thumbnail") return row.thumbnail || "";
  const v = (row as any)[key];
  return v === null || v === undefined ? "" : String(v);
};

const ColumnHeader = ({
  col, filter, setFilter, distinctValues,
}: {
  col: CallColumn;
  filter: ColFilter | undefined;
  setFilter: (f: ColFilter | undefined) => void;
  distinctValues: string[];
}) => {
  const active = !!(filter && (filter.search || filter.values?.length || filter.min || filter.max || filter.sort));
  const [local, setLocal] = useState<ColFilter>(filter || {});
  const [open, setOpen] = useState(false);
  useEffect(() => { setLocal(filter || {}); }, [filter]);
  const isNum = col.type === "number";
  const isDate = col.type === "date" || col.key === "lastVideo";
  const isSelect = col.type === "select";

  const apply = (next: ColFilter) => {
    const empty = !next.search && !next.values?.length && !next.min && !next.max && !next.sort;
    setFilter(empty ? undefined : next);
  };

  return (
    <div className="inline-flex items-center gap-1">
      <span>{col.label}</span>
      {col.auto && <span className="text-[10px] text-primary">(auto)</span>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`inline-flex items-center ${active ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"}`}
            title="Filter / Sort"
          >
            <Filter className="h-3 w-3" />
            {filter?.sort === "asc" && <ArrowUp className="h-3 w-3" />}
            {filter?.sort === "desc" && <ArrowDown className="h-3 w-3" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-2" align="start" onClick={e => e.stopPropagation()}>
          <div className="text-xs font-semibold">{col.label}</div>
          <div className="flex gap-1">
            <Button size="sm" variant={local.sort === "asc" ? "default" : "outline"} className="h-6 flex-1 text-[11px]"
              onClick={() => { const n = { ...local, sort: local.sort === "asc" ? undefined : "asc" as const }; setLocal(n); apply(n); }}>
              <ArrowUp className="h-3 w-3 mr-1" /> Asc
            </Button>
            <Button size="sm" variant={local.sort === "desc" ? "default" : "outline"} className="h-6 flex-1 text-[11px]"
              onClick={() => { const n = { ...local, sort: local.sort === "desc" ? undefined : "desc" as const }; setLocal(n); apply(n); }}>
              <ArrowDown className="h-3 w-3 mr-1" /> Desc
            </Button>
          </div>

          {(isNum || isDate) ? (
            <div className="flex items-center gap-1">
              <Input
                className="h-7 text-xs" placeholder={isDate ? "From (YYYY-MM-DD)" : "Min"}
                value={local.min || ""} onChange={e => setLocal({ ...local, min: e.target.value })}
              />
              <Input
                className="h-7 text-xs" placeholder={isDate ? "To (YYYY-MM-DD)" : "Max"}
                value={local.max || ""} onChange={e => setLocal({ ...local, max: e.target.value })}
              />
            </div>
          ) : (
            <Input
              className="h-7 text-xs" placeholder="Contains…"
              value={local.search || ""} onChange={e => setLocal({ ...local, search: e.target.value })}
            />
          )}

          {isSelect && (
            <div className="max-h-40 overflow-auto space-y-1 border-t pt-2">
              {(col.options || distinctValues).map(opt => {
                const checked = local.values?.includes(opt) ?? false;
                return (
                  <button
                    key={opt || "(blank)"}
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-xs hover:bg-accent"
                    onClick={() => {
                      const set = new Set(local.values || []);
                      if (checked) set.delete(opt); else set.add(opt);
                      setLocal({ ...local, values: Array.from(set) });
                    }}
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <span className="truncate">{opt || "(blank)"}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-1 pt-1">
            <Button size="sm" className="h-6 flex-1 text-[11px]" onClick={() => { apply(local); setOpen(false); }}>Apply</Button>
            <Button size="sm" variant="outline" className="h-6 flex-1 text-[11px]"
              onClick={() => { setLocal({}); setFilter(undefined); setOpen(false); }}>Clear</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ─────────────────────────────── panel

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
  const [assignee, setAssignee] = useState("all");
  const [sort, setSort] = useState<"subs" | "views" | "name">("subs");
  const [pageSize, setPageSize] = useState<number>(() => Number(localStorage.getItem("calling.pageSize")) || 100);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [reload, setReload] = useState(0);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [revealedEmailId, setRevealedEmailId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState<string>(ASSIGNEES[0] || "");
  const [filters, setFilters] = useState<Record<string, ColFilter>>({});
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [fillProgress, setFillProgress] = useState<{ done: number; total: number } | null>(null);

  const me = (currentEmail || "").toLowerCase();
  const masked = !isAdmin;

  const visibleColumns = useMemo(
    () => COLUMNS.filter(c => !c.adminOnly || isAdmin),
    [isAdmin],
  );

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [debounced, status, assignee, sort, pageSize]);

  useEffect(() => { localStorage.setItem("calling.pageSize", String(pageSize)); }, [pageSize]);

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
  }, [page, pageSize, debounced, status, sort, assignee, reload, isAdmin, me, toast]);

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

  // ── YouTube enrichment: fill whatever is still empty on the row.
  const missingFields = (r: CallingLead) =>
    !r.channel_name || !r.thumbnail || !r.subscribers || !r.total_views || !r.country ||
    !r.description || !r.channel_joined || !r.last_video_title || !r.email || !r.phone;

  const enrichLead = async (row: CallingLead, silent = false): Promise<boolean> => {
    if (!row.channel_link) {
      if (!silent) toast({ title: "No channel URL on this lead", variant: "destructive" });
      return false;
    }
    try {
      const { data, error } = await supabase.functions.invoke("youtube-channel-info", {
        body: { channelUrl: row.channel_link, includeVideos: true, maxVideos: 3 },
      });
      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error || "No channel data");

      const lv = data.latestVideo;
      const values: Partial<CallingLead> = {};
      const keep = (k: keyof CallingLead, v: any) => {
        if (v === undefined || v === null || v === "" ) return;
        if (row[k] === null || row[k] === undefined || row[k] === "" || row[k] === 0) (values as any)[k] = v;
      };
      keep("channel_id", data.channelId);
      keep("channel_name", data.channelName);
      keep("thumbnail", data.thumbnail);
      keep("subscribers", Number(data.subscribers) || null);
      keep("total_views", Number(data.totalViews) || null);
      keep("country", data.country);
      keep("description", data.description);
      keep("channel_joined", data.publishedAt ? String(data.publishedAt).slice(0, 10) : "");
      keep("last_video_title", lv?.title);
      keep("last_video_date", lv?.publishedAt);
      keep("last_video_url", lv?.url);
      if (!row.phone && data.phone) values.phone = data.phone;

      // Email is never on the YouTube API — pull it from the prospect record.
      if (!row.email && row.channel_link) {
        const { data: p } = await supabase
          .from("prospects")
          .select("data")
          .ilike("channel_link", row.channel_link)
          .limit(1);
        const email = (p?.[0] as any)?.data?.email;
        if (email) values.email = email;
      }

      if (!Object.keys(values).length) {
        if (!silent) toast({ title: "Already up to date" });
        return false;
      }
      await patch(row.id, values);
      if (!silent) toast({ title: "Details fetched from YouTube" });
      return true;
    } catch (e: any) {
      if (!silent) toast({ title: "Fetch failed", description: String(e?.message || e).slice(0, 200), variant: "destructive" });
      return false;
    }
  };

  const enrichOne = async (row: CallingLead) => {
    setEnrichingId(row.id);
    try { await enrichLead(row); } finally { setEnrichingId(null); }
  };

  // Walk the rows currently on screen (or the selection) and complete them.
  const fillMissing = async () => {
    const scope = selected.size
      ? rows.filter(r => selected.has(r.id))
      : rows.filter(missingFields);
    const targets = scope.filter(r => r.channel_link);
    if (!targets.length) return toast({ title: "Nothing to fill on this page" });
    setFillProgress({ done: 0, total: targets.length });
    let filled = 0;
    for (let i = 0; i < targets.length; i++) {
      const ok = await enrichLead(targets[i], true);
      if (ok) filled++;
      setFillProgress({ done: i + 1, total: targets.length });
    }
    setFillProgress(null);
    toast({ title: "Fill complete", description: `${filled} of ${targets.length} lead(s) updated from YouTube.` });
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
            email: d.email || r.email || null,
            subscribers: Number(String(d.subscribersLive || d.subscribers || "").replace(/\D/g, "")) || 0,
            total_views: Number(String(d.totalViews || "").replace(/\D/g, "")) || 0,
            country: d.country || null,
            language: d.language || d.defaultLanguage || null,
            keyword: d.niche || d.keyword || null,
            description: d.description || d.channelDescription || null,
            last_video_title: d.lastVideoTitle || d.recentVideos?.[0]?.title || null,
            last_video_date: d.lastVideoDate || d.recentVideos?.[0]?.publishedAt || null,
            last_video_url: d.lastVideoUrl || d.recentVideos?.[0]?.url || null,
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

  // Split every lead evenly between the calling agents.
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
    if (!isAdmin && me) q = q.eq("assigned_to", me);
    else if (assignee === "unassigned") q = q.is("assigned_to", null);
    else if (assignee !== "all") q = q.eq("assigned_to", assignee);
    if (debounced) {
      const s = debounced.replace(/,/g, " ");
      q = q.or(
        `channel_name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,keyword.ilike.%${s}%,channel_link.ilike.%${s}%,last_video_title.ilike.%${s}%`,
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
      const headers = ["Channel Name", "Channel Link", "Phone", "Email", "Subscribers", "Views", "Country", "Language", "Keyword", "Last Video Title", "Last Video Date", "Description", "Source", "Status", "Assigned To", "Notes", "Last Called At"];
      const lines = [
        headers.join(","),
        ...allRows.map(r =>
          [
            r.channel_name, r.channel_link, r.phone, r.email ?? "", r.subscribers ?? "", r.total_views ?? "",
            r.country ?? "", r.language ?? "", r.keyword ?? "", r.last_video_title ?? "", r.last_video_date ?? "",
            r.description ?? "", r.source, r.call_status, r.assigned_to ?? "", r.call_notes ?? "", r.last_called_at ?? "",
          ].map(escapeCsv).join(","),
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

  const copyRow = (r: CallingLead) => {
    const text = [r.channel_name, r.channel_link, r.phone, r.email, r.country, r.subscribers]
      .filter(Boolean).join(" · ");
    navigator.clipboard.writeText(text);
    toast({ title: "Row copied" });
  };

  const distinctFor = (key: string) =>
    Array.from(new Set(rows.map(r => cellText(r, key)))).filter(v => v !== "").sort().slice(0, 200);

  // Excel-style per-column filtering + sorting on the loaded page.
  const viewRows = useMemo(() => {
    let out = [...rows];
    Object.entries(filters).forEach(([key, f]) => {
      if (!f) return;
      if (f.search) {
        const needle = f.search.toLowerCase();
        out = out.filter(r => cellText(r, key).toLowerCase().includes(needle));
      }
      if (f.values?.length) {
        out = out.filter(r => f.values!.includes(cellText(r, key)));
      }
      if (f.min || f.max) {
        const col = COLUMNS.find(c => c.key === key);
        const isDate = col?.type === "date" || key === "lastVideo";
        out = out.filter(r => {
          const raw = key === "lastVideo" ? (r.last_video_date || "") : cellText(r, key);
          if (isDate) {
            const t = raw ? new Date(raw).getTime() : NaN;
            if (isNaN(t)) return false;
            if (f.min && t < new Date(f.min).getTime()) return false;
            if (f.max && t > new Date(f.max).getTime()) return false;
            return true;
          }
          const n = Number(String(raw).replace(/[^\d.-]/g, ""));
          if (isNaN(n)) return false;
          if (f.min && n < Number(f.min)) return false;
          if (f.max && n > Number(f.max)) return false;
          return true;
        });
      }
    });
    const sortEntry = Object.entries(filters).find(([, f]) => f?.sort);
    if (sortEntry) {
      const [key, f] = sortEntry;
      const col = COLUMNS.find(c => c.key === key);
      const dir = f!.sort === "asc" ? 1 : -1;
      out.sort((a, b) => {
        const av = key === "lastVideo" ? (a.last_video_date || "") : cellText(a, key);
        const bv = key === "lastVideo" ? (b.last_video_date || "") : cellText(b, key);
        if (col?.type === "number") return (Number(av || 0) - Number(bv || 0)) * dir;
        if (col?.type === "date" || key === "lastVideo") {
          return ((new Date(av).getTime() || 0) - (new Date(bv).getTime() || 0)) * dir;
        }
        return av.localeCompare(bv) * dir;
      });
    }
    return out;
  }, [rows, filters]);

  const activeColFilters = Object.keys(filters).length;
  const allVisibleSelected = viewRows.length > 0 && viewRows.every(r => selected.has(r.id));


  const renderCell = (r: CallingLead, col: CallColumn) => {
    switch (col.key) {
      case "thumbnail":
        return r.thumbnail
          ? <img src={r.thumbnail} alt={r.channel_name || "Creator thumbnail"} className="h-10 w-10 rounded object-cover border border-border mx-auto" loading="lazy" />
          : <div className="h-10 w-10 rounded bg-muted mx-auto" />;
      case "phone":
        return (
          <PhoneCell
            lead={r} masked={masked}
            revealed={revealedId === r.id}
            onReveal={() => setRevealedId(id => (id === r.id ? null : r.id))}
          />
        );
      case "email":
      case "alt_email":
        return (
          <EmailCell
            value={(r as any)[col.key]}
            masked={masked && col.key === "email"}
            revealed={revealedEmailId === r.id}
            onReveal={() => setRevealedEmailId(id => (id === r.id ? null : r.id))}
            onChange={v => patch(r.id, { [col.key]: v || null } as Partial<CallingLead>)}
          />
        );
      case "channel_link":
        return (
          <div className="flex items-center gap-1 px-1">
            <input
              value={r.channel_link || ""}
              onChange={e => patch(r.id, { channel_link: e.target.value })}
              className="w-full h-7 px-0 bg-transparent border-0 outline-none focus:bg-accent text-xs"
            />
            {r.channel_link && (
              <a href={r.channel_link} target="_blank" rel="noreferrer" title="Open channel">
                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
              </a>
            )}
          </div>
        );
      case "lastVideo":
        return r.last_video_title ? (
          <div className="px-1 py-0.5">
            <div className="truncate" title={r.last_video_title}>
              {r.last_video_url
                ? <a href={r.last_video_url} target="_blank" rel="noreferrer" className="hover:underline">{r.last_video_title}</a>
                : r.last_video_title}
            </div>
            <div className="text-[10px] text-muted-foreground">{fmtDate(r.last_video_date) || "—"}</div>
          </div>
        ) : <span className="px-1 text-muted-foreground">—</span>;
      case "call_status":
        return (
          <select
            value={r.call_status}
            onChange={e => patch(r.id, {
              call_status: e.target.value,
              last_called_at: ["connected", "calling", "not reachable"].includes(e.target.value)
                ? new Date().toISOString()
                : r.last_called_at,
            })}
            className={`h-6 w-full rounded px-1 text-[11px] border-0 ${statusClass(r.call_status)}`}
          >
            {CALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        );
      case "subscribers":
      case "total_views":
        return <div className="px-1 text-right tabular-nums">{(((r as any)[col.key] as number) ?? 0).toLocaleString()}</div>;
      case "last_called_at":
        return <div className="px-1 text-muted-foreground">{fmtDate(r.last_called_at) || "—"}</div>;
      case "source":
        return <div className="px-1 text-muted-foreground truncate">{r.source || "—"}</div>;
      default:
        if (col.type === "select") {
          return (
            <select
              value={((r as any)[col.key] ?? "") as string}
              onChange={e => patch(r.id, { [col.key]: e.target.value || null } as Partial<CallingLead>)}
              className="h-7 w-full bg-transparent px-1 text-xs outline-none focus:bg-accent"
            >
              {(col.options || []).map(o => <option key={o} value={o}>{o || "—"}</option>)}
            </select>
          );
        }
        return (
          <input
            defaultValue={((r as any)[col.key] ?? "") as string}
            key={`${r.id}-${col.key}-${(r as any)[col.key] ?? ""}`}
            onBlur={e => {
              const v = e.target.value;
              if (v !== (((r as any)[col.key] ?? "") as string)) patch(r.id, { [col.key]: v || null } as Partial<CallingLead>);
            }}
            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="w-full h-7 px-1 bg-transparent border-0 outline-none focus:bg-accent text-xs"
          />
        );
    }
  };

  const tableWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0) + 180;

  return (
    <div className="w-full h-[calc(100vh-180px)] flex flex-col overflow-hidden gap-2">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto pb-1 thin-scrollbar">
        <div className="flex shrink-0 items-center gap-2 text-sm font-semibold">
          <PhoneCall className="h-4 w-4 text-primary" /> Calling leads
          <span className="text-xs font-normal text-muted-foreground">{total.toLocaleString()} total</span>
        </div>
        <div className="relative shrink-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email, video…"
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
        {activeColFilters > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setFilters({})}>
            Clear {activeColFilters} column filter{activeColFilters === 1 ? "" : "s"}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 text-xs">
              Actions <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setReload(n => n + 1)} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
              Refresh
            </DropdownMenuItem>
            <DropdownMenuItem onClick={fillMissing} disabled={!!fillProgress}>
              {fillProgress ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
              {fillProgress ? `Filling ${fillProgress.done}/${fillProgress.total}` : "Fill missing details"}
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={importFromProspects} disabled={importing}>
                  {importing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="mr-2 h-3.5 w-3.5" />}
                  Import prospects with phone
                </DropdownMenuItem>
                <DropdownMenuItem onClick={distributeEvenly}>
                  <Users className="mr-2 h-3.5 w-3.5" />
                  Distribute evenly
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
          <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="min-h-0 flex-1 border border-border rounded-lg overflow-auto">
        <table
          className="table-fixed border-collapse text-xs"
          style={{ width: tableWidth, minWidth: tableWidth }}
        >
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: 40 }} />
            {visibleColumns.map(col => <col key={col.key} style={{ width: col.width }} />)}
            <col style={{ width: 100 }} />
          </colgroup>
          <thead className="sticky top-0 z-20 bg-muted">
            <tr>
              <th className="border border-border px-2 py-1.5 sticky left-0 z-30 bg-muted w-10 text-center">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={v => setSelected(v ? new Set(viewRows.map(r => r.id)) : new Set())}
                />
              </th>
              <th className="border border-border px-2 py-1.5 sticky left-10 z-30 bg-muted w-10 text-center font-semibold">#</th>
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  className="border border-border px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                  style={{ width: col.width, minWidth: col.width }}
                >
                  <ColumnHeader
                    col={col}
                    filter={filters[col.key]}
                    setFilter={f => setFilters(prev => {
                      const n = { ...prev };
                      if (f) n[col.key] = f; else delete n[col.key];
                      return n;
                    })}
                    distinctValues={distinctFor(col.key)}
                  />
                </th>
              ))}
              <th className="border border-border px-2 py-1.5 w-24 text-center bg-muted sticky right-0 z-30">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && viewRows.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 3} className="p-12 text-center text-muted-foreground">
                  {isAdmin
                    ? <>No calling leads here — import prospects with phone numbers above, or run the <a href="/phone" className="underline">/phone</a> tool.</>
                    : "No leads assigned to you yet."}
                </td>
              </tr>
            )}
            {viewRows.map((r, idx) => (
              <tr key={r.id} className="hover:bg-accent/30">
                <td className="border border-border px-2 py-1 sticky left-0 bg-background text-center">
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={v => setSelected(prev => {
                      const next = new Set(prev);
                      if (v) next.add(r.id); else next.delete(r.id);
                      return next;
                    })}
                  />
                </td>
                <td className="border border-border px-2 py-1 sticky left-10 bg-background text-center text-muted-foreground">
                  {page * pageSize + idx + 1}
                </td>
                {visibleColumns.map(col => (
                  <td
                    key={col.key}
                    className="border border-border p-0 align-middle"
                    style={{ width: col.width, minWidth: col.width }}
                  >
                    {renderCell(r, col)}
                  </td>
                ))}
                <td className="border border-border p-1 text-center sticky right-0 bg-background">
                  <div className="flex items-center justify-center gap-0.5">
                    <Button
                      size="sm" variant="ghost" className="h-6 w-6 p-0"
                      title="Fetch missing details from YouTube"
                      disabled={enrichingId === r.id}
                      onClick={() => enrichOne(r)}
                    >
                      {enrichingId === r.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RefreshCw className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Copy row" onClick={() => copyRow(r)}>
                      <ClipboardCopy className="h-3 w-3" />
                    </Button>
                    {canDelete && (
                      <Button
                        size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                        title="Delete" onClick={() => remove(r.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
