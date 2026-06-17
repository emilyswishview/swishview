import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Plus, Search, Pencil, Trash2, LogOut, RefreshCw,
  Users, UserCheck, UserX, AlertCircle, PauseCircle, Clock,
  Mail, Phone, Link2, Calendar, DollarSign, Eye, Tag, Briefcase, ExternalLink,
  Upload, FileSpreadsheet, Video, Globe, FileText, StickyNote, TrendingUp, ThumbsUp, MessageSquare, PlayCircle,
  Check, Star, X, ArrowUpDown
} from "lucide-react";
import { CRM_SESSION_KEY } from "./CrmLogin";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

type Status = "Customer" | "Prospect" | "Churned" | "Disputed" | "Interrupted" | "Paused" | "Subscription not started";

interface RecentVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  url: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

interface ChannelSnapshot {
  date: string; // YYYY-MM-DD
  subscribers: number;
  totalViews: number;
  videoCount: number;
}

interface StripeCachePayload {
  fetchedAt: string;
  byEmail: Record<string, any>;
}

interface Client {
  id: string;
  channelName: string;
  clientName: string;
  channelLink: string;
  clientEmail: string;
  phoneNumber: string;
  subscribersLive: number | string;
  ytCapture: string;
  totalViews: number | string;
  videoCount: number | string;
  channelDescription: string;
  channelCountry: string;
  channelCreatedAt: string;
  channelThumbnail: string;
  productName: string;
  productCycle: string;
  paymentId: string;
  duration: string;
  paymentAmount: string;
  status: Status;
  paymentDate: string;
  assignedOn: string;
  renewalDate: string;
  salesRep: string;
  seoRep: string;
  natureOfClient: string;
  notes: string;
  recentVideos?: RecentVideo[];
  snapshots?: ChannelSnapshot[];
  lastFetchedAt?: string;
  // Stripe + renewal extensions
  stripeEmails?: string[];
  primaryPaymentId?: string;
  renewalIntervalValue?: number;
  renewalIntervalUnit?: "day" | "month";
  stripeCache?: StripeCachePayload;
  paymentMeta?: Record<string, { isPrimary?: boolean; product?: string; intervalValue?: number; intervalUnit?: "day" | "month" }>;
}

const PRODUCT_OPTIONS = ["SEO", "Campaign", "Boost", "Audit", "Channel Optimization", "Thumbnail", "Other"];

const STORAGE_KEY = "swishview_crm_clients";
const STATUSES: Status[] = ["Customer", "Prospect", "Churned", "Disputed", "Interrupted", "Paused", "Subscription not started"];

const statusStyles: Record<Status, { badge: string; dot: string; icon: any }> = {
  Customer:    { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: UserCheck },
  Prospect:    { badge: "bg-blue-50 text-blue-700 border-blue-200",          dot: "bg-blue-500",    icon: Users },
  Churned:     { badge: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-500",     icon: UserX },
  Disputed:    { badge: "bg-orange-50 text-orange-700 border-orange-200",    dot: "bg-orange-500",  icon: AlertCircle },
  Interrupted: { badge: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500",   icon: Clock },
  Paused:      { badge: "bg-slate-100 text-slate-700 border-slate-200",      dot: "bg-slate-400",   icon: PauseCircle },
  "Subscription not started": { badge: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-400", icon: Clock },
};

const emptyClient = (): Client => ({
  id: crypto.randomUUID(),
  channelName: "", clientName: "", channelLink: "", clientEmail: "", phoneNumber: "",
  subscribersLive: "", ytCapture: "", totalViews: "", videoCount: "",
  channelDescription: "", channelCountry: "", channelCreatedAt: "", channelThumbnail: "",
  productName: "", productCycle: "",
  paymentId: "", duration: "", paymentAmount: "", status: "Prospect", paymentDate: "",
  assignedOn: "", renewalDate: "", salesRep: "", seoRep: "", natureOfClient: "", notes: "",
  recentVideos: [], snapshots: [], lastFetchedAt: "",
  stripeEmails: [], primaryPaymentId: "", renewalIntervalValue: 1, renewalIntervalUnit: "month",
});

// Compute renewal date from a base ISO/timestamp + interval
const addInterval = (baseISO: string, value: number, unit: "day" | "month"): string => {
  if (!baseISO) return "";
  const d = new Date(baseISO);
  if (isNaN(d.getTime())) return "";
  if (unit === "day") d.setDate(d.getDate() + value);
  else d.setMonth(d.getMonth() + value);
  return d.toISOString().slice(0, 10);
};


const todayISO = () => new Date().toISOString().slice(0, 10);

const addSnapshot = (snaps: ChannelSnapshot[] = [], snap: ChannelSnapshot): ChannelSnapshot[] => {
  const filtered = snaps.filter(s => s.date !== snap.date);
  return [...filtered, snap].sort((a, b) => a.date.localeCompare(b.date));
};


const initials = (name: string) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";

const fmtNum = (v: string | number) => {
  const n = Number(v);
  if (!v || isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
};

const daysUntil = (date: string) => {
  if (!date) return null;
  const d = new Date(date).getTime() - Date.now();
  return Math.ceil(d / (1000 * 60 * 60 * 24));
};

// T+/T- renewal tag: T+N = N days until renewal; T-N = overdue by N days
const tDayTag = (d: number | null) => {
  if (d === null || isNaN(d as any)) return null;
  if (d >= 0) {
    return {
      label: `T+${d}`,
      tone:
        d <= 7
          ? "bg-orange-50 text-orange-700 border-orange-200"
          : d <= 30
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200",
      hint: d === 0 ? "renews today" : `${d}d to renewal`,
    };
  }
  const overdue = Math.abs(d);
  return {
    label: `T-${overdue}`,
    tone: "bg-red-50 text-red-700 border-red-200",
    hint: `overdue by ${overdue}d`,
  };
};

// Parse duration like "1 month", "3 months", "1 year", "30 days", "1m", "1y", "30d"
const parseDurationToDays = (duration: string): number | null => {
  if (!duration) return null;
  const s = duration.toLowerCase().trim();
  const m = s.match(/(\d+(?:\.\d+)?)\s*(day|days|d|week|weeks|w|month|months|mo|m|year|years|yr|y)\b/);
  if (!m) {
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  const n = parseFloat(m[1]);
  const u = m[2];
  if (/^(d|day|days)$/.test(u)) return n;
  if (/^(w|week|weeks)$/.test(u)) return n * 7;
  if (/^(m|mo|month|months)$/.test(u)) return Math.round(n * 30);
  if (/^(y|yr|year|years)$/.test(u)) return Math.round(n * 365);
  return null;
};

const computeRenewal = (paymentDate: string, duration: string): string => {
  if (!paymentDate) return "";
  const days = parseDurationToDays(duration);
  if (days === null) return "";
  const d = new Date(paymentDate);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// Normalize header for fuzzy matching
const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Map common header variations to our field keys
const HEADER_MAP: Record<string, keyof Client> = {
  channelname: "channelName", channel: "channelName",
  clientname: "clientName", client: "clientName", name: "clientName",
  channellink: "channelLink", channelurl: "channelLink", url: "channelLink", link: "channelLink",
  email: "clientEmail", clientemail: "clientEmail", mail: "clientEmail",
  phone: "phoneNumber", phonenumber: "phoneNumber", mobile: "phoneNumber",
  subscribers: "subscribersLive", subs: "subscribersLive", subscriberslive: "subscribersLive",
  ytcapture: "ytCapture", capture: "ytCapture",
  totalviews: "totalViews", views: "totalViews",
  videocount: "videoCount", videos: "videoCount",
  description: "channelDescription", channeldescription: "channelDescription", desc: "channelDescription",
  country: "channelCountry", channelcountry: "channelCountry",
  channelcreatedat: "channelCreatedAt", channelcreated: "channelCreatedAt", joined: "channelCreatedAt",
  thumbnail: "channelThumbnail", avatar: "channelThumbnail",
  productname: "productName", product: "productName",
  productcycle: "productCycle", cycle: "productCycle", billingcycle: "productCycle",
  paymentid: "paymentId", txid: "paymentId", transactionid: "paymentId",
  duration: "duration", term: "duration",
  paymentamount: "paymentAmount", amount: "paymentAmount", price: "paymentAmount",
  status: "status",
  paymentdate: "paymentDate", paiddate: "paymentDate", paid: "paymentDate",
  assignedon: "assignedOn", assigned: "assignedOn",
  renewaldate: "renewalDate", renewal: "renewalDate", renews: "renewalDate",
  salesrep: "salesRep", sales: "salesRep",
  seorep: "seoRep", seo: "seoRep",
  natureofclient: "natureOfClient", nature: "natureOfClient", type: "natureOfClient",
  notes: "notes", comment: "notes", comments: "notes",
};

const xlsxDateToISO = (val: any): string => {
  if (val == null || val === "") return "";
  if (typeof val === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return s;
};

const Crm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [salesFilter, setSalesFilter] = useState<string>("all");
  const [seoFilter, setSeoFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("renewal_future");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [fetchingYT, setFetchingYT] = useState(false);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem(CRM_SESSION_KEY);
    if (!session) { navigate("/crm-login"); return; }
    (async () => {
      const { data, error } = await supabase
        .from("crm_clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setClients(data.map((r: any) => ({ ...emptyClient(), ...(r.data || {}), id: r.id })));
      }
      setLoading(false);
    })();
  }, [navigate]);

  const upsertClient = async (c: Client) => {
    const { error } = await supabase.from("crm_clients").upsert({ id: c.id, data: c as any });
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  };

  // Update a single client (used by detail sheet for Stripe cache, primary id, intervals)
  const patchClient = (id: string, patch: Partial<Client>) => {
    setClients(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...patch } : c);
      const changed = next.find(c => c.id === id);
      if (changed) upsertClient(changed);
      return next;
    });
    setViewing(prev => prev && prev.id === id ? { ...prev, ...patch } : prev);
  };

  const setAndUpsert = (next: Client[], changed: Client) => {
    setClients(next);
    upsertClient(changed);
  };

  const logout = () => { localStorage.removeItem(CRM_SESSION_KEY); navigate("/crm-login"); };
  const openNew = () => { setEditing(emptyClient()); setModalOpen(true); };
  const openEdit = (c: Client) => { setEditing({ ...c }); setModalOpen(true); setViewing(null); };

  // Keep renewal date in sync when payment date or duration changes (only if user hasn't manually set a different one)
  const updateEditing = (patch: Partial<Client>) => {
    if (!editing) return;
    const next = { ...editing, ...patch };
    if ((patch.paymentDate !== undefined || patch.duration !== undefined) && next.paymentDate && next.duration) {
      const auto = computeRenewal(next.paymentDate, next.duration);
      if (auto) next.renewalDate = auto;
    }
    setEditing(next);
  };

  const save = async () => {
    if (!editing) return;
    const finalized = { ...editing };
    if (!finalized.renewalDate && finalized.paymentDate && finalized.duration) {
      finalized.renewalDate = computeRenewal(finalized.paymentDate, finalized.duration);
    }
    const exists = clients.find(c => c.id === finalized.id);
    setClients(exists ? clients.map(c => c.id === finalized.id ? finalized : c) : [finalized, ...clients]);
    await upsertClient(finalized);
    setModalOpen(false);
    setEditing(null);
    toast({ title: exists ? "Client updated" : "Client added" });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this client?")) return;
    setClients(clients.filter(c => c.id !== id));
    setViewing(null);
    const { error } = await supabase.from("crm_clients").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
  };

  // Merge YT data into a client object (also appends today's snapshot)
  const applyYTData = (client: Client, data: any): Client => {
    const subs = data.subscribers ?? Number(client.subscribersLive) ?? 0;
    const views = data.totalViews ?? Number(client.totalViews) ?? 0;
    const vids = data.videoCount ?? Number(client.videoCount) ?? 0;
    const snapshot: ChannelSnapshot = {
      date: todayISO(),
      subscribers: Number(subs) || 0,
      totalViews: Number(views) || 0,
      videoCount: Number(vids) || 0,
    };
    return {
      ...client,
      channelName: data.channelName || client.channelName,
      subscribersLive: data.subscribers ?? client.subscribersLive,
      totalViews: data.totalViews ?? client.totalViews,
      videoCount: data.videoCount ?? client.videoCount,
      channelDescription: data.description || client.channelDescription,
      channelCountry: data.country || client.channelCountry,
      channelCreatedAt: data.publishedAt ? data.publishedAt.slice(0, 10) : client.channelCreatedAt,
      channelThumbnail: data.thumbnail || client.channelThumbnail,
      recentVideos: Array.isArray(data.recentVideos) ? data.recentVideos : (client.recentVideos || []),
      snapshots: addSnapshot(client.snapshots, snapshot),
      lastFetchedAt: data.fetchedAt || new Date().toISOString(),
    };
  };

  const fetchYT = async () => {
    if (!editing?.channelLink) { toast({ title: "Enter channel link first", variant: "destructive" }); return; }
    setFetchingYT(true);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-channel-info", {
        body: { channelUrl: editing.channelLink, includeVideos: true, maxVideos: 12 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEditing(applyYTData(editing, data));
      toast({ title: "Channel data loaded", description: `${data.recentVideos?.length || 0} recent videos` });
    } catch (e) {
      toast({ title: "Fetch failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setFetchingYT(false);
    }
  };

  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const refreshClient = async (client: Client) => {
    if (!client.channelLink) { toast({ title: "No channel link on this client", variant: "destructive" }); return; }
    setRefreshingId(client.id);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-channel-info", {
        body: { channelUrl: client.channelLink, includeVideos: true, maxVideos: 12 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const updated = applyYTData(client, data);
      setClients(clients.map(c => c.id === client.id ? updated : c));
      await upsertClient(updated);
      setViewing(updated);
      toast({ title: "Refreshed", description: `Snapshot saved · ${data.recentVideos?.length || 0} videos` });
    } catch (e) {
      toast({ title: "Refresh failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setRefreshingId(null);
    }
  };

  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);

  const syncAll = async () => {
    if (syncingAll) return;
    if (!clients.length) { toast({ title: "No clients to sync" }); return; }
    if (!confirm(`Sync YouTube + Stripe payment details for all ${clients.length} clients? This may take a few minutes.`)) return;
    setSyncingAll(true);
    setSyncProgress({ done: 0, total: clients.length });
    let ytOk = 0, ytFail = 0, stripeOk = 0, stripeFail = 0;
    let current = [...clients];
    for (let idx = 0; idx < current.length; idx++) {
      const client = current[idx];
      let updated: Client = client;
      if (client.channelLink) {
        try {
          const { data, error } = await supabase.functions.invoke("youtube-channel-info", {
            body: { channelUrl: client.channelLink, includeVideos: true, maxVideos: 12 },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          updated = applyYTData(updated, data);
          ytOk++;
        } catch { ytFail++; }
      }
      const emailSet = new Set<string>();
      (updated.stripeEmails || []).forEach(e => e && emailSet.add(e.trim().toLowerCase()));
      if (updated.clientEmail) emailSet.add(updated.clientEmail.trim().toLowerCase());
      const emails = Array.from(emailSet).filter(Boolean);
      if (emails.length) {
        const existing = { ...(updated.stripeCache?.byEmail || {}) };
        for (const e of emails) {
          try {
            const { data: res, error } = await supabase.functions.invoke("stripe-payment-details", {
              body: { email: e },
            });
            if (error) throw error;
            if ((res as any)?.error) throw new Error((res as any).error);
            existing[e] = res;
            stripeOk++;
          } catch { stripeFail++; }
        }
        updated = { ...updated, stripeCache: { fetchedAt: new Date().toISOString(), byEmail: existing } };
      }
      if (updated !== client) {
        current = current.map(c => c.id === updated.id ? updated : c);
        setClients(current);
        await upsertClient(updated);
      }
      setSyncProgress({ done: idx + 1, total: current.length });
    }
    setSyncingAll(false);
    setSyncProgress(null);
    toast({
      title: "Sync complete",
      description: `YouTube: ${ytOk} ok / ${ytFail} failed · Stripe: ${stripeOk} ok / ${stripeFail} failed`,
    });
  };


  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!rows.length) throw new Error("Sheet is empty");

      const imported: Client[] = rows.map((row) => {
        const c = emptyClient();
        for (const [k, v] of Object.entries(row)) {
          const field = HEADER_MAP[norm(k)];
          if (!field) continue;
          if (["paymentDate", "assignedOn", "renewalDate", "channelCreatedAt"].includes(field)) {
            (c as any)[field] = xlsxDateToISO(v);
          } else if (field === "status") {
            const s = String(v).trim();
            const match = STATUSES.find(st => st.toLowerCase() === s.toLowerCase());
            c.status = match || "Prospect";
          } else {
            (c as any)[field] = v == null ? "" : String(v).trim();
          }
        }
        if (!c.renewalDate && c.paymentDate && c.duration) {
          c.renewalDate = computeRenewal(c.paymentDate, c.duration);
        }
        return c;
      }).filter(c => c.channelName || c.clientName || c.clientEmail || c.channelLink);

      setClients([...imported, ...clients]);
      if (imported.length) {
        const { error: insErr } = await supabase
          .from("crm_clients")
          .insert(imported.map(c => ({ id: c.id, data: c as any })));
        if (insErr) throw insErr;
      }
      toast({ title: `Imported ${imported.length} client${imported.length === 1 ? "" : "s"}` });
    } catch (e) {
      toast({ title: "Import failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "Channel Name", "Client Name", "Channel Link", "Client Email", "Phone Number",
      "Subscribers", "Total Views", "Video Count", "Description", "Country", "Channel Created At",
      "Product Name", "Product Cycle", "Payment ID", "Duration", "Payment Amount",
      "Status", "Payment Date", "Assigned On", "Renewal Date",
      "Sales Rep", "SEO Rep", "Nature of Client", "Notes",
    ];
    const example = [{
      "Channel Name": "Example Channel", "Client Name": "John Doe",
      "Channel Link": "https://youtube.com/@example", "Client Email": "john@example.com",
      "Phone Number": "+1234567890", "Subscribers": 8300, "Total Views": 1700000,
      "Video Count": 120, "Description": "Channel description here", "Country": "US",
      "Product Name": "SEO Pro", "Product Cycle": "Monthly", "Duration": "1 month",
      "Payment Amount": "$299", "Status": "Customer", "Payment Date": "2025-01-15",
      "Sales Rep": "Alice", "SEO Rep": "Bob", "Nature of Client": "Gaming", "Notes": "VIP",
    }];
    const ws = XLSX.utils.json_to_sheet(example, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, "crm-import-template.xlsx");
  };

  const exportXlsx = () => {
    const data = clients.map(c => ({
      "Channel Name": c.channelName, "Client Name": c.clientName, "Channel Link": c.channelLink,
      "Client Email": c.clientEmail, "Phone Number": c.phoneNumber,
      "Subscribers": c.subscribersLive, "Total Views": c.totalViews, "Video Count": c.videoCount,
      "Description": c.channelDescription, "Country": c.channelCountry, "Channel Created At": c.channelCreatedAt,
      "Channel Thumbnail": c.channelThumbnail, "YT Capture": c.ytCapture,
      "Product Name": c.productName, "Product Cycle": c.productCycle, "Payment ID": c.paymentId,
      "Duration": c.duration, "Payment Amount": c.paymentAmount, "Status": c.status,
      "Payment Date": c.paymentDate, "Assigned On": c.assignedOn, "Renewal Date": c.renewalDate,
      "Sales Rep": c.salesRep, "SEO Rep": c.seoRep, "Nature of Client": c.natureOfClient, "Notes": c.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, `crm-clients-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const uniqueReps = (key: "salesRep" | "seoRep") =>
    Array.from(new Set(clients.map(c => c[key]).filter(Boolean)));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = clients.filter(c => {
      if (q && ![c.channelName, c.clientName, c.clientEmail].some(v => v?.toLowerCase().includes(q))) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (salesFilter !== "all" && c.salesRep !== salesFilter) return false;
      if (seoFilter !== "all" && c.seoRep !== seoFilter) return false;
      return true;
    });
    if (sortBy === "renewal_future") {
      // Closest future renewals first; past renewals pushed to the bottom
      const now = Date.now();
      list.sort((a, b) => {
        const ta = a.renewalDate ? new Date(a.renewalDate).getTime() : NaN;
        const tb = b.renewalDate ? new Date(b.renewalDate).getTime() : NaN;
        const aFuture = !isNaN(ta) && ta >= now;
        const bFuture = !isNaN(tb) && tb >= now;
        if (aFuture && !bFuture) return -1;
        if (!aFuture && bFuture) return 1;
        if (isNaN(ta) && isNaN(tb)) return 0;
        if (isNaN(ta)) return 1;
        if (isNaN(tb)) return -1;
        return ta - tb;
      });
    } else if (sortBy === "renewal_asc" || sortBy === "renewal_desc") {
      const dir = sortBy === "renewal_asc" ? 1 : -1;
      list.sort((a, b) => {
        const ta = a.renewalDate ? new Date(a.renewalDate).getTime() : NaN;
        const tb = b.renewalDate ? new Date(b.renewalDate).getTime() : NaN;
        if (isNaN(ta) && isNaN(tb)) return 0;
        if (isNaN(ta)) return 1;
        if (isNaN(tb)) return -1;
        return (ta - tb) * dir;
      });
    } else if (sortBy === "name_asc") {
      list.sort((a, b) => (a.channelName || a.clientName || "").localeCompare(b.channelName || b.clientName || ""));
    }
    return list;
  }, [clients, search, statusFilter, salesFilter, seoFilter, sortBy]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { Customer: 0, Prospect: 0, Churned: 0, Paused: 0 };
    clients.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  }, [clients]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Helmet><title>CRM | SwishView</title><meta name="robots" content="noindex" /></Helmet>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
      />

      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{clients.length} clients · {filtered.length} shown</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Template / Import / Export hidden per request */}
            <Button
              onClick={syncAll}
              disabled={syncingAll}
              variant="outline"
              className="gap-1.5"
              title="Refresh YouTube channel data and Stripe payment details for every client"
            >
              {syncingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncingAll && syncProgress ? `Syncing ${syncProgress.done}/${syncProgress.total}` : "Sync All"}
            </Button>
            <Button onClick={openNew} className="gap-1.5 shadow-sm"><Plus className="h-4 w-4" />Add Client</Button>
            <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-4 w-4" /></Button>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Customers", value: stats.Customer || 0, color: "from-emerald-500 to-teal-500", icon: UserCheck },
            { label: "Prospects", value: stats.Prospect || 0, color: "from-blue-500 to-indigo-500", icon: Users },
            { label: "Churned", value: stats.Churned || 0, color: "from-red-500 to-rose-500", icon: UserX },
            { label: "Paused", value: stats.Paused || 0, color: "from-slate-400 to-slate-500", icon: PauseCircle },
          ].map(s => (
            <Card key={s.label} className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${s.color} text-white shadow-sm`}>
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-3 border-0 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9 border-slate-200" placeholder="Search channel, client, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={salesFilter} onValueChange={setSalesFilter}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Sales Rep" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales Reps</SelectItem>
                {uniqueReps("salesRep").map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={seoFilter} onValueChange={setSeoFilter}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="SEO Rep" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SEO Reps</SelectItem>
                {uniqueReps("seoRep").map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[170px] h-9">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default order</SelectItem>
                <SelectItem value="renewal_future">Closest future renewal</SelectItem>
                <SelectItem value="renewal_asc">Renewal — overall (earliest → latest)</SelectItem>
                <SelectItem value="renewal_desc">Renewal — overall (latest → earliest)</SelectItem>
                <SelectItem value="name_asc">Name A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Cards Grid */}
        {filtered.length === 0 ? (
          <Card className="p-16 text-center border-dashed">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No clients match your filters.</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add your first client</Button>
              
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => {
              const s = statusStyles[c.status];
              const renewal = daysUntil(c.renewalDate);
              const tTag = tDayTag(renewal);
              return (
                <Card
                  key={c.id}
                  className="group p-5 border-0 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer bg-white"
                  onClick={() => setViewing(c)}
                >
                  <div className="flex items-start gap-3">
                    {c.channelThumbnail ? (
                      <img src={c.channelThumbnail} alt="" className="h-11 w-11 rounded-xl object-cover shadow-sm shrink-0" />
                    ) : (
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 text-white flex items-center justify-center font-semibold text-sm shadow-sm shrink-0">
                        {initials(c.channelName || c.clientName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{c.channelName || "Untitled"}</h3>
                          <p className="text-xs text-muted-foreground truncate">{c.clientName || "—"}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className={`${s.badge} text-[10px] px-2 py-0.5 font-medium whitespace-nowrap`}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot} mr-1`} />
                            {c.status}
                          </Badge>
                          {tTag && (
                            <span
                              title={tTag.hint}
                              className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold tabular-nums ${tTag.tone}`}
                            >
                              {tTag.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>


                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Subs</p>
                      <p className="text-sm font-semibold mt-0.5">{fmtNum(c.subscribersLive)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Views</p>
                      <p className="text-sm font-semibold mt-0.5">{fmtNum(c.totalViews)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Videos</p>
                      <p className="text-sm font-semibold mt-0.5">{fmtNum(c.videoCount)}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-3 text-xs text-muted-foreground">
                    {c.clientEmail && (
                      <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{c.clientEmail}</span></div>
                    )}
                    {c.productName && (
                      <div className="flex items-center gap-1.5 truncate"><Briefcase className="h-3 w-3 shrink-0" /><span className="truncate">{c.productName}{c.paymentAmount && ` · ${c.paymentAmount}`}</span></div>
                    )}
                    {c.renewalDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span className={renewal !== null && renewal <= 7 ? "text-orange-600 font-medium" : ""}>
                          Renews {c.renewalDate}{renewal !== null && renewal >= 0 && renewal <= 30 ? ` (${renewal}d)` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <div className="flex gap-1 flex-wrap">
                      {c.salesRep && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">SR: {c.salesRep}</span>}
                      {c.seoRep && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">SEO: {c.seoRep}</span>}
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(c); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); remove(c.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail Sheet */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {viewing && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  {viewing.channelThumbnail ? (
                    <img src={viewing.channelThumbnail} alt="" className="h-12 w-12 rounded-xl object-cover shadow-sm" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 text-white flex items-center justify-center font-semibold shadow-sm">
                      {initials(viewing.channelName || viewing.clientName)}
                    </div>
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <SheetTitle className="truncate">{viewing.channelName || "Untitled"}</SheetTitle>
                    <p className="text-sm text-muted-foreground truncate">{viewing.clientName}</p>
                    {viewing.lastFetchedAt && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">Updated {new Date(viewing.lastFetchedAt).toLocaleString()}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={statusStyles[viewing.status].badge}>{viewing.status}</Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refreshClient(viewing)}
                    disabled={refreshingId === viewing.id || !viewing.channelLink}
                    className="gap-1.5"
                  >
                    {refreshingId === viewing.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Refresh YouTube data
                  </Button>
                  {viewing.channelLink && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={viewing.channelLink} target="_blank" rel="noreferrer" className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />Open channel
                      </a>
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <StatBox icon={Users} label="Subs" value={fmtNum(viewing.subscribersLive)} />
                  <StatBox icon={Eye} label="Views" value={fmtNum(viewing.totalViews)} />
                  <StatBox icon={Video} label="Videos" value={fmtNum(viewing.videoCount)} />
                </div>

                <GrowthChart snapshots={viewing.snapshots || []} />

                <LatestVideoCard video={viewing.recentVideos?.[0]} />

                <RecentVideosList videos={viewing.recentVideos?.slice(1) || []} />

                {viewing.channelDescription && (
                  <Section title="Channel Description">
                    <p className="text-xs whitespace-pre-wrap text-foreground/80 max-h-32 overflow-y-auto">{viewing.channelDescription}</p>
                  </Section>
                )}

                <Section title="Channel">
                  <Info icon={Link2} label="Link" value={viewing.channelLink} link />
                  <Info icon={Globe} label="Country" value={viewing.channelCountry} />
                  <Info icon={Calendar} label="Joined" value={viewing.channelCreatedAt} />
                  <Info icon={FileText} label="YT Capture" value={viewing.ytCapture} />
                </Section>

                <Section title="Contact">
                  <Info icon={Mail} label="Primary Email" value={viewing.clientEmail} />
                  {(viewing.stripeEmails || []).filter(e => e && e.toLowerCase() !== (viewing.clientEmail || "").toLowerCase()).map(e => (
                    <Info key={e} icon={Mail} label="Email" value={e} />
                  ))}
                  <Info icon={Phone} label="Phone" value={viewing.phoneNumber} />
                </Section>

                <Section title="Product & Payment">
                  <Info icon={Briefcase} label="Product" value={viewing.productName} />
                  <Info icon={RefreshCw} label="Cycle" value={viewing.productCycle} />
                  <Info icon={DollarSign} label="Amount" value={viewing.paymentAmount} />
                  <Info icon={Tag} label="Payment ID" value={viewing.paymentId} />
                  <Info icon={Clock} label="Duration" value={viewing.duration} />
                </Section>

                <StripeMultiSection client={viewing} onPatch={(patch) => patchClient(viewing.id, patch)} />


                <Section title="Dates">
                  <Info icon={Calendar} label="Payment Date" value={viewing.paymentDate} />
                  <Info icon={Calendar} label="Assigned" value={viewing.assignedOn} />
                  <Info icon={Calendar} label="Renewal" value={viewing.renewalDate} />
                </Section>

                <Section title="Assignment">
                  <Info label="Sales Rep" value={viewing.salesRep} />
                  <Info label="SEO Rep" value={viewing.seoRep} />
                  <Info label="Nature" value={viewing.natureOfClient} />
                </Section>

                {viewing.notes && (
                  <Section title="Notes">
                    <p className="text-xs whitespace-pre-wrap text-foreground/80">{viewing.notes}</p>
                  </Section>
                )}

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={() => openEdit(viewing)}><Pencil className="h-4 w-4 mr-1.5" />Edit</Button>
                  <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => remove(viewing.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>


      {/* Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing && clients.some(c => c.id === editing.id) ? "Edit Client" : "Add Client"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 space-y-1">
                <Label>Channel Link</Label>
                <div className="flex gap-2">
                  <Input value={editing.channelLink} onChange={(e) => updateEditing({ channelLink: e.target.value })} placeholder="https://youtube.com/@channel" />
                  <Button type="button" onClick={fetchYT} disabled={fetchingYT}>
                    {fetchingYT ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-1">Auto-fill from YouTube</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Fetches name, subscribers, views, description, country, video count, thumbnail.</p>
              </div>
              <Field label="Channel Name" value={editing.channelName} onChange={(v) => updateEditing({ channelName: v })} />
              <Field label="Client Name" value={editing.clientName} onChange={(v) => updateEditing({ clientName: v })} />
              <Field label="Client Email" type="email" value={editing.clientEmail} onChange={(v) => updateEditing({ clientEmail: v })} />
              <Field label="Phone Number" value={editing.phoneNumber} onChange={(v) => updateEditing({ phoneNumber: v })} />
              <Field label="Subscribers" type="number" value={String(editing.subscribersLive)} onChange={(v) => updateEditing({ subscribersLive: v })} />
              <Field label="Total Views" type="number" value={String(editing.totalViews)} onChange={(v) => updateEditing({ totalViews: v })} />
              <Field label="Video Count" type="number" value={String(editing.videoCount)} onChange={(v) => updateEditing({ videoCount: v })} />
              <Field label="YT Capture" value={editing.ytCapture} onChange={(v) => updateEditing({ ytCapture: v })} />
              <Field label="Country" value={editing.channelCountry} onChange={(v) => updateEditing({ channelCountry: v })} />
              <Field label="Channel Created At" type="date" value={editing.channelCreatedAt} onChange={(v) => updateEditing({ channelCreatedAt: v })} />
              <div className="md:col-span-2 space-y-1">
                <Label>Channel Description</Label>
                <Textarea rows={3} value={editing.channelDescription} onChange={(e) => updateEditing({ channelDescription: e.target.value })} />
              </div>
              <Field label="Product Name" value={editing.productName} onChange={(v) => updateEditing({ productName: v })} />
              <Field label="Product Cycle" value={editing.productCycle} onChange={(v) => updateEditing({ productCycle: v })} />
              <Field label="Payment ID" value={editing.paymentId} onChange={(v) => updateEditing({ paymentId: v })} />
              <Field label="Duration (e.g. 1 month, 30 days, 1 year)" value={editing.duration} onChange={(v) => updateEditing({ duration: v })} />
              <Field label="Payment Amount" value={editing.paymentAmount} onChange={(v) => updateEditing({ paymentAmount: v })} />
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => updateEditing({ status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Field label="Payment Date" type="date" value={editing.paymentDate} onChange={(v) => updateEditing({ paymentDate: v })} />
              <Field label="Assigned On" type="date" value={editing.assignedOn} onChange={(v) => updateEditing({ assignedOn: v })} />
              <div className="space-y-1">
                <Label>Renewal Date {editing.paymentDate && editing.duration && <span className="text-[10px] text-muted-foreground">(auto from payment + duration)</span>}</Label>
                <Input type="date" value={editing.renewalDate} onChange={(e) => setEditing({ ...editing, renewalDate: e.target.value })} />
              </div>
              <Field label="Sales Rep" value={editing.salesRep} onChange={(v) => updateEditing({ salesRep: v })} />
              <Field label="SEO Rep" value={editing.seoRep} onChange={(v) => updateEditing({ seoRep: v })} />
              <Field label="Nature of Client" value={editing.natureOfClient} onChange={(v) => updateEditing({ natureOfClient: v })} />
              <div className="md:col-span-2 space-y-1">
                <Label className="flex items-center gap-1.5"><StickyNote className="h-3.5 w-3.5" />Notes</Label>
                <Textarea rows={3} value={editing.notes} onChange={(e) => updateEditing({ notes: e.target.value })} placeholder="Internal notes, special instructions, history…" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div className="space-y-1">
    <Label>{label}</Label>
    <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const StatBox = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/50">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[10px] uppercase tracking-wide font-medium">{label}</span>
    </div>
    <p className="text-xl font-bold mt-1">{value}</p>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{title}</h4>
    <div className="space-y-1.5 bg-slate-50/50 rounded-lg p-3 border border-slate-100">{children}</div>
  </div>
);

const Info = ({ icon: Icon, label, value, link }: { icon?: any; label: string; value: string; link?: boolean }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
          <span className="truncate">{value}</span><ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <span className="truncate font-medium">{value}</span>
      )}
    </div>
  );
};

const fmtCompact = (n: number) => {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
};

const KV = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-muted-foreground w-20 shrink-0 truncate">{label}</span>
      <span className="font-medium break-all">{value}</span>
    </div>
  );
};

const fmtMoneyCents = (cents: number | null | undefined, currency = "usd") => {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "usd").toUpperCase() }).format(cents / 100);
};
const fmtUnix = (s: number | null | undefined) => s ? new Date(s * 1000).toLocaleString() : "—";

const StripeMultiSection = ({ client, onPatch }: { client: Client; onPatch: (patch: Partial<Client>) => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [statusTab, setStatusTab] = useState<"succeeded" | "failed" | "all">("succeeded");
  const [newEmail, setNewEmail] = useState("");
  const [primaryOnly, setPrimaryOnly] = useState(false);
  const [failedEmails, setFailedEmails] = useState<Record<string, string>>({});

  const getMeta = (id: string) => client.paymentMeta?.[id] || {};
  const patchMeta = (id: string, partial: Partial<{ isPrimary: boolean; product: string; intervalValue: number; intervalUnit: "day" | "month" }>) => {
    const next = { ...(client.paymentMeta || {}) };
    next[id] = { ...(next[id] || {}), ...partial };
    onPatch({ paymentMeta: next });
  };
  const renewalFor = (charge: any) => {
    const meta = getMeta(charge.id);
    const value = meta.intervalValue ?? client.renewalIntervalValue ?? 1;
    const unit = meta.intervalUnit ?? client.renewalIntervalUnit ?? "month";
    const baseISO = charge.created ? new Date(charge.created * 1000).toISOString() : "";
    return addInterval(baseISO, value, unit);
  };

  // Build effective email list: stripeEmails ∪ {clientEmail}
  const emails = useMemo(() => {
    const set = new Set<string>();
    (client.stripeEmails || []).forEach(e => e && set.add(e.trim().toLowerCase()));
    if (client.clientEmail) set.add(client.clientEmail.trim().toLowerCase());
    return Array.from(set).filter(Boolean);
  }, [client.stripeEmails, client.clientEmail]);

  const cache = client.stripeCache;
  const fetchedAt = cache?.fetchedAt;

  // Merge cached results across all emails
  const merged = useMemo(() => {
    const charges: any[] = [];
    const subscriptions: any[] = [];
    const invoices: any[] = [];
    const customers: any[] = [];
    if (cache?.byEmail) {
      for (const [email, payload] of Object.entries(cache.byEmail)) {
        (payload?.charges || []).forEach((c: any) => charges.push({ ...c, _email: email }));
        (payload?.subscriptions || []).forEach((s: any) => subscriptions.push({ ...s, _email: email }));
        (payload?.invoices || []).forEach((i: any) => invoices.push({ ...i, _email: email }));
        (payload?.customers || []).forEach((c: any) => customers.push({ ...c, _email: email }));
      }
    }
    charges.sort((a, b) => (b.created || 0) - (a.created || 0));
    return { charges, subscriptions, invoices, customers };
  }, [cache]);

  const fetchOne = async (e: string, attempts = 2): Promise<any> => {
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const { data: res, error } = await supabase.functions.invoke("stripe-payment-details", {
          body: { email: e },
        });
        if (error) throw error;
        if ((res as any)?.error) throw new Error((res as any).error);
        return res;
      } catch (err) {
        lastErr = err;
        await new Promise(r => setTimeout(r, 400 * (i + 1)));
      }
    }
    throw lastErr;
  };

  const fetchAll = async (only?: string[]) => {
    const targets = (only && only.length ? only : emails).filter(Boolean);
    if (targets.length === 0) {
      toast({ title: "Add at least one Stripe email", variant: "destructive" });
      return;
    }
    setLoading(true);
    const existing = { ...(cache?.byEmail || {}) };
    const failures: Record<string, string> = { ...failedEmails };
    // run in parallel, in chunks of 4 to avoid rate limits
    const chunkSize = 4;
    for (let i = 0; i < targets.length; i += chunkSize) {
      const chunk = targets.slice(i, i + chunkSize);
      const results = await Promise.allSettled(chunk.map(e => fetchOne(e)));
      results.forEach((r, idx) => {
        const em = chunk[idx];
        if (r.status === "fulfilled") {
          existing[em] = r.value;
          delete failures[em];
        } else {
          failures[em] = (r.reason as any)?.message || String(r.reason);
        }
      });
      // incremental save so partial data persists even if user closes
      onPatch({ stripeCache: { fetchedAt: new Date().toISOString(), byEmail: existing } });
    }
    setFailedEmails(failures);
    setLoading(false);
    const ok = targets.length - Object.keys(failures).filter(k => targets.includes(k)).length;
    if (Object.keys(failures).length) {
      toast({ title: `Fetched ${ok}/${targets.length}`, description: `Failed: ${Object.keys(failures).join(", ")}`, variant: ok ? "default" : "destructive" });
    } else {
      toast({ title: `Stripe data refreshed for ${ok} email${ok === 1 ? "" : "s"}` });
    }
  };

  const addEmail = () => {
    const e = newEmail.trim().toLowerCase();
    if (!e) return;
    const list = Array.from(new Set([...(client.stripeEmails || []), e]));
    onPatch({ stripeEmails: list });
    setNewEmail("");
  };

  const removeEmail = (e: string) => {
    const list = (client.stripeEmails || []).filter(x => x.toLowerCase() !== e.toLowerCase());
    const cleaned = { ...(client.stripeCache?.byEmail || {}) };
    delete cleaned[e];
    onPatch({
      stripeEmails: list,
      stripeCache: client.stripeCache ? { fetchedAt: client.stripeCache.fetchedAt, byEmail: cleaned } : undefined,
    });
  };

  const setPrimary = (charge: any) => {
    const value = client.renewalIntervalValue || 1;
    const unit = client.renewalIntervalUnit || "month";
    const baseISO = charge.created ? new Date(charge.created * 1000).toISOString() : "";
    const renewalDate = addInterval(baseISO, value, unit);
    onPatch({
      primaryPaymentId: charge.id,
      paymentId: charge.id,
      paymentDate: baseISO ? baseISO.slice(0, 10) : client.paymentDate,
      paymentAmount: charge.amount != null ? fmtMoneyCents(charge.amount, charge.currency) : client.paymentAmount,
      renewalDate: renewalDate || client.renewalDate,
    });
    toast({ title: "Primary payment set", description: `Renewal: ${renewalDate || "—"}` });
  };

  const visibleCharges = merged.charges.filter(c => {
    if (primaryOnly && !client.paymentMeta?.[c.id]?.isPrimary) return false;
    if (statusTab === "all") return true;
    return c.status === statusTab;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <DollarSign className="h-3 w-3" />Stripe — all activity
        </h4>
        <div className="flex items-center gap-2">
          {fetchedAt && (
            <span className="text-[10px] text-muted-foreground">Cached {new Date(fetchedAt).toLocaleString()}</span>
          )}
          <Button size="sm" variant="outline" onClick={() => fetchAll()} disabled={loading} className="h-7 text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            {fetchedAt ? "Refresh all" : "Fetch all"}
          </Button>
          {Object.keys(failedEmails).length > 0 && (
            <Button size="sm" variant="outline" onClick={() => fetchAll(Object.keys(failedEmails))} disabled={loading} className="h-7 text-xs text-orange-600 border-orange-200">
              Retry failed ({Object.keys(failedEmails).length})
            </Button>
          )}
        </div>
      </div>

      {/* Email chips */}
      <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Stripe emails for this client</p>
        <div className="flex flex-wrap gap-1.5">
          {emails.length === 0 && <span className="text-xs text-muted-foreground">No emails yet.</span>}
          {emails.map(e => {
            const isPrimaryEmail = client.clientEmail?.trim().toLowerCase() === e;
            const failed = !!failedEmails[e];
            const fetched = !!cache?.byEmail?.[e];
            return (
              <span key={e} className={`inline-flex items-center gap-1 border rounded-full pl-2 pr-1 py-0.5 text-xs ${failed ? "bg-red-50 border-red-200 text-red-700" : fetched ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`} title={failed ? `Failed: ${failedEmails[e]}` : fetched ? "Fetched" : "Not fetched"}>
                <span className={`h-1.5 w-1.5 rounded-full ${failed ? "bg-red-500" : fetched ? "bg-emerald-500" : "bg-slate-300"}`} />
                {e}
                {failed && (
                  <button onClick={() => fetchAll([e])} className="hover:bg-red-100 rounded-full p-0.5" title="Retry">
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
                {!isPrimaryEmail && (
                  <button onClick={() => removeEmail(e)} className="hover:bg-slate-100 rounded-full p-0.5" title="Remove">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="add another stripe email…"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
            className="h-7 text-xs"
          />
          <Button size="sm" variant="outline" onClick={addEmail} className="h-7 text-xs">Add</Button>
        </div>
      </div>

      {/* Status tabs + primary-only toggle */}
      <div className="flex flex-wrap gap-1 mt-3 mb-2 items-center">
        {(["succeeded", "failed", "all"] as const).map(t => (
          <button
            key={t}
            onClick={() => setStatusTab(t)}
            className={`px-2 py-1 text-[10px] uppercase font-semibold rounded ${statusTab === t ? "bg-primary text-primary-foreground" : "bg-slate-100 text-muted-foreground hover:bg-slate-200"}`}
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => setPrimaryOnly(p => !p)}
          className={`px-2 py-1 text-[10px] uppercase font-semibold rounded ml-1 ${primaryOnly ? "bg-emerald-500 text-white" : "bg-slate-100 text-muted-foreground hover:bg-slate-200"}`}
          title="Show only payments you've tagged as primary"
        >
          {primaryOnly ? "Primary only ✓" : "Primary only"}
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground self-center">{visibleCharges.length} payment{visibleCharges.length === 1 ? "" : "s"}</span>
      </div>

      {/* Payment list */}
      {!fetchedAt ? (
        <div className="text-xs text-muted-foreground bg-slate-50/50 rounded-lg p-4 border border-slate-100 text-center">
          No cached Stripe data yet. Click <span className="font-medium">Fetch</span> to pull all activity for the emails above.
        </div>
      ) : visibleCharges.length === 0 ? (
        <div className="text-xs text-muted-foreground bg-slate-50/50 rounded-lg p-4 border border-slate-100 text-center">
          No {primaryOnly ? "primary " : ""}{statusTab === "all" ? "" : statusTab} payments found.{primaryOnly && " Toggle off ‘Primary only’ to see all."}
        </div>
      ) : (
        <div className="space-y-2">
          {visibleCharges.map((c: any) => {
            const meta = getMeta(c.id);
            const isPrimary = !!meta.isPrimary;
            const intervalValue = meta.intervalValue ?? 1;
            const intervalUnit = meta.intervalUnit ?? "month";
            const renewal = renewalFor(c);
            return (
              <div key={c.id} className={`border rounded p-2 bg-white space-y-1.5 text-xs ${isPrimary ? "border-emerald-400 ring-1 ring-emerald-200" : "border-slate-200"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                    {isPrimary && (
                      <Badge className="text-[10px] bg-emerald-500 hover:bg-emerald-500"><Star className="h-3 w-3 mr-0.5" />Primary</Badge>
                    )}
                    {meta.product && (
                      <Badge variant="secondary" className="text-[10px]"><Tag className="h-3 w-3 mr-0.5" />{meta.product}</Badge>
                    )}
                  </div>
                  <span className="font-semibold">{fmtMoneyCents(c.amount, c.currency)}</span>
                </div>
                <KV label="ID" value={c.id} />
                <KV label="Date" value={fmtUnix(c.created)} />
                <KV label="Email" value={c._email} />
                {c.card && <KV label="Card" value={`${c.card.brand} •••• ${c.card.last4}`} />}
                {c.amountRefunded > 0 && <KV label="Refunded" value={fmtMoneyCents(c.amountRefunded, c.currency)} />}
                <KV label="Description" value={c.description} />

                {/* Per-payment controls: product + renewal interval */}
                <div className="grid grid-cols-1 sm:grid-cols-[auto_auto_auto_1fr] gap-2 pt-1 items-center bg-slate-50/60 rounded p-2 border border-slate-100">
                  <Select
                    value={meta.product || ""}
                    onValueChange={(v) => patchMeta(c.id, { product: v })}
                  >
                    <SelectTrigger className="h-7 text-[11px] w-full sm:w-36"><SelectValue placeholder="Tag product…" /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={intervalValue}
                    onChange={(e) => patchMeta(c.id, { intervalValue: Math.max(1, parseInt(e.target.value || "1", 10)) })}
                    className="h-7 w-16 text-[11px]"
                  />
                  <Select
                    value={intervalUnit}
                    onValueChange={(u) => patchMeta(c.id, { intervalUnit: u as "day" | "month" })}
                  >
                    <SelectTrigger className="h-7 w-24 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Days</SelectItem>
                      <SelectItem value="month">Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[11px] text-muted-foreground">
                    → Renewal: <span className="font-medium text-foreground">{renewal || "—"}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={isPrimary ? "default" : "outline"}
                    className="h-6 text-[10px] gap-1"
                    onClick={() => {
                      patchMeta(c.id, { isPrimary: !isPrimary });
                      if (!isPrimary) setPrimary(c);
                    }}
                  >
                    {isPrimary ? <Check className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                    {isPrimary ? "Primary" : "Mark as primary"}
                  </Button>
                  {c.receiptUrl && (
                    <a href={c.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-[10px]">
                      Receipt <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};






const GrowthChart = ({ snapshots }: { snapshots: ChannelSnapshot[] }) => {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3" />Daily growth
        </h4>
        <div className="bg-slate-50/50 rounded-lg p-6 border border-slate-100 text-center text-xs text-muted-foreground">
          No snapshots yet. Click <span className="font-medium">Refresh YouTube data</span> daily to build a growth chart.
        </div>
      </div>
    );
  }
  const data = snapshots.map(s => ({
    date: s.date.slice(5), // MM-DD
    Subscribers: s.subscribers,
    Views: s.totalViews,
  }));
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const subDelta = last.subscribers - first.subscribers;
  const viewDelta = last.totalViews - first.totalViews;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3" />Daily growth ({snapshots.length} {snapshots.length === 1 ? "day" : "days"})
        </h4>
        <div className="flex gap-2 text-[10px]">
          <span className={subDelta >= 0 ? "text-emerald-600" : "text-red-600"}>
            {subDelta >= 0 ? "+" : ""}{fmtCompact(subDelta)} subs
          </span>
          <span className={viewDelta >= 0 ? "text-emerald-600" : "text-red-600"}>
            {viewDelta >= 0 ? "+" : ""}{fmtCompact(viewDelta)} views
          </span>
        </div>
      </div>
      <div className="bg-white rounded-lg p-3 border border-slate-100" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis yAxisId="l" tick={{ fontSize: 10 }} stroke="#3b82f6" tickFormatter={fmtCompact} />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} stroke="#10b981" tickFormatter={fmtCompact} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
              formatter={(v: any) => fmtCompact(Number(v))}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line yAxisId="l" type="monotone" dataKey="Subscribers" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
            <Line yAxisId="r" type="monotone" dataKey="Views" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const LatestVideoCard = ({ video }: { video?: RecentVideo }) => {
  if (!video) return null;
  const published = video.publishedAt ? new Date(video.publishedAt) : null;
  const daysAgo = published ? Math.floor((Date.now() - published.getTime()) / (1000 * 60 * 60 * 24)) : null;
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
        <PlayCircle className="h-3 w-3" />Latest video
      </h4>
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        className="block bg-white rounded-lg border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
      >
        {video.thumbnail && (
          <div className="relative aspect-video bg-slate-100">
            <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
            {video.duration && (
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                {video.duration}
              </span>
            )}
          </div>
        )}
        <div className="p-3">
          <p className="text-sm font-medium line-clamp-2 leading-snug">{video.title}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            {published && (
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{published.toLocaleDateString()}{daysAgo !== null && ` · ${daysAgo}d ago`}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[11px]">
            <span className="flex items-center gap-1 text-foreground"><Eye className="h-3 w-3" />{fmtCompact(video.viewCount)}</span>
            <span className="flex items-center gap-1 text-foreground"><ThumbsUp className="h-3 w-3" />{fmtCompact(video.likeCount)}</span>
            <span className="flex items-center gap-1 text-foreground"><MessageSquare className="h-3 w-3" />{fmtCompact(video.commentCount)}</span>
          </div>
        </div>
      </a>
    </div>
  );
};

const RecentVideosList = ({ videos }: { videos: RecentVideo[] }) => {
  if (!videos || videos.length === 0) return null;
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
        <Video className="h-3 w-3" />Recent uploads ({videos.length})
      </h4>
      <div className="space-y-2">
        {videos.map(v => {
          const published = v.publishedAt ? new Date(v.publishedAt) : null;
          return (
            <a
              key={v.videoId}
              href={v.url}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3 bg-white rounded-lg border border-slate-100 p-2 hover:shadow-sm transition-shadow"
            >
              <div className="relative w-28 aspect-video bg-slate-100 rounded overflow-hidden shrink-0">
                {v.thumbnail && <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />}
                {v.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 rounded">{v.duration}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium line-clamp-2 leading-snug">{v.title}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  {published && <span>{published.toLocaleDateString()}</span>}
                  <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{fmtCompact(v.viewCount)}</span>
                  <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" />{fmtCompact(v.likeCount)}</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default Crm;
