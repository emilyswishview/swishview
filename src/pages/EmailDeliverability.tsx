import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";

const DOMAINS = ["swishview.com", "swishview.email"] as const;
const DOH = "https://dns.google/resolve";

type DnsCheck = {
  domain: string;
  spf: { ok: boolean; record?: string; note: string };
  dkim: { ok: boolean; record?: string; note: string };
  dmarc: { ok: boolean; record?: string; note: string };
  mx: { ok: boolean; records: string[]; note: string };
};

async function doh(name: string, type: string): Promise<string[]> {
  try {
    const r = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
    });
    const j = await r.json();
    return (j?.Answer || []).map((a: any) => String(a.data || "").replace(/^"|"$/g, "").replace(/"\s+"/g, ""));
  } catch { return []; }
}

async function checkDomain(domain: string): Promise<DnsCheck> {
  const [txt, dmarc, mx, dkim] = await Promise.all([
    doh(domain, "TXT"),
    doh(`_dmarc.${domain}`, "TXT"),
    doh(domain, "MX"),
    doh(`google._domainkey.${domain}`, "TXT"),
  ]);
  const spfRecords = txt.filter(t => /^v=spf1/i.test(t));
  const spf = spfRecords[0];
  const spfOk = !!spf && /_spf\.google\.com/.test(spf) && spfRecords.length === 1 && /[-~]all\b/.test(spf);
  const dmarcRec = dmarc.find(t => /^v=DMARC1/i.test(t));
  const dkimOk = dkim.some(t => /v=DKIM1/i.test(t));
  return {
    domain,
    spf: {
      ok: spfOk,
      record: spf,
      note: !spf ? "No SPF record." :
            spfRecords.length > 1 ? "Multiple SPF records — must combine into ONE." :
            !/_spf\.google\.com/.test(spf) ? "Missing include:_spf.google.com." :
            !/[-~]all\b/.test(spf) ? "Missing -all or ~all terminator." : "OK",
    },
    dkim: { ok: dkimOk, record: dkim[0], note: dkimOk ? "google selector OK" : "google._domainkey TXT not found." },
    dmarc: {
      ok: !!dmarcRec, record: dmarcRec,
      note: !dmarcRec ? "No DMARC record." : /p=reject/i.test(dmarcRec) ? "Strict (reject)." : /p=quarantine/i.test(dmarcRec) ? "Quarantine." : "Monitor only (p=none).",
    },
    mx: { ok: mx.some(m => /google/i.test(m)), records: mx, note: mx.length ? "OK" : "No MX records." },
  };
}

export default function EmailDeliverability() {
  const [authed, setAuthed] = useState<null | boolean>(null);
  const [dns, setDns] = useState<DnsCheck[]>([]);
  const [loadingDns, setLoadingDns] = useState(true);
  const [senders, setSenders] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, { sentToday: number; sent7: number; failed7: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  const [queueStats, setQueueStats] = useState({ pending: 0, processing: 0, errors: 0, nextAt: null as string | null });
  const [testEmail, setTestEmail] = useState("");
  const [testSender, setTestSender] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => { (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setAuthed(false); return; }
    const { data } = await supabase.rpc("is_swishview_staff", { _user_id: session.user.id });
    setAuthed(!!data);
  })(); }, []);

  const refreshDns = async () => {
    setLoadingDns(true);
    try {
      const out = await Promise.all(DOMAINS.map(checkDomain));
      setDns(out);
      toast.success("DNS re-checked");
    } catch (e: any) {
      toast.error(`DNS check failed: ${e?.message || e}`);
    } finally {
      setLoadingDns(false);
    }
  };

  const refreshSenders = async () => {
    setLoading(true);
    try {
      const [{ data: cfg, error: cfgErr }, { data: jobs, error: jobErr }, { data: pending }, { data: nextJob }] = await Promise.all([
        supabase.from("prospect_sender_config").select("*").order("sender_email"),
        supabase.from("prospect_email_jobs").select("from_email, status, sent_at, created_at")
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("prospect_email_jobs").select("status").in("status", ["pending", "processing", "error"]),
        supabase.from("prospect_email_jobs").select("scheduled_at").eq("status", "pending")
          .order("scheduled_at", { ascending: true }).limit(1).maybeSingle(),
      ]);
      if (cfgErr) throw cfgErr;
      if (jobErr) throw jobErr;
      setSenders(cfg || []);
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const map: Record<string, any> = {};
      for (const j of (jobs || [])) {
        const k = (j.from_email || "").toLowerCase();
        if (!map[k]) map[k] = { sentToday: 0, sent7: 0, failed7: 0, total: 0 };
        map[k].total++;
        if (j.status === "sent") {
          map[k].sent7++;
          if (j.sent_at && new Date(j.sent_at) >= todayStart) map[k].sentToday++;
        }
        if (j.status === "error") map[k].failed7++;
      }
      setStats(map);
      const qs = { pending: 0, processing: 0, errors: 0, nextAt: (nextJob as any)?.scheduled_at || null };
      for (const r of (pending || [])) {
        if (r.status === "pending") qs.pending++;
        else if (r.status === "processing") qs.processing++;
        else if (r.status === "error") qs.errors++;
      }
      setQueueStats(qs);
      toast.success("Refreshed");
    } catch (e: any) {
      toast.error(`Refresh failed: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authed) { refreshDns(); refreshSenders(); } }, [authed]);

  const updateSender = async (sender_email: string, patch: any) => {
    const { error } = await supabase.from("prospect_sender_config").update(patch).eq("sender_email", sender_email);
    if (error) toast.error(error.message); else { toast.success("Updated"); refreshSenders(); }
  };

  const totalToday = useMemo(() => Object.values(stats).reduce((a, b) => a + b.sentToday, 0), [stats]);
  const totalFail7 = useMemo(() => Object.values(stats).reduce((a, b) => a + b.failed7, 0), [stats]);
  const totalSent7 = useMemo(() => Object.values(stats).reduce((a, b) => a + b.sent7, 0), [stats]);
  const failRate = totalSent7 + totalFail7 > 0 ? (totalFail7 / (totalSent7 + totalFail7)) * 100 : 0;

  const sendTest = async () => {
    const to = testEmail.trim();
    const from = testSender.trim().toLowerCase();
    if (!to || !from) { toast.error("Enter both sender and recipient"); return; }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-prospect-reply", {
        body: {
          to,
          fromEmail: from,
          fromName: from.split("@")[0],
          subject: "quick check from swishview",
          text: `Hey there,\n\nJust a quick deliverability test from ${from}. If this lands in Promotions or Inbox, we're good.\n\nBest,\n${from.split("@")[0]}\nSwishView`,
        },
      });
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error((data as any).error || "send failed");
      toast.success(`Test sent to ${to}`);
    } catch (e: any) {
      toast.error(`Test failed: ${e?.message || e}`);
    } finally {
      setSendingTest(false);
    }
  };

  const nextLabel = queueStats.nextAt
    ? (() => {
        const diff = new Date(queueStats.nextAt!).getTime() - Date.now();
        if (diff <= 0) return "now";
        const m = Math.round(diff / 60000);
        if (m < 60) return `in ${m} min`;
        const h = Math.round(m / 60);
        return h < 24 ? `in ${h} h` : `in ${Math.round(h / 24)} d`;
      })()
    : "—";

  if (authed === null) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (!authed) return <div className="min-h-screen flex items-center justify-center p-8 text-center text-muted-foreground">Admin/staff only. Please log in at <a className="text-primary underline ml-1" href="/prospects-login">/prospects-login</a>.</div>;

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Email Check</h1>
          <p className="text-sm text-muted-foreground">SPF / DKIM / DMARC, sender warm-up, queue health & live deliverability test for prospect outreach.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { refreshDns(); refreshSenders(); }} disabled={loading || loadingDns}>
          {(loading || loadingDns) ? "Refreshing…" : "Refresh all"}
        </Button>
      </header>

      {/* DNS health */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Domain authentication</h2>
          <Button size="sm" variant="outline" onClick={refreshDns} disabled={loadingDns}>{loadingDns ? "Checking…" : "Re-check DNS"}</Button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {dns.map(d => (
            <Card key={d.domain} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{d.domain}</h3>
              </div>
              <Row label="SPF" ok={d.spf.ok} note={d.spf.note} record={d.spf.record} />
              <Row label="DKIM" ok={d.dkim.ok} note={d.dkim.note} record={d.dkim.record} />
              <Row label="DMARC" ok={d.dmarc.ok} note={d.dmarc.note} record={d.dmarc.record} />
              <Row label="MX" ok={d.mx.ok} note={d.mx.note} record={d.mx.records.join(" | ")} />
            </Card>
          ))}
        </div>
      </section>

      {/* Queue health */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Queue pending" value={queueStats.pending} />
        <Kpi label="Processing" value={queueStats.processing} tone={queueStats.processing > 0 ? "warn" : "neutral"} />
        <Kpi label="Errored" value={queueStats.errors} tone={queueStats.errors > 0 ? "bad" : "ok"} />
        <Kpi label="Next send" value={nextLabel} />
      </section>

      {/* Aggregate KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Sent today" value={totalToday} />
        <Kpi label="Sent (7d)" value={totalSent7} />
        <Kpi label="Failed (7d)" value={totalFail7} tone={totalFail7 > 0 ? "warn" : "ok"} />
        <Kpi label="Fail rate (7d)" value={`${failRate.toFixed(1)}%`} tone={failRate > 5 ? "bad" : failRate > 2 ? "warn" : "ok"} />
      </section>

      {/* Live test send */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Live deliverability test</h2>
        <Card className="p-4 flex flex-col md:flex-row gap-2 md:items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">From (@swishview.com / @swishview.email)</label>
            <Input placeholder="mia.brooks@swishview.com" value={testSender} onChange={e => setTestSender(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Send test to</label>
            <Input placeholder="your-personal@gmail.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
          </div>
          <Button onClick={sendTest} disabled={sendingTest}>{sendingTest ? "Sending…" : "Send test email"}</Button>
        </Card>
        <p className="text-xs text-muted-foreground mt-2">Sends a real outreach-style email so you can confirm Inbox/Promotions placement instead of Spam.</p>
      </section>

      {/* Per-sender warm-up */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Sender warm-up & caps</h2>
          <Button size="sm" variant="outline" onClick={refreshSenders} disabled={loading}>Refresh</Button>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2">Sender</th>
                <th className="p-2">Today / Cap</th>
                <th className="p-2">7d sent</th>
                <th className="p-2">7d fail</th>
                <th className="p-2">Warm-up start</th>
                <th className="p-2">Ramp days</th>
                <th className="p-2">Start cap</th>
                <th className="p-2">Target cap</th>
                <th className="p-2">Paused</th>
              </tr>
            </thead>
            <tbody>
              {senders.map(s => {
                const k = s.sender_email.toLowerCase();
                const st = stats[k] || { sentToday: 0, sent7: 0, failed7: 0 };
                const daysIn = Math.max(0, Math.floor((Date.now() - new Date(s.warmup_start_date + "T00:00:00Z").getTime()) / 86400000));
                const t = Math.min(1, daysIn / Math.max(1, s.ramp_days));
                const cap = Math.round(s.starting_cap + (s.target_daily_cap - s.starting_cap) * t);
                const over = st.sentToday >= cap;
                return (
                  <tr key={s.sender_email} className="border-t">
                    <td className="p-2 font-mono text-xs">{s.sender_email}</td>
                    <td className="p-2"><span className={over ? "text-orange-500 font-semibold" : ""}>{st.sentToday} / {cap}</span></td>
                    <td className="p-2">{st.sent7}</td>
                    <td className="p-2">{st.failed7 ? <span className="text-red-500">{st.failed7}</span> : 0}</td>
                    <td className="p-2"><Input type="date" defaultValue={s.warmup_start_date} className="h-7 w-36" onBlur={e => e.target.value !== s.warmup_start_date && updateSender(s.sender_email, { warmup_start_date: e.target.value })} /></td>
                    <td className="p-2"><Input type="number" defaultValue={s.ramp_days} className="h-7 w-20" onBlur={e => Number(e.target.value) !== s.ramp_days && updateSender(s.sender_email, { ramp_days: Number(e.target.value) })} /></td>
                    <td className="p-2"><Input type="number" defaultValue={s.starting_cap} className="h-7 w-20" onBlur={e => Number(e.target.value) !== s.starting_cap && updateSender(s.sender_email, { starting_cap: Number(e.target.value) })} /></td>
                    <td className="p-2"><Input type="number" defaultValue={s.target_daily_cap} className="h-7 w-20" onBlur={e => Number(e.target.value) !== s.target_daily_cap && updateSender(s.sender_email, { target_daily_cap: Number(e.target.value) })} /></td>
                    <td className="p-2"><Switch checked={s.paused} onCheckedChange={v => updateSender(s.sender_email, { paused: v })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        <p className="text-xs text-muted-foreground mt-2">Daily cap ramps linearly from <em>start cap</em> to <em>target cap</em> over <em>ramp days</em>, starting on <em>warm-up start</em>. Jobs over cap are auto-rescheduled to tomorrow.</p>
      </section>
    </div>
  );
}

function Row({ label, ok, note, record }: { label: string; ok: boolean; note: string; record?: string }) {
  return (
    <div className="py-2 border-t first:border-t-0">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <Badge variant={ok ? "default" : "destructive"}>{ok ? "PASS" : "FAIL"}</Badge>
      </div>
      <div className="text-xs text-muted-foreground">{note}</div>
      {record && <code className="block mt-1 text-[10px] bg-muted/50 p-1 rounded break-all">{record}</code>}
    </div>
  );
}
function Kpi({ label, value, tone = "neutral" }: { label: string; value: any; tone?: "ok" | "warn" | "bad" | "neutral" }) {
  const color = tone === "bad" ? "text-red-500" : tone === "warn" ? "text-orange-500" : tone === "ok" ? "text-emerald-500" : "";
  return <Card className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className={`text-2xl font-bold ${color}`}>{value}</div></Card>;
}