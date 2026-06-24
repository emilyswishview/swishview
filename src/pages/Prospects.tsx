import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FlaskConical, Inbox, LogOut } from "lucide-react";
import SendQueuePanel from "@/components/prospects/SendQueuePanel";
import {
  Loader2, Plus, Trash2, RefreshCw, Search, ExternalLink,
  TrendingUp, Video, ArrowDown, ArrowUp, Zap, Filter,
  Eye, EyeOff, Copy, CopyMinus, ClipboardCopy, ChevronLeft, ChevronRight, ChevronDown, Mail, Send, Reply, Paperclip, Sparkles, Pencil, Wand2, Upload,
} from "lucide-react";


import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useProspectsSession, PROSPECTS_ALLOWED_SENDERS } from "@/hooks/useProspectsSession";
import EmployeePermissionsDialog from "@/components/prospects/EmployeePermissionsDialog";
import ProspectsResetPasswordDialog from "@/components/prospects/ProspectsResetPasswordDialog";
import { supabase } from "@/integrations/supabase/client";

type ProspectStatus = "NA" | "Interested" | "Negotiating" | "Closed Won" | "Closed Lost" | "Follow-up" | "No Response";
type YesNo = "Yes" | "No" | "";
type SalesRep = string;
type Product = "" | "SEO" | "Viral" | "Video editing" | "Other";

interface Snapshot {
  date: string;
  subscribers: number;
  totalViews: number;
}

interface RecentVid {
  title: string;
  url: string;
  description: string;
}

interface Prospect {
  id: string;
  email: string;
  altEmail: string;
  phone: string;
  clientName: string;
  channelLink: string;
  channelName: string;
  channelDescription: string;
  country: string;
  channelJoined: string;
  subscribersLive: string;
  totalViews: string;
  ytCapture: string;
  sales: SalesRep;
  emailShared: YesNo;
  roadmap: string;
  paymentLinkShared: YesNo;
  status: ProspectStatus;
  comment: string;
  productName: Product;
  duration: string;
  paymentAmount: string;
  paymentStatus: ProspectStatus;
  updatedAt: string;
  snapshots: Snapshot[];
  lastVideoTitle: string;
  lastVideoDate: string;
  lastVideoUrl: string;
  lastVideoThumb: string;
  lastVideoViews: string;
  lastFetchedAt: string;
  recentVideos: RecentVid[];
  assignedSender?: string;
  autoDiscovered?: boolean;
}

const STATUSES: ProspectStatus[] = ["NA", "Interested", "Negotiating", "Closed Won", "Closed Lost", "Follow-up", "No Response"];
// 20 Google Workspace mailboxes used for outreach. Sales Rep column maps
// directly to the assigned sender so emails sent for that prospect always
// originate from this address (auto-distributed on insert via DB trigger).
const SALES: string[] = [
  "",
  "amelia@swishview.com","ashley@swishview.com","daisy@swishview.com",
  "emily.j@swishview.com","emily@swishview.com","grace@swishview.com",
  "hazel@swishview.com","irene@swishview.com","mia.brooks@swishview.com",
  "rachel@swishview.com","scarlett.l@swishview.com","scarlett@swishview.com",
  "serena@swishview.com","sophie@swishview.com",
  "amelia@swishview.email","grace@swishview.email","jasmine@swishview.email",
  "rachel@swishview.email","serena@swishview.email","sophie@swishview.email",
];
const PRODUCTS: Product[] = ["", "SEO", "Viral", "Video editing", "Other"];

const todayISO = () => new Date().toISOString().slice(0, 10);

// Small inline control: "Select first N rows" for sales reps to quickly grab a batch.
const SelectFirstN: React.FC<{ onSelect: (n: number) => void; max: number }> = ({ onSelect, max }) => {
  const [n, setN] = useState<string>("50");
  if (max === 0) return null;
  return (
    <div className="inline-flex items-center gap-1 h-7 px-2 rounded border border-border text-[11px] bg-background">
      <span className="text-muted-foreground">Select first</span>
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={n}
        onChange={e => setN(e.target.value.replace(/\D/g, ""))}
        className="h-6 w-14 text-[11px] px-1"
      />
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px]"
        onClick={() => {
          const parsed = Math.max(1, Math.min(max, parseInt(n) || 0));
          if (parsed > 0) onSelect(parsed);
        }}
      >
        Go
      </Button>
      <span className="text-muted-foreground">of {max.toLocaleString()}</span>
    </div>
  );
};

const emptyProspect = (): Prospect => ({
  id: crypto.randomUUID(),
  email: "", altEmail: "", phone: "", clientName: "",
  channelLink: "", channelName: "", channelDescription: "", country: "", channelJoined: "",
  subscribersLive: "", totalViews: "", ytCapture: "",
  sales: "", emailShared: "", roadmap: "", paymentLinkShared: "",
  status: "NA", comment: "", productName: "", duration: "", paymentAmount: "", paymentStatus: "NA",
  updatedAt: new Date().toISOString(),
  snapshots: [], lastVideoTitle: "", lastVideoDate: "", lastVideoUrl: "",
  lastVideoThumb: "", lastVideoViews: "", lastFetchedAt: "",
  recentVideos: [],
});

type ColType = "text" | "url" | "email" | "select" | "image" | "growth" | "video" | "number" | "date" | "emails";

interface Column {
  key: keyof Prospect | "growthChart" | "lastVideo" | "emailHistory";

  label: string;
  width: number;
  type: ColType;
  options?: readonly string[];
  auto?: boolean;
}

const COLUMNS: Column[] = [
  // Most important info first
  { key: "ytCapture", label: "YT Thumb", width: 80, type: "image", auto: true },
  { key: "email", label: "Email", width: 220, type: "email" },
  { key: "clientName", label: "Client Name", width: 150, type: "text" },
  { key: "channelName", label: "Channel Name", width: 170, type: "text", auto: true },
  { key: "channelLink", label: "YT Channel URL", width: 220, type: "url" },
  { key: "emailHistory", label: "Conversations", width: 130, type: "emails", auto: true },
  { key: "status", label: "Status", width: 130, type: "select", options: STATUSES },
  { key: "assignedSender" as any, label: "Sales Rep", width: 180, type: "select", options: SALES },
  { key: "subscribersLive", label: "Subscribers", width: 110, type: "number", auto: true },
  { key: "totalViews", label: "Total Views", width: 120, type: "number", auto: true },
  { key: "lastVideo", label: "Last Video", width: 240, type: "video", auto: true },
  { key: "growthChart", label: "Daily Growth", width: 130, type: "growth", auto: true },
  { key: "country", label: "Country", width: 100, type: "text", auto: true },
  { key: "channelJoined", label: "Joined", width: 110, type: "date", auto: true },
  { key: "altEmail", label: "Alt Email", width: 190, type: "email" },
  { key: "phone", label: "Phone", width: 140, type: "text" },
  { key: "emailShared", label: "Email Shared", width: 110, type: "select", options: ["", "Yes", "No"] },
  { key: "roadmap", label: "Roadmap", width: 140, type: "text" },
  { key: "paymentLinkShared", label: "Pay Link Shared", width: 130, type: "select", options: ["", "Yes", "No"] },
  { key: "productName", label: "Product Pitching", width: 140, type: "select", options: PRODUCTS },
  { key: "duration", label: "Duration", width: 130, type: "text" },
  { key: "paymentAmount", label: "Amount", width: 110, type: "number" },
  { key: "paymentStatus", label: "Payment Status", width: 130, type: "select", options: STATUSES },
  { key: "comment", label: "Comment", width: 220, type: "text" },
];

// Column key (UI) -> top-level Supabase column for server-side ORDER BY.
// Keys not listed here fall back to client-only sort within the current page.
const SORT_DB_MAP: Record<string, string> = {
  email: "email",
  clientName: "client_name",
  channelName: "channel_name",
  channelLink: "channel_link",
  status: "status",
  assignedSender: "assigned_sender",
  subscribersLive: "subscribers_live",
  totalViews: "total_views",
  lastVideo: "last_video_date",
  productName: "product_name",
};

const HEADER_MAP: Record<string, keyof Prospect> = {
  email: "email", mail: "email", clientemail: "email", emailid: "email",
  altemail: "altEmail", alternativeemail: "altEmail", alternateemail: "altEmail",
  phone: "phone", phonenumber: "phone", mobile: "phone",
  clientname: "clientName", name: "clientName",
  channellink: "channelLink", channelurl: "channelLink", channel: "channelLink",
  ytchannel: "channelLink", youtubechannel: "channelLink",
  ytchannellink: "channelLink", ytchannelurl: "channelLink", ytlink: "channelLink",
  youtubelink: "channelLink", youtubeurl: "channelLink", youtubechannellink: "channelLink",
  youtubechannelurl: "channelLink",
  channelname: "channelName",
  channeldescription: "channelDescription", description: "channelDescription", channeldis: "channelDescription",
  country: "country",
  joineddate: "channelJoined", joined: "channelJoined", channeljoined: "channelJoined",
  subscribers: "subscribersLive", subs: "subscribersLive", subscriberslive: "subscribersLive",
  subscriber: "subscribersLive", subscribercount: "subscribersLive",
  totalviews: "totalViews", views: "totalViews",
  ytcapture: "ytCapture", thumbnail: "ytCapture", thumb: "ytCapture", ytthumb: "ytCapture",
  sales: "assignedSender" as any, salesrep: "assignedSender" as any, salesperson: "assignedSender" as any, sender: "assignedSender" as any, assignedsender: "assignedSender" as any,
  emailshared: "emailShared",
  roadmap: "roadmap",
  paymentlinkshared: "paymentLinkShared", paylinkshared: "paymentLinkShared",
  status: "status",
  comment: "comment", comments: "comment", notes: "comment",
  productnamepitching: "productName", product: "productName", productname: "productName",
  productpitching: "productName",
  duration: "duration",
  paymentamount: "paymentAmount", amount: "paymentAmount",
  paymentstatus: "paymentStatus",
};

const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const fmtCompact = (n: number) => {
  if (!n || isNaN(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
};

const fmtDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit" });
};

const daysAgo = (iso: string) => {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d) / 86400000);
};

const addSnapshot = (existing: Snapshot[] = [], snap: Snapshot): Snapshot[] => {
  const filtered = (existing || []).filter(s => s.date !== snap.date);
  return [...filtered, snap].sort((a, b) => a.date.localeCompare(b.date)).slice(-90);
};

// Detailed growth analytics from a snapshot series.
// Returns null when there's no snapshot at all, otherwise gives:
//  - perDay:   the headline number shown in the cell (7d avg if available,
//              else last-day delta, else 0)
//  - last1d:   subs gained since the most recent prior snapshot
//  - avg7d:    average subs/day over the most recent ≤7-day window
//  - avg30d:   average subs/day over the most recent ≤30-day window
//  - total:    total subs gained across the full snapshot window
//  - days:     number of days the snapshot window covers
//  - pct:      total % growth over the window (rounded to 0.01)
//  - viewsPerDay: avg total-views/day over the same window (when available)
const computeDailyGrowth = (snaps: Snapshot[] = []) => {
  if (!snaps || snaps.length === 0) return null;
  const sorted = [...snaps].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const daySpan = (a: Snapshot, b: Snapshot) =>
    Math.max(1, Math.round((+new Date(b.date) - +new Date(a.date)) / 86400000));

  const avgWindow = (windowDays: number) => {
    const cutoff = +new Date(last.date) - windowDays * 86400000;
    const inWindow = sorted.filter(s => +new Date(s.date) >= cutoff);
    if (inWindow.length < 2) return null;
    const a = inWindow[0];
    const b = inWindow[inWindow.length - 1];
    const days = daySpan(a, b);
    return Math.round((b.subscribers - a.subscribers) / days);
  };

  let last1d: number | null = null;
  if (sorted.length >= 2) {
    const prev = sorted[sorted.length - 2];
    const days = daySpan(prev, last);
    last1d = Math.round((last.subscribers - prev.subscribers) / days);
  }
  const avg7d = avgWindow(7);
  const avg30d = avgWindow(30);
  const totalDays = sorted.length >= 2 ? daySpan(first, last) : 0;
  const total = sorted.length >= 2 ? last.subscribers - first.subscribers : 0;
  const pct = sorted.length >= 2 && first.subscribers > 0
    ? Math.round(((last.subscribers - first.subscribers) / first.subscribers) * 10000) / 100
    : 0;
  const viewsTotal = sorted.length >= 2 ? (last.totalViews ?? 0) - (first.totalViews ?? 0) : 0;
  const viewsPerDay = totalDays > 0 ? Math.round(viewsTotal / totalDays) : 0;

  const perDay = avg7d ?? last1d ?? 0;
  return { perDay, last1d, avg7d, avg30d, total, days: totalDays, pct, viewsPerDay };
};

const isYouTubeUrl = (s: string) => /youtube\.com|youtu\.be/i.test(s || "");
const isYouTubeVideoUrl = (s: string) => {
  if (!s) return false;
  try {
    const u = new URL(s.trim());
    const h = u.hostname.replace(/^www\./, "");
    if (h === "youtu.be") return true;
    const p = u.pathname.split("/").filter(Boolean);
    if (p[0] === "watch" && u.searchParams.get("v")) return true;
    if (["shorts", "live", "embed"].includes(p[0]) && p[1]) return true;
  } catch {}
  return false;
};

const maskEmail = (email: string) => {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  const visible = local.slice(0, Math.min(3, Math.max(1, local.length - 2)));
  return `${visible}${"*".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
};

// Per-column filter state
type ColFilter = {
  search?: string;
  values?: string[];      // for select
  min?: string;
  max?: string;
  sort?: "asc" | "desc";
};

// --- Email cell with mask + reveal + copy ---
const EmailCell = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [reveal, setReveal] = useState(false);
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast({ title: "Email copied" });
  };
  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        className="w-full h-7 px-1 bg-transparent border-0 outline-none focus:bg-accent text-xs"
      />
    );
  }
  return (
    <div className="flex items-center gap-1 h-7 px-1 group">
      <span className="flex-1 truncate text-xs select-text" onDoubleClick={() => setEditing(true)} title="Double-click to edit">
        {value ? (reveal ? value : maskEmail(value)) : <span className="text-muted-foreground">—</span>}
      </span>
      {value && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setReveal(r => !r); }} className="opacity-60 hover:opacity-100" title={reveal ? "Hide" : "Show"}>
            {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button onClick={copy} className="opacity-60 hover:opacity-100" title="Copy">
            <Copy className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
};

// --- Column header with Excel-like filter popover ---
const ColumnHeader = ({
  col, filter, setFilter, distinctValues,
  extraToggle,
}: {
  col: Column;
  filter: ColFilter | undefined;
  setFilter: (f: ColFilter | undefined) => void;
  distinctValues: string[];
  extraToggle?: { label: string; checked: boolean; onChange: (v: boolean) => void; count?: number; onSync?: () => void; syncing?: boolean };
}) => {
  const active = !!(filter && (filter.search || filter.values?.length || filter.min || filter.max || filter.sort));
  const [local, setLocal] = useState<ColFilter>(filter || {});
  const [open, setOpen] = useState(false);
  useEffect(() => { setLocal(filter || {}); }, [filter]);
  const isNum = col.type === "number";
  const isDate = col.type === "date" || col.key === "lastVideo";
  const isSelect = col.type === "select";
  return (
    <div className="inline-flex items-center gap-1">
      <span>{col.label}</span>
      {col.auto && <span className="text-[10px] text-primary">(auto)</span>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={`inline-flex items-center ${active ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"}`} title="Filter / Sort">
            <Filter className="h-3 w-3" />
            {filter?.sort === "asc" && <ArrowUp className="h-3 w-3" />}
            {filter?.sort === "desc" && <ArrowDown className="h-3 w-3" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-2" align="start" onClick={e => e.stopPropagation()}>
          <div className="text-xs font-semibold">{col.label}</div>
          {extraToggle && (
            <div className="flex items-center gap-1.5 bg-accent/50 rounded px-2 py-1.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); extraToggle.onChange(!extraToggle.checked); }}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent rounded flex-1 text-left"
              >
                <Checkbox checked={extraToggle.checked} className="pointer-events-none" />
                <span className="font-medium">{extraToggle.label}</span>
                {typeof extraToggle.count === "number" && (
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                    {extraToggle.count.toLocaleString()}
                  </span>
                )}
              </button>
              {extraToggle.onSync && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); extraToggle.onSync?.(); }}
                  disabled={extraToggle.syncing}
                  className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50"
                  title="Sync conversations from Workspace"
                >
                  {extraToggle.syncing
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                </button>
              )}
            </div>
          )}
          <div className="flex gap-1">
            <Button size="sm" variant={local.sort === "asc" ? "default" : "outline"} className="flex-1 h-7 text-xs"
              onClick={() => setLocal({ ...local, sort: local.sort === "asc" ? undefined : "asc" })}>
              <ArrowUp className="h-3 w-3 mr-1" /> Asc
            </Button>
            <Button size="sm" variant={local.sort === "desc" ? "default" : "outline"} className="flex-1 h-7 text-xs"
              onClick={() => setLocal({ ...local, sort: local.sort === "desc" ? undefined : "desc" })}>
              <ArrowDown className="h-3 w-3 mr-1" /> Desc
            </Button>
          </div>
          {(isNum || isDate) && (
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Range</div>
              <div className="flex gap-1">
                <Input
                  type={isDate ? "date" : "number"}
                  placeholder="Min"
                  value={local.min || ""}
                  onChange={e => setLocal({ ...local, min: e.target.value })}
                  className="h-7 text-xs"
                />
                <Input
                  type={isDate ? "date" : "number"}
                  placeholder="Max"
                  value={local.max || ""}
                  onChange={e => setLocal({ ...local, max: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          )}
          {!isSelect && !isNum && !isDate && (
            <Input
              placeholder="Contains..."
              value={local.search || ""}
              onChange={e => setLocal({ ...local, search: e.target.value })}
              className="h-7 text-xs"
            />
          )}
          {isSelect && (
            <div className="max-h-48 overflow-auto space-y-1 border border-border rounded p-2">
              {distinctValues.map(v => {
                const checked = local.values?.includes(v) ?? false;
                return (
                  <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        const cur = new Set(local.values || []);
                        if (c) cur.add(v); else cur.delete(v);
                        setLocal({ ...local, values: Array.from(cur) });
                      }}
                    />
                    <span className="truncate">{v || "(empty)"}</span>
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex gap-1 pt-1">
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => { setLocal({}); setFilter(undefined); setOpen(false); }}>
              Clear
            </Button>
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => { setFilter(local); setOpen(false); }}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// --- Prospect Emails: full conversation dialog with details + reply ---
interface EmailLogEntry {
  id: string;
  message_id: string;
  thread_id: string | null;
  subject: string | null;
  employee_email: string;
  recipients: string[];
  cc_recipients?: string[] | null;
  bcc_recipients?: string[] | null;
  sent_at: string;
  event_type: string | null;
  has_attachments: boolean | null;
  attachment_count?: number | null;
  attachment_names?: string[] | null;
  message_size_bytes?: number | null;
  read_at?: string | null;
  replied_at?: string | null;
  forwarded_at?: string | null;
  in_reply_to?: string | null;
  delivery_status?: string | null;
  is_external?: boolean | null;
}

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const DEFAULT_SENDERS = [
  { value: "amelia@swishview.com", display: "Amelia P" },
  { value: "ashley@swishview.com", display: "Ashley M" },
  { value: "daisy@swishview.com", display: "Daisy J" },
  { value: "emily.j@swishview.com", display: "Emily J" },
  { value: "emily@swishview.com", display: "Emily J" },
  { value: "grace@swishview.com", display: "Grace H" },
  { value: "hazel@swishview.com", display: "Hazel B" },
  { value: "irene@swishview.com", display: "Irene W" },
  { value: "mia.brooks@swishview.com", display: "Mia Brooks" },
  { value: "rachel@swishview.com", display: "Rachel W" },
  { value: "scarlett.l@swishview.com", display: "Scarlett L" },
  { value: "scarlett@swishview.com", display: "Scarlett L" },
  { value: "serena@swishview.com", display: "Serena H" },
  { value: "sophie@swishview.com", display: "Sophie D" },
  { value: "amelia@swishview.email", display: "Amelia P (.email)" },
  { value: "grace@swishview.email", display: "Grace H (.email)" },
  { value: "jasmine@swishview.email", display: "Jasmine S (.email)" },
  { value: "rachel@swishview.email", display: "Rachel W (.email)" },
  { value: "serena@swishview.email", display: "Serena H (.email)" },
  { value: "sophie@swishview.email", display: "Sophie D (.email)" },
  { value: "support@swishview.com", display: "SwishView Support" },
];

const ALL_SYNC_MAILBOXES = [
  "amelia@swishview.com","ashley@swishview.com","daisy@swishview.com",
  "emily.j@swishview.com","emily@swishview.com","grace@swishview.com",
  "hazel@swishview.com","irene@swishview.com","mia.brooks@swishview.com",
  "rachel@swishview.com","scarlett.l@swishview.com","scarlett@swishview.com",
  "serena@swishview.com","sophie@swishview.com",
  "amelia@swishview.email","grace@swishview.email","jasmine@swishview.email",
  "rachel@swishview.email","serena@swishview.email","sophie@swishview.email",
];

const titleCaseFromEmail = (email: string) => {
  const local = (email.split("@")[0] || "").replace(/[._-]+/g, " ").trim();
  return local.replace(/\b\w/g, c => c.toUpperCase()) || email;
};

const MailSyncStatus = () => {
  const [status, setStatus] = useState<string>("idle");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [totalLogs, setTotalLogs] = useState<number>(0);

  const refresh = async () => {
    const [{ data: cfg }, { count }] = await Promise.all([
      supabase.from("email_tracker_sync_config").select("sync_status,last_sync_at").limit(1).maybeSingle(),
      supabase.from("email_tracker_logs").select("*", { count: "exact", head: true }),
    ]);
    if (cfg) {
      setStatus(cfg.sync_status || "idle");
      setLastSync(cfg.last_sync_at || null);
    }
    if (typeof count === "number") setTotalLogs(count);
  };

  useEffect(() => {
    refresh();
    // Kick a silent background sync on mount with the full mailbox list
    supabase.functions.invoke("email-tracker-sync", {
      body: { users: ALL_SYNC_MAILBOXES },
    }).catch(() => {});
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  const dotColor = status === "syncing" ? "bg-yellow-500 animate-pulse"
    : status === "error" ? "bg-red-500"
    : status === "success" ? "bg-emerald-500"
    : "bg-muted-foreground/40";

  const timeAgo = lastSync ? Math.round((Date.now() - new Date(lastSync).getTime()) / 60000) : null;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground select-none"
      title={`Mail sync: ${status}${timeAgo !== null ? ` · ${timeAgo}m ago` : ""} · ${totalLogs.toLocaleString()} emails`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {totalLogs.toLocaleString()}
    </span>
  );
};


interface ProspectEmailsProps {
  emails: string[];
  clientName?: string;
  prospect?: Prospect;
}

const ProspectEmails = ({ emails, clientName, prospect }: ProspectEmailsProps) => {
  const { toast } = useToast();
  const { isAdmin, email: authedEmail } = useProspectsSession();
  // Senders this user is allowed to send from (admin = everything).
  const allowedSenderValues = React.useMemo<Set<string> | null>(() => {
    if (isAdmin) return null;
    const me = (authedEmail || "").toLowerCase().trim();
    const list = PROSPECTS_ALLOWED_SENDERS[me] || (me ? [me] : []);
    return new Set(list);
  }, [isAdmin, authedEmail]);
  const filterSenders = (arr: { value: string; display: string }[]) =>
    allowedSenderValues ? arr.filter(s => allowedSenderValues.has(s.value)) : arr;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [replyMode, setReplyMode] = useState<"reply" | "forward" | "new" | null>(null);
  const [replyTo, setReplyTo] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [senders, setSenders] = useState(() => filterSenders(DEFAULT_SENDERS));
  const defaultFrom = (() => {
    const assigned = (prospect?.assignedSender || "").toLowerCase().trim();
    if (assigned && (!allowedSenderValues || allowedSenderValues.has(assigned))) return assigned;
    const first = filterSenders(DEFAULT_SENDERS)[0]?.value || DEFAULT_SENDERS[0].value;
    return first;
  })();
  const [replyFrom, setReplyFrom] = useState(defaultFrom);
  useEffect(() => { setReplyFrom(defaultFrom); }, [defaultFrom]);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);


  const cleanEmails = emails.map(e => (e || "").trim().toLowerCase()).filter(Boolean);

  useEffect(() => {
    if (!open || cleanEmails.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const PAGE_SIZE = 1000;
        const seen = new Map<string, any>();
        let lastErr: string | null = null;

        // Run separate paginated queries per filter type so we never hit
        // PostgREST OR-clause limits and never miss rows where the prospect
        // is the sender, the recipient, or only in cc.
        const runQuery = async (build: (q: any) => any) => {
          let from = 0;
          for (let i = 0; i < 25; i++) {
            if (cancelled) return;
            const q = supabase
              .from("email_tracker_logs")
              .select("id,message_id,thread_id,subject,employee_email,recipients,cc_recipients,bcc_recipients,sent_at,event_type,has_attachments,attachment_count,attachment_names,message_size_bytes,read_at,replied_at,forwarded_at,in_reply_to,delivery_status,is_external")
              .order("sent_at", { ascending: false })
              .range(from, from + PAGE_SIZE - 1);
            const { data, error } = await build(q);
            if (cancelled) return;
            if (error) { lastErr = error.message; break; }
            const page = data || [];
            for (const row of page) {
              if (!seen.has(row.id)) seen.set(row.id, row);
            }
            if (!cancelled) setLogs(Array.from(seen.values()) as any);
            if (page.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
          }
        };

        for (const em of cleanEmails) {
          await runQuery(q => q.contains("recipients", [em]));
          if (cancelled) return;
          await runQuery(q => q.contains("cc_recipients", [em]));
          if (cancelled) return;
          await runQuery(q => q.eq("employee_email", em));
          if (cancelled) return;
        }

        if (cancelled) return;
        if (lastErr && seen.size === 0) setError(lastErr);
        else setLogs(Array.from(seen.values()) as any);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, cleanEmails.join("|")]);



  // Fetch the full list of @swishview.com sender accounts from email_tracker_logs
  // so the From dropdown reflects every workspace mailbox (10+), not a hardcoded 5.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("email_tracker_logs")
          .select("employee_email")
          .ilike("employee_email", "%@swishview.com")
          .limit(5000);
        if (cancelled || error) return;
        const set = new Map<string, { value: string; display: string }>();
        DEFAULT_SENDERS.forEach(s => set.set(s.value, s));
        (data || []).forEach((r: any) => {
          const e = (r.employee_email || "").toLowerCase().trim();
          if (!e || set.has(e)) return;
          set.set(e, { value: e, display: titleCaseFromEmail(e) });
        });
        const merged = Array.from(set.values()).sort((a, b) => a.display.localeCompare(b.display));
        setSenders(filterSenders(merged));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [open]);


  // Group by thread_id (fallback to message_id)
  const threads = useMemo(() => {
    const map = new Map<string, EmailLogEntry[]>();
    for (const l of logs) {
      const k = l.thread_id || l.message_id;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(l);
    }
    return Array.from(map.entries()).map(([k, arr]) => {
      const sorted = [...arr].sort((a, b) => +new Date(a.sent_at) - +new Date(b.sent_at));
      return {
        key: k,
        subject: sorted[sorted.length - 1].subject || "(no subject)",
        count: sorted.length,
        first: sorted[0].sent_at,
        last: sorted[sorted.length - 1].sent_at,
        messages: sorted,
      };
    }).sort((a, b) => +new Date(b.last) - +new Date(a.last));
  }, [logs]);

  const selectedThread = activeThread ? threads.find(t => t.key === activeThread) : null;

  // Pre-fill reply form based on mode + selected thread
  const startReply = (mode: "reply" | "forward" | "new") => {
    setReplyMode(mode);
    if (mode === "new") {
      setReplyTo(cleanEmails[0] || "");
      setReplySubject("");
      setReplyBody(`Hi${clientName ? " " + clientName : ""},\n\n\n\nBest,\n`);
      return;
    }
    if (!selectedThread) return;
    const lastMsg = selectedThread.messages[selectedThread.messages.length - 1];
    const isFromProspect = cleanEmails.includes((lastMsg.employee_email || "").toLowerCase());
    const targetEmail = isFromProspect
      ? lastMsg.employee_email
      : (lastMsg.recipients || []).find(r => cleanEmails.includes((r || "").toLowerCase())) || cleanEmails[0];
    setReplyTo(targetEmail || cleanEmails[0] || "");
    const subj = selectedThread.subject || "";
    if (mode === "reply") {
      setReplySubject(subj.toLowerCase().startsWith("re:") ? subj : `Re: ${subj}`);
    } else {
      setReplySubject(subj.toLowerCase().startsWith("fwd:") ? subj : `Fwd: ${subj}`);
    }
    // Build quoted history from metadata (no body content stored in tracker)
    const quoted = selectedThread.messages
      .map(m => `> ${fmtDateTime(m.sent_at)} · ${m.employee_email} → ${(m.recipients || []).join(", ")}\n> Subject: ${m.subject || "(no subject)"}${m.has_attachments ? `\n> 📎 ${m.attachment_count || 1} attachment(s)${m.attachment_names?.length ? ": " + m.attachment_names.join(", ") : ""}` : ""}`)
      .join("\n>\n");
    const greeting = mode === "reply"
      ? `Hi${clientName ? " " + clientName : ""},\n\n\n\nBest,\n`
      : `Forwarding the conversation below for your reference.\n\n`;
    setReplyBody(`${greeting}\n\n— Conversation history —\n${quoted}`);
  };

  // Generate a personalized outreach email via Lovable AI using the prospect data
  const draftAIEmail = async () => {
    if (!prospect) {
      toast({ title: "No prospect context", description: "Open this from the table to use AI draft.", variant: "destructive" });
      return;
    }
    setDrafting(true);
    try {
      const senderDisplay = senders.find(s => s.value === replyFrom)?.display || "Emily";
      const { data, error } = await supabase.functions.invoke("draft-outreach-email", {
        body: {
          channelName: prospect.channelName,
          channelLink: prospect.channelLink,
          channelDescription: prospect.channelDescription,
          country: prospect.country,
          channelJoined: prospect.channelJoined,
          email: prospect.email || cleanEmails[0],
          clientName: prospect.clientName || prospect.channelName,
          subscribers: prospect.subscribersLive,
          totalViews: prospect.totalViews,
          senderName: senderDisplay,
          videos: (prospect.recentVideos || []).slice(0, 3).map(v => ({
            title: v.title, url: v.url, description: v.description,
          })),
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const subject = (data as any)?.subject || "quick thought on your channel";
      const body = (data as any)?.body || "";
      // Switch to "new" compose mode if not already replying, and prefill
      if (!replyMode) {
        setReplyMode("new");
        setReplyTo(cleanEmails[0] || "");
      }
      // Keep the user-selected sender (do not force Emily) so the sign-off
      // and From: match what the user chose in the dropdown.

      setReplySubject(subject);
      setReplyBody(body);
      toast({ title: "AI draft ready", description: "Review and edit before sending." });
    } catch (e: any) {
      toast({ title: "Draft failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  };



  const sendReply = async () => {
    if (!replyTo.trim() || !replySubject.trim() || !replyBody.trim()) {
      toast({ title: "Fill recipient, subject, and message", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const lastMsg = selectedThread?.messages[selectedThread.messages.length - 1];
      const messageIds = (selectedThread?.messages || [])
        .map(m => m.message_id)
        .filter(Boolean);
      const { data, error } = await supabase.functions.invoke("send-prospect-reply", {
        body: {
          to: replyTo.split(",").map(s => s.trim()).filter(Boolean),
          subject: replySubject,
          text: replyBody,
          fromEmail: replyFrom,
          fromName: senders.find(o => o.value === replyFrom)?.display,
          inReplyTo: lastMsg?.message_id || undefined,
          references: messageIds.length ? messageIds : undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error((data as any)?.error || "Send failed");
      toast({ title: "Email sent", description: `To ${replyTo}` });
      setReplyMode(null);
      setReplyBody("");
    } catch (e: any) {
      toast({ title: "Send failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        className="w-full h-7 px-2 inline-flex items-center justify-center gap-1 hover:bg-accent text-xs"
        disabled={cleanEmails.length === 0}
        onClick={() => { setOpen(true); setActiveThread(null); setReplyMode(null); }}
        title={cleanEmails.length === 0 ? "Add an email first" : "View email conversations"}
      >
        <Mail className="h-3 w-3 text-primary" />
        <span className="text-muted-foreground">{cleanEmails.length === 0 ? "—" : "View"}</span>
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setActiveThread(null); setReplyMode(null); } }}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Email conversations · {clientName || cleanEmails[0]}
            </DialogTitle>
            <div className="text-[11px] text-muted-foreground break-all">
              {cleanEmails.join(", ")}
              {logs.length > 0 && (
                <span className="ml-2">· <strong>{threads.length}</strong> thread{threads.length === 1 ? "" : "s"} · <strong>{logs.length}</strong> message{logs.length === 1 ? "" : "s"}{loading ? " (loading more…)" : ""}</span>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-3">
            {loading && (
              <div className="text-sm text-muted-foreground py-8 text-center">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading conversations…
              </div>
            )}
            {error && <div className="text-sm text-destructive py-2">{error}</div>}

            {!loading && !error && threads.length === 0 && (
              <div className="text-sm text-muted-foreground py-8 text-center space-y-3">
                <div>No email exchanges found in any @swishview.com inbox.</div>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => startReply("new")}>
                    <Send className="h-3 w-3 mr-1" /> Compose new email
                  </Button>
                  {prospect && isAdmin && (
                    <Button size="sm" onClick={draftAIEmail} disabled={drafting}>
                      {drafting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Drafting…</> : <>✨ AI draft outreach</>}
                    </Button>
                  )}
                </div>
              </div>
            )}


            {!loading && !error && !selectedThread && threads.map(t => {
              const last = t.messages[t.messages.length - 1];
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveThread(t.key)}
                  className="w-full text-left border border-border rounded-lg p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm line-clamp-1 flex-1">{t.subject}</div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{fmtDateTime(t.last)}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {t.count} message{t.count === 1 ? "" : "s"} · last from <strong>{last.employee_email}</strong>
                    {last.has_attachments && <span className="ml-2 inline-flex items-center"><Paperclip className="h-3 w-3 mr-0.5" />{last.attachment_count || 1}</span>}
                  </div>
                </button>
              );
            })}

            {selectedThread && !replyMode && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 sticky top-0 bg-background py-1 z-10 border-b">
                  <Button size="sm" variant="ghost" onClick={() => setActiveThread(null)}>
                    <ChevronLeft className="h-3 w-3 mr-1" /> Back to threads
                  </Button>
                  <div className="flex gap-1">
                    <Button size="sm" variant="default" onClick={() => startReply("reply")}>
                      <Reply className="h-3 w-3 mr-1" /> Reply
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => startReply("forward")}>
                      <Send className="h-3 w-3 mr-1" /> Resend full convo
                    </Button>
                  </div>
                </div>
                <div className="font-semibold text-base">{selectedThread.subject}</div>
                <div className="text-[11px] text-muted-foreground">
                  {selectedThread.count} messages · started {fmtDateTime(selectedThread.first)}
                </div>

                <div className="space-y-2">
                  {selectedThread.messages.map((m, i) => (
                    <div key={m.id} className="border border-border rounded-lg p-3 bg-card">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-xs">
                          <div><span className="text-muted-foreground">From:</span> <strong>{m.employee_email}</strong></div>
                          <div><span className="text-muted-foreground">To:</span> {(m.recipients || []).join(", ") || "—"}</div>
                          {m.cc_recipients && m.cc_recipients.length > 0 && (
                            <div><span className="text-muted-foreground">Cc:</span> {m.cc_recipients.join(", ")}</div>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{fmtDateTime(m.sent_at)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {m.is_external && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded px-1.5 py-0.5">External</span>}
                        {m.event_type && <span className="bg-muted rounded px-1.5 py-0.5">{m.event_type}</span>}
                        {m.read_at && <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5">Read {fmtDate(m.read_at)}</span>}
                        {m.replied_at && <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5">Replied {fmtDate(m.replied_at)}</span>}
                        {m.forwarded_at && <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5">Forwarded</span>}
                        {m.delivery_status && m.delivery_status !== "delivered" && <span className="bg-amber-500/10 text-amber-600 rounded px-1.5 py-0.5">{m.delivery_status}</span>}
                        {m.has_attachments && (
                          <span className="bg-muted rounded px-1.5 py-0.5 inline-flex items-center gap-0.5">
                            <Paperclip className="h-2.5 w-2.5" />
                            {m.attachment_count || 1}
                            {m.attachment_names?.length ? `: ${m.attachment_names.slice(0, 2).join(", ")}${m.attachment_names.length > 2 ? "…" : ""}` : ""}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-[10px] text-muted-foreground italic">
                        Body content is not stored by Workspace audit log. Metadata only — click Reply to compose a fresh reply.
                      </div>
                      {i < selectedThread.messages.length - 1 && <div className="text-[10px] text-muted-foreground text-center mt-2">↓ then</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {replyMode && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setReplyMode(null)}>
                    <ChevronLeft className="h-3 w-3 mr-1" /> Back
                  </Button>
                  <div className="flex items-center gap-2">
                    {prospect && isAdmin && (
                      <Button size="sm" variant="outline" onClick={draftAIEmail} disabled={drafting}>
                        {drafting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Drafting…</> : <>✨ AI draft</>}
                      </Button>
                    )}
                    <div className="text-xs text-muted-foreground capitalize">{replyMode === "new" ? "New email" : replyMode}</div>
                  </div>
                </div>


                <div className="grid grid-cols-[80px_1fr] gap-2 items-center text-xs">
                  <label className="text-muted-foreground">From</label>
                  <select
                    value={replyFrom}
                    onChange={e => setReplyFrom(e.target.value)}
                    className="h-8 px-2 bg-background border border-border rounded text-xs"
                  >
                    {senders.map(o => (
                      <option key={o.value} value={o.value}>{o.display} &lt;{o.value}&gt;</option>
                    ))}
                  </select>

                  <label className="text-muted-foreground">To</label>
                  <Input
                    value={replyTo}
                    onChange={e => setReplyTo(e.target.value)}
                    placeholder="recipient@example.com (comma-separated for multiple)"
                    className="h-8 text-xs"
                  />

                  <label className="text-muted-foreground">Subject</label>
                  <Input
                    value={replySubject}
                    onChange={e => setReplySubject(e.target.value)}
                    placeholder="Subject"
                    className="h-8 text-xs"
                  />
                </div>

                <Textarea
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  placeholder="Your message…"
                  className="min-h-[280px] text-xs font-mono"
                />

                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setReplyMode(null)} disabled={sending}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={sendReply} disabled={sending}>
                    {sending ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sending…</> : <><Send className="h-3 w-3 mr-1" /> Send</>}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!replyMode && !selectedThread && threads.length > 0 && (
            <DialogFooter className="gap-2">
              {prospect && isAdmin && (
                <Button size="sm" variant="outline" onClick={draftAIEmail} disabled={drafting}>
                  {drafting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Drafting…</> : <>✨ AI draft outreach</>}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => startReply("new")}>
                <Send className="h-3 w-3 mr-1" /> New email to prospect
              </Button>
            </DialogFooter>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
};



const Prospects = () => {

  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<Prospect[]>([]);
  const [sendQueueOpen, setSendQueueOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [autoFetchingId, setAutoFetchingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });
  const [syncStatus, setSyncStatus] = useState<{ recentError?: string; lastChannel?: string; ratePerMin?: number }>({});
  // (guide removed)
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[] } | null>(null);
  const [filters, setFilters] = useState<Record<string, ColFilter>>({});
  const [formulaExpr, setFormulaExpr] = useState("");
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [pickCount, setPickCount] = useState<string>("10");
  const [pickMode, setPickMode] = useState<"first" | "last" | "every" | "random">("first");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkField, setBulkField] = useState<string>("status");
  const [bulkValue, setBulkValue] = useState<string>("");
  const [convCounts, setConvCounts] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("prospects.convCounts") || "{}"); } catch { return {}; }
  });
  const [convReplied, setConvReplied] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("prospects.convReplied") || "{}"); } catch { return {}; }
  });
  const [convLoading, setConvLoading] = useState(false);
  const [convProgress, setConvProgress] = useState({ done: 0, total: 0 });
  const convCacheLoadedRef = useRef(false);
  const convCacheUpdatedAtRef = useRef<number>(0);
  const [onlyWithConv, setOnlyWithConv] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"prospects" | "discovered" | "banned" | "unqualified">(
    () => {
      const v = localStorage.getItem("prospects.sourceFilter") as any;
      if (v === "discovered") return "discovered";
      if (v === "banned") return "banned";
      if (v === "unqualified") return "unqualified";
      return "prospects";
    }
  );
  const { isAdmin, role, email: authedEmail, signOut, perms } = useProspectsSession();
  const [permsDialogOpen, setPermsDialogOpen] = useState(false);
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const canEdit = isAdmin || perms.can_edit;
  const canCreate = isAdmin || perms.can_create;
  const canDelete = isAdmin || perms.can_delete;
  const canSend = isAdmin || perms.can_send;
  const canSync = isAdmin || perms.can_sync;
  const canBan = isAdmin || perms.can_ban;
  const canExport = isAdmin || perms.can_export;
  // Senders this user is allowed to send from (admin = all DEFAULT_SENDERS).
  const allowedSenders = React.useMemo(() => {
    if (isAdmin) return DEFAULT_SENDERS;
    const me = (authedEmail || "").toLowerCase().trim();
    const list = new Set(PROSPECTS_ALLOWED_SENDERS[me] || (me ? [me] : []));
    return DEFAULT_SENDERS.filter(s => list.has(s.value));
  }, [isAdmin, authedEmail]);
  const [prospectsFirst, setProspectsFirst] = useState<boolean>(
    () => localStorage.getItem("prospects.prospectsFirst") !== "0"
  );
  useEffect(() => { localStorage.setItem("prospects.sourceFilter", sourceFilter); }, [sourceFilter]);
  // Non-admins must never sit on the Banned tab.
  useEffect(() => {
    if (!isAdmin && (sourceFilter === "banned" || sourceFilter === "discovered")) {
      setSourceFilter("prospects");
    }
  }, [isAdmin, sourceFilter]);
  useEffect(() => { localStorage.setItem("prospects.prospectsFirst", prospectsFirst ? "1" : "0"); }, [prospectsFirst]);
  useEffect(() => {
    try { localStorage.setItem("prospects.convCounts", JSON.stringify(convCounts)); } catch {}
  }, [convCounts]);
  useEffect(() => {
    try { localStorage.setItem("prospects.convReplied", JSON.stringify(convReplied)); } catch {}
  }, [convReplied]);
  const cancelSyncRef = useRef(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // --- Bulk AI outreach (draft + scheduled send with random delays) ---
  const [bulkAIOpen, setBulkAIOpen] = useState(false);
  const [bulkAISender, setBulkAISender] = useState<string>(DEFAULT_SENDERS[0].value);
  useEffect(() => {
    if (!allowedSenders.find(s => s.value === bulkAISender)) {
      setBulkAISender(allowedSenders[0]?.value || DEFAULT_SENDERS[0].value);
    }
  }, [allowedSenders, bulkAISender]);
  // Per-sender gap between two sends from the SAME from-email.
  // Default: random 5-10 minutes. User can switch to a fixed timer.
  const [bulkAIMinSec, setBulkAIMinSec] = useState<number>(300);
  const [bulkAIMaxSec, setBulkAIMaxSec] = useState<number>(600);
  const [bulkGapMode, setBulkGapMode] = useState<"random" | "fixed">("random");
  const [bulkGapFixedSec, setBulkGapFixedSec] = useState<number>(300);
  type BulkDraft = {
    prospectId: string;
    to: string;
    clientName: string;
    channelName: string;
    subject: string;
    body: string;
    status: "pending" | "drafting" | "review" | "ready" | "sending" | "sent" | "error" | "skipped";
    error?: string;
    nextSendAt?: number; // epoch ms
    sender: string; // per-row sender email (defaults to assigned sales rep)
    missingFields?: string[]; // e.g. ["FIRST_NAME","LATEST_VIDEO"] — fields that fell back to defaults
  };
  const [bulkDrafts, setBulkDrafts] = useState<BulkDraft[]>(() => {
    try {
      const raw = localStorage.getItem("prospects.bulkDrafts");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // strip transient states so a refresh doesn't leave rows stuck "sending"
      return (Array.isArray(parsed) ? parsed : []).map((d: BulkDraft) => {
        const actionableMissing = (d.missingFields || []).filter(f => f !== "LATEST_VIDEO");
        if (actionableMissing.length) return { ...d, status: "review" as const, missingFields: actionableMissing, nextSendAt: undefined };
        return d.status === "sending" || d.status === "drafting"
          ? { ...d, status: "ready" as const, missingFields: undefined, nextSendAt: undefined }
          : { ...d, missingFields: undefined };
      });
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem("prospects.bulkDrafts", JSON.stringify(bulkDrafts)); } catch {}
  }, [bulkDrafts]);

  // Normalize email body formatting: collapse hard line breaks INSIDE a
  // paragraph into a single space, but preserve blank-line breaks BETWEEN
  // paragraphs. This fixes drafts that render as broken short lines in Gmail
  // mobile (which wraps already-wrapped text again).
  const normalizeEmailBody = React.useCallback((raw: string): string => {
    if (!raw) return raw;
    let s = String(raw).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // strip trailing spaces per line
    s = s.split("\n").map(l => l.replace(/[ \t]+$/g, "")).join("\n");
    // split into paragraphs on 1+ blank lines
    const paragraphs = s.split(/\n\s*\n+/);
    const fixed = paragraphs.map(p => {
      const lines = p.split("\n").map(l => l.trim()).filter(Boolean);
      if (!lines.length) return "";
      // Preserve the sign-off block ("Best," / name / "SwishView") on
      // separate lines — those SHOULD have hard breaks.
      const isSignoffBlock =
        lines.length <= 5 &&
        /^(best|thanks|cheers|regards|warmly|sincerely|kind regards)[,.]?$/i.test(lines[0]);
      if (isSignoffBlock) return lines.join("\n");
      // Otherwise join into one continuous line per paragraph.
      return lines.join(" ").replace(/[ \t]{2,}/g, " ");
    });
    return fixed.join("\n\n").trim();
  }, []);

  // One-time auto-fix: normalize formatting on any drafts that were created
  // BEFORE this fix shipped (so the user doesn't have to re-draft).
  useEffect(() => {
    try {
      if (localStorage.getItem("prospects.bulkDrafts.normalized.v1") === "1") return;
      setBulkDrafts(prev => prev.map(d => d.body ? { ...d, body: normalizeEmailBody(d.body) } : d));
      localStorage.setItem("prospects.bulkDrafts.normalized.v1", "1");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [bulkDrafting, setBulkDrafting] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkExpanded, setBulkExpanded] = useState<Set<string>>(new Set());
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkEditSender, setBulkEditSender] = useState<string>(DEFAULT_SENDERS[0].value);
  useEffect(() => {
    if (!allowedSenders.find(s => s.value === bulkEditSender)) {
      setBulkEditSender(allowedSenders[0]?.value || DEFAULT_SENDERS[0].value);
    }
  }, [allowedSenders, bulkEditSender]);
  const toggleBulkExpanded = (id: string) =>
    setBulkExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const toggleBulkSelected = (id: string) =>
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const applyBulkSenderToSelected = () => {
    if (bulkSelected.size === 0) {
      toast({ title: "No rows selected", description: "Tick the checkboxes for the leads you want to update." });
      return;
    }
    setBulkDrafts(prev => prev.map(x => bulkSelected.has(x.prospectId) && x.status !== "sent" && x.status !== "sending"
      ? { ...x, sender: bulkEditSender }
      : x));
    toast({ title: `Sender updated for ${bulkSelected.size} draft${bulkSelected.size === 1 ? "" : "s"}` });
  };
  const DEFAULT_AI_PROMPT_TEMPLATE = "";
  // Bulk dialog tab: "template" (default, available to everyone) | "ai" (admin only)
  const [bulkTab, setBulkTab] = useState<"template" | "ai">("template");

  const [bulkAIPrompt, setBulkAIPrompt] = useState<string>(() => {
    try { return localStorage.getItem("prospects.bulkAIPrompt") || DEFAULT_AI_PROMPT_TEMPLATE; }
    catch { return DEFAULT_AI_PROMPT_TEMPLATE; }
  });
  useEffect(() => {
    try { localStorage.setItem("prospects.bulkAIPrompt", bulkAIPrompt); } catch {}
  }, [bulkAIPrompt]);
  // Plain template mode (no AI). Variables: {{FIRST_NAME}}, {{CHANNEL_NAME}},
  // {{JOINED_DATE}}, {{SENDER_FIRST_NAME}}.
  const DEFAULT_TEMPLATE_SUBJECT = "quick thought on {{CHANNEL_NAME}}";
  const DEFAULT_TEMPLATE_BODY = `Hey {{FIRST_NAME}},

I came across {{CHANNEL_NAME}} and spent a few minutes looking through your recent videos.

One thing that stood out is that channels with an existing audience and content library often have opportunities hidden in videos they've already published, not just the ones they're about to create.

Since you've been building the channel since {{JOINED_DATE}}, there's a good chance a few small changes could help more of your content get discovered over time.

I work with SwishView, and reviewing channels like this is a big part of what we do.

Would you be open to a couple of specific observations?

With love and respect,

{{SENDER_FIRST_NAME}} 💜

www.swishview.com

WhatsApp - +1 (705) 614 0340`;
  const [bulkTemplateSubject, setBulkTemplateSubject] = useState<string>(() => {
    try { return localStorage.getItem("prospects.bulkTemplateSubject") || DEFAULT_TEMPLATE_SUBJECT; }
    catch { return DEFAULT_TEMPLATE_SUBJECT; }
  });
  const [bulkTemplateBody, setBulkTemplateBody] = useState<string>(() => {
    try { return localStorage.getItem("prospects.bulkTemplateBody") || DEFAULT_TEMPLATE_BODY; }
    catch { return DEFAULT_TEMPLATE_BODY; }
  });
  useEffect(() => {
    try { localStorage.setItem("prospects.bulkTemplateSubject", bulkTemplateSubject); } catch {}
  }, [bulkTemplateSubject]);
  useEffect(() => {
    try { localStorage.setItem("prospects.bulkTemplateBody", bulkTemplateBody); } catch {}
  }, [bulkTemplateBody]);
  useEffect(() => {
    setBulkTemplateBody(prev => prev.replace(/, including "\{\{\s*LATEST_VIDEO\s*\}\}"/g, ""));
  }, []);
  const getDraftMissingFields = React.useCallback((row: Prospect, templateText?: string) => {
    const missing: string[] = [];
    const hasAnyYtInfo = [
      row.channelName,
      row.channelDescription,
      row.subscribersLive,
      row.totalViews,
      row.channelJoined,
      row.country,
      row.ytCapture,
      row.lastVideoTitle,
      row.recentVideos?.[0]?.title,
    ].some(v => String(v || "").trim());
    if (!hasAnyYtInfo) missing.push("YOUTUBE_INFO");
    if (templateText) {
      if (/\{\{\s*FIRST_NAME\s*\}\}/.test(templateText) && !(row.clientName || row.channelName || "").trim()) missing.push("FIRST_NAME");
      if (/\{\{\s*CHANNEL_NAME\s*\}\}/.test(templateText) && !(row.channelName || row.clientName || "").trim()) missing.push("CHANNEL_NAME");
      if (/\{\{\s*JOINED_DATE\s*\}\}/.test(templateText) && !(row.channelJoined || "").trim()) missing.push("JOINED_DATE");
    }
    return Array.from(new Set(missing));
  }, []);
  useEffect(() => {
    if (!rows.length || !bulkDrafts.length) return;
    setBulkDrafts(prev => prev.map(d => {
      if (d.status !== "ready" && d.status !== "review") return d;
      const row = rows.find(r => r.id === d.prospectId) || bulkRowsRef.current.get(d.prospectId);
      if (!row) return d;
      const missing = getDraftMissingFields(row).filter(f => f !== "LATEST_VIDEO");
      return { ...d, status: missing.length ? "review" : "ready", missingFields: missing.length ? missing : undefined };
    }));
  }, [rows, getDraftMissingFields]);
  const fillTemplate = React.useCallback((tpl: string, row: Prospect, senderDisplay: string, senderEmail?: string) => {
    const firstWord = (s: string) => (s || "").trim().split(/\s+/)[0] || "";
    const firstName = firstWord(row.clientName || row.channelName || "there");
    const channelName = (row.channelName || row.clientName || "your channel").trim();
    const latestVideo = (row.recentVideos?.[0]?.title || row.lastVideoTitle || "your recent video").trim();
    let joined = (row.channelJoined || "").trim();
    if (joined) {
      const d = new Date(joined);
      if (!isNaN(d.getTime())) {
        joined = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      }
    } else {
      joined = "you started";
    }
    const senderFirst = firstWord(senderDisplay) || "Emily";
    const subsNum = Number(row.subscribersLive) || 0;
    const viewsNum = Number(row.totalViews) || 0;
    const growth = computeDailyGrowth(row.snapshots);
    const dailyGrowth = growth ? fmtCompact(growth.perDay) : "0";
    const lastVideoDate = row.lastVideoDate ? fmtDate(row.lastVideoDate) : "";
    const ds = daysAgo(row.lastVideoDate);
    const daysSinceVideo = ds == null ? "—" : String(ds);
    const vars: Record<string, string> = {
      FIRST_NAME: firstName,
      CHANNEL_NAME: channelName,
      LATEST_VIDEO: latestVideo,
      LATEST_VIDEO_URL: (row.recentVideos?.[0]?.url || row.lastVideoUrl || "").trim(),
      JOINED_DATE: joined,
      SENDER_FIRST_NAME: senderFirst,
      SENDER_NAME: senderDisplay,
      SENDER_EMAIL: (senderEmail || "").trim(),
      CHANNEL_LINK: (row.channelLink || "").trim(),
      CHANNEL_DESCRIPTION: (row.channelDescription || "").trim(),
      EMAIL: (row.email || "").trim(),
      COUNTRY: (row.country || "").trim(),
      SUBSCRIBERS: fmtCompact(subsNum),
      SUBSCRIBERS_RAW: String(subsNum),
      TOTAL_VIEWS: fmtCompact(viewsNum),
      TOTAL_VIEWS_RAW: String(viewsNum),
      DAILY_GROWTH: dailyGrowth,
      LAST_VIDEO_DATE: lastVideoDate,
      DAYS_SINCE_VIDEO: daysSinceVideo,
      PRODUCT: (row.productName || "").trim(),
      STATUS: (row.status || "").trim(),
      PHONE: (row.phone || "").trim(),
      CLIENT_NAME: (row.clientName || "").trim(),
    };
    return tpl.replace(/\{\{\s*([A-Z_][A-Z0-9_]*)\s*\}\}/g, (m, key) =>
      Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : m
    );
  }, []);
  const [bulkFind, setBulkFind] = useState<string>("");
  const [bulkReplace, setBulkReplace] = useState<string>("");
  // Test-send (preview AI drafts to your own inbox before sending the queue)
  const [testEmail, setTestEmail] = useState<string>(() => {
    try { return localStorage.getItem("prospects.testEmail") || ""; } catch { return ""; }
  });
  useEffect(() => {
    try { localStorage.setItem("prospects.testEmail", testEmail); } catch {}
  }, [testEmail]);
  const [testSending, setTestSending] = useState(false);
  // ---- Test Drafts panel (separate from the bulk queue) ----
  type TestRow = {
    id: string;
    to: string;
    channelLink: string;
    sender: string;
    subject: string;
    body: string;
    status: "pending" | "fetching" | "drafting" | "ready" | "sending" | "sent" | "error";
    error?: string;
  };
  const [testDraftOpen, setTestDraftOpen] = useState(false);
  const [testRows, setTestRows] = useState<TestRow[]>(() => {
    try {
      const raw = localStorage.getItem("prospects.testRows");
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
    return [
      { id: crypto.randomUUID(), to: "", channelLink: "", sender: DEFAULT_SENDERS[0].value, subject: "", body: "", status: "pending" as const },
    ];
  });
  useEffect(() => {
    try { localStorage.setItem("prospects.testRows", JSON.stringify(testRows)); } catch {}
  }, [testRows]);
  const [testBusy, setTestBusy] = useState(false);
  const [testExpanded, setTestExpanded] = useState<Set<string>>(new Set());
  const toggleTestExpanded = (id: string) => setTestExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const updateTestRow = (id: string, patch: Partial<TestRow>) =>
    setTestRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  const addTestRow = () =>
    setTestRows(prev => [...prev, { id: crypto.randomUUID(), to: "", channelLink: "", sender: DEFAULT_SENDERS[(prev.length) % DEFAULT_SENDERS.length].value, subject: "", body: "", status: "pending" }]);
  const removeTestRow = (id: string) => setTestRows(prev => prev.filter(r => r.id !== id));

  const runTestDrafts = async () => {
    if (testBusy) return;
    setTestBusy(true);
    try {
      for (const row of testRows) {
        const to = row.to.trim();
        const link = row.channelLink.trim();
        if (!to || !link) {
          updateTestRow(row.id, { status: "error", error: "Need email + channel link" });
          continue;
        }
        try {
          updateTestRow(row.id, { status: "fetching", error: undefined });
          const { data: yt, error: ytErr } = await supabase.functions.invoke("youtube-channel-info", {
            body: { channelUrl: link, includeVideos: true, maxVideos: 3 },
          });
          if (ytErr) throw ytErr;
          if (!yt || yt.error) throw new Error(yt?.error || "Channel fetch failed");

          updateTestRow(row.id, { status: "drafting" });
          const senderDisplay = DEFAULT_SENDERS.find(s => s.value === row.sender)?.display || row.sender.split("@")[0];
          const { data, error } = await supabase.functions.invoke("draft-outreach-email", {
            body: {
              channelName: yt.channelName,
              channelLink: link,
              channelDescription: yt.description,
              country: yt.country,
              channelJoined: yt.publishedAt ? String(yt.publishedAt).slice(0, 10) : undefined,
              email: to,
              clientName: yt.channelName,
              subscribers: yt.subscribers,
              totalViews: yt.totalViews,
              senderName: senderDisplay,
              systemPromptOverride: bulkAIPrompt.trim() || undefined,
              videos: (yt.recentVideos || []).slice(0, 3).map((v: any) => ({
                title: v.title, url: v.url, description: v.description,
              })),
            },
          });
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          updateTestRow(row.id, {
            subject: (data as any)?.subject || "quick thought on your channel",
            body: (data as any)?.body || "",
            status: "ready",
          });
        } catch (e: any) {
          updateTestRow(row.id, { status: "error", error: e?.message || String(e) });
        }
      }
    } finally {
      setTestBusy(false);
    }
  };

  const sendTestRow = async (id: string) => {
    const row = testRows.find(r => r.id === id);
    if (!row) return;
    if (!row.subject.trim() || !row.body.trim()) {
      toast({ title: "Draft is empty", description: "Generate or write a draft first.", variant: "destructive" });
      return;
    }
    const senderMeta = DEFAULT_SENDERS.find(s => s.value === row.sender) || DEFAULT_SENDERS[0];
    updateTestRow(id, { status: "sending", error: undefined });
    try {
      const { error } = await supabase.functions.invoke("send-prospect-reply", {
        body: {
          to: [row.to.trim()],
          subject: row.subject,
          text: row.body,
          fromEmail: row.sender,
          fromName: senderMeta?.display,
        },
      });
      if (error) throw error;
      updateTestRow(id, { status: "sent" });
      toast({ title: `Test sent to ${row.to}` });
    } catch (e: any) {
      updateTestRow(id, { status: "error", error: e?.message || String(e) });
      toast({ title: "Send failed", description: e?.message || String(e), variant: "destructive" });
    }
  };
  const sendAllTestRows = async () => {
    for (const r of testRows) {
      if (r.status === "ready" || (r.subject && r.body && r.status !== "sent")) {
        // eslint-disable-next-line no-await-in-loop
        await sendTestRow(r.id);
      }
    }
  };

  // Plain template drafting for test rows — no AI calls. Fetches the channel
  // and fills variables, mirroring draftAllFromTemplate.
  const runTestDraftsFromTemplate = async () => {
    if (testBusy) return;
    const subjectTpl = bulkTemplateSubject.trim() || DEFAULT_TEMPLATE_SUBJECT;
    const bodyTpl = bulkTemplateBody.trim();
    if (!bodyTpl) {
      toast({ title: "Template is empty", description: "Write a template body in the Bulk AI sheet first.", variant: "destructive" });
      return;
    }
    setTestBusy(true);
    try {
      for (const row of testRows) {
        const to = row.to.trim();
        const link = row.channelLink.trim();
        if (!to || !link) {
          updateTestRow(row.id, { status: "error", error: "Need email + channel link" });
          continue;
        }
        try {
          updateTestRow(row.id, { status: "fetching", error: undefined });
          const { data: yt, error: ytErr } = await supabase.functions.invoke("youtube-channel-info", {
            body: { channelUrl: link, includeVideos: true, maxVideos: 3 },
          });
          if (ytErr) throw ytErr;
          if (!yt || yt.error) throw new Error(yt?.error || "Channel fetch failed");
          const senderDisplay = DEFAULT_SENDERS.find(s => s.value === row.sender)?.display || row.sender.split("@")[0];
          const synthetic: any = {
            channelName: yt.channelName,
            clientName: yt.channelName,
            channelJoined: yt.publishedAt ? String(yt.publishedAt).slice(0, 10) : "",
            recentVideos: yt.recentVideos || [],
          };
          const subject = fillTemplate(subjectTpl, synthetic, senderDisplay).trim().slice(0, 120) || "quick thought";
          const body = fillTemplate(bodyTpl, synthetic, senderDisplay).trim();
          updateTestRow(row.id, { subject, body, status: "ready" });
        } catch (e: any) {
          updateTestRow(row.id, { status: "error", error: e?.message || String(e) });
        }
      }
      toast({ title: "Template drafts filled", description: "Review/edit, then Send." });
    } finally {
      setTestBusy(false);
    }
  };

  // Cache of full prospect rows that may not be in the current visible page.
  // Populated when "Select all matching" pulls IDs across pages, or when
  // draftAllBulk needs a row that isn't in `rows`.
  const bulkRowsRef = useRef<Map<string, Prospect>>(new Map());
  const bulkCancelRef = useRef(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [, bulkTick] = useState(0); // re-render for countdown
  useEffect(() => {
    if (!bulkSending) return;
    const id = setInterval(() => bulkTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [bulkSending]);


  const autoFetchedRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const PAGE_SIZE = 200;

  // Hidden columns (persisted)
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("prospects.hiddenCols") || "[]")); }
    catch { return new Set(); }
  });
  useEffect(() => {
    try { localStorage.setItem("prospects.hiddenCols", JSON.stringify(Array.from(hiddenCols))); } catch {}
  }, [hiddenCols]);
  const toggleColumn = (key: string) => {
    setHiddenCols(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };
  const visibleColumns = useMemo(() => COLUMNS.filter(c => !hiddenCols.has(c.key as string)), [hiddenCols]);


  // Auth handled by useProspectsSession (redirects to /prospects-login)

  // Load the global conversation cache once from Supabase so counts/replied
  // dots appear instantly on page open without any background sync flicker.
  useEffect(() => {
    if (convCacheLoadedRef.current) return;
    convCacheLoadedRef.current = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("prospects_conv_cache")
          .select("counts,replied,updated_at")
          .eq("id", "global")
          .maybeSingle();
        if (data) {
          if (data.counts && typeof data.counts === "object") setConvCounts(data.counts as any);
          if (data.replied && typeof data.replied === "object") setConvReplied(data.replied as any);
          if (data.updated_at) convCacheUpdatedAtRef.current = new Date(data.updated_at).getTime();
        }
      } catch {}
    })();
  }, []);

  // Debounced search for server-side query
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Server-side sort: pick the first column filter that has a sort set AND
  // maps to a real Supabase column. Falls back to created_at desc.
  const serverSort = useMemo(() => {
    for (const [key, f] of Object.entries(filters)) {
      if (!f?.sort) continue;
      const col = SORT_DB_MAP[key];
      if (!col) continue;
      return { col, asc: f.sort === "asc", key };
    }
    return null;
  }, [filters]);

  // When column filters / formula are active, fetch ALL matching rows so
  // pagination + sorting work across the full dataset (not just the 200 of
  // the current server page).
  const hasColumnFilters = useMemo(() => {
    if (formulaExpr.trim()) return true;
    for (const f of Object.values(filters)) {
      if (!f) continue;
      if (f.search) return true;
      if (f.min) return true;
      if (f.max) return true;
      if (f.values && f.values.length) return true;
    }
    return false;
  }, [filters, formulaExpr]);

  // Server-side paginated load — only fetch the current page from Supabase.
  // Refetch when page, search, sourceFilter, or server sort changes.
  useEffect(() => {
    let cancelled = false;
    const useExact = sourceFilter !== "discovered";
    const myEmail = (authedEmail || "").toLowerCase().trim();
    const ownerSenders = isAdmin ? null : (PROSPECTS_ALLOWED_SENDERS[myEmail] || (myEmail ? [myEmail] : null));
    const buildQuery = (from: number, to: number, withCount: boolean) => {
      let q: any = supabase
        .from("prospects")
        .select("*", withCount ? { count: useExact ? "exact" : "estimated" } : (undefined as any));
      if (serverSort) {
        q = q.order(serverSort.col, { ascending: serverSort.asc, nullsFirst: false });
      } else {
        q = q.order("created_at", { ascending: false });
      }
      q = q.range(from, to);
      if (debouncedSearch) q = q.ilike("search_text", `%${debouncedSearch}%`);
      if (sourceFilter === "banned") q = q.eq("is_banned", true);
      else q = q.eq("is_banned", false);
      if (sourceFilter === "discovered") q = q.eq("auto_discovered", true);
      else if (sourceFilter === "prospects") {
        // Qualified leads: have an enriched channel name OR meet the subs floor.
        // `channel_name` is stored as "" for unenriched rows (never NULL), so
        // `.neq("channel_name","")` correctly excludes empty strings.
        q = q.eq("auto_discovered", false)
             .or("channel_name.neq.,subscribers_live.gte.500");
      } else if (sourceFilter === "unqualified") {
        // Unqualified = no channel name AND below the subs floor (or unknown).
        q = q.eq("auto_discovered", false)
             .eq("channel_name", "")
             .or("subscribers_live.lt.500,subscribers_live.is.null");
      }
      // Sales reps only see rows assigned to them. Admin sees everything.
      if (ownerSenders) q = q.in("assigned_sender", ownerSenders);
      return q;
    };
    (async () => {
      setLoading(true);
      if (onlyWithConv || hasColumnFilters) {
        const all: any[] = [];
        let from = 0;
        let total = 0;
        const PAGE = 1000;
        while (true) {
          const { data, error, count } = await buildQuery(from, from + PAGE - 1, from === 0);
          if (cancelled) return;
          if (error) {
            toast({ title: "Load failed", description: error.message, variant: "destructive" });
            break;
          }
          if (from === 0 && typeof count === "number") total = count;
          all.push(...(data || []));
          if (!data || data.length < PAGE) break;
          from += PAGE;
        }
        if (cancelled) return;
        const mapped = all.map((r: any) => ({
          ...emptyProspect(),
          ...(r.data || {}),
          id: r.id,
          assignedSender: r.assigned_sender || (r.data?.assignedSender ?? ""),
        }));
        setRows(mapped);
        setServerTotal(total || mapped.length);
        setLoading(false);
        return;
      }
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let { data, error, count } = await buildQuery(from, to, true);
      // If counting failed, retry without count so rows still load.
      if (error) {
        const retry = await buildQuery(from, to, false);
        data = retry.data; error = retry.error; count = undefined as any;
      }
      if (cancelled) return;
      if (error) {
        toast({ title: "Load failed", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      const mapped = (data || []).map((r: any) => ({
        ...emptyProspect(),
        ...(r.data || {}),
        id: r.id,
        assignedSender: r.assigned_sender || (r.data?.assignedSender ?? ""),
      }));
      setRows(mapped);
      if (typeof count === "number") setServerTotal(count);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [currentPage, debouncedSearch, sourceFilter, onlyWithConv, serverSort, hasColumnFilters, isAdmin, authedEmail]);

  // When onlyWithConv flips on (and rows reload to the full set), kick a
  // conversation refresh immediately so counts cover every email.
  useEffect(() => {
    if (onlyWithConv && rows.length > 0) {
      refreshConversations(true).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyWithConv, rows.length]);


  // Reset page when search or tab changes
  useEffect(() => { setCurrentPage(0); }, [debouncedSearch, sourceFilter]);





  const upsertRow = async (row: Prospect) => {
    const payload: any = { id: row.id, data: row as any };
    // Mirror assigned sender to the top-level column so the auto-distribution
    // trigger + downstream queries always see the latest selection.
    if (row.assignedSender !== undefined) payload.assigned_sender = row.assignedSender || null;
    const { error } = await supabase.from("prospects").upsert(payload);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  };

  const saveTimers = useRef<Record<string, any>>({});
  const queueSave = (row: Prospect) => {
    if (saveTimers.current[row.id]) clearTimeout(saveTimers.current[row.id]);
    saveTimers.current[row.id] = setTimeout(() => upsertRow(row), 500);
  };

  const updateCell = (id: string, key: keyof Prospect, value: any) => {
    setRows(prev => {
      const next = prev.map(r => r.id === id ? { ...r, [key]: value, updatedAt: new Date().toISOString() } : r);
      const changed = next.find(r => r.id === id);
      if (changed) {
        queueSave(changed);
        if (key === "channelLink" && isYouTubeUrl(value) && !autoFetchedRef.current.has(id) && !changed.channelName) {
          autoFetchedRef.current.add(id);
          setTimeout(() => autoFillChannel(changed), 600);
        }
      }
      return next;
    });
  };

  const addRow = async () => {
    const r = emptyProspect();
    setRows(prev => [r, ...prev]);
    await upsertRow(r);
  };

  const banSelected = async () => {
    if (!isAdmin) return;
    const ids = Array.from(selected);
    if (!ids.length) return;
    // Direct move to Banned list — no confirm, no reason prompt.
    const { error } = await supabase
      .from("prospects")
      .update({ is_banned: true, ban_reason: null } as any)
      .in("id", ids);
    if (error) { toast({ title: "Ban failed", description: error.message, variant: "destructive" }); return; }
    setRows(prev => prev.filter(r => !ids.includes(r.id)));
    setSelected(new Set());
    toast({ title: `Moved ${ids.length} lead${ids.length === 1 ? "" : "s"} to Banned` });
  };

  const unbanSelected = async () => {
    if (!isAdmin) return;
    const ids = Array.from(selected);
    if (!ids.length) return;
    const { error } = await supabase.from("prospects").update({ is_banned: false, ban_reason: null } as any).in("id", ids);
    if (error) { toast({ title: "Unban failed", description: error.message, variant: "destructive" }); return; }
    setRows(prev => prev.filter(r => !ids.includes(r.id)));
    setSelected(new Set());
    toast({ title: `Restored ${ids.length} lead${ids.length === 1 ? "" : "s"}` });
  };

  const deleteRows = async (ids: string[]) => {
    setRows(prev => prev.filter(r => !ids.includes(r.id)));
    setSelected(prev => {
      const n = new Set(prev);
      ids.forEach(id => n.delete(id));
      return n;
    });
    const BATCH = 200;
    let deleted = 0;
    const failures: string[] = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      const { error } = await supabase.from("prospects").delete().in("id", chunk);
      if (error) {
        failures.push(`Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      } else {
        deleted += chunk.length;
      }
    }
    if (failures.length) {
      toast({
        title: `Deleted ${deleted}/${ids.length}. ${failures.length} batch${failures.length === 1 ? "" : "es"} failed`,
        description: failures.slice(0, 2).join(" | "),
        variant: "destructive",
      });
    } else {
      toast({ title: `Deleted ${deleted} prospect${deleted === 1 ? "" : "s"}` });
    }
  };

  // ===== Bulk AI outreach =====
  // Fetch any prospect rows that aren't currently on the visible page so we
  // can bulk-draft across the entire selection (potentially 6k+ leads, not
  // just the 200 on the current page).
  const fetchProspectsByIds = async (ids: string[]): Promise<Map<string, Prospect>> => {
    const out = new Map<string, Prospect>();
    const missing = ids.filter(id => !rows.find(r => r.id === id) && !bulkRowsRef.current.has(id));
    const CHUNK = 200;
    for (let i = 0; i < missing.length; i += CHUNK) {
      const slice = missing.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from("prospects")
        .select("id,data,assigned_sender")
        .in("id", slice);
      if (error) throw error;
      for (const r of (data || [])) {
        const mapped: Prospect = {
          ...emptyProspect(),
          ...((r as any).data || {}),
          id: r.id,
          assignedSender: (r as any).assigned_sender || ((r as any).data?.assignedSender ?? ""),
        };
        bulkRowsRef.current.set(r.id, mapped);
        out.set(r.id, mapped);
      }
    }
    return out;
  };
  const getRowAny = (id: string): Prospect | undefined =>
    rows.find(r => r.id === id) || bulkRowsRef.current.get(id);

  const getQueueSendState = async () => {
    const snapshot = await new Promise<BulkDraft[]>(rs => {
      setBulkDrafts(prev => { rs(prev); return prev; });
    });
    const reviewableIds = snapshot
      .filter(d => d.status === "ready" || d.status === "review")
      .map(d => d.prospectId);
    try { await fetchProspectsByIds(reviewableIds); } catch {}
    const normalized = snapshot.map(d => {
      if (d.status !== "ready" && d.status !== "review") return d;
      const row = getRowAny(d.prospectId);
      const missing = row
        ? getDraftMissingFields(row).filter(f => f !== "LATEST_VIDEO")
        : (d.missingFields || []).filter(f => f !== "LATEST_VIDEO");
      return { ...d, status: missing.length ? "review" as const : "ready" as const, missingFields: missing.length ? missing : undefined };
    });
    setBulkDrafts(normalized);
    return {
      skippedReview: normalized.filter(d => d.status === "review" || (d.status === "ready" && (d.missingFields?.length ?? 0) > 0)),
      ready: normalized.filter(d => d.status === "ready" && (d.missingFields?.length ?? 0) === 0),
    };
  };

  const buildDraftsFromSelection = async (): Promise<BulkDraft[] | null> => {
    const ids = Array.from(selected);
    if (!ids.length) {
      toast({ title: "Select rows first", description: "Tick the checkboxes of the leads you want to email.", variant: "destructive" });
      return null;
    }
    try {
      if (ids.length > rows.length / 2) {
        toast({ title: `Loading ${ids.length.toLocaleString()} leads…` });
      }
      await fetchProspectsByIds(ids);
    } catch (e: any) {
      toast({ title: "Failed to load selected leads", description: e?.message || String(e), variant: "destructive" });
      return null;
    }
    return ids.map(id => {
      const r = getRowAny(id);
      const to = (r?.email || r?.altEmail || "").split(",")[0].trim();
      const assigned = (r?.assignedSender || "").toLowerCase().trim();
      const sender = DEFAULT_SENDERS.find(s => s.value === assigned)?.value || bulkAISender;
      return {
        prospectId: id,
        to,
        clientName: r?.clientName || r?.channelName || "",
        channelName: r?.channelName || "",
        subject: "",
        body: "",
        status: to ? "pending" : "skipped",
        error: to ? undefined : "no email",
        sender,
      } as BulkDraft;
    });
  };

  const openBulkAI = async () => {
    // If a queue already exists AND the user has a fresh selection that
    // differs from the queue, ask before discarding it. If no fresh selection,
    // just reopen the existing queue without bothering them.
    if (bulkDrafts.length > 0) {
      const selIds = Array.from(selected);
      const currentIds = new Set(bulkDrafts.map(d => d.prospectId));
      const isNewSelection = selIds.length > 0 && selIds.some(id => !currentIds.has(id));
      if (isNewSelection) {
        if (!confirm("New rows selected. Discard the current queue and build a new one?")) return;
        setBulkDrafts([]);
        try { localStorage.removeItem("prospects.bulkDrafts"); } catch {}
        const drafts = await buildDraftsFromSelection();
        if (!drafts) return;
        setBulkDrafts(drafts);
      }
      await getQueueSendState();
      setBulkAIOpen(true);
      return;
    }
    const drafts = await buildDraftsFromSelection();
    if (!drafts) return;
    setBulkDrafts(drafts);
    setBulkAIOpen(true);
  };

  const resetBulkQueue = async () => {
    if (bulkDrafting || bulkSending) return;
    if (bulkDrafts.length > 0 && !confirm("Discard the current queue and clear all selected leads?")) return;
    setBulkDrafts([]);
    setBulkExpanded(new Set());
    setSelected(new Set());
    setBulkAIOpen(false);
    try { localStorage.removeItem("prospects.bulkDrafts"); } catch {}
    toast({ title: "Queue reset", description: "Cleared drafts and lead selection." });
  };

  const sendTestDraft = async () => {
    const to = testEmail.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast({ title: "Enter a valid test email", variant: "destructive" });
      return;
    }
    const sample = bulkDrafts.find(d => d.status === "ready") || bulkDrafts.find(d => d.subject && d.body);
    if (!sample) {
      toast({ title: "No draft to test", description: "Draft at least one email first.", variant: "destructive" });
      return;
    }
    const senderMeta = DEFAULT_SENDERS.find(s => s.value === sample.sender) || DEFAULT_SENDERS[0];
    setTestSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-prospect-reply", {
        body: {
          to,
          subject: sample.subject,
          text: sample.body,
          fromEmail: sample.sender,
          fromName: senderMeta?.display,
        },
      });
      if (error) throw error;
      toast({ title: `Test sent to ${to}`, description: `Sender: ${sample.sender}` });
    } catch (e: any) {
      toast({ title: "Test send failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setTestSending(false);
    }
  };


  // Draft one prospect with internal retry/backoff. Returns true on success.
  const draftOneInternal = async (prospectId: string, systemPromptOverride: string, maxAttempts = 4) => {
    const d = bulkDrafts.find(x => x.prospectId === prospectId)
      || (await new Promise<BulkDraft | undefined>(rs => {
        // grab current state synchronously via setter trick
        setBulkDrafts(prev => { rs(prev.find(x => x.prospectId === prospectId)); return prev; });
      }));
    if (!d) return false;
    setBulkDrafts(prev => prev.map(x => x.prospectId === prospectId ? { ...x, status: "drafting", error: undefined } : x));
    let row = getRowAny(prospectId);
    if (!row) {
      try { await fetchProspectsByIds([prospectId]); } catch {}
      row = getRowAny(prospectId);
    }
    if (!row) {
      setBulkDrafts(prev => prev.map(x => x.prospectId === prospectId ? { ...x, status: "error", error: "row missing" } : x));
      return false;
    }
    let attempt = 0;
    let lastErr = "";
    while (attempt < maxAttempts && !bulkCancelRef.current) {
      try {
        const senderDisplay = DEFAULT_SENDERS.find(s => s.value === d.sender)?.display || d.sender.split("@")[0];
        const { data, error } = await supabase.functions.invoke("draft-outreach-email", {
          body: {
            channelName: row.channelName,
            channelLink: row.channelLink,
            channelDescription: row.channelDescription,
            country: row.country,
            channelJoined: row.channelJoined,
            email: d.to,
            clientName: row.clientName || row.channelName,
            subscribers: row.subscribersLive,
            totalViews: row.totalViews,
            senderName: senderDisplay,
            systemPromptOverride,
            videos: (row.recentVideos || []).slice(0, 3).map(v => ({
              title: v.title, url: v.url, description: v.description,
            })),
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const subject = (data as any)?.subject || "quick thought on your channel";
        const body = normalizeEmailBody((data as any)?.body || "");
        if (!body.trim()) throw new Error("empty draft");
        const missing = getDraftMissingFields(row);
        setBulkDrafts(prev => prev.map(x => x.prospectId === prospectId ? { ...x, subject, body, status: missing.length ? "review" : "ready", error: undefined, missingFields: missing.length ? missing : undefined } : x));
        return true;
      } catch (e: any) {
        lastErr = e?.message || String(e);
        attempt++;
        if (attempt < maxAttempts) await new Promise(rs => setTimeout(rs, 2500 * attempt));
      }
    }
    setBulkDrafts(prev => prev.map(x => x.prospectId === prospectId ? { ...x, status: "error", error: lastErr || "failed" } : x));
    return false;
  };

  // Plain template drafting — no AI calls. Fills variables from YouTube data.
  const draftAllFromTemplate = async () => {
    if (bulkDrafting || bulkSending) return;
    const subjectTpl = bulkTemplateSubject.trim() || DEFAULT_TEMPLATE_SUBJECT;
    const bodyTpl = bulkTemplateBody.trim();
    if (!bodyTpl) {
      toast({ title: "Template is empty", description: "Write a template body first.", variant: "destructive" });
      return;
    }
    setBulkDrafting(true);
    try {
      const targets = bulkDrafts.filter(d => d.status === "pending" || d.status === "error").map(d => d.prospectId);
      // Make sure we have rows loaded for any selection that wasn't on-page.
      try { await fetchProspectsByIds(targets); } catch {}
      let filled = 0;
      let skipped = 0;
      setBulkDrafts(prev => prev.map(x => {
        if (x.status !== "pending" && x.status !== "error") return x;
        const row = getRowAny(x.prospectId);
        if (!row) { skipped++; return { ...x, status: "error", error: "row missing" }; }
        const senderDisplay = DEFAULT_SENDERS.find(s => s.value === x.sender)?.display || x.sender.split("@")[0];
        const subject = fillTemplate(subjectTpl, row, senderDisplay).trim().slice(0, 120) || "quick thought";
        const body = fillTemplate(bodyTpl, row, senderDisplay).trim();
        // Detect which template fields fell back to defaults (so we can flag for manual review).
        const allTpl = `${subjectTpl}\n${bodyTpl}`;
        const missing: string[] = [];
        const firstNameRaw = (row.clientName || row.channelName || "").trim();
        if (/\{\{\s*FIRST_NAME\s*\}\}/.test(allTpl) && !firstNameRaw) missing.push("FIRST_NAME");
        if (/\{\{\s*CHANNEL_NAME\s*\}\}/.test(allTpl) && !(row.channelName || row.clientName || "").trim()) missing.push("CHANNEL_NAME");
        if (/\{\{\s*JOINED_DATE\s*\}\}/.test(allTpl) && !(row.channelJoined || "").trim()) missing.push("JOINED_DATE");
        missing.push(...getDraftMissingFields(row));
        filled++;
        const uniqueMissing = Array.from(new Set(missing));
        return { ...x, subject, body, status: uniqueMissing.length ? "review" : "ready", error: undefined, missingFields: uniqueMissing.length ? uniqueMissing : undefined };
      }));
      toast({ title: `Filled ${filled} draft${filled === 1 ? "" : "s"} from template`, description: skipped ? `${skipped} skipped (missing data).` : "Review/edit, then Send Queue." });
    } finally {
      setBulkDrafting(false);
    }
  };

  const draftAllBulk = async () => {
    if (bulkDrafting) return;
    setBulkDrafting(true);
    bulkCancelRef.current = false;
    const systemPromptOverride = bulkAIPrompt.trim();
    // First pass: anything pending or errored
    const initialTargets = bulkDrafts.filter(d => d.status === "pending" || d.status === "error").map(d => d.prospectId);
    // Sequential with a tiny pacing gap. Parallel drafting (3-way) plus the
    // edge-function's old 2-model race was overwhelming the AI gateway and
    // producing "error" rows. One-at-a-time keeps the success rate near 100%.
    for (const id of initialTargets) {
      if (bulkCancelRef.current) break;
      await draftOneInternal(id, systemPromptOverride, 4);
      // Pace between requests so the AI gateway doesn't 429 mid-batch. With
      // ~3-5s per call this still keeps throughput high (~30-40 drafts/min).
      await new Promise(rs => setTimeout(rs, 1200));
    }
    // Auto-retry sweeps: any rows still in "error" get re-attempted up to 2
    // more times with a longer cool-down. Errors are kept (not skipped) so a
    // future manual run still picks them up.
    for (let sweep = 1; sweep <= 2 && !bulkCancelRef.current; sweep++) {
      const stillFailed = await new Promise<string[]>(rs => {
        setBulkDrafts(prev => { rs(prev.filter(x => x.status === "error").map(x => x.prospectId)); return prev; });
      });
      if (!stillFailed.length) break;
      // small cool-down so the gateway recovers between sweeps
      await new Promise(rs => setTimeout(rs, 5000 * sweep));
      for (const id of stillFailed) {
        if (bulkCancelRef.current) break;
        await draftOneInternal(id, systemPromptOverride, 3);
        await new Promise(rs => setTimeout(rs, 600));
      }
    }
    setBulkDrafting(false);
    const remaining = await new Promise<number>(rs => {
      setBulkDrafts(prev => { rs(prev.filter(x => x.status === "error").length); return prev; });
    });
    toast({
      title: "Drafting complete",
      description: remaining
        ? `${remaining} still failing — they'll auto-retry on the next Draft run.`
        : "Review/edit drafts, then click Send Queue.",
    });
  };


  const sendQueueBulk = async () => {
    if (bulkSending) return;
    const { skippedReview, ready } = await getQueueSendState();
    if (!ready.length) {
      toast({ title: "No ready drafts", description: skippedReview.length ? `${skippedReview.length} skipped — fix missing fields first.` : "Draft emails first.", variant: "destructive" });
      return;
    }
    if (skippedReview.length) {
      toast({ title: `Skipping ${skippedReview.length} review draft${skippedReview.length === 1 ? "" : "s"}`, description: "Edit them to clear the missing-field warning to include them." });
    }
    // Per-sender gap: random range or fixed timer, depending on mode.
    // Floor at 30s as a safety minimum so Gmail doesn't choke on bursts.
    const SAFE_FLOOR = 30;
    let min: number, max: number;
    if (bulkGapMode === "fixed") {
      const v = Math.max(SAFE_FLOOR, Math.floor(bulkGapFixedSec) || SAFE_FLOOR);
      min = v; max = v;
    } else {
      min = Math.max(SAFE_FLOOR, Math.min(bulkAIMinSec, bulkAIMaxSec));
      max = Math.max(min, Math.max(bulkAIMinSec, bulkAIMaxSec));
    }
    setBulkSending(true);
    bulkCancelRef.current = false;
    const nextAtBySender = new Map<string, number>();
    for (let i = 0; i < ready.length; i++) {
      if (bulkCancelRef.current) break;
      const d = ready[i];

      // Wait until this sender's slot is free.
      const senderKey = d.sender;
      const slot = nextAtBySender.get(senderKey) || 0;
      const now = Date.now();
      if (slot > now) {
        setBulkDrafts(prev => prev.map(x => x.prospectId === d.prospectId ? { ...x, nextSendAt: slot } : x));
        while (Date.now() < slot && !bulkCancelRef.current) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
      if (bulkCancelRef.current) break;
      setBulkDrafts(prev => prev.map(x => x.prospectId === d.prospectId ? { ...x, status: "sending", nextSendAt: undefined } : x));

      try {
        const senderDisplay = DEFAULT_SENDERS.find(s => s.value === d.sender)?.display || d.sender.split("@")[0];
        const { data, error } = await supabase.functions.invoke("send-prospect-reply", {
          body: {
            to: [d.to],
            subject: d.subject,
            text: normalizeEmailBody(d.body),
            fromEmail: d.sender,
            fromName: senderDisplay,
          },
        });
        if (error) throw error;
        if ((data as any)?.ok === false) throw new Error((data as any)?.error || "Send failed");
        setBulkDrafts(prev => prev.map(x => x.prospectId === d.prospectId ? { ...x, status: "sent" } : x));
      } catch (e: any) {
        setBulkDrafts(prev => prev.map(x => x.prospectId === d.prospectId ? { ...x, status: "error", error: e?.message || String(e) } : x));
      }

      // Reserve this sender's next slot: now + random(5-10 min).
      const waitSec = Math.floor(Math.random() * (max - min + 1)) + min;
      nextAtBySender.set(senderKey, Date.now() + waitSec * 1000);
    }
    setBulkSending(false);
    toast({ title: bulkCancelRef.current ? "Send queue cancelled" : "Send queue complete" });
  };

  // Server-side scheduling. Inserts each ready draft into prospect_email_jobs
  // with a staggered scheduled_at; a pg_cron job runs process-prospect-email-queue
  // every minute, so emails keep flowing even after this browser closes.
  const scheduleOnServer = async () => {
    const { skippedReview, ready } = await getQueueSendState();
    if (!ready.length) {
      toast({ title: "No ready drafts", description: skippedReview.length ? `${skippedReview.length} skipped — fix missing fields first.` : "Draft emails first.", variant: "destructive" });
      return;
    }
    if (skippedReview.length) {
      toast({ title: `Skipping ${skippedReview.length} review draft${skippedReview.length === 1 ? "" : "s"}`, description: "Edit them to clear the missing-field warning to include them." });
    }
    // Per-sender gap (same rules as sendQueueBulk).
    const SAFE_FLOOR = 30;
    let min: number, max: number;
    if (bulkGapMode === "fixed") {
      const v = Math.max(SAFE_FLOOR, Math.floor(bulkGapFixedSec) || SAFE_FLOOR);
      min = v; max = v;
    } else {
      min = Math.max(SAFE_FLOOR, Math.min(bulkAIMinSec, bulkAIMaxSec));
      max = Math.max(min, Math.max(bulkAIMinSec, bulkAIMaxSec));
    }
    const batchId = (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random()}`;

    // Per-sender cursor so two emails from the same from-email are always
    // 5-10 min apart, while different senders can fire in parallel.
    const cursorBySender = new Map<string, number>();
    const baseStart = Date.now() + 30_000;
    let lastAt = baseStart;
    const jobs = ready.map((d) => {
      const prev = cursorBySender.get(d.sender);
      let at: number;
      if (prev === undefined) {
        at = baseStart;
      } else {
        const pause = Math.floor(Math.random() * (max - min + 1)) + min;
        at = prev + pause * 1000;
      }
      cursorBySender.set(d.sender, at);
      if (at > lastAt) lastAt = at;
      const senderDisplay = DEFAULT_SENDERS.find(s => s.value === d.sender)?.display || d.sender.split("@")[0];
      return {
        batch_id: batchId,
        prospect_id: d.prospectId,
        to_email: d.to,
        subject: d.subject,
        body_text: normalizeEmailBody(d.body),
        from_email: d.sender,
        from_name: senderDisplay,
        scheduled_at: new Date(at).toISOString(),
      };
    });

    const { error } = await (supabase.from as any)("prospect_email_jobs").insert(jobs);
    if (error) {
      toast({ title: "Schedule failed", description: error.message, variant: "destructive" });
      return;
    }

    setBulkDrafts(prev => prev.map(x =>
      ready.find(r => r.prospectId === x.prospectId)
        ? { ...x, status: "sent" as const, error: "queued on server" }
        : x
    ));

    toast({
      title: `Queued ${jobs.length} on server`,
      description: `Per-sender gap ${Math.round(min/60)}-${Math.round(max/60)} min. Last email ~${new Date(lastAt).toLocaleString()}. Safe to close the browser.`,
    });
  };



  // Retry a single errored draft (re-run AI draft for just that row)
  const retryDraftOne = async (prospectId: string) => {
    const d = bulkDrafts.find(x => x.prospectId === prospectId);
    if (!d) return;
    const r = rows.find(x => x.id === prospectId);
    if (!r) {
      setBulkDrafts(prev => prev.map(x => x.prospectId === prospectId ? { ...x, status: "error", error: "row missing" } : x));
      return;
    }
    const senderDisplay = DEFAULT_SENDERS.find(s => s.value === d.sender)?.display || d.sender.split("@")[0];
    setBulkDrafts(prev => prev.map(x => x.prospectId === prospectId ? { ...x, status: "drafting", error: undefined } : x));
    try {
      const { data, error } = await supabase.functions.invoke("draft-outreach-email", {
        body: {
          channelName: r.channelName,
          channelLink: r.channelLink,
          channelDescription: r.channelDescription,
          country: r.country,
          channelJoined: r.channelJoined,
          email: d.to,
          clientName: r.clientName || r.channelName,
          subscribers: r.subscribersLive,
          totalViews: r.totalViews,
          senderName: senderDisplay,
          systemPromptOverride: bulkAIPrompt.trim(),
          videos: (r.recentVideos || []).slice(0, 3).map(v => ({
            title: v.title, url: v.url, description: v.description,
          })),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const subject = (data as any)?.subject || "quick thought on your channel";
      const body = normalizeEmailBody((data as any)?.body || "");
      if (!body.trim()) throw new Error("empty draft");
      const missing = getDraftMissingFields(r);
      setBulkDrafts(prev => prev.map(x => x.prospectId === prospectId ? { ...x, subject, body, status: missing.length ? "review" : "ready", error: undefined, missingFields: missing.length ? missing : undefined } : x));
      toast({ title: "Draft retried", description: missing.length ? "Review required before sending." : "Ready to send." });
    } catch (e: any) {
      setBulkDrafts(prev => prev.map(x => x.prospectId === prospectId ? { ...x, status: "error", error: e?.message || String(e) } : x));
      toast({ title: "Retry failed", description: e?.message || String(e), variant: "destructive" });
    }
  };

  // Retry sending a single errored row
  const retrySendOne = async (prospectId: string) => {
    const d = bulkDrafts.find(x => x.prospectId === prospectId);
    if (!d) return;
    if (!d.subject?.trim() || !d.body?.trim()) {
      toast({ title: "Nothing to send", description: "Draft is empty — retry draft first.", variant: "destructive" });
      return;
    }
    const senderDisplay = DEFAULT_SENDERS.find(s => s.value === d.sender)?.display || d.sender.split("@")[0];
    setBulkDrafts(prev => prev.map(x => x.prospectId === prospectId ? { ...x, status: "sending", error: undefined } : x));
    try {
      const { data, error } = await supabase.functions.invoke("send-prospect-reply", {
        body: { to: [d.to], subject: d.subject, text: normalizeEmailBody(d.body), fromEmail: d.sender, fromName: senderDisplay },
      });
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error((data as any)?.error || "Send failed");
      setBulkDrafts(prev => prev.map(x => x.prospectId === prospectId ? { ...x, status: "sent" } : x));
      toast({ title: "Sent" });
    } catch (e: any) {
      setBulkDrafts(prev => prev.map(x => x.prospectId === prospectId ? { ...x, status: "error", error: e?.message || String(e) } : x));
      toast({ title: "Send failed", description: e?.message || String(e), variant: "destructive" });
    }
  };



  const cancelBulk = () => {
    bulkCancelRef.current = true;
    toast({ title: "Cancelling…", description: "Stopping after the current step." });
  };

  // Bulk apply value to selected rows

  const applyBulkEdit = async () => {
    const ids = Array.from(selected);
    if (!ids.length || !bulkField) return;
    const updated: Prospect[] = [];
    setRows(prev => prev.map(r => {
      if (!ids.includes(r.id)) return r;
      const next = { ...r, [bulkField]: bulkValue, updatedAt: new Date().toISOString() } as Prospect;
      updated.push(next);
      return next;
    }));
    setBulkEditOpen(false);
    const BATCH = 200;
    for (let i = 0; i < updated.length; i += BATCH) {
      const chunk = updated.slice(i, i + BATCH);
      await supabase.from("prospects").upsert(chunk.map(p => ({ id: p.id, data: p as any })));
    }
    toast({ title: `Updated ${updated.length} rows: ${bulkField} → "${bulkValue || "(empty)"}"` });
  };

  // Remove duplicates: any rows sharing a primary email OR sharing a
  // (clientName + altEmail) tuple. Real-world duplicates often have one row
  // with the prospect on email and another with the same person on altEmail,
  // or auto-discovered rows colliding with manual entries — group by *every*
  // non-empty email a row contains so all of those collapse together.
  // Keeps the row with the most populated fields.
  const dedupe = async () => {
    if (!isAdmin) {
      toast({ title: "Admin only", description: "Only admins can dedupe.", variant: "destructive" });
      return;
    }
    if (!confirm("Run dedupe across the entire database? This removes duplicates by email and by YouTube channel link, keeping the row with the richest data.")) return;
    const t = toast({ title: "Dedupe running…" });
    try {
      const { data, error } = await supabase.rpc("prospects_dedupe_all" as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const removed = Number((row as any)?.removed ?? 0);
      const kept = Number((row as any)?.kept ?? 0);
      t.update({
        id: t.id,
        title: removed > 0 ? `Removed ${removed} duplicate row${removed === 1 ? "" : "s"}` : "No duplicates found",
        description: `Total prospects now: ${kept.toLocaleString()}`,
      });
      // Refetch current page so the UI matches the DB.
      setCurrentPage(p => p);
      // Force the load effect to re-run by bumping a state it depends on:
      // safest is to refetch via a small key change. We'll just call window location
      // soft refresh of the list by toggling sourceFilter to itself.
      setSourceFilter(s => s);
    } catch (e: any) {
      t.update({ id: t.id, title: "Dedupe failed", description: e?.message || String(e), variant: "destructive" });
    }
  };


  // Refresh conversation counts + replied status from email_tracker_logs for all rows.
  // The full sweep accumulates locally and only commits to React state ONCE at the
  // end — this prevents the flicker of partial counts appearing/disappearing while
  // syncing. The final snapshot is also persisted to `prospects_conv_cache` so the
  // next page open hydrates instantly without any background work.
  // Pass `force=true` to bypass the 24h freshness check (manual sync button).
  const refreshConversations = async (silent = false, force = false) => {
    // Skip silent refreshes if the cached snapshot is < 24h old.
    if (silent && !force && convCacheUpdatedAtRef.current) {
      const ageMs = Date.now() - convCacheUpdatedAtRef.current;
      if (ageMs < 24 * 60 * 60 * 1000) return;
    }
    setConvLoading(true);
    const counts: Record<string, number> = {};
    const replied: Record<string, boolean> = {};
    const emailToProspects: Record<string, string[]> = {};

    // Pull EVERY prospect's email from the DB (not just the visible page) so a
    // single click syncs the entire conversation history in one pass.
    try {
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("prospects")
          .select("id,email,data")
          .range(from, from + PAGE - 1);
        if (error) { console.error("conv prospects fetch", error); break; }
        const page = data || [];
        page.forEach((r: any) => {
          const emails = [r.email, r.data?.altEmail].filter(Boolean) as string[];
          emails.forEach(e => {
            const k = e.toLowerCase().trim();
            if (!k) return;
            (emailToProspects[k] ||= []).push(r.id);
          });
        });
        if (page.length < PAGE) break;
        from += PAGE;
      }
    } catch (e) {
      console.error("conv prospects pagination", e);
    }
    const emails = Object.keys(emailToProspects);
    setConvProgress({ done: 0, total: emails.length });
    const BATCH = 25;
    const PAGE_SIZE = 1000;
    let totalFetched = 0;
    for (let i = 0; i < emails.length; i += BATCH) {
      const chunk = emails.slice(i, i + BATCH);
      const orParts = chunk.flatMap(e => [`recipients.cs.{${e}}`, `employee_email.eq.${e}`]);
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("email_tracker_logs")
          .select("recipients,employee_email,is_external,replied_at")
          .or(orParts.join(","))
          .order("sent_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error) { console.error("conv fetch", error); break; }
        const page = data || [];
        totalFetched += page.length;
        page.forEach((row: any) => {
          const recips = (row.recipients || []).map((x: string) => (x || "").toLowerCase());
          const sender = (row.employee_email || "").toLowerCase();
          chunk.forEach(e => {
            if (recips.includes(e) || sender === e) {
              (emailToProspects[e] || []).forEach(pid => {
                counts[pid] = (counts[pid] || 0) + 1;
                if (sender === e || row.is_external || row.replied_at) {
                  replied[pid] = true;
                }
              });
            }
          });
        });
        if (page.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
        await new Promise(res => setTimeout(res, 30));
      }
      setConvProgress({ done: Math.min(i + BATCH, emails.length), total: emails.length });
      // NOTE: no incremental setConvCounts here — we publish once at the end
      // to keep the UI stable and avoid flickering counts.
    }
    // Merge (don't overwrite) so counts/replied accumulate across pages and
    // sessions — otherwise switching pages wipes counts for rows not in `rows`.
    const mergedCounts = { ...convCounts, ...counts };
    const mergedReplied = { ...convReplied, ...replied };
    setConvCounts(mergedCounts);
    setConvReplied(mergedReplied);
    convCacheUpdatedAtRef.current = Date.now();
    try {
      await supabase.from("prospects_conv_cache").upsert({
        id: "global",
        counts: mergedCounts as any,
        replied: mergedReplied as any,
        message_total: totalFetched,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("conv cache save failed", e);
    }
    setConvLoading(false);
    if (!silent) {
      const withConv = Object.keys(counts).length;
      toast({
        title: "Sync complete",
        description: `${withConv}/${emails.length} prospects · ${totalFetched} messages`,
      });
    }
  };


  // Scan email_tracker_logs for any external email address we've conversed with
  // that isn't yet a prospect row. Add a highlighted row for each missing one
  // so /prospects reflects the full Google Workspace conversation history.
  const [discovering, setDiscovering] = useState(false);
  const discoverFromWorkspace = async (silent = false) => {
    if (discovering) return;
    setDiscovering(true);
    try {
      // Build the set of emails already represented in prospects
      const known = new Set<string>();
      rows.forEach(r => {
        [r.email, r.altEmail].forEach(e => {
          const k = (e || "").toLowerCase().trim();
          if (k) known.add(k);
        });
      });

      // Page through all external email logs and collect unique counterparties.
      // is_external=true covers both outbound (recipients = external) and
      // inbound (recipients = [external sender]) per the sync function.
      const PAGE = 1000;
      let from = 0;
      const discovered = new Map<string, { lastAt: string }>();
      while (true) {
        const { data, error } = await supabase
          .from("email_tracker_logs")
          .select("recipients,employee_email,sent_at,is_external,event_type")
          .eq("is_external", true)
          .order("sent_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) { console.error("discover fetch", error); break; }
        const page = data || [];
        page.forEach((row: any) => {
          const sender = (row.employee_email || "").toLowerCase();
          const recips: string[] = (row.recipients || []).map((x: string) => (x || "").toLowerCase()).filter(Boolean);
          // Candidates = all addresses on the message that aren't @swishview.com
          const candidates = [sender, ...recips].filter(e => e && !e.endsWith("@swishview.com"));
          candidates.forEach(e => {
            if (known.has(e)) return;
            const existing = discovered.get(e);
            if (!existing || (row.sent_at && row.sent_at > existing.lastAt)) {
              discovered.set(e, { lastAt: row.sent_at || "" });
            }
          });
        });
        if (page.length < PAGE) break;
        from += PAGE;
        await new Promise(res => setTimeout(res, 30));
      }

      if (discovered.size === 0) {
        if (!silent) toast({ title: "No new prospects to add", description: "All Workspace conversations are already linked." });
        return;
      }

      // Materialise new rows + upsert in batches
      const newRows: Prospect[] = Array.from(discovered.entries()).map(([email, meta]) => {
        const r = emptyProspect();
        r.email = email;
        r.clientName = titleCaseFromEmail(email);
        r.autoDiscovered = true;
        if (meta.lastAt) r.updatedAt = meta.lastAt;
        return r;
      });

      setRows(prev => [...newRows, ...prev]);

      const BATCH = 200;
      let inserted = 0;
      for (let i = 0; i < newRows.length; i += BATCH) {
        const chunk = newRows.slice(i, i + BATCH);
        const { error } = await supabase
          .from("prospects")
          .upsert(chunk.map(p => ({ id: p.id, data: p as any })));
        if (!error) inserted += chunk.length;
        await new Promise(res => setTimeout(res, 20));
      }

      toast({
        title: `Added ${inserted} prospects from Workspace`,
        description: "Highlighted in amber. Refreshing conversation counts…",
      });
      // Refresh conversation counts so the new rows show their message volume
      refreshConversations(true, true).catch(() => {});
    } finally {
      setDiscovering(false);
    }
  };


  // Auto background refresh: conv counts once rows load, then every 10 min;
  // and visible client-side YT sync once loaded (so user can SEE progress),
  // plus a server-side sync to drain the rest in the background.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (loading || autoStartedRef.current || rows.length === 0) return;
    autoStartedRef.current = true;
    // initial silent refresh of conversation counts
    setTimeout(() => refreshConversations(true).catch(() => {}), 1500);

    // YT sync: run AT MOST ONCE per day per browser. The server-side cron
    // (prospects-daily-sync) already drains the queue continuously, and each
    // row is skipped if `lastFetchedAt` is today — so re-kicking it on every
    // page load / browser was pure waste.
    const todayKey = todayISO();
    let kickedSync = false;
    try {
      if (localStorage.getItem("prospects.lastAutoSyncDay") !== todayKey) {
        kickedSync = true;
        localStorage.setItem("prospects.lastAutoSyncDay", todayKey);
        setTimeout(() => {
          supabase.functions.invoke("prospects-daily-sync", {
            body: { priorityIds: rows.slice(0, 200).map(r => r.id) },
          }).catch(() => {});
        }, 4000);
      }
    } catch {}
    // No client-side syncAll auto-trigger anymore. The user can hit the
    // manual "Sync" button if they want the visible progress bar.

    if (sourceFilter === "discovered") {
      setTimeout(() => discoverFromWorkspace(true).catch(() => {}), 6000);
    }
    const convInterval = setInterval(() => refreshConversations(true).catch(() => {}), 60 * 60 * 1000);
    return () => { clearInterval(convInterval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, rows.length]);






  const fetchYouTubeForRow = async (row: Prospect): Promise<Prospect | null> => {
    const url = row.channelLink;
    if (!url) return null;
    const { data, error } = await supabase.functions.invoke("youtube-channel-info", {
      body: { channelUrl: url, includeVideos: true, maxVideos: 6 },
    });
    if (error) throw error;
    if (!data || data.error) throw new Error(data?.error || "No channel data");

    const subs = Number(data.subscribers) || 0;
    const views = Number(data.totalViews) || 0;
    const lv = data.latestVideo;

    // Auto-convert video URL → canonical channel URL
    const canonicalLink = data.customUrl
      ? (data.customUrl.startsWith("@") ? `https://www.youtube.com/${data.customUrl}` : `https://www.youtube.com/${data.customUrl}`)
      : (data.channelId ? `https://www.youtube.com/channel/${data.channelId}` : row.channelLink);

    const recent: RecentVid[] = (data.recentVideos || []).slice(0, 3).map((v: any) => ({
      title: v.title || "",
      url: v.url || "",
      description: v.description || "",
    }));

    return {
      ...row,
      channelLink: isYouTubeVideoUrl(row.channelLink) ? canonicalLink : (row.channelLink || canonicalLink),
      channelName: data.channelName || row.channelName,
      channelDescription: data.description || row.channelDescription,
      country: data.country || row.country,
      channelJoined: data.publishedAt ? data.publishedAt.slice(0, 10) : row.channelJoined,
      subscribersLive: subs ? String(subs) : row.subscribersLive,
      totalViews: views ? String(views) : row.totalViews,
      ytCapture: data.thumbnail || row.ytCapture,
      snapshots: addSnapshot(row.snapshots, { date: todayISO(), subscribers: subs, totalViews: views }),
      lastVideoTitle: lv?.title || row.lastVideoTitle,
      lastVideoDate: lv?.publishedAt || row.lastVideoDate,
      lastVideoUrl: lv?.url || row.lastVideoUrl,
      lastVideoThumb: lv?.thumbnail || row.lastVideoThumb,
      lastVideoViews: lv?.viewCount != null ? String(lv.viewCount) : row.lastVideoViews,
      lastFetchedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recentVideos: recent.length ? recent : row.recentVideos,
    };
  };

  const autoFillChannel = async (row: Prospect) => {
    if (!row.channelLink) {
      toast({ title: "Add a YT Channel URL first", variant: "destructive" });
      return;
    }
    setAutoFetchingId(row.id);
    try {
      const updated = await fetchYouTubeForRow(row);
      if (updated) {
        setRows(prev => prev.map(r => r.id === row.id ? updated : r));
        await upsertRow(updated);
        toast({ title: "Channel data fetched" });
      }
    } catch (e: any) {
      console.error("[autoFillChannel] fetch failed", e);
      const desc = e?.context?.error || e?.message || (typeof e === "string" ? e : JSON.stringify(e));
      toast({ title: "Fetch failed", description: String(desc).slice(0, 200), variant: "destructive" });
    } finally {
      setAutoFetchingId(null);
    }
  };

  // Simple one-by-one YouTube fetch for every prospect row.
  // Loads all prospects (scoped to the user's senders if not admin), then
  // calls the youtube-channel-info edge function for each row sequentially.
  const syncAll = async () => {
    if (syncing) { cancelSyncRef.current = true; return; }

    const myEmail = (authedEmail || "").toLowerCase().trim();
    const ownerSenders = isAdmin ? null : (PROSPECTS_ALLOWED_SENDERS[myEmail] || (myEmail ? [myEmail] : null));

    // 1. Load all prospect ids + data that have a channel link.
    let all: Prospect[] = [];
    try {
      const PAGE = 1000;
      let from = 0;
      while (true) {
        let q: any = supabase
          .from("prospects")
          .select("id,data,assigned_sender")
          .neq("channel_link", "")
          .not("channel_link", "is", null)
          .eq("is_banned", false)
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (ownerSenders) q = q.in("assigned_sender", ownerSenders);
        const { data, error } = await q;
        if (error) throw error;
        const batch = (data || []).map((r: any) => ({
          ...emptyProspect(),
          ...(r.data || {}),
          id: r.id,
          assignedSender: r.assigned_sender || (r.data?.assignedSender ?? ""),
        })) as Prospect[];
        all.push(...batch.filter(r => !!r.channelLink));
        if (batch.length < PAGE) break;
        from += PAGE;
      }
    } catch (e: any) {
      toast({ title: "Could not load rows", description: e.message, variant: "destructive" });
      return;
    }

    if (all.length === 0) {
      toast({ title: "No rows with a YouTube channel link" });
      return;
    }

    // Persistent resume cursor — skip rows already fetched today, and pick up
    // where the last run stopped. When everything today is fetched, restart
    // from the very top (row 1).
    const today = todayISO();
    const CURSOR_KEY = "prospects.syncCursor";
    const isFetchedToday = (r: Prospect) => !!r.lastFetchedAt && r.lastFetchedAt.slice(0, 10) === today;

    // Remaining rows = those not yet fetched today, preserving original order.
    let remaining = all.filter(r => !isFetchedToday(r));

    // If everything is already fetched today, restart from row 1 (full refresh).
    if (remaining.length === 0) {
      try { localStorage.removeItem(CURSOR_KEY); } catch {}
      remaining = all.slice();
      toast({ title: "All rows fetched today — restarting from row 1" });
    }

    setSyncing(true);
    cancelSyncRef.current = false;
    setSyncProgress({ done: 0, total: remaining.length });
    setSyncStatus({});

    let ok = 0;
    let failed = 0;

    for (let i = 0; i < remaining.length; i++) {
      if (cancelSyncRef.current) break;
      const row = remaining[i];
      setSyncStatus({ lastChannel: row.channelName || row.channelLink });
      try {
        const updated = await fetchYouTubeForRow(row);
        if (updated) {
          await upsertRow(updated);
          setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
          ok++;
        }
      } catch (e: any) {
        failed++;
        setSyncStatus(s => ({ ...s, recentError: e?.message || "fetch failed" }));
        console.error("syncAll row failed", row.id, e);
      }
      setSyncProgress({ done: i + 1, total: remaining.length });
      // Persist cursor so a refresh / new click resumes from here.
      try { localStorage.setItem(CURSOR_KEY, JSON.stringify({ day: today, lastId: row.id, done: i + 1 })); } catch {}
    }

    setSyncing(false);
    setSyncStatus({});

    // If the run completed (not cancelled), clear cursor so next click restarts.
    if (!cancelSyncRef.current) {
      try { localStorage.removeItem(CURSOR_KEY); } catch {}
    }

    toast({
      title: cancelSyncRef.current ? `Stopped at ${ok}/${remaining.length} · resume any time` : `Synced ${ok}/${remaining.length}`,
      description: failed ? `${failed} row${failed === 1 ? "" : "s"} failed` : undefined,
    });
  };


  const handleImport = async (file: File) => {
    const importToast = toast({ title: "Reading file…" });
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const totalParsed = json.length;
      const imported: Prospect[] = json.map(row => {
        const p = emptyProspect();
        for (const [rawKey, val] of Object.entries(row)) {
          const mapped = HEADER_MAP[normKey(rawKey)];
          if (mapped) (p as any)[mapped] = String(val ?? "");
        }
        return p;
      }).filter(p => p.channelLink || p.email || p.clientName);
      const skipped = totalParsed - imported.length;
      if (!imported.length) {
        importToast.update({
          id: importToast.id,
          title: "Import failed",
          description: `No usable rows in ${totalParsed} parsed. Need at least Client Name, Email, or YT Channel Link.`,
          variant: "destructive",
        });
        return;
      }
      setRows(prev => [...imported, ...prev]);
      const BATCH = 500;
      const totalBatches = Math.ceil(imported.length / BATCH);
      let insertedCount = 0;
      const failures: string[] = [];
      for (let i = 0; i < totalBatches; i++) {
        const chunk = imported.slice(i * BATCH, (i + 1) * BATCH);
        importToast.update({
          id: importToast.id,
          title: `Importing… ${insertedCount}/${imported.length}`,
          description: `Batch ${i + 1}/${totalBatches}`,
        });
        const { error } = await supabase
          .from("prospects")
          .insert(chunk.map(p => ({ id: p.id, data: p as any })));
        if (error) {
          failures.push(`Batch ${i + 1}: ${error.message}`);
        } else {
          insertedCount += chunk.length;
        }
      }
      if (failures.length) {
        importToast.update({
          id: importToast.id,
          title: `Imported ${insertedCount}/${imported.length}. ${failures.length} batch${failures.length === 1 ? "" : "es"} failed`,
          description: failures.slice(0, 2).join(" | "),
          variant: "destructive",
        });
      } else {
        importToast.update({
          id: importToast.id,
          title: `Imported ${insertedCount} prospects`,
          description: skipped > 0 ? `${skipped} row${skipped === 1 ? "" : "s"} skipped (missing name/email/channel)` : undefined,
        });
      }
      // Background auto-fetch for rows with channelLink (only if successful insert)
      if (insertedCount > 0) {
        (async () => {
          for (const p of imported) {
            if (!p.channelLink) continue;
            try {
              const updated = await fetchYouTubeForRow(p);
              if (updated) {
                setRows(prev => prev.map(r => r.id === p.id ? updated : r));
                await upsertRow(updated);
              }
            } catch (e) { console.error("import auto-fetch fail", e); }
            await new Promise(res => setTimeout(res, 400));
          }
        })();
      }
    } catch (e: any) {
      importToast.update({
        id: importToast.id,
        title: "Import failed",
        description: e.message || "Unknown error reading file",
        variant: "destructive",
      });
    }
  };


  const exportXlsx = () => {
    const data = rows.map(r => {
      const o: any = {};
      COLUMNS.forEach(c => {
        if (c.key === "growthChart") {
          const g = computeDailyGrowth(r.snapshots);
          o["Daily Growth (subs/day)"] = g ? g.perDay : "";
        } else if (c.key === "lastVideo") {
          o["Last Video Title"] = r.lastVideoTitle;
          o["Last Video Date"] = r.lastVideoDate;
          o["Last Video URL"] = r.lastVideoUrl;
        } else {
          o[c.label] = (r as any)[c.key];
        }
      });
      o["Channel Description"] = r.channelDescription;
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prospects");
    XLSX.writeFile(wb, `prospects-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const downloadTemplate = () => {
    const headers: any = {};
    COLUMNS.forEach(c => {
      if (c.key === "growthChart" || c.key === "lastVideo") return;
      headers[c.label] = "";
    });
    headers["Channel Description"] = "";
    const ws = XLSX.utils.json_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "prospects-template.xlsx");
  };

  // Compute filterable distinct values per select column
  const distinctFor = (key: string) => {
    const col = COLUMNS.find(c => c.key === key);
    if (!col || col.type !== "select") return [];
    return col.options ? [...col.options] : Array.from(new Set(rows.map(r => String((r as any)[key] ?? ""))));
  };

  // Get cell raw value for filtering/sorting
  const cellValue = (r: Prospect, key: string): string => {
    if (key === "lastVideo") return r.lastVideoDate || "";
    if (key === "growthChart") {
      const g = computeDailyGrowth(r.snapshots);
      return g ? String(g.perDay) : "";
    }
    return String((r as any)[key] ?? "");
  };

  // Compile formula once
  const formulaFn = useMemo(() => {
    if (!formulaExpr.trim()) { setFormulaError(null); return null; }
    try {
      // Available vars in formula:
      // subs, views, status, sales, country, name, email, channel, hasConv, convCount, daysSinceVideo, joinedYear
      // Examples: subs > 10000 && status == "Interested"
      //           hasConv && country == "US"
      //           daysSinceVideo > 30
      // eslint-disable-next-line no-new-func
      const fn = new Function("ctx", `with(ctx){ return (${formulaExpr}); }`);
      setFormulaError(null);
      return fn as (ctx: any) => any;
    } catch (e: any) {
      setFormulaError(e.message);
      return null;
    }
  }, [formulaExpr]);

  const buildCtx = (r: Prospect) => {
    const cc = convCounts[r.id] || 0;
    const ds = daysAgo(r.lastVideoDate);
    return {
      subs: Number(r.subscribersLive) || 0,
      views: Number(r.totalViews) || 0,
      status: r.status, sales: r.sales, country: r.country,
      name: r.clientName, email: r.email, channel: r.channelName,
      hasConv: cc > 0, convCount: cc,
      daysSinceVideo: ds == null ? 99999 : ds,
      joinedYear: r.channelJoined ? Number(r.channelJoined.slice(0, 4)) : 0,
      amount: Number(r.paymentAmount) || 0,
      product: r.productName,
    };
  };

  const filteredSorted = useMemo(() => {
    let out = rows;
    // Search is applied server-side via search_text ilike. Skip client filter here.

    if (onlyWithConv) {
      out = out.filter(r => (convCounts[r.id] || 0) > 0);
    }
    if (sourceFilter === "prospects") {
      out = out.filter(r => !r.autoDiscovered);
    } else if (sourceFilter === "discovered") {
      out = out.filter(r => !!r.autoDiscovered);
    }
    if (formulaFn) {
      out = out.filter(r => {
        try { return !!formulaFn(buildCtx(r)); } catch { return false; }
      });
    }
    // Apply per-column filters
    for (const [key, f] of Object.entries(filters)) {
      if (!f) continue;
      out = out.filter(r => {
        const v = cellValue(r, key);
        if (f.search && !v.toLowerCase().includes(f.search.toLowerCase())) return false;
        if (f.values && f.values.length && !f.values.includes(v)) return false;
        const col = COLUMNS.find(c => c.key === key);
        const isDate = col?.type === "date" || key === "lastVideo";
        const isNum = col?.type === "number" || key === "growthChart";
        if (isNum) {
          const n = Number(v);
          if (f.min && (isNaN(n) || n < Number(f.min))) return false;
          if (f.max && (isNaN(n) || n > Number(f.max))) return false;
        } else if (isDate) {
          if (f.min && (!v || v < f.min)) return false;
          if (f.max && (!v || v > f.max)) return false;
        }
        return true;
      });
    }
    // Apply sort (first sort key found wins)
    const sortKey = Object.entries(filters).find(([, f]) => f?.sort);
    if (sortKey) {
      const [k, f] = sortKey;
      const col = COLUMNS.find(c => c.key === k);
      const isNum = col?.type === "number" || k === "growthChart";
      const isDate = col?.type === "date" || k === "lastVideo";
      const dir = f!.sort === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        if (prospectsFirst) {
          const ad = a.autoDiscovered ? 1 : 0;
          const bd = b.autoDiscovered ? 1 : 0;
          if (ad !== bd) return ad - bd;
        }
        const va = cellValue(a, k);
        const vb = cellValue(b, k);
        if (isNum) return ((Number(va) || 0) - (Number(vb) || 0)) * dir;
        if (isDate) return ((va ? +new Date(va) : 0) - (vb ? +new Date(vb) : 0)) * dir;
        return va.localeCompare(vb) * dir;
      });
    }

    return out;
  }, [rows, search, filters, formulaFn, onlyWithConv, convCounts, sourceFilter, prospectsFirst]);

  const allVisibleSelected = filteredSorted.length > 0 && filteredSorted.every(r => selected.has(r.id));
  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected(prev => {
        const n = new Set(prev);
        filteredSorted.forEach(r => n.delete(r.id));
        return n;
      });
    } else {
      setSelected(prev => {
        const n = new Set(prev);
        filteredSorted.forEach(r => n.add(r.id));
        return n;
      });
    }
  };

  // Select every prospect ID that matches the current search & source tab,
  // across all pages (not just the visible 200). For the conversations-only
  // toggle we already have the full set in `rows`, so just use that.
  const selectAllMatching = async () => {
    if (selectingAll) return;
    setSelectingAll(true);
    try {
      if (onlyWithConv) {
        setSelected(prev => {
          const n = new Set(prev);
          filteredSorted.forEach(r => n.add(r.id));
          return n;
        });
        toast({ title: `Selected ${filteredSorted.length.toLocaleString()} rows` });
        return;
      }
      const ids: string[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        let q: any = supabase
          .from("prospects")
          .select("id")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (debouncedSearch) q = q.ilike("search_text", `%${debouncedSearch}%`);
        if (sourceFilter === "banned") q = q.eq("is_banned", true); else q = q.eq("is_banned", false);
        if (sourceFilter === "discovered") q = q.eq("auto_discovered", true);
        else if (sourceFilter === "prospects") {
          q = q.eq("auto_discovered", false)
               .or("channel_name.neq.,subscribers_live.gte.500");
        } else if (sourceFilter === "unqualified") {
          q = q.eq("auto_discovered", false)
               .eq("channel_name", "")
               .or("subscribers_live.lt.500,subscribers_live.is.null");
        }
        const { data, error } = await q;
        if (error) throw error;
        const batch = (data || []) as { id: string }[];
        ids.push(...batch.map(x => x.id));
        if (batch.length < PAGE) break;
        from += PAGE;
        if (ids.length > 100_000) break; // hard safety cap
      }
      setSelected(prev => {
        const n = new Set(prev);
        ids.forEach(id => n.add(id));
        return n;
      });
      toast({ title: `Selected ${ids.length.toLocaleString()} matching rows` });
    } catch (e: any) {
      toast({ title: "Select all failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSelectingAll(false);
    }
  };

  const selectPickedRows = async () => {
    const count = pickCount === "" ? 0 : parseInt(pickCount, 10) || 0;
    if (count <= 0) { toast({ title: "Enter a number to select" }); return; }
    const useVisibleOnly = onlyWithConv || Object.keys(filters).length > 0 || !!formulaExpr.trim();
    if (useVisibleOnly || count <= filteredSorted.length) {
      const pool = filteredSorted;
      if (!pool.length) { toast({ title: "No rows to select" }); return; }
      let picked: typeof pool = [];
      if (pickMode === "first") picked = pool.slice(0, count);
      else if (pickMode === "last") picked = pool.slice(-count);
      else if (pickMode === "every") {
        for (let i = 0; i < pool.length; i += Math.max(1, count)) picked.push(pool[i]);
      } else {
        const idxs = pool.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, count);
        picked = idxs.map(i => pool[i]);
      }
      setSelected(prev => {
        const n = new Set(prev);
        picked.forEach(r => n.add(r.id));
        return n;
      });
      toast({ title: `Selected ${picked.length} row${picked.length === 1 ? "" : "s"}` });
      return;
    }

    setSelectingAll(true);
    try {
      const ids: string[] = [];
      const PAGE = 1000;
      let from = 0;
      const ascending = pickMode === "last";
      while (true) {
        let q: any = supabase
          .from("prospects")
          .select("id")
          .order("created_at", { ascending })
          .range(from, from + PAGE - 1);
        if (debouncedSearch) q = q.ilike("search_text", `%${debouncedSearch}%`);
        if (sourceFilter === "banned") q = q.eq("is_banned", true); else q = q.eq("is_banned", false);
        if (sourceFilter === "discovered") q = q.eq("auto_discovered", true);
        else if (sourceFilter === "prospects") {
          q = q.eq("auto_discovered", false)
               .or("channel_name.neq.,subscribers_live.gte.500");
        } else if (sourceFilter === "unqualified") {
          q = q.eq("auto_discovered", false)
               .eq("channel_name", "")
               .or("subscribers_live.lt.500,subscribers_live.is.null");
        }
        const { data, error } = await q;
        if (error) throw error;
        const batch = ((data || []) as { id: string }[]).map(x => x.id);
        ids.push(...batch);
        if ((pickMode === "first" || pickMode === "last") && ids.length >= count) break;
        if (batch.length < PAGE) break;
        from += PAGE;
        if (ids.length > 100_000) break;
      }
      let pickedIds: string[] = [];
      if (pickMode === "first" || pickMode === "last") pickedIds = ids.slice(0, count);
      else if (pickMode === "every") {
        for (let i = 0; i < ids.length; i += Math.max(1, count)) pickedIds.push(ids[i]);
      } else {
        pickedIds = ids.sort(() => Math.random() - 0.5).slice(0, count);
      }
      setSelected(prev => {
        const n = new Set(prev);
        pickedIds.forEach(id => n.add(id));
        return n;
      });
      toast({ title: `Selected ${pickedIds.length.toLocaleString()} row${pickedIds.length === 1 ? "" : "s"}` });
    } catch (e: any) {
      toast({ title: "Select failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSelectingAll(false);
    }
  };


  const copyRow = async (r: Prospect) => {
    const v = r.recentVideos || [];
    const vidBlock = (i: number) => {
      const x = v[i];
      const fallbackTitle = i === 0 ? r.lastVideoTitle : "";
      const fallbackUrl = i === 0 ? r.lastVideoUrl : "";
      return `Latest video ${i + 1} - name: ${x?.title || fallbackTitle || ""}
Latest video ${i + 1} - link: ${x?.url || fallbackUrl || ""}
Latest video ${i + 1} - Description: ${x?.description || ""}`;
    };
    const text =
`Channel Name - ${r.channelName || ""}
Channel link - ${r.channelLink || ""}
Channel Description - ${r.channelDescription || ""}
Country - ${r.country || ""}
Joined date - ${r.channelJoined || ""}
Email id - ${r.email || ""}
Subscriber - ${r.subscribersLive || ""}
Total views - ${r.totalViews || ""}
${vidBlock(0)}
${vidBlock(1)}
${vidBlock(2)}`;
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied full summary to clipboard" });
  };


  // Block bulk copy/drag on table
  const blockCopy = (e: React.SyntheticEvent) => {
    e.preventDefault();
    toast({ title: "Bulk copy disabled", description: "Use the row copy button instead." });
  };

  // ---- Pagination ----
  // Server-side when no client filters: `rows` is already one page.
  // Client-side when column filters / formula / onlyWithConv: `rows` has
  // every matching row and we slice `filteredSorted` per page.
  const clientPaging = hasColumnFilters || onlyWithConv;
  const total = clientPaging ? filteredSorted.length : serverTotal;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(currentPage, Math.max(0, totalPages - 1));
  const startIdx = safePage * PAGE_SIZE;
  const endIdx = clientPaging
    ? Math.min(total, startIdx + PAGE_SIZE)
    : Math.min(total, startIdx + filteredSorted.length);
  const visibleRows = clientPaging ? filteredSorted.slice(startIdx, startIdx + PAGE_SIZE) : filteredSorted;

  // Reset to first page when non-sort filter values change. Pure sort changes
  // preserve the current page so the user can keep paginating with the sort applied.
  const prevFiltersRef = useRef<typeof filters>(filters);
  useEffect(() => {
    const prev = prevFiltersRef.current || {};
    prevFiltersRef.current = filters;
    const keys = new Set<string>([...Object.keys(prev), ...Object.keys(filters)]);
    let nonSortChanged = false;
    for (const k of keys) {
      const a: any = (prev as any)[k] || {};
      const b: any = (filters as any)[k] || {};
      if (
        a.search !== b.search ||
        a.min !== b.min ||
        a.max !== b.max ||
        JSON.stringify(a.values || []) !== JSON.stringify(b.values || [])
      ) { nonSortChanged = true; break; }
    }
    if (nonSortChanged) setCurrentPage(0);
  }, [filters]);
  useEffect(() => { setCurrentPage(0); }, [formulaExpr, onlyWithConv, sourceFilter]);

  // ---- Row virtualization ----
  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 34,
    overscan: 12,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;



  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Helmet><title>Prospects | SwishView</title><meta name="robots" content="noindex" /></Helmet>

      <div className="border-b border-border bg-card shrink-0 z-30">

        <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold">Prospects</h1>
          <span className="text-sm text-muted-foreground">
            {loading ? "loading…" : `${total.toLocaleString()} total${debouncedSearch ? " · filtered" : ""}`}
          </span>


          {selected.size > 0 && (
            <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5">
              <span className="text-[11px] text-muted-foreground px-1">{selected.size.toLocaleString()} selected</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setBulkEditOpen(true)} title="Bulk edit">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={openBulkAI}
                title="Bulk email outreach (template + AI)"
              >
                <Wand2 className="h-3.5 w-3.5 text-primary" />
              </Button>
              {isAdmin && sourceFilter !== "banned" && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-destructive hover:text-destructive" onClick={() => banSelected()} title="Move selected straight to Banned Leads">
                  Ban
                </Button>
              )}
              {isAdmin && sourceFilter === "banned" && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => unbanSelected()} title="Restore from banned">
                  Unban
                </Button>
              )}
            </div>
          )}
          {total > selected.size && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              disabled={selectingAll || loading}
              onClick={selectAllMatching}
              title="Select every row matching the current search & tab (across all pages)"
            >
              {selectingAll ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Selecting…</> : `Select all ${total.toLocaleString()} matching`}
            </Button>
          )}
          <SelectFirstN
            onSelect={async (n) => {
              // Fast path: already loaded enough rows in the visible page.
              if (n <= filteredSorted.length) {
                const ids = filteredSorted.slice(0, n).map(r => r.id);
                setSelected(prev => {
                  const next = new Set(prev);
                  ids.forEach(id => next.add(id));
                  return next;
                });
                toast({ title: `Selected first ${ids.length} row${ids.length === 1 ? "" : "s"}` });
                return;
              }
              // Need to reach further than the loaded page — page through DB.
              setSelectingAll(true);
              try {
                const ids: string[] = [];
                const PAGE = 1000;
                let from = 0;
                while (ids.length < n) {
                  let q: any = supabase
                    .from("prospects")
                    .select("id")
                    .order("created_at", { ascending: false })
                    .range(from, from + PAGE - 1);
                  if (debouncedSearch) q = q.ilike("search_text", `%${debouncedSearch}%`);
                  if (sourceFilter === "banned") q = q.eq("is_banned", true); else q = q.eq("is_banned", false);
                  if (sourceFilter === "discovered") q = q.eq("auto_discovered", true);
                  else if (sourceFilter === "prospects") {
                    q = q.eq("auto_discovered", false)
                         .or("channel_name.neq.,subscribers_live.gte.500");
                  } else if (sourceFilter === "unqualified") {
                    q = q.eq("auto_discovered", false)
                         .eq("channel_name", "")
                         .or("subscribers_live.lt.500,subscribers_live.is.null");
                  }
                  const { data, error } = await q;
                  if (error) throw error;
                  const batch = ((data || []) as { id: string }[]).map(x => x.id);
                  ids.push(...batch);
                  if (batch.length < PAGE) break;
                  from += PAGE;
                }
                const pickedIds = ids.slice(0, n);
                setSelected(prev => {
                  const next = new Set(prev);
                  pickedIds.forEach(id => next.add(id));
                  return next;
                });
                toast({ title: `Selected first ${pickedIds.length.toLocaleString()} row${pickedIds.length === 1 ? "" : "s"}` });
              } catch (e: any) {
                toast({ title: "Select failed", description: e?.message || String(e), variant: "destructive" });
              } finally {
                setSelectingAll(false);
              }
            }}
            max={total || filteredSorted.length}
          />





          <div className="relative flex-1 max-w-xl ml-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all pages..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 w-full"
            />
          </div>

          {/* Minimal admin badge — only shown for admins; employees get nothing */}
          {isAdmin && (
            <div className="inline-flex items-center gap-1.5 h-9 px-2 rounded-md border border-border text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="font-medium text-primary">Admin</span>
              <span className="hidden lg:inline text-muted-foreground truncate max-w-[160px]">· {authedEmail}</span>
              <button
                onClick={() => setPermsDialogOpen(true)}
                className="ml-1 text-muted-foreground hover:text-foreground"
                title="Sales rep permissions"
              >⚙</button>
              <button
                onClick={() => setResetPwOpen(true)}
                className="ml-1 text-muted-foreground hover:text-foreground"
                title="Reset user password"
              >🔑</button>
            </div>
          )}


          {/* Admin-only data sheet import */}
          {isAdmin && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.target.value = "";
                }}
              />
              <Button
                size="icon" variant="ghost" className="h-9 w-9"
                onClick={() => importInputRef.current?.click()}
                title="Import data sheet (.xlsx, .csv) — auto-detects columns"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </>
          )}

          {isAdmin && (
            <Button
              size="icon" variant="ghost" className="h-9 w-9"
              onClick={dedupe}
              title="Remove duplicate rows (same email)"
            >
              <CopyMinus className="h-4 w-4" />
            </Button>
          )}

          {isAdmin && (
            <Button
              size="icon" variant="ghost" className="h-9 w-9"
              onClick={() => setTestDraftOpen(true)}
              title="Test draft — generate & email test drafts to any inbox"
            >
              <FlaskConical className="h-4 w-4" />
            </Button>
          )}

          <Button
            size="icon" variant="ghost" className="h-9 w-9"
            onClick={() => setSendQueueOpen(true)}
            title="Send Queue — view scheduled outreach emails on the server"
          >
            <Inbox className="h-4 w-4" />
          </Button>


          {isAdmin && <MailSyncStatus />}
          {(convLoading || convProgress.total > 0 && convProgress.done < convProgress.total) && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              Syncing conv {convProgress.done}/{convProgress.total}
            </span>
          )}
          <Button
            size="sm"
            variant={syncing ? "secondary" : "outline"}
            className="h-9 px-2.5 gap-1.5"
            onClick={syncAll}
            title={
              syncing
                ? `Click to cancel${syncStatus.lastChannel ? ` · Last: ${syncStatus.lastChannel}` : ""}${syncStatus.ratePerMin ? ` · ${syncStatus.ratePerMin}/min` : ""}${syncStatus.recentError ? ` · Recent error: ${syncStatus.recentError}` : ""}`
                : "Fetch fresh YouTube data for every row that hasn't been refreshed today"
            }
          >
            {syncing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="text-xs">
              {syncing ? `Fetching ${syncProgress.done}/${syncProgress.total}` : "Fetch"}
            </span>
          </Button>
          {syncing && syncProgress.total > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden" title={`${Math.round((syncProgress.done/syncProgress.total)*100)}%`}>
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.round((syncProgress.done / Math.max(1, syncProgress.total)) * 100))}%` }}
                />
              </div>
              <div className="text-[10px] leading-tight text-muted-foreground max-w-[200px] truncate" title={syncStatus.recentError || syncStatus.lastChannel || ""}>
                {syncStatus.recentError
                  ? <span className="text-destructive">⚠ {syncStatus.recentError}</span>
                  : syncStatus.lastChannel
                    ? <>↳ {syncStatus.lastChannel}{syncStatus.ratePerMin ? ` · ${syncStatus.ratePerMin}/min` : ""}</>
                    : "Starting…"}
              </div>
            </div>
          )}

          {/* Source tabs — Prospect List + Unqualified are visible to everyone;
              Workspace Contacts + Banned Leads stay admin-only. */}
          <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={sourceFilter === "prospects"}
              onClick={() => setSourceFilter("prospects")}
              className={`px-2.5 h-7 text-xs rounded ${sourceFilter === "prospects" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
              title="Qualified prospect rows"
            >
              Prospect List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sourceFilter === "unqualified"}
              onClick={() => setSourceFilter("unqualified")}
              className={`px-2.5 h-7 text-xs rounded ${sourceFilter === "unqualified" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "text-muted-foreground hover:bg-accent/50"}`}
              title="Rows with no channel name and fewer than 500 subscribers"
            >
              Unqualified
            </button>
            {isAdmin && (
              <button
                type="button"
                role="tab"
                aria-selected={sourceFilter === "discovered"}
                onClick={() => setSourceFilter("discovered")}
                className={`px-2.5 h-7 text-xs rounded ${sourceFilter === "discovered" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
                title="Not on the prospect list but Workspace emails have been sent to them"
              >
                Workspace Contacts
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                role="tab"
                aria-selected={sourceFilter === "banned"}
                onClick={() => setSourceFilter("banned")}
                className={`px-2.5 h-7 text-xs rounded ${sourceFilter === "banned" ? "bg-destructive/15 text-destructive" : "text-muted-foreground hover:bg-accent/50"}`}
                title="Banned leads (incorrect email, bounced, deleted channel, etc.)"
              >
                Banned Leads
              </button>
            )}
          </div>


          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" title="Show/hide columns">
                Columns
                {hiddenCols.size > 0 && <span className="text-[10px] text-muted-foreground">({COLUMNS.length - hiddenCols.size}/{COLUMNS.length})</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 pb-1.5 flex items-center justify-between">
                <span>Columns</span>
                {hiddenCols.size > 0 && (
                  <button className="text-primary hover:underline normal-case" onClick={() => setHiddenCols(new Set())}>
                    Show all
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-auto">
                {COLUMNS.map(col => {
                  const key = col.key as string;
                  const visible = !hiddenCols.has(key);
                  return (
                    <label key={key} className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent cursor-pointer">
                      <Checkbox checked={visible} onCheckedChange={() => toggleColumn(key)} />
                      <span className="flex-1">{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>


          <Button
            size="icon" variant="ghost" className="h-9 w-9"
            onClick={addRow}
            title="Add row"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {role && (
            <Button size="icon" variant="ghost" onClick={signOut} className="h-9 w-9 ml-1" title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          )}





        </div>


        {/* Minimal formula bar — admin only */}
        {isAdmin && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFormulaOpen(o => !o)}
            className={`h-6 px-1.5 rounded text-[11px] font-mono ${formulaExpr || formulaOpen ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
            title="Formula filter"
          >
            ƒx{formulaExpr ? " •" : ""}
          </button>
          {formulaOpen && (
            <>
              <Input
                placeholder='subs > 10000 && status == "Interested"'
                value={formulaExpr}
                onChange={e => setFormulaExpr(e.target.value)}
                className="h-7 text-xs font-mono flex-1 max-w-2xl"
                autoFocus
              />
              {formulaExpr && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={!formulaFn}
                  onClick={() => {
                    if (!formulaFn) {
                      toast({ title: "Invalid formula", description: formulaError || "Check syntax", variant: "destructive" });
                      return;
                    }
                    const matches = rows.filter(r => {
                      try { return !!formulaFn(buildCtx(r)); } catch { return false; }
                    });
                    if (!matches.length) { toast({ title: "No rows match the formula" }); return; }
                    setSelected(prev => {
                      const n = new Set(prev);
                      matches.forEach(r => n.add(r.id));
                      return n;
                    });
                    toast({ title: `Selected ${matches.length} matching row${matches.length === 1 ? "" : "s"}` });
                  }}
                >
                  Select matching
                </Button>
              )}
              {formulaExpr && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setFormulaExpr("")}>Clear</Button>
              )}
              {formulaError && <span className="text-[11px] text-destructive">{formulaError}</span>}
            </>
          )}
          {!formulaOpen && formulaExpr && (
            <span className="text-[11px] text-muted-foreground font-mono truncate max-w-md">{formulaExpr}</span>
          )}
          {/* Quick row picker */}
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Pick</span>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pickCount}
              onChange={e => {
                const digits = e.target.value.replace(/\D+/g, "");
                setPickCount(digits);
              }}
              className="h-7 w-16 text-xs"
            />
            <select
              value={pickMode}
              onChange={e => setPickMode(e.target.value as any)}
              className="h-7 rounded-md border border-input bg-background px-1 text-xs"
              title="Selection pattern"
            >
              <option value="first">First N</option>
              <option value="last">Last N</option>
              <option value="every">Every Nth (alt.)</option>
              <option value="random">Random N</option>
            </select>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={selectingAll}
              onClick={selectPickedRows}
            >
              {selectingAll ? "Selecting…" : "Select"}
            </Button>
          </div>
        </div>
        )}
      </div>


      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto select-none thin-scrollbar"

        onCopy={blockCopy}
        onCut={blockCopy}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <table
          className="border-collapse text-xs"
          style={{ minWidth: visibleColumns.reduce((s, c) => s + c.width, 80) + 80 }}
        >
          <thead className="sticky top-0 z-20 bg-muted">
            <tr>
              <th className="border border-border px-2 py-1.5 sticky left-0 z-30 bg-muted w-10 text-center">
                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} />
              </th>
              <th className="border border-border px-2 py-1.5 sticky left-10 z-30 bg-muted w-10 text-center font-semibold">#</th>
              {visibleColumns.map(col => (
                <th
                  key={col.key as string}
                  className="border border-border px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                  style={{ width: col.width, minWidth: col.width }}
                >
                  <ColumnHeader
                    col={col}
                    filter={filters[col.key as string]}
                    setFilter={(f) => setFilters(prev => {
                      const n = { ...prev };
                      if (f) n[col.key as string] = f; else delete n[col.key as string];
                      return n;
                    })}
                    distinctValues={distinctFor(col.key as string)}
                    extraToggle={col.type === "emails" ? {
                      label: "Only rows with conversations",
                      checked: onlyWithConv,
                      onChange: setOnlyWithConv,
                      count: Object.values(convCounts).filter(n => (n || 0) > 0).length,
                      onSync: () => refreshConversations(false, true),
                      syncing: convLoading,
                    } : undefined}
                  />

                </th>
              ))}
              <th className="border border-border px-2 py-1.5 w-28 text-center bg-muted sticky right-0 z-30">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 3} className="text-center py-16 text-muted-foreground">
                  {loading ? "Loading…" : <>No prospects. Click <strong>Add Row</strong>.</>}
                </td>
              </tr>
            )}
            {paddingTop > 0 && (
              <tr aria-hidden style={{ height: paddingTop }}>
                <td colSpan={visibleColumns.length + 3} style={{ padding: 0, border: 0 }} />
              </tr>
            )}
            {virtualItems.map((virtualRow) => {
              const row = visibleRows[virtualRow.index];
              if (!row) return null;
              const idx = startIdx + virtualRow.index;
              return (
              <tr key={row.id} className={`hover:bg-muted/30 ${row.autoDiscovered ? "bg-amber-50/60 dark:bg-amber-950/20 border-l-2 border-amber-400" : ""}`} style={{ height: 34 }} title={row.autoDiscovered ? "Auto-discovered from Google Workspace conversations" : undefined}>


                <td className="border border-border px-2 py-1 sticky left-0 bg-background text-center">
                  <Checkbox
                    checked={selected.has(row.id)}
                    onCheckedChange={(c) => {
                      setSelected(prev => {
                        const n = new Set(prev);
                        if (c) n.add(row.id); else n.delete(row.id);
                        return n;
                      });
                    }}
                  />
                </td>
                <td className="border border-border px-2 py-1 sticky left-10 bg-background text-center text-muted-foreground">{idx + 1}</td>
                {visibleColumns.map(col => {
                  if (col.type === "emails") {
                    const cc = convCounts[row.id] || 0;
                    
                    return (
                      <td key="emailHistory" className="border border-border p-0 text-center relative" style={{ width: col.width, minWidth: col.width }}>
                        <ProspectEmails
                          emails={[row.email, row.altEmail]}
                          clientName={row.clientName || row.channelName}
                          prospect={row}
                        />
                        {cc > 0 && (
                          <span className="absolute top-0.5 right-0.5 text-[9px] bg-primary text-primary-foreground rounded px-1">{cc}</span>
                        )}
                      </td>
                    );
                  }

                  if (col.type === "growth") {

                    const g = computeDailyGrowth(row.snapshots);
                    const sortedSnaps = [...(row.snapshots || [])].sort((a, b) => a.date.localeCompare(b.date));
                    const chartData = sortedSnaps.map((s, i) => {
                      const prev = sortedSnaps[i - 1];
                      const delta = prev ? s.subscribers - prev.subscribers : 0;
                      return { date: s.date.slice(5), subs: s.subscribers, delta };
                    });
                    const headline = g?.perDay ?? 0;
                    return (
                      <td key="growthChart" className="border border-border p-0 text-center" style={{ width: col.width, minWidth: col.width }}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="w-full h-7 px-2 inline-flex items-center justify-between gap-1 hover:bg-accent text-xs"
                              title={g ? `1d ${g.last1d ?? "—"} · 7d avg ${g.avg7d ?? "—"} · 30d avg ${g.avg30d ?? "—"} · total ${g.total >= 0 ? "+" : ""}${g.total} over ${g.days}d` : "No snapshots yet"}
                            >
                              <span className="inline-flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-primary" />
                                {g && sortedSnaps.length >= 2 ? (
                                  <span className={headline >= 0 ? "text-green-600" : "text-red-600"}>
                                    {headline >= 0 ? "+" : ""}{fmtCompact(headline)}/d
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </span>
                              <span className="text-muted-foreground text-[10px]">{sortedSnaps.length}d</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[22rem] p-3" align="start">
                            <div className="text-sm font-semibold mb-2">{row.channelName || "Channel"} – Subscriber Growth</div>
                            {chartData.length < 2 ? (
                              <div className="text-xs text-muted-foreground py-6 text-center">
                                Not enough data yet. Daily sync builds this graph over time.
                              </div>
                            ) : (
                              <>
                                {g && (
                                  <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                                    {[
                                      { label: "1d", val: g.last1d },
                                      { label: "7d avg", val: g.avg7d },
                                      { label: "30d avg", val: g.avg30d },
                                      { label: `${g.days}d total`, val: g.total },
                                    ].map(({ label, val }) => (
                                      <div key={label} className="rounded border border-border bg-muted/30 px-1.5 py-1">
                                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
                                        <div className={`text-xs font-semibold ${val == null ? "text-muted-foreground" : (val >= 0 ? "text-green-600" : "text-red-600")}`}>
                                          {val == null ? "—" : `${val >= 0 ? "+" : ""}${fmtCompact(val)}`}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {g && (
                                  <div className="flex justify-between text-[10px] text-muted-foreground mb-2 px-0.5">
                                    <span>Total growth: <span className={g.pct >= 0 ? "text-green-600" : "text-red-600"}>{g.pct >= 0 ? "+" : ""}{g.pct}%</span></span>
                                    <span>Views/day avg: {fmtCompact(g.viewsPerDay)}</span>
                                  </div>
                                )}
                                <div className="h-36">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                      <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtCompact} width={40} />
                                      <Tooltip
                                        formatter={(v: any, name: any, p: any) => {
                                          if (name === "subs") return [fmtCompact(Number(v)), "Subs"];
                                          return [fmtCompact(Number(v)), name];
                                        }}
                                        labelFormatter={(label: any, payload: any) => {
                                          const d = payload?.[0]?.payload;
                                          if (!d) return label;
                                          const delta = d.delta || 0;
                                          const sign = delta >= 0 ? "+" : "";
                                          return `${label}  ·  ${sign}${fmtCompact(delta)} vs prev`;
                                        }}
                                      />
                                      <Line type="monotone" dataKey="subs" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </>
                            )}
                          </PopoverContent>
                        </Popover>
                      </td>
                    );
                  }

                  if (col.type === "video") {
                    const da = daysAgo(row.lastVideoDate);
                    return (
                      <td key="lastVideo" className="border border-border p-0" style={{ width: col.width, minWidth: col.width }}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="w-full h-7 px-2 inline-flex items-center gap-2 hover:bg-accent text-xs text-left">
                              <Video className="h-3 w-3 text-primary shrink-0" />
                              {row.lastVideoDate ? (
                                <>
                                  <span className="truncate flex-1">{row.lastVideoTitle || "Untitled"}</span>
                                  <span className="text-muted-foreground text-[10px] shrink-0">{fmtDate(row.lastVideoDate)}</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3" align="start">
                            {row.lastVideoDate ? (
                              <>
                                {row.lastVideoThumb && (
                                  <img src={row.lastVideoThumb} alt="" className="w-full rounded mb-2 object-cover aspect-video" />
                                )}
                                <div className="text-sm font-semibold line-clamp-2">{row.lastVideoTitle}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Released <strong>{fmtDate(row.lastVideoDate)}</strong>
                                  {da != null && <> · {da} day{da === 1 ? "" : "s"} ago</>}
                                </div>
                                {row.lastVideoUrl && (
                                  <a href={row.lastVideoUrl} target="_blank" rel="noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                    Open on YouTube <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </>
                            ) : (
                              <div className="text-xs text-muted-foreground py-4 text-center">No video data yet.</div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </td>
                    );
                  }

                  const val = (row as any)[col.key] ?? "";
                  if (col.type === "email") {
                    return (
                      <td key={col.key as string} className="border border-border p-0" style={{ width: col.width, minWidth: col.width }}>
                        <EmailCell value={val} onChange={(v) => updateCell(row.id, col.key as keyof Prospect, v)} />
                      </td>
                    );
                  }
                  if (col.type === "select") {
                    return (
                      <td key={col.key as string} className="border border-border p-0" style={{ width: col.width, minWidth: col.width }}>
                        <select
                          value={val}
                          onChange={e => updateCell(row.id, col.key as keyof Prospect, e.target.value)}
                          className="w-full h-7 px-1 bg-transparent border-0 outline-none focus:bg-accent text-xs"
                        >
                          {col.options?.map(opt => (
                            <option key={opt} value={opt}>{opt || "—"}</option>
                          ))}
                        </select>
                      </td>
                    );
                  }
                  if (col.type === "image") {
                    return (
                      <td key={col.key as string} className="border border-border p-1 text-center" style={{ width: col.width, minWidth: col.width }}>
                        {val ? (
                          <img src={val} alt="" className="h-8 w-8 rounded mx-auto object-cover" draggable={false} />
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </td>
                    );
                  }
                  if (col.type === "url") {
                    return (
                      <td key={col.key as string} className="border border-border p-0 relative" style={{ width: col.width, minWidth: col.width }}>
                        <input
                          value={val}
                          onChange={e => updateCell(row.id, col.key as keyof Prospect, e.target.value)}
                          className="w-full h-7 px-1 pr-5 bg-transparent border-0 outline-none focus:bg-accent text-xs"
                          placeholder="Paste YT channel or video URL"
                        />
                        {val && (
                          <a href={val} target="_blank" rel="noreferrer" className="absolute right-1 top-1/2 -translate-y-1/2 text-primary">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    );
                  }
                  return (
                    <td key={col.key as string} className="border border-border p-0" style={{ width: col.width, minWidth: col.width }}>
                      <input
                        value={val}
                        onChange={e => updateCell(row.id, col.key as keyof Prospect, e.target.value)}
                        className="w-full h-7 px-1 bg-transparent border-0 outline-none focus:bg-accent text-xs"
                      />
                    </td>
                  );
                })}
                <td className="border border-border p-1 text-center sticky right-0 bg-background">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      size="sm" variant="ghost" className="h-6 w-6 p-0"
                      title="Refresh YouTube data"
                      disabled={autoFetchingId === row.id}
                      onClick={() => autoFillChannel(row)}
                    >
                      {autoFetchingId === row.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RefreshCw className="h-3 w-3" />}
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-6 w-6 p-0"
                      title="Copy summary"
                      onClick={() => copyRow(row)}
                    >
                      <ClipboardCopy className="h-3 w-3" />
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                        title="Delete"
                        onClick={() => setConfirmDelete({ ids: [row.id] })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden style={{ height: paddingBottom }}>
                <td colSpan={visibleColumns.length + 3} style={{ padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="border-t border-border bg-card px-4 py-1.5 flex items-center justify-between text-[11px] shrink-0">
        <div className="text-muted-foreground">
          {total === 0 ? "0 rows" : (
            <>
              Showing <strong>{startIdx + 1}</strong>–<strong>{endIdx}</strong> of <strong>{total.toLocaleString()}</strong>
              {(hasColumnFilters || onlyWithConv) && <> filtered (of <strong>{serverTotal.toLocaleString()}</strong> total)</>}
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent disabled:opacity-30"
            disabled={safePage === 0}
            onClick={() => setCurrentPage(0)}
            title="First page"
          >«</button>
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent disabled:opacity-30"
            disabled={safePage === 0}
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            title="Previous"
          >‹</button>
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={safePage + 1}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) setCurrentPage(Math.max(0, Math.min(totalPages - 1, v - 1)));
            }}
            className="h-6 w-14 text-center text-[11px] px-1"
          />
          <span className="text-muted-foreground">/ {totalPages}</span>
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent disabled:opacity-30"
            disabled={safePage >= totalPages - 1}
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            title="Next"
          >›</button>
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent disabled:opacity-30"
            disabled={safePage >= totalPages - 1}
            onClick={() => setCurrentPage(totalPages - 1)}
            title="Last page"
          >»</button>
        </div>
      </div>



      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {confirmDelete?.ids.length || 0} prospect{confirmDelete?.ids.length === 1 ? "" : "s"}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirmDelete) await deleteRows(confirmDelete.ids);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk edit {selected.size} row{selected.size === 1 ? "" : "s"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Column</label>
              <select
                value={bulkField}
                onChange={e => { setBulkField(e.target.value); setBulkValue(""); }}
                className="w-full h-9 px-2 bg-background border border-border rounded text-sm"
              >
                {COLUMNS.filter(c => !["growthChart", "lastVideo", "emailHistory", "ytCapture"].includes(c.key as string)).map(c => (
                  <option key={c.key as string} value={c.key as string}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">New value</label>
              {(() => {
                const c = COLUMNS.find(c => c.key === bulkField);
                if (c?.type === "select") {
                  return (
                    <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
                      className="w-full h-9 px-2 bg-background border border-border rounded text-sm">
                      {c.options?.map(opt => <option key={opt} value={opt}>{opt || "—"}</option>)}
                    </select>
                  );
                }
                return <Input value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="Value (leave empty to clear)" />;
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: use the <strong>ƒx</strong> formula bar above to filter, then "Select All Matching", then bulk edit.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditOpen(false)}>Cancel</Button>
            <Button onClick={applyBulkEdit}>Apply to {selected.size}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Draft sheet — generate & email AI drafts to any inbox using the bulk AI prompt */}
      <Sheet open={testDraftOpen} onOpenChange={(o) => { if (!testBusy) setTestDraftOpen(o); }}>
        <SheetContent
          side="right"
          className="w-screen sm:max-w-none sm:w-[min(900px,95vw)] p-0 flex flex-col gap-0"
        >
          <SheetHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-primary" /> Test Drafts · {testRows.length} row{testRows.length === 1 ? "" : "s"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Add a recipient email + YouTube channel link per row. We fetch the channel, run the AI prompt above, then email the draft from any Workspace sender.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
            {/* AI prompt — shared with the Bulk AI sheet */}
            <div className="px-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-primary" />
                  AI prompt — used as the full system prompt. Channel data is injected automatically.
                </label>
                <Button
                  size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                  disabled={testBusy}
                  onClick={() => { if (confirm("Clear the AI prompt? Drafts will use the built-in default template.")) setBulkAIPrompt(""); }}
                >Clear</Button>
              </div>
              <textarea
                value={bulkAIPrompt}
                onChange={e => setBulkAIPrompt(e.target.value)}
                disabled={testBusy}
                rows={4}
                placeholder={'Paste your full system prompt here. Leave blank to use the built-in default template.'}
                className="w-full mt-1 rounded-md border border-input bg-background p-2 text-xs font-mono leading-relaxed resize-y min-h-[80px] max-h-[140px] overflow-auto"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {bulkAIPrompt.trim().length > 0
                  ? `Custom prompt active · ${bulkAIPrompt.length.toLocaleString()} chars.`
                  : "Using the built-in default template."}
              </p>
            </div>

            {/* Plain template (no AI) — shared with the Bulk AI sheet */}
            <div className="px-1 border-t border-border pt-3 mt-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Plain template (no AI) — variables: <code className="text-[10px]">{"{{FIRST_NAME}}"}</code> <code className="text-[10px]">{"{{CHANNEL_NAME}}"}</code> <code className="text-[10px]">{"{{LATEST_VIDEO}}"}</code> <code className="text-[10px]">{"{{JOINED_DATE}}"}</code> <code className="text-[10px]">{"{{SUBSCRIBERS}}"}</code> <code className="text-[10px]">{"{{TOTAL_VIEWS}}"}</code> <code className="text-[10px]">{"{{DAILY_GROWTH}}"}</code> <code className="text-[10px]">{"{{COUNTRY}}"}</code> <code className="text-[10px]">{"{{LAST_VIDEO_DATE}}"}</code> <code className="text-[10px]">{"{{DAYS_SINCE_VIDEO}}"}</code> <code className="text-[10px]">{"{{CHANNEL_LINK}}"}</code> <code className="text-[10px]">{"{{EMAIL}}"}</code> <code className="text-[10px]">{"{{PRODUCT}}"}</code> <code className="text-[10px]">{"{{STATUS}}"}</code> <code className="text-[10px]">{"{{SENDER_FIRST_NAME}}"}</code> <code className="text-[10px]">{"{{SENDER_NAME}}"}</code>
                </label>
                <Button
                  size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                  disabled={testBusy}
                  onClick={() => { setBulkTemplateSubject(DEFAULT_TEMPLATE_SUBJECT); setBulkTemplateBody(DEFAULT_TEMPLATE_BODY); }}
                >Reset to default</Button>
              </div>
              <Input
                value={bulkTemplateSubject}
                onChange={e => setBulkTemplateSubject(e.target.value)}
                disabled={testBusy}
                placeholder="Subject template"
                className="h-8 mt-1 text-xs"
              />
              <textarea
                value={bulkTemplateBody}
                onChange={e => setBulkTemplateBody(e.target.value)}
                disabled={testBusy}
                rows={5}
                placeholder="Template body with {{VARIABLES}}…"
                className="w-full mt-1 rounded-md border border-input bg-background p-2 text-xs font-mono leading-relaxed resize-y min-h-[100px] max-h-[180px] overflow-auto"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Click <b>Draft All from Template</b> below to fill test drafts with no AI usage. Missing data falls back to safe defaults.
              </p>
            </div>


            {/* Find / Replace across test drafts */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 px-1 items-end">
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Find in all drafts</label>
                <Input value={bulkFind} onChange={e => setBulkFind(e.target.value)} placeholder="Hey" className="h-8 mt-1" disabled={testBusy} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Replace with</label>
                <Input value={bulkReplace} onChange={e => setBulkReplace(e.target.value)} placeholder="Hi" className="h-8 mt-1" disabled={testBusy} />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!bulkFind || testBusy}
                onClick={() => {
                  let count = 0;
                  setTestRows(prev => prev.map(x => {
                    if (!x.subject && !x.body) return x;
                    const nextSubject = (x.subject || "").split(bulkFind).join(bulkReplace);
                    const nextBody = (x.body || "").split(bulkFind).join(bulkReplace);
                    if (nextSubject !== x.subject || nextBody !== x.body) count++;
                    return { ...x, subject: nextSubject, body: nextBody };
                  }));
                  toast({ title: `Replaced in ${count} draft${count === 1 ? "" : "s"}` });
                }}
              >
                Replace in all
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={runTestDrafts} disabled={testBusy}>
                {testBusy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                {testBusy ? "Working…" : "Fetch + Draft All"}
              </Button>
              <Button size="sm" variant="secondary" onClick={runTestDraftsFromTemplate} disabled={testBusy} title="Fill test drafts from the plain template above — no AI calls">
                <Sparkles className="h-3 w-3 mr-1" />
                Draft All from Template
              </Button>
              <Button size="sm" variant="outline" onClick={sendAllTestRows} disabled={testBusy || !testRows.some(r => r.subject && r.body && r.status !== "sent")}>
                <Send className="h-3 w-3 mr-1" /> Send all ready
              </Button>
              <Button size="sm" variant="ghost" onClick={addTestRow} disabled={testBusy}>
                <Plus className="h-3 w-3 mr-1" /> Add row
              </Button>
              <span className="text-[11px] text-muted-foreground ml-auto">
                Uses the AI prompt from the Bulk AI sheet ({bulkAIPrompt.trim() ? `${bulkAIPrompt.length} chars` : "default template"}).
              </span>
            </div>

            <div className="flex-1 min-h-[50vh] overflow-auto mt-2 pr-1">
              <div className="border border-border rounded-md overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 w-8">#</th>
                    <th className="text-left p-2">Recipient email</th>
                    <th className="text-left p-2">YouTube channel link</th>
                    <th className="text-left p-2 w-52">Sender (Workspace)</th>
                    <th className="text-left p-2 w-28">Status</th>
                    <th className="p-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {testRows.map((r, i) => {
                    const hasDraft = !!(r.subject || r.body || r.status === "error");
                    const isOpen = testExpanded.has(r.id);
                    return (
                    <React.Fragment key={r.id}>
                      <tr
                        className={`border-t border-border align-middle ${hasDraft ? "cursor-pointer hover:bg-muted/40" : ""}`}
                        onClick={() => { if (hasDraft) toggleTestExpanded(r.id); }}
                      >
                        <td className="p-2 text-center text-muted-foreground">
                          {hasDraft ? (
                            <button
                              className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted"
                              onClick={(e) => { e.stopPropagation(); toggleTestExpanded(r.id); }}
                              title={isOpen ? "Hide draft" : "Review draft"}
                            >
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                          ) : (
                            <span className="text-[10px]">{i + 1}</span>
                          )}
                        </td>
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="email"
                            value={r.to}
                            placeholder="you@gmail.com"
                            onChange={e => updateTestRow(r.id, { to: e.target.value })}
                            className="h-8 text-xs"
                            disabled={testBusy}
                          />
                        </td>
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={r.channelLink}
                            placeholder="https://youtube.com/@channel"
                            onChange={e => updateTestRow(r.id, { channelLink: e.target.value })}
                            className="h-8 text-xs"
                            disabled={testBusy}
                          />
                        </td>
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          <select
                            className="w-full h-8 rounded border border-input bg-background px-1 text-[11px]"
                            value={r.sender}
                            disabled={testBusy}
                            onChange={e => updateTestRow(r.id, { sender: e.target.value })}
                          >
                            {allowedSenders.map(o => (
                              <option key={o.value} value={o.value}>{o.display} — {o.value}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          {r.status === "pending" && <span className="text-muted-foreground">pending</span>}
                          {r.status === "fetching" && <span className="text-blue-600">fetching YT…</span>}
                          {r.status === "drafting" && <span className="text-blue-600">drafting…</span>}
                          {r.status === "ready" && <span className="text-amber-600">ready</span>}
                          {r.status === "sending" && <span className="text-blue-600">sending…</span>}
                          {r.status === "sent" && <span className="text-green-600">✓ sent</span>}
                          {r.status === "error" && <span className="text-red-600" title={r.error}>error</span>}
                        </td>
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px]"
                              disabled={testBusy || !r.subject || !r.body}
                              onClick={() => sendTestRow(r.id)}
                            >Send</Button>
                            <button
                              className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                              disabled={testBusy || testRows.length === 1}
                              onClick={() => removeTestRow(r.id)}
                              title="Remove row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && hasDraft && (
                        <tr className="border-t border-border bg-muted/20">
                          <td></td>
                          <td colSpan={5} className="p-3">
                            {r.status === "error" && (
                              <div className="mb-2 text-[11px] text-red-600">Error: {r.error}</div>
                            )}
                            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Subject</label>
                            <Input
                              value={r.subject}
                              onChange={e => updateTestRow(r.id, { subject: e.target.value })}
                              className="h-8 mt-1 mb-2 text-sm"
                              disabled={testBusy}
                            />
                            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Body</label>
                            <textarea
                              value={r.body}
                              onChange={e => updateTestRow(r.id, { body: e.target.value })}
                              rows={12}
                              className="w-full mt-1 rounded-md border border-input bg-background p-2 text-sm leading-relaxed whitespace-pre-wrap resize-y"
                              style={{ fontFamily: "inherit" }}
                              disabled={testBusy}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>


          <div className="px-6 py-3 border-t border-border shrink-0 flex justify-end">
            <Button variant="outline" onClick={() => { if (!testBusy) setTestDraftOpen(false); }} disabled={testBusy}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bulk AI Outreach — right-side sheet */}
      <Sheet open={bulkAIOpen} onOpenChange={(o) => { if (!bulkSending) setBulkAIOpen(o); }}>
        <SheetContent
          side="right"
          className="w-screen sm:max-w-none sm:w-[min(1100px,95vw)] p-0 flex flex-col gap-0"
        >
          <SheetHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              Bulk Email Outreach
              <span className="text-[11px] font-normal text-muted-foreground ml-1">
                · {bulkDrafts.length} lead{bulkDrafts.length === 1 ? "" : "s"}
              </span>
            </SheetTitle>
            {/* Segmented tabs — Template / AI. AI is admin-only. */}
            {isAdmin && (
              <div className="inline-flex items-center p-0.5 mt-2 -mb-1 rounded-md bg-muted w-fit border border-border">
                <button
                  onClick={() => setBulkTab("template")}
                  className={`h-7 px-3 text-[11px] rounded-[5px] transition-colors ${bulkTab === "template" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Template
                </button>
                <button
                  onClick={() => setBulkTab("ai")}
                  className={`h-7 px-3 text-[11px] rounded-[5px] inline-flex items-center gap-1 transition-colors ${bulkTab === "ai" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Sparkles className="h-3 w-3" /> AI
                </button>
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">




          {/* AI prompt — AI tab */}
          {bulkTab === "ai" && (

          <>
          {/* AI prompt — used verbatim as the system prompt for every draft */}
          <div className="px-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-primary" />
                AI prompt — used as the full system prompt. Channel data is injected automatically.
              </label>
              <div className="flex items-center gap-1">
                <Button
                  size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                  disabled={bulkDrafting || bulkSending}
                  onClick={() => { if (confirm("Clear the AI prompt? Drafts will use the built-in default template.")) setBulkAIPrompt(""); }}
                >Clear</Button>
              </div>
            </div>
            <textarea
              value={bulkAIPrompt}
              onChange={e => setBulkAIPrompt(e.target.value)}
              disabled={bulkDrafting || bulkSending}
              rows={4}
              placeholder={'Paste your full system prompt here. Leave blank to use the built-in default template.'}
              className="w-full mt-1 rounded-md border border-input bg-background p-2 text-xs font-mono leading-relaxed resize-y min-h-[80px] max-h-[140px] overflow-auto"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {bulkAIPrompt.trim().length > 0
                ? `Custom prompt active · ${bulkAIPrompt.length.toLocaleString()} chars. This replaces the default system prompt for every lead in this batch.`
                : "Using the built-in default template (deliverability-tuned, no emojis, no links)."}
            </p>
          </div>
          </>
          )}


          {/* Plain template — visible on Template tab */}
          {bulkTab === "template" && (
          <>
          {/* Plain template mode — no AI, variables filled from YouTube data */}
          <div className="px-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Plain template — variables: <code className="text-[10px]">{"{{FIRST_NAME}}"}</code> <code className="text-[10px]">{"{{CHANNEL_NAME}}"}</code> <code className="text-[10px]">{"{{LATEST_VIDEO}}"}</code> <code className="text-[10px]">{"{{JOINED_DATE}}"}</code> <code className="text-[10px]">{"{{SUBSCRIBERS}}"}</code> <code className="text-[10px]">{"{{TOTAL_VIEWS}}"}</code> <code className="text-[10px]">{"{{DAILY_GROWTH}}"}</code> <code className="text-[10px]">{"{{COUNTRY}}"}</code> <code className="text-[10px]">{"{{LAST_VIDEO_DATE}}"}</code> <code className="text-[10px]">{"{{DAYS_SINCE_VIDEO}}"}</code> <code className="text-[10px]">{"{{CHANNEL_LINK}}"}</code> <code className="text-[10px]">{"{{EMAIL}}"}</code> <code className="text-[10px]">{"{{PRODUCT}}"}</code> <code className="text-[10px]">{"{{STATUS}}"}</code> <code className="text-[10px]">{"{{SENDER_FIRST_NAME}}"}</code> <code className="text-[10px]">{"{{SENDER_NAME}}"}</code>
              </label>
              <Button
                size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                disabled={bulkDrafting || bulkSending}
                onClick={() => { setBulkTemplateSubject(DEFAULT_TEMPLATE_SUBJECT); setBulkTemplateBody(DEFAULT_TEMPLATE_BODY); }}
              >Reset to default</Button>
            </div>
            <Input
              value={bulkTemplateSubject}
              onChange={e => setBulkTemplateSubject(e.target.value)}
              disabled={bulkDrafting || bulkSending}
              placeholder="Subject template"
              className="h-8 mt-1 text-xs"
            />
            <textarea
              value={bulkTemplateBody}
              onChange={e => setBulkTemplateBody(e.target.value)}
              disabled={bulkDrafting || bulkSending}
              rows={5}
              placeholder="Template body with {{VARIABLES}}…"
              className="w-full mt-1 rounded-md border border-input bg-background p-2 text-xs font-mono leading-relaxed resize-y min-h-[100px] max-h-[180px] overflow-auto"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Click <b>Draft All from Template</b> below to fill drafts with no AI usage. Drafts without YouTube info are held for review.
            </p>
          </div>
          </>
          )}






          {/* Find / Replace across all drafts */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 px-1 items-end">
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Find in all drafts</label>
              <Input value={bulkFind} onChange={e => setBulkFind(e.target.value)} placeholder="Hey" className="h-8 mt-1" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Replace with</label>
              <Input value={bulkReplace} onChange={e => setBulkReplace(e.target.value)} placeholder="Hi" className="h-8 mt-1" />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!bulkFind || bulkDrafting || bulkSending}
              onClick={() => {
                let count = 0;
                setBulkDrafts(prev => prev.map(x => {
                  if (x.status !== "ready" && x.status !== "review" && x.status !== "error") return x;
                  const nextSubject = x.subject.split(bulkFind).join(bulkReplace);
                  const nextBody = x.body.split(bulkFind).join(bulkReplace);
                  if (nextSubject !== x.subject || nextBody !== x.body) count++;
                  return { ...x, subject: nextSubject, body: nextBody, missingFields: undefined, status: nextSubject.trim() && nextBody.trim() ? "ready" : x.status };
                }));
                toast({ title: `Replaced in ${count} draft${count === 1 ? "" : "s"}` });
              }}
            >
              Replace in all
            </Button>
          </div>

          {/* Per-sender gap between two emails from the SAME from-address */}
          <div className="flex flex-wrap items-center gap-2 px-1 py-2 rounded border border-border bg-muted/30">
            <span className="text-[11px] font-medium text-muted-foreground">Gap between 2 emails (same sender):</span>
            <select
              className="h-7 rounded border border-input bg-background px-1 text-[11px]"
              value={bulkGapMode}
              onChange={e => setBulkGapMode(e.target.value as "random" | "fixed")}
              disabled={bulkSending}
            >
              <option value="random">Random (default)</option>
              <option value="fixed">Fixed timer</option>
            </select>
            {bulkGapMode === "random" ? (
              <div className="inline-flex items-center gap-1 text-[11px]">
                <Input
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  className="h-7 w-16 text-[11px]"
                  value={String(bulkAIMinSec)}
                  onChange={e => setBulkAIMinSec(Math.max(0, Math.min(600, parseInt(e.target.value.replace(/\D/g, "")) || 0)))}
                  disabled={bulkSending}
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  className="h-7 w-16 text-[11px]"
                  value={String(bulkAIMaxSec)}
                  onChange={e => setBulkAIMaxSec(Math.max(0, Math.min(600, parseInt(e.target.value.replace(/\D/g, "")) || 0)))}
                  disabled={bulkSending}
                />
                <span className="text-muted-foreground">sec</span>
                <span className="text-muted-foreground ml-1">
                  (~{Math.round(Math.min(bulkAIMinSec, bulkAIMaxSec) / 60)}–{Math.round(Math.max(bulkAIMinSec, bulkAIMaxSec) / 60)} min)
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 text-[11px]">
                <Input
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  className="h-7 w-20 text-[11px]"
                  value={String(bulkGapFixedSec)}
                  onChange={e => setBulkGapFixedSec(Math.max(0, Math.min(600, parseInt(e.target.value.replace(/\D/g, "")) || 0)))}
                  disabled={bulkSending}
                />
                <span className="text-muted-foreground">sec (~{Math.round(bulkGapFixedSec / 60)} min)</span>
              </div>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">Different senders still fire in parallel.</span>
          </div>



          <div className="flex flex-wrap items-center gap-2 px-1">
            {bulkTab === "ai" && (
              <Button size="sm" variant="outline" onClick={draftAllBulk} disabled={bulkDrafting || bulkSending}>
                {bulkDrafting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                {bulkDrafting ? "Drafting…" : "Draft All with AI"}
              </Button>
            )}
            {bulkTab === "template" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={draftAllFromTemplate}
                disabled={bulkDrafting || bulkSending}
                title="Fill drafts from the plain template above — no AI calls"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Draft All from Template
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={sendQueueBulk} disabled={bulkSending || bulkDrafting || !bulkDrafts.some(d => d.status === "ready" && !(d.missingFields?.length))}>
                <Send className="h-3 w-3 mr-1" />
                {bulkSending ? "Sending…" : `Send Queue (${bulkDrafts.filter(d => d.status === "ready" && !(d.missingFields?.length)).length})`}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={scheduleOnServer}
              disabled={bulkSending || bulkDrafting || !bulkDrafts.some(d => d.status === "ready" && !(d.missingFields?.length))}
              title="Hand the queue to the server. Sends continue even if you close this browser."
            >
              Schedule on Server ({bulkDrafts.filter(d => d.status === "ready" && !(d.missingFields?.length)).length})
            </Button>
            {(bulkSending || bulkDrafting) && (
              <Button size="sm" variant="outline" onClick={cancelBulk}>Cancel</Button>
            )}
            <Button
              size="sm" variant="ghost" className="text-[11px]"
              onClick={resetBulkQueue}
              disabled={bulkSending || bulkDrafting}
              title="Discard the current queue and reload drafts from the current selection"
            >Reset queue</Button>
            <Button
              size="sm" variant="ghost" className="text-[11px]"
              onClick={() => {
                const withDraft = bulkDrafts.filter(d => d.subject || d.body).map(d => d.prospectId);
                const allOpen = withDraft.length > 0 && withDraft.every(id => bulkExpanded.has(id));
                setBulkExpanded(allOpen ? new Set() : new Set(withDraft));
              }}
              title="Expand/collapse all drafts"
            >{(() => {
              const withDraft = bulkDrafts.filter(d => d.subject || d.body).map(d => d.prospectId);
              const allOpen = withDraft.length > 0 && withDraft.every(id => bulkExpanded.has(id));
              return allOpen ? "Collapse all" : "Expand all";
            })()}</Button>
            <div className="text-xs text-muted-foreground ml-auto">
              {bulkDrafts.filter(d => d.status === "sent").length} sent ·{" "}
              {bulkDrafts.filter(d => d.status === "ready" && !(d.missingFields?.length)).length} ready ·{" "}
              {bulkDrafts.filter(d => d.status === "review" || (d.status === "ready" && (d.missingFields?.length ?? 0) > 0)).length} review ·{" "}
              {bulkDrafts.filter(d => d.status === "error" || d.status === "skipped").length} issues
          </div>

          {/* Bulk row actions inside the dialog: select all + bulk sender edit (admin only) */}
          {isAdmin && (
          <div className="basis-full w-full flex flex-wrap items-center gap-2 px-1 pt-2 border-t border-border mt-1">
            <span className="text-[11px] text-muted-foreground">
              {bulkSelected.size > 0
                ? `${bulkSelected.size} of ${bulkDrafts.length} draft${bulkDrafts.length === 1 ? "" : "s"} selected`
                : "Tick rows below to bulk-edit the sender"}
            </span>
            <Button
              size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
              disabled={bulkDrafts.length === 0}
              onClick={() => {
                if (bulkSelected.size === bulkDrafts.length) setBulkSelected(new Set());
                else setBulkSelected(new Set(bulkDrafts.map(d => d.prospectId)));
              }}
            >
              {bulkSelected.size === bulkDrafts.length && bulkDrafts.length > 0 ? "Clear selection" : "Select all"}
            </Button>
            <div className="ml-2 flex items-center gap-2">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Sender</label>
              <select
                className="h-7 rounded border border-input bg-background px-1 text-[11px] min-w-[220px]"
                value={bulkEditSender}
                onChange={e => setBulkEditSender(e.target.value)}
                disabled={bulkSending}
              >
                {allowedSenders.map(o => (
                  <option key={o.value} value={o.value}>{o.display} — {o.value}</option>
                ))}
              </select>
              <Button
                size="sm" variant="outline" className="h-7 px-2 text-[11px]"
                onClick={applyBulkSenderToSelected}
                disabled={bulkSending || bulkSelected.size === 0}
              >
                Apply to selected
              </Button>
            </div>
          </div>
          )}

          </div>






          <div className="flex-1 min-h-[50vh] overflow-auto mt-2 pr-1">
            {bulkDrafts.length === 0 && (
              <div className="p-6 text-center text-muted-foreground text-xs border border-dashed border-border rounded-md">
                No leads in queue.
              </div>
            )}
            {bulkDrafts.length > 0 && (
              <div className="border border-border rounded-md overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="w-8 p-2 text-center">
                        <input
                          type="checkbox"
                          checked={bulkDrafts.length > 0 && bulkSelected.size === bulkDrafts.length}
                          ref={el => { if (el) el.indeterminate = bulkSelected.size > 0 && bulkSelected.size < bulkDrafts.length; }}
                          onChange={() => {
                            if (bulkSelected.size === bulkDrafts.length) setBulkSelected(new Set());
                            else setBulkSelected(new Set(bulkDrafts.map(d => d.prospectId)));
                          }}
                          title="Select all"
                        />
                      </th>
                      <th className="w-8 p-2"></th>
                      <th className="text-left p-2">Lead</th>
                      <th className="text-left p-2">To</th>
                      <th className="text-left p-2 w-56">Sender</th>
                      <th className="text-left p-2">Subject</th>
                      <th className="text-left p-2 w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkDrafts.map((d, idx) => {
                      const remaining = d.nextSendAt ? Math.max(0, Math.ceil((d.nextSendAt - Date.now()) / 1000)) : 0;
                      const canEdit = d.status === "ready" || d.status === "review" || d.status === "error";
                      const hasDraft = !!(d.subject || d.body);
                      const isOpen = bulkExpanded.has(d.prospectId);
                      const rowLocked = d.status === "sending" || d.status === "sent" || bulkSending;
                      const wordCount = (d.body || "").trim().split(/\s+/).filter(Boolean).length;
                      const needsReview = (d.missingFields?.length ?? 0) > 0;
                      return (
                        <React.Fragment key={d.prospectId}>
                          <tr
                            className={`border-t border-border align-middle ${hasDraft ? "cursor-pointer hover:bg-muted/40" : ""} ${needsReview ? "bg-amber-500/10 border-l-2 border-l-amber-500" : d.status === "error" ? "bg-red-500/5" : d.status === "sent" ? "bg-green-500/5" : ""}`}
                            onClick={() => { if (hasDraft) toggleBulkExpanded(d.prospectId); }}
                          >
                            <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={bulkSelected.has(d.prospectId)}
                                onChange={() => toggleBulkSelected(d.prospectId)}
                                title="Select for bulk edit"
                              />
                            </td>
                            <td className="p-2 text-center text-muted-foreground">
                              {hasDraft ? (
                                <button
                                  className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted"
                                  onClick={(e) => { e.stopPropagation(); toggleBulkExpanded(d.prospectId); }}
                                  title={isOpen ? "Hide draft" : "Review draft"}
                                >
                                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </button>
                              ) : (
                                <span className="text-[10px]">#{idx + 1}</span>
                              )}
                            </td>
                            <td className="p-2">
                              <div className="font-medium truncate max-w-[180px]" title={d.clientName || d.channelName || ""}>
                                {d.clientName || d.channelName || "—"}
                              </div>
                              {needsReview && (
                                <div className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-400 font-medium" title={`Fell back to defaults for: ${d.missingFields!.join(", ")}`}>
                                  ⚠ Review · missing {d.missingFields!.join(", ")}
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-muted-foreground truncate max-w-[200px]" title={d.to || ""}>
                              {d.to || "no email"}
                            </td>
                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                              <select
                                className="w-full h-8 rounded border border-input bg-background px-1 text-[11px]"
                                value={d.sender}
                                disabled={rowLocked}
                                onChange={e => {
                                  const v = e.target.value;
                                  setBulkDrafts(prev => prev.map(x => x.prospectId === d.prospectId ? { ...x, sender: v } : x));
                                }}
                                title="Sender for this lead"
                              >
                                {allowedSenders.map(o => (
                                  <option key={o.value} value={o.value}>{o.display} — {o.value}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2 truncate max-w-[280px]" title={d.subject || ""}>
                              {d.subject ? d.subject : <span className="text-muted-foreground italic">{d.status === "drafting" ? "drafting…" : "—"}</span>}
                            </td>
                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                              {d.status === "sent" && <span className="text-green-600">✓ sent</span>}
                              {d.status === "sending" && <span className="text-blue-600">sending…</span>}
                              {d.status === "ready" && (remaining > 0 ? <span className="text-amber-600">in {remaining}s</span> : <span className="text-emerald-600">ready</span>)}
                              {d.status === "review" && <span className="text-amber-600">review</span>}
                              {d.status === "drafting" && <span className="text-blue-600">drafting…</span>}
                              {d.status === "pending" && <span className="text-muted-foreground">pending</span>}
                              {d.status === "skipped" && <span className="text-muted-foreground" title={d.error}>skipped</span>}
                              {d.status === "error" && (
                                <button
                                  className="text-red-600 underline hover:opacity-80"
                                  onClick={(e) => { e.stopPropagation(); (d.subject && d.body) ? retrySendOne(d.prospectId) : retryDraftOne(d.prospectId); }}
                                  title={d.subject && d.body ? "Retry send" : "Retry draft"}
                                >error · retry</button>
                              )}
                            </td>
                          </tr>
                          {isOpen && hasDraft && (
                            <tr className="border-t border-border bg-muted/20">
                              <td></td>
                              <td></td>
                              <td colSpan={5} className="p-3">
                                {d.status === "error" && d.error && (
                                  <div className="mb-2 text-[11px] text-red-600">Error: {d.error}</div>
                                )}
                                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Subject</label>
                                <Input
                                  value={d.subject}
                                  onChange={e => {
                                    const v = e.target.value;
                                    setBulkDrafts(prev => prev.map(x => x.prospectId === d.prospectId ? { ...x, subject: v, missingFields: undefined, status: (x.status === "error" || x.status === "review") && v.trim() && x.body.trim() ? "ready" : x.status, error: x.status === "error" ? undefined : x.error } : x));
                                  }}
                                  disabled={!canEdit}
                                  className="h-8 mt-1 mb-2 text-sm"
                                />
                                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Body</label>
                                <textarea
                                  value={d.body}
                                  onChange={e => {
                                    const v = e.target.value;
                                    setBulkDrafts(prev => prev.map(x => x.prospectId === d.prospectId ? { ...x, body: v, missingFields: undefined, status: (x.status === "error" || x.status === "review") && v.trim() && x.subject.trim() ? "ready" : x.status, error: x.status === "error" ? undefined : x.error } : x));
                                  }}
                                  disabled={!canEdit}
                                  rows={14}
                                  className="w-full mt-1 rounded-md border border-input bg-background p-2 text-sm leading-relaxed whitespace-pre-wrap resize-y"
                                  style={{ fontFamily: "inherit" }}
                                />
                                <div className="mt-1 text-[10px] text-muted-foreground flex items-center justify-between">
                                  <span>{wordCount} word{wordCount === 1 ? "" : "s"} · {(d.body || "").length} chars</span>
                                  {canEdit && <span>Edits autosave</span>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>

          <div className="px-6 py-3 border-t border-border shrink-0 flex justify-end">
            <Button variant="outline" onClick={() => { if (!bulkSending) setBulkAIOpen(false); }} disabled={bulkSending}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      <SendQueuePanel
        open={sendQueueOpen}
        onOpenChange={setSendQueueOpen}
        senderFilter={isAdmin ? null : (PROSPECTS_ALLOWED_SENDERS[(authedEmail || "").toLowerCase()] || ((authedEmail || "").toLowerCase() ? [(authedEmail || "").toLowerCase()] : []))}
      />

      <EmployeePermissionsDialog open={permsDialogOpen} onOpenChange={setPermsDialogOpen} />
      {isAdmin && <ProspectsResetPasswordDialog open={resetPwOpen} onOpenChange={setResetPwOpen} />}

    </div>
  );
};


export default Prospects;
