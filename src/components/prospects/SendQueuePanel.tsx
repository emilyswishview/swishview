import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Trash2, Play, Pause, RotateCcw, ChevronDown, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type JobStatus = "pending" | "processing" | "sent" | "error" | "paused";

interface Job {
  id: string;
  to_email: string;
  from_email: string;
  from_name: string | null;
  subject: string;
  body_text: string | null;
  status: JobStatus;
  scheduled_at: string;
  sent_at: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  message_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /**
   * If provided, only jobs whose from_email is in this list are visible.
   * Pass null/undefined for admin (sees everything).
   */
  senderFilter?: string[] | null;
}

const STATUS_TABS: { key: JobStatus | "all"; label: string }[] = [
  { key: "pending", label: "Upcoming" },
  { key: "processing", label: "Sending" },
  { key: "paused", label: "Paused" },
  { key: "sent", label: "Sent" },
  { key: "error", label: "Failed" },
  { key: "all", label: "All" },
];

const fmtCountdown = (iso: string | null) => {
  if (!iso) return "—";
  const ms = +new Date(iso) - Date.now();
  if (ms <= 0) return "due now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `in ${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `in ${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `in ${h}h ${m % 60}m`;
};

const fmtAbs = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export default function SendQueuePanel({ open, onOpenChange, senderFilter }: Props) {
  const { toast } = useToast();
  const scoped = Array.isArray(senderFilter) && senderFilter.length > 0;
  const senders = scoped ? senderFilter!.map(s => s.toLowerCase()) : null;
  const [tab, setTab] = useState<JobStatus | "all">("pending");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [, setNowTick] = useState(0); // re-render every second for countdowns

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statuses: JobStatus[] = ["pending", "processing", "sent", "error", "paused"];
      const countResults = await Promise.all(
        statuses.map(s =>
          {
            let cq: any = (supabase.from as any)("prospect_email_jobs")
              .select("id", { count: "exact", head: true })
              .eq("status", s);
            if (scoped) cq = cq.in("from_email", senders);
            return cq;
          }
        )
      );
      const c: Record<string, number> = {};
      statuses.forEach((s, i) => { c[s] = countResults[i].count || 0; });
      setCounts(c);

      let q: any = (supabase.from as any)("prospect_email_jobs")
        .select("id,to_email,from_email,from_name,subject,body_text,status,scheduled_at,sent_at,attempts,last_error,created_at,message_id")
        .limit(500);
      if (scoped) q = q.in("from_email", senders);
      if (tab === "pending" || tab === "paused") {
        q = q.eq("status", tab).order("scheduled_at", { ascending: true });
      } else if (tab === "processing") {
        // "Sending" view = currently in-flight + the last 30 min of activity
        // so the tab is useful even when nothing is mid-flight.
        const since = new Date(Date.now() - 30 * 60_000).toISOString();
        q = q.or(`status.eq.processing,and(status.eq.sent,sent_at.gte.${since}),and(status.eq.error,updated_at.gte.${since})`)
             .order("sent_at", { ascending: false, nullsFirst: true })
             .order("scheduled_at", { ascending: true });
      } else if (tab === "sent" || tab === "error") {
        q = q.eq("status", tab).order("sent_at", { ascending: false, nullsFirst: false }).order("updated_at", { ascending: false });
      } else {
        q = q.order("scheduled_at", { ascending: true });
      }
      const { data, error } = await q;
      if (error) throw error;
      setJobs((data || []) as Job[]);

    } catch (e: any) {
      toast({ title: "Failed to load queue", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load, refreshTick]);

  // Auto-refresh every 2s for near-live queue state
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setRefreshTick(t => t + 1), 2_000);
    return () => clearInterval(id);
  }, [open]);


  // Tick every second for live countdowns
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNowTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return jobs;
    return jobs.filter(j =>
      (j.to_email || "").toLowerCase().includes(s) ||
      (j.from_email || "").toLowerCase().includes(s) ||
      (j.subject || "").toLowerCase().includes(s)
    );
  }, [jobs, search]);

  const nextPending = useMemo(() => {
    const pending = jobs.filter(j => j.status === "pending");
    if (!pending.length) return null;
    return pending.reduce((a, b) => (+new Date(a.scheduled_at) < +new Date(b.scheduled_at) ? a : b));
  }, [jobs]);

  // Per-sender next slot summary for transparency
  const senderSchedule = useMemo(() => {
    const map = new Map<string, string>();
    jobs.filter(j => j.status === "pending").forEach(j => {
      const cur = map.get(j.from_email);
      if (!cur || +new Date(j.scheduled_at) < +new Date(cur)) map.set(j.from_email, j.scheduled_at);
    });
    return Array.from(map.entries()).sort((a, b) => +new Date(a[1]) - +new Date(b[1]));
  }, [jobs]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const updateJob = async (id: string, patch: Partial<Job>) => {
    const { error } = await (supabase.from as any)("prospect_email_jobs").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
    setRefreshTick(t => t + 1);
    return true;
  };

  const cancelJob = async (id: string) => {
    if (!confirm("Delete this email from the queue?")) return;
    const { error } = await (supabase.from as any)("prospect_email_jobs").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    setJobs(prev => prev.filter(j => j.id !== id));
    setRefreshTick(t => t + 1);
  };

  const pauseJob = (j: Job) => updateJob(j.id, { status: "paused" } as any);
  const resumeJob = (j: Job) => updateJob(j.id, { status: "pending", scheduled_at: new Date().toISOString() } as any);
  const retryJob = (j: Job) => updateJob(j.id, { status: "pending", scheduled_at: new Date().toISOString(), last_error: null, attempts: 0 } as any);

  const pauseAllPending = async () => {
    if (!confirm(`Pause ALL ${counts.pending || 0} pending emails? They will not send until you resume them.`)) return;
    const { error } = await (supabase.from as any)("prospect_email_jobs").update({ status: "paused" }).eq("status", "pending");
    if (error) return toast({ title: "Pause failed", description: error.message, variant: "destructive" });
    toast({ title: "Queue paused" });
    setRefreshTick(t => t + 1);
  };

  const resumeAllPaused = async () => {
    if (!confirm(`Resume ALL ${counts.paused || 0} paused emails? They will be scheduled to send now.`)) return;
    const { error } = await (supabase.from as any)("prospect_email_jobs")
      .update({ status: "pending", scheduled_at: new Date().toISOString() })
      .eq("status", "paused");
    if (error) return toast({ title: "Resume failed", description: error.message, variant: "destructive" });
    toast({ title: "Queue resumed" });
    setRefreshTick(t => t + 1);
  };

  const retryAllFailed = async () => {
    if (!confirm(`Retry ALL ${counts.error || 0} failed emails?`)) return;
    const { error } = await (supabase.from as any)("prospect_email_jobs")
      .update({ status: "pending", scheduled_at: new Date().toISOString(), attempts: 0, last_error: null })
      .eq("status", "error");
    if (error) return toast({ title: "Retry failed", description: error.message, variant: "destructive" });
    toast({ title: "Failed emails requeued" });
    setRefreshTick(t => t + 1);
  };

  const cancelAllPending = async () => {
    if (!confirm(`Delete ALL ${counts.pending || 0} pending emails? This cannot be undone.`)) return;
    const { error } = await (supabase.from as any)("prospect_email_jobs").delete().eq("status", "pending");
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Pending queue cleared" });
    setRefreshTick(t => t + 1);
  };

  const [minGap, setMinGap] = useState<number>(() => Number(localStorage.getItem("prospect_min_gap")) || 60);
  const [maxGap, setMaxGap] = useState<number>(() => Number(localStorage.getItem("prospect_max_gap")) || 180);
  useEffect(() => { localStorage.setItem("prospect_min_gap", String(minGap)); }, [minGap]);
  useEffect(() => { localStorage.setItem("prospect_max_gap", String(maxGap)); }, [maxGap]);

  const sendNowRespace = async () => {
    const lo = Math.max(5, Math.floor(minGap) || 60);
    const hi = Math.max(lo, Math.floor(maxGap) || lo);
    if (!confirm(`Re-schedule ALL ${counts.pending || 0} pending emails to start now with a RANDOM ${lo}-${hi}s gap per sender? They will begin sending within ~30s and continue running on the server (no need to keep your laptop open).`)) return;
    const { error } = await (supabase as any).rpc("respace_prospect_queue_random", {
      min_gap_seconds: lo, max_gap_seconds: hi, start_offset_seconds: 30,
    });
    if (error) return toast({ title: "Respace failed", description: error.message, variant: "destructive" });
    toast({ title: "Queue rescheduled", description: `Pending emails will fire every ${lo}-${hi}s (random) per sender starting in ~30s.` });
    setRefreshTick(t => t + 1);
  };


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[1100px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-5 py-3 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-3 pr-8">
            Send Queue
            <span className="text-xs font-normal text-muted-foreground">
              Server-scheduled outreach · live (updates every 2s)
            </span>
            <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={() => setRefreshTick(t => t + 1)} title="Refresh now">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </SheetTitle>
        </SheetHeader>


        {/* Summary cards */}
        <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-6 gap-2 border-b border-border shrink-0">
          <div className="rounded-md border border-border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Upcoming</div>
            <div className="text-lg font-semibold">{counts.pending || 0}</div>
            <div className="text-[10px] text-muted-foreground">
              {nextPending ? `next ${fmtCountdown(nextPending.scheduled_at)}` : "—"}
            </div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sending</div>
            <div className="text-lg font-semibold">{counts.processing || 0}</div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Paused</div>
            <div className="text-lg font-semibold text-amber-600">{counts.paused || 0}</div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sent</div>
            <div className="text-lg font-semibold text-green-600">{counts.sent || 0}</div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Failed</div>
            <div className="text-lg font-semibold text-destructive">{counts.error || 0}</div>
          </div>
          <div className="rounded-md border border-border p-2 flex flex-col gap-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Next email</div>
            <div className="text-xs font-medium truncate" title={nextPending?.to_email || ""}>
              {nextPending ? nextPending.to_email : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {nextPending ? `${fmtAbs(nextPending.scheduled_at)} · ${fmtCountdown(nextPending.scheduled_at)}` : "Queue idle"}
            </div>
          </div>
        </div>

        {/* Per-sender next-send schedule */}
        {senderSchedule.length > 0 && (
          <div className="px-5 py-2 border-b border-border shrink-0 flex flex-wrap gap-1.5 text-[10px]">
            <span className="text-muted-foreground self-center mr-1">Next per sender:</span>
            {senderSchedule.slice(0, 12).map(([sender, at]) => (
              <span key={sender} className="px-2 py-0.5 rounded-full border border-border bg-muted/30 tabular-nums">
                <span className="font-medium">{sender.split("@")[0]}</span>
                <span className="text-muted-foreground"> · {fmtCountdown(at)}</span>
              </span>
            ))}
            {senderSchedule.length > 12 && (
              <span className="text-muted-foreground self-center">+{senderSchedule.length - 12} more</span>
            )}
          </div>
        )}

        {/* Tabs + search + bulk actions */}
        <div className="px-5 py-2 flex items-center gap-2 border-b border-border shrink-0 flex-wrap">
          <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-2.5 h-7 text-xs rounded ${tab === t.key ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
              >
                {t.label}{t.key !== "all" && ` (${counts[t.key as string] || 0})`}
              </button>
            ))}
          </div>
          <Input
            placeholder="Search recipient / subject / sender…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 text-xs max-w-xs"
          />
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            {(counts.pending || 0) > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">gap</span>
                <Input
                  type="number"
                  value={minGap}
                  onChange={e => setMinGap(Number(e.target.value))}
                  className="h-7 w-14 text-xs"
                  title="Minimum gap per sender (seconds)"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  value={maxGap}
                  onChange={e => setMaxGap(Number(e.target.value))}
                  className="h-7 w-14 text-xs"
                  title="Maximum gap per sender (seconds)"
                />
                <span className="text-muted-foreground">s (random)</span>
                <Button size="sm" className="h-7 text-xs" onClick={sendNowRespace} title="Reschedule all pending with random gap; server keeps sending even if your laptop is closed">
                  <Play className="h-3 w-3 mr-1" /> Send now
                </Button>
              </div>
            )}
            {(counts.pending || 0) > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={pauseAllPending}>
                <Pause className="h-3 w-3 mr-1" /> Pause all
              </Button>
            )}
            {(counts.paused || 0) > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={resumeAllPaused}>
                <Play className="h-3 w-3 mr-1" /> Resume all
              </Button>
            )}
            {(counts.error || 0) > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={retryAllFailed}>
                <RotateCcw className="h-3 w-3 mr-1" /> Retry all failed
              </Button>
            )}
            {(counts.pending || 0) > 0 && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={cancelAllPending}>
                <Trash2 className="h-3 w-3 mr-1" /> Cancel all pending
              </Button>
            )}
          </div>

        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-muted/40 sticky top-0 z-10">
              <tr>
                <th className="w-6"></th>
                <th className="text-left px-3 py-2 font-medium">When</th>
                <th className="text-left px-3 py-2 font-medium">Recipient</th>
                <th className="text-left px-3 py-2 font-medium">From</th>
                <th className="text-left px-3 py-2 font-medium">Subject</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-right px-3 py-2 font-medium">Try</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="text-center text-muted-foreground py-10">
                    No emails in this view.
                  </td>
                </tr>
              )}
              {filtered.map(j => {
                const isOpen = expanded.has(j.id);
                const whenIso = j.status === "sent" ? j.sent_at : j.scheduled_at;
                const isPending = j.status === "pending";
                const isPaused = j.status === "paused";
                const isError = j.status === "error";
                const isSent = j.status === "sent";
                return (
                  <Fragment key={j.id}>
                    <tr className="border-t border-border hover:bg-muted/20 cursor-pointer" onClick={() => toggleExpand(j.id)}>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">
                        <div>{fmtAbs(whenIso)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {isPending ? fmtCountdown(j.scheduled_at) : isSent ? "sent" : isError ? "failed" : isPaused ? "paused" : j.status}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 truncate max-w-[220px]" title={j.to_email}>{j.to_email}</td>
                      <td className="px-3 py-1.5 truncate max-w-[200px]" title={j.from_email}>
                        <div className="font-medium">{j.from_name || j.from_email.split("@")[0]}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{j.from_email}</div>
                      </td>
                      <td className="px-3 py-1.5 truncate max-w-[280px]" title={j.subject}>{j.subject}</td>
                      <td className="px-3 py-1.5">
                        <span className={
                          "px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide " +
                          (isSent ? "bg-green-500/15 text-green-700 dark:text-green-400" :
                           isError ? "bg-red-500/15 text-red-600 dark:text-red-400" :
                           j.status === "processing" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 animate-pulse" :
                           isPaused ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                           "bg-amber-500/15 text-amber-700 dark:text-amber-400")
                        }>
                          {j.status}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{j.attempts}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {isPending && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-amber-600" onClick={() => pauseJob(j)} title="Pause">
                            <Pause className="h-3 w-3" />
                          </Button>
                        )}
                        {isPaused && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={() => resumeJob(j)} title="Resume now">
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        {(isError || isSent) && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-600" onClick={() => retryJob(j)} title={isSent ? "Send again" : "Retry now"}>
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                        {(isPending || isPaused || isError) && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => cancelJob(j.id)} title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/10 border-t border-border">
                        <td></td>
                        <td colSpan={7} className="px-3 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                            <div className="space-y-0.5">
                              <div className="text-muted-foreground uppercase tracking-wide text-[9px]">From</div>
                              <div className="font-medium">{j.from_name || "—"}</div>
                              <div className="text-muted-foreground">{j.from_email}</div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-muted-foreground uppercase tracking-wide text-[9px]">To</div>
                              <div className="font-medium">{j.to_email}</div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-muted-foreground uppercase tracking-wide text-[9px]">Scheduled</div>
                              <div>{fmtAbs(j.scheduled_at)}</div>
                              {j.sent_at && <div className="text-muted-foreground">Sent: {fmtAbs(j.sent_at)}</div>}
                              {j.message_id && <div className="text-muted-foreground truncate" title={j.message_id}>msg: {j.message_id}</div>}
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="text-muted-foreground uppercase tracking-wide text-[9px] mb-1">Subject</div>
                            <div className="text-xs font-medium">{j.subject}</div>
                          </div>
                          <div className="mt-2">
                            <div className="text-muted-foreground uppercase tracking-wide text-[9px] mb-1">Body</div>
                            <pre className="text-xs whitespace-pre-wrap font-sans bg-background border border-border rounded p-2 max-h-72 overflow-auto">
{j.body_text || "(empty)"}
                            </pre>
                          </div>
                          {j.last_error && (
                            <div className="mt-2">
                              <div className="text-destructive uppercase tracking-wide text-[9px] mb-1">Last error</div>
                              <div className="text-xs text-destructive bg-destructive/5 border border-destructive/30 rounded p-2">{j.last_error}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
