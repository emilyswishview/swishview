import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/looseClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, RotateCcw, Zap, Play, Terminal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type LogEvent = { at: string; kind: string; level: 'info' | 'good' | 'warn' | 'error'; text: string };

type Status = {
  ok: boolean;
  settings: { autopilot: boolean; pausedReason: string | null; targetLeads: number; config: any; updatedAt: string | null };
  progress: { leads: number; target: number; pct: number; channels: number; qualified: number; phones: number; emails: number; callingLeads: number };
  frontier: { new: number; active: number; retired: number; dupRate?: number };
  queue: { searchQueued: number; contactQueued: number; running: number; dead: number };
  bands: Record<string, number>;
  api: {
    projects: Array<{
      id: string; name: string; secret: string; hasKey: boolean; enabled: boolean; status: string;
      searchUsed: number; searchLimit: number; unitsUsed: number; unitsLimit: number;
      cooldownUntil: string | null; errors: number; lastUsedAt: string | null;
    }>;
    keysConfigured: number; available: number; unitsToday: number; failures: number; lastCallAt: string | null;
  };
  worker: { locked: boolean; workerId: string | null; lockExpiresAt: string | null };
  logs?: LogEvent[];
};

const healthColor = (s: string) =>
  s === 'healthy' ? 'bg-emerald-100 text-emerald-700'
  : s === 'exhausted' ? 'bg-red-100 text-red-700'
  : s === 'cooling' ? 'bg-amber-100 text-amber-700'
  : s === 'disabled' ? 'bg-gray-100 text-gray-600'
  : 'bg-orange-100 text-orange-700';

const logColor = (l: LogEvent['level']) =>
  l === 'good' ? 'text-emerald-600'
  : l === 'warn' ? 'text-amber-600'
  : l === 'error' ? 'text-red-600'
  : 'text-muted-foreground';

const Stat = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) => (
  <div className="rounded-md border p-2" title={hint}>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold tabular-nums">{value}</div>
  </div>
);

const time = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return ''; }
};

const AutopilotPanel = () => {
  const { toast } = useToast();
  const [st, setSt] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logBox = useRef<HTMLDivElement>(null);

  const call = useCallback(async (body: any, label?: string) => {
    if (label) setActing(label);
    try {
      const { data, error } = await supabase.functions.invoke('lead-engine-control', { body });
      if (error) throw error;
      const s: Status | undefined = data?.status ?? (data?.ok && data?.progress ? data : undefined);
      if (s) {
        setSt(s);
        if (Array.isArray(s.logs)) setLogs(s.logs);
      }
      if (Array.isArray(data?.logs) && !s) setLogs(data.logs);
      if (s?.settings?.targetLeads) setTarget(String(s.settings.targetLeads));
      return data;
    } catch (e: any) {
      toast({ title: 'Engine error', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setActing(null);
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    call({ action: 'status' });
    const t = setInterval(() => call({ action: 'status' }), 10000);
    return () => clearInterval(t);
  }, [call]);

  useEffect(() => {
    if (autoScroll && logBox.current) logBox.current.scrollTop = 0;
  }, [logs, autoScroll]);

  const runNow = async () => {
    const data = await call({ action: 'tick' }, 'tick');
    if (data?.tick?.started) {
      setLastRun(new Date().toLocaleTimeString());
      toast({
        title: 'Worker started',
        description: 'A discovery tick is running now — search, qualification and phone extraction will appear in the live log below.',
      });
      // refresh a few times while the tick runs so the user sees movement
      [4000, 10000, 20000, 35000].forEach((ms) => setTimeout(() => call({ action: 'status' }), ms));
    }
  };

  if (loading && !st) {
    return (
      <Card className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading discovery engine…
      </Card>
    );
  }
  if (!st) return null;

  const p = st.progress;
  const perDay = Math.max(0, p.target - p.leads);
  const busy = st.worker.locked;

  return (
    <Card className="p-4 space-y-4 border-primary/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              Autopilot discovery engine
              <Badge variant="secondary" className={busy ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                {busy ? 'working…' : 'idle'}
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Server-side planner → search → dedupe → enrich → contacts → calling list. Runs every minute even with the browser closed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2" title="Autopilot: when ON the engine ticks automatically every minute. When OFF nothing runs unless you press Run now.">
            <span className="text-sm">Autopilot {st.settings.autopilot ? 'ON' : 'OFF'}</span>
            <Switch
              checked={st.settings.autopilot}
              disabled={!!acting}
              onCheckedChange={(v) => call({ action: v ? 'start' : 'stop' }, 'toggle')}
            />
          </div>
          <Button
            size="sm"
            variant="default"
            disabled={!!acting}
            onClick={runNow}
            title="Run now: fires one discovery tick immediately (claims search jobs, calls the YouTube API, scrapes contacts). Takes up to ~2 minutes."
          >
            {acting === 'tick' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="ml-1">{acting === 'tick' ? 'Starting…' : 'Run now'}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!!acting}
            onClick={() => call({ action: 'status' }, 'status')}
            title="Refresh: reload counters, API quota and the live log."
          >
            <RefreshCw className={`h-4 w-4 ${acting === 'status' ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!!acting}
            onClick={() => call({ action: 'reset' }, 'reset')}
            title="Reset: release a stuck worker lock, requeue jobs that failed or hung, and clear expired API cooldowns. Safe to press any time."
          >
            {acting === 'reset' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
        <span><b>Autopilot</b> — automatic tick every minute</span>
        <span><b>Run now</b> — force one tick immediately</span>
        <span><b>Refresh</b> — reload these numbers</span>
        <span><b>Reset</b> — unstick worker/jobs/cooldowns</span>
        {lastRun && <span className="text-emerald-600">Last manual run at {lastRun}</span>}
      </div>

      {st.settings.pausedReason && (
        <div className="text-xs rounded-md bg-amber-50 text-amber-800 px-3 py-2">
          Paused: {st.settings.pausedReason}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Phone leads in calling list</span>
          <span className="tabular-nums">{p.leads.toLocaleString()} / {p.target.toLocaleString()} ({p.pct}%)</span>
        </div>
        <Progress value={p.pct} />
        <p className="text-[11px] text-muted-foreground">
          Counts callable leads handed to /calling. The engine pauses automatically when the target is reached.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Input
            className="h-8 w-28"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))}
            placeholder="20000"
          />
          <Button size="sm" variant="outline" disabled={!!acting || !target} onClick={() => call({ action: 'config', targetLeads: Number(target) }, 'config')}>
            Set target
          </Button>
          <span className="text-xs text-muted-foreground">{perDay.toLocaleString()} leads remaining</span>
          <span className="text-xs text-muted-foreground">
            · Markets: {(st.settings.config?.markets || []).map((m: any) => m.region).join(', ') || '—'}
          </span>
        </div>
      </div>


      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="Channels" value={p.channels.toLocaleString()} hint="Total channels seen by the engine" />
        <Stat label="Qualified" value={p.qualified.toLocaleString()} hint="Channels passing the lead-score threshold" />
        <Stat label="Phones" value={p.phones.toLocaleString()} hint="Unique phone numbers extracted" />
        <Stat label="Emails" value={p.emails.toLocaleString()} hint="Emails extracted" />
        <Stat label="Calling list" value={p.callingLeads.toLocaleString()} hint="Leads pushed to /calling" />
        <Stat label="Units today" value={st.api.unitsToday.toLocaleString()} hint="YouTube API quota units consumed in the last 24h" />
        <Stat label="API failures" value={st.api.failures.toLocaleString()} hint="Failed API calls in the last 24h" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border p-3 space-y-1">
          <div className="text-xs font-medium">Search frontier</div>
          <div className="text-xs text-muted-foreground">New {st.frontier.new} · Active {st.frontier.active} · Retired {st.frontier.retired}</div>
          <div className="text-xs text-muted-foreground">Duplicate rate {st.frontier.dupRate ?? 0}% of results already known</div>

          <div className="text-xs font-medium pt-2">Queue</div>
          <div className="text-xs text-muted-foreground">
            Search {st.queue.searchQueued} · Contact {st.queue.contactQueued} · Running {st.queue.running} · Dead {st.queue.dead}
          </div>
          <div className="text-xs font-medium pt-2">Worker</div>
          <div className="text-xs text-muted-foreground">
            {st.worker.locked ? `busy (${st.worker.workerId})` : 'idle'}
          </div>
        </div>

        <div className="rounded-md border p-3 space-y-1">
          <div className="text-xs font-medium">Lead quality</div>
          {['A+', 'A', 'B', 'C', 'D'].map((b) => (
            <div key={b} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{b}</span>
              <span className="tabular-nums">{(st.bands?.[b] || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="rounded-md border p-3 space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">API projects</div>
            <span className="text-[10px] text-muted-foreground">{st.api.available} available · {st.api.keysConfigured} keyed</span>
          </div>
          <div className="space-y-1 max-h-40 overflow-auto">
            {st.api.projects.map((pr) => (
              <div key={pr.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{pr.name}</span>
                <span className="flex items-center gap-1">
                  <span className="tabular-nums text-muted-foreground">{pr.searchUsed}/{pr.searchLimit}</span>
                  <Badge variant="secondary" className={`${healthColor(pr.hasKey ? pr.status : 'disabled')} text-[10px] px-1.5 py-0`}>
                    {pr.hasKey ? pr.status : 'no key'}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Terminal className="h-3.5 w-3.5" />
            Live engine log
            <span className="text-[10px] font-normal text-muted-foreground">
              searches, contacts found and errors as they happen (refreshes every 10s)
            </span>
          </div>
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
            stick to newest
          </label>
        </div>
        <div ref={logBox} className="max-h-64 overflow-auto p-2 font-mono text-[11px] space-y-0.5">
          {logs.length === 0 && (
            <div className="text-muted-foreground p-2">No activity in the last 6 hours. Press “Run now” to start a tick.</div>
          )}
          {logs.map((l, i) => (
            <div key={`${l.at}-${i}`} className="flex gap-2">
              <span className="text-muted-foreground shrink-0">{time(l.at)}</span>
              <span className="shrink-0 uppercase text-[10px] text-muted-foreground w-14">{l.kind}</span>
              <span className={`${logColor(l.level)} break-all`}>{l.text}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default AutopilotPanel;
