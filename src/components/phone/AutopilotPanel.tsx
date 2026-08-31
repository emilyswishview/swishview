import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/looseClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, RotateCcw, Zap, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Status = {
  ok: boolean;
  settings: { autopilot: boolean; pausedReason: string | null; targetLeads: number; config: any; updatedAt: string | null };
  progress: { leads: number; target: number; pct: number; channels: number; qualified: number; phones: number; emails: number; callingLeads: number };
  frontier: { new: number; active: number; retired: number };
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
};

const healthColor = (s: string) =>
  s === 'healthy' ? 'bg-emerald-100 text-emerald-700'
  : s === 'exhausted' ? 'bg-red-100 text-red-700'
  : s === 'cooling' ? 'bg-amber-100 text-amber-700'
  : s === 'disabled' ? 'bg-gray-100 text-gray-600'
  : 'bg-orange-100 text-orange-700';

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-md border p-2">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold tabular-nums">{value}</div>
  </div>
);

const AutopilotPanel = () => {
  const { toast } = useToast();
  const [st, setSt] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [target, setTarget] = useState('');

  const call = useCallback(async (body: any, label?: string) => {
    if (label) setActing(label);
    try {
      const { data, error } = await supabase.functions.invoke('lead-engine-control', { body });
      if (error) throw error;
      if (data?.status) setSt(data.status as Status);
      else if (data?.ok) setSt(data as Status);
      if (data?.settings?.targetLeads) setTarget(String(data.settings.targetLeads));
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
    const t = setInterval(() => call({ action: 'status' }), 15000);
    return () => clearInterval(t);
  }, [call]);

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

  return (
    <Card className="p-4 space-y-4 border-primary/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">Autopilot discovery engine</h2>
            <p className="text-xs text-muted-foreground">
              Server-side planner → search → dedupe → enrich → contacts → calling list. Runs every minute even with the browser closed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{st.settings.autopilot ? 'ON' : 'OFF'}</span>
          <Switch
            checked={st.settings.autopilot}
            disabled={!!acting}
            onCheckedChange={(v) => call({ action: v ? 'start' : 'stop' }, 'toggle')}
          />
          <Button size="sm" variant="outline" disabled={!!acting} onClick={() => call({ action: 'tick' }, 'tick')}>
            {acting === 'tick' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="ml-1">Run now</span>
          </Button>
          <Button size="sm" variant="ghost" disabled={!!acting} onClick={() => call({ action: 'status' }, 'status')}>
            <RefreshCw className={`h-4 w-4 ${acting === 'status' ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" variant="ghost" disabled={!!acting} onClick={() => call({ action: 'reset' }, 'reset')} title="Release worker lock, requeue stuck jobs, clear cooldowns">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {st.settings.pausedReason && (
        <div className="text-xs rounded-md bg-amber-50 text-amber-800 px-3 py-2">
          Paused: {st.settings.pausedReason}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span className="tabular-nums">{p.leads.toLocaleString()} / {p.target.toLocaleString()} ({p.pct}%)</span>
        </div>
        <Progress value={p.pct} />
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
        </div>
      </div>

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="Channels" value={p.channels.toLocaleString()} />
        <Stat label="Qualified" value={p.qualified.toLocaleString()} />
        <Stat label="Phones" value={p.phones.toLocaleString()} />
        <Stat label="Emails" value={p.emails.toLocaleString()} />
        <Stat label="Calling list" value={p.callingLeads.toLocaleString()} />
        <Stat label="Units today" value={st.api.unitsToday.toLocaleString()} />
        <Stat label="API failures" value={st.api.failures.toLocaleString()} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border p-3 space-y-1">
          <div className="text-xs font-medium">Search frontier</div>
          <div className="text-xs text-muted-foreground">New {st.frontier.new} · Active {st.frontier.active} · Retired {st.frontier.retired}</div>
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
    </Card>
  );
};

export default AutopilotPanel;
