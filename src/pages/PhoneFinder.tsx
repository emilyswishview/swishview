import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/looseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Phone, Search, Loader2, Download, StopCircle, PhoneCall, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AutopilotPanel from '@/components/phone/AutopilotPanel';

type Row = {
  channelId: string;
  title: string;
  url: string;
  thumbnail?: string;
  keyword: string;
  status: 'queued' | 'scanning' | 'found' | 'none' | 'error' | 'duplicate';
  phone?: string;
  subscribers?: number;
  totalViews?: number;
  country?: string;
  error?: string;
};

const LS_KEY = 'phoneFinder.settings';
const LS_SEEN = 'phoneFinder.seenChannels';

type Settings = {
  query: string;
  perKeyword: string;   // YouTube page size (max 50)
  pages: string;        // pages per keyword per round
  cap: string;          // total channels to scrape before stopping
  minSubs: string;
  maxSubs: string;
  country: string;      // ISO code filter applied after enrichment
  regionCode: string;   // YouTube search regionCode
  language: string;     // relevanceLanguage
  order: 'relevance' | 'viewCount' | 'date' | 'videoCount';
  concurrency: string;
  continuous: boolean;
  onlySaveWithPhone: boolean;
};

const DEFAULTS: Settings = {
  query: '',
  perKeyword: '50',
  pages: '4',
  cap: '1000',
  minSubs: '1000',
  maxSubs: '',
  country: '',
  regionCode: '',
  language: '',
  order: 'relevance',
  concurrency: '6',
  continuous: true,
  onlySaveWithPhone: true,
};

const PhoneFinder = () => {
  const { toast } = useToast();
  const [s, setS] = useState<Settings>(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') }; } catch { return DEFAULTS; }
  });
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS(prev => ({ ...prev, [k]: v }));

  const [rows, setRows] = useState<Row[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'searching' | 'scanning' | 'waiting' | 'done'>('idle');
  const [saved, setSaved] = useState(0);
  const [scannedTotal, setScannedTotal] = useState(0);
  const [dupes, setDupes] = useState(0);
  const [units, setUnits] = useState(0);
  const [keys, setKeys] = useState<{ total: number; available: number } | null>(null);

  const cancelRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(s)); }, [s]);
  useEffect(() => {
    try { seenRef.current = new Set(JSON.parse(localStorage.getItem(LS_SEEN) || '[]')); } catch {}
  }, []);
  const persistSeen = () => {
    try { localStorage.setItem(LS_SEEN, JSON.stringify(Array.from(seenRef.current).slice(-20000))); } catch {}
  };

  const addLog = (m: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${m}`, ...l].slice(0, 400));

  const withPhone = useMemo(() => rows.filter((r) => r.status === 'found'), [rows]);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.channelId === id ? { ...r, ...patch } : r)));

  const saveLead = async (row: Row): Promise<'saved' | 'duplicate' | 'error'> => {
    const payload = {
      channel_id: row.channelId,
      channel_name: row.title,
      channel_link: row.url,
      thumbnail: row.thumbnail || null,
      phone: row.phone,
      subscribers: row.subscribers ?? 0,
      total_views: row.totalViews ?? 0,
      country: row.country || null,
      keyword: row.keyword,
      source: 'phone-tool',
      call_status: 'new',
    };
    const { error } = await supabase.from('calling_leads').insert(payload);
    if (!error) return 'saved';
    // 23505 = unique violation (channel or phone already collected)
    if (String(error.code) === '23505' || /duplicate key/i.test(error.message)) return 'duplicate';
    addLog(`⚠ save failed for ${row.title}: ${error.message}`);
    return 'error';
  };

  const scrapeBatch = async (batch: Row[], concurrency: number) => {
    let idx = 0;
    await Promise.all(
      Array.from({ length: Math.min(concurrency, batch.length) }, async () => {
        while (idx < batch.length && !cancelRef.current) {
          const row = batch[idx++];
          update(row.channelId, { status: 'scanning' });
          try {
            const { data: info, error: err } = await supabase.functions.invoke('youtube-channel-info', {
              body: { channelUrl: row.url, includeVideos: true, maxVideos: 6, phoneOnly: true },
            });

            if (err || info?.error) throw new Error(info?.error || err?.message);
            const phone = String(info?.phone || '').trim();
            const enriched: Row = {
              ...row,
              phone,
              subscribers: info?.subscribers ?? row.subscribers,
              totalViews: info?.totalViews ?? row.totalViews,
              country: info?.country || row.country,
            };
            setScannedTotal(n => n + 1);
            if (phone) {
              const res = await saveLead(enriched);
              if (res === 'duplicate') setDupes(n => n + 1);
              if (res === 'saved') setSaved(n => n + 1);
              update(row.channelId, {
                ...enriched,
                status: res === 'duplicate' ? 'duplicate' : 'found',
              });
              addLog(res === 'duplicate'
                ? `↺ ${row.title} → ${phone} (already in calling list)`
                : `✅ ${row.title} → ${phone} (added to calling leads)`);
            } else {
              update(row.channelId, { ...enriched, status: 'none' });
            }
          } catch (e: any) {
            setScannedTotal(n => n + 1);
            update(row.channelId, { status: 'error', error: e?.message || 'failed' });
          }
        }
      }),
    );
  };

  const run = async () => {
    const keywords = s.query.split(/[,\n]/).map((k) => k.trim()).filter(Boolean);
    if (!keywords.length) return;

    cancelRef.current = false;
    setBusy(true);
    setRows([]);
    setLog([]);
    setSaved(0);
    setDupes(0);
    setScannedTotal(0);
    setUnits(0);


    const cap = Math.max(1, Number(s.cap) || 1000);
    const concurrency = Math.min(20, Math.max(1, Number(s.concurrency) || 6));
    const minSubs = Number(s.minSubs) || 0;
    const maxSubs = Number(s.maxSubs) || 0;
    const countryFilter = s.country.trim().toUpperCase();

    let pageTokens: Record<string, string> = {};
    let processed = 0;
    let round = 0;

    addLog(`Starting: ${keywords.length} keyword(s), cap ${cap} channels, min subs ${minSubs || 'any'}${s.continuous ? ', continuous mode ON' : ''}`);

    while (!cancelRef.current && processed < cap) {
      round++;
      setPhase('searching');
      const { data, error } = await supabase.functions.invoke('youtube-keyword-search', {
        body: {
          keywords,
          pages: Number(s.pages) || 1,
          order: s.order,
          regionCode: s.regionCode.trim(),
          relevanceLanguage: s.language.trim(),
          pageTokens,
          exclude: Array.from(seenRef.current).slice(-4000),
        },
      });

      if (error || data?.error) {
        addLog(`Search failed: ${data?.error || error?.message}`);
        if (data?.keys) setKeys(data.keys);
        break;
      }

      if (data.keys) setKeys(data.keys);
      if (typeof data.unitsUsed === 'number') setUnits(u => u + data.unitsUsed);
      (data.perKeyword || []).forEach((p: any) =>
        addLog(`round ${round} · "${p.keyword}" → ${p.found} new${p.error ? ` (error: ${p.error})` : ''}`));

      if (data.quotaExhausted) {
        addLog('⛔ Every API key hit its daily quota — add another Google Cloud project key (YOUTUBE_API_KEY_2, _3, …) to keep going.');
        toast({ title: 'YouTube quota exhausted', description: 'Add more API keys to continue scraping.', variant: 'destructive' });
        break;
      }

      pageTokens = data.pageTokens || {};


      const all: Row[] = (data.channels || []).map((c: any) => ({
        channelId: c.channelId,
        title: c.title,
        url: c.url,
        thumbnail: c.thumbnail,
        keyword: c.keyword,
        subscribers: c.subscribers,
        totalViews: c.totalViews,
        country: c.country,
        status: 'queued' as const,
      }));

      // De-dup against everything we've already looked at, then apply filters.
      const fresh = all.filter(r => !seenRef.current.has(r.channelId));
      fresh.forEach(r => seenRef.current.add(r.channelId));
      persistSeen();

      const filtered = fresh.filter(r => {
        const subs = r.subscribers ?? 0;
        if (minSubs && subs < minSubs) return false;
        if (maxSubs && subs > maxSubs) return false;
        if (countryFilter && (r.country || '').toUpperCase() !== countryFilter) return false;
        return true;
      });

      const batch = filtered.slice(0, Math.max(0, cap - processed));
      addLog(`round ${round}: ${fresh.length} new channel(s), ${filtered.length} pass filters, scraping ${batch.length}`);

      if (batch.length) {
        setRows(rs => [...batch, ...rs].slice(0, 1500));
        setPhase('scanning');
        await scrapeBatch(batch, concurrency);
        processed += batch.length;
      }

      const hasMore = Object.keys(pageTokens).length > 0;
      if (!hasMore) {
        if (!s.continuous) break;
        // Continuous mode: start the keyword walk over with a fresh order so the
        // scraper keeps discovering channels in the background.
        pageTokens = {};
        setPhase('waiting');
        addLog('No more pages for these keywords — restarting the walk in 20s (continuous mode).');
        for (let i = 0; i < 20 && !cancelRef.current; i++) {
          await new Promise(res => setTimeout(res, 1000));
        }
      }
    }

    addLog(cancelRef.current
      ? `Stopped. ${saved} lead(s) added to Calling section.`
      : `Finished. Scraped ${processed} channels.`);
    setPhase('done');
    setBusy(false);
    toast({ title: 'Phone scan finished', description: `${processed} channels scanned.` });
  };

  const exportCsv = () => {
    const header = 'Channel,Phone,Subscribers,Country,Keyword,URL\n';
    const body = withPhone
      .map((r) =>
        [r.title, r.phone, r.subscribers ?? '', r.country ?? '', r.keyword, r.url]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `youtube-phones-${Date.now()}.csv`;
    a.click();
  };

  const badge = (st: Row['status']) => {
    const map: Record<Row['status'], string> = {
      queued: 'bg-muted text-muted-foreground',
      scanning: 'bg-blue-100 text-blue-700',
      found: 'bg-green-100 text-green-700',
      duplicate: 'bg-amber-100 text-amber-700',
      none: 'bg-gray-100 text-gray-600',
      error: 'bg-red-100 text-red-700',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[st]}`}>{st}</span>;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Phone className="h-6 w-6" /> Keyword → Channel Phone Finder
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Finds matching YouTube channels, scrapes public contact numbers and pushes every hit
              straight into the Calling section of /prospects (no duplicates).
            </p>
          </div>
          <Button variant="outline" onClick={() => window.open('/prospects', '_blank')}>
            <PhoneCall className="h-4 w-4 mr-2" /> Open Calling list
          </Button>
        </header>

        <AutopilotPanel />

        <Card className="p-4 space-y-4">
          <Input
            value={s.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="e.g. tech reviews india, cooking vlogs, fitness coach"
            disabled={busy}
          />

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Results per page (fixed)</label>
              <Input value="50" disabled readOnly title="search.list costs 100 units per call regardless of page size, so we always pull 50" />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Pages per round</label>
              <Input value={s.pages} inputMode="numeric" disabled={busy}
                onChange={(e) => set('pages', e.target.value.replace(/\D/g, ''))} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Total cap (channels)</label>
              <Input value={s.cap} inputMode="numeric" disabled={busy}
                onChange={(e) => set('cap', e.target.value.replace(/\D/g, ''))} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Parallel scrapes</label>
              <Input value={s.concurrency} inputMode="numeric" disabled={busy}
                onChange={(e) => set('concurrency', e.target.value.replace(/\D/g, ''))} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Min subscribers</label>
              <Input value={s.minSubs} inputMode="numeric" disabled={busy}
                onChange={(e) => set('minSubs', e.target.value.replace(/\D/g, ''))} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Max subscribers</label>
              <Input value={s.maxSubs} inputMode="numeric" placeholder="any" disabled={busy}
                onChange={(e) => set('maxSubs', e.target.value.replace(/\D/g, ''))} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Country (ISO, e.g. IN/US)</label>
              <Input value={s.country} placeholder="any" disabled={busy}
                onChange={(e) => set('country', e.target.value.toUpperCase().slice(0, 2))} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Search region</label>
              <Input value={s.regionCode} placeholder="any" disabled={busy}
                onChange={(e) => set('regionCode', e.target.value.toUpperCase().slice(0, 2))} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Language (e.g. en/hi)</label>
              <Input value={s.language} placeholder="any" disabled={busy}
                onChange={(e) => set('language', e.target.value.toLowerCase().slice(0, 5))} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Sort by</label>
              <select
                value={s.order}
                disabled={busy}
                onChange={(e) => set('order', e.target.value as Settings['order'])}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="relevance">Relevance</option>
                <option value="viewCount">View count</option>
                <option value="date">Newest</option>
                <option value="videoCount">Video count</option>
              </select>
            </div>
            <label className="flex items-end gap-2 text-sm pb-2">
              <input type="checkbox" checked={s.continuous} disabled={busy}
                onChange={(e) => set('continuous', e.target.checked)} />
              Keep scraping continuously
            </label>
          </div>

          <div className="flex flex-wrap gap-3 items-center pt-1">
            <Button onClick={run} disabled={busy || !s.query.trim()}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              {busy ? 'Working…' : 'Find & add to Calling'}
            </Button>
            {busy && (
              <Button variant="outline" onClick={() => { cancelRef.current = true; }}>
                <StopCircle className="h-4 w-4 mr-2" /> Stop
              </Button>
            )}
            {withPhone.length > 0 && (
              <Button variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-2" /> Export {withPhone.length} contacts
              </Button>
            )}
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => { seenRef.current = new Set(); persistSeen(); addLog('Cleared local seen-channel memory.'); }}
              title="Forget which channels were already scanned locally"
            >
              <Filter className="h-4 w-4 mr-2" /> Reset scanned memory
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Phase: <b>{phase}</b> · scanned {scannedTotal} · <b className="text-green-600">{saved}</b> added to Calling ·{' '}
            {dupes} duplicate(s) skipped · ~{units} quota units used
            {keys && (
              <> · API keys: <b className={keys.available ? 'text-green-600' : 'text-red-600'}>{keys.available}</b>/{keys.total} available</>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Quota tip: each keyword page costs 100 units (10,000/day per Google Cloud project), so one project ≈ 100 pages ≈ 5,000 channels/day.
            Add more projects as <code>YOUTUBE_API_KEY_2</code>, <code>YOUTUBE_API_KEY_3</code>… (or a comma-separated <code>YOUTUBE_API_KEYS</code>)
            and the scraper rotates keys automatically when one runs dry.
          </p>

        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-0 overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">Scanned channels</div>
            <div className="max-h-[55vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3">Channel</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-left p-3">Subs</th>
                    <th className="text-left p-3">Country</th>
                    <th className="text-left p-3">Keyword</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No results yet.</td></tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.channelId} className={`border-t ${r.status === 'found' ? 'bg-green-50/60' : ''}`}>
                      <td className="p-3">
                        <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline font-medium">
                          {r.title}
                        </a>
                      </td>
                      <td className="p-3 font-mono">{r.phone || '—'}</td>
                      <td className="p-3">{r.subscribers?.toLocaleString() ?? '—'}</td>
                      <td className="p-3">{r.country || '—'}</td>
                      <td className="p-3 text-muted-foreground">{r.keyword}</td>
                      <td className="p-3">{badge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">Live process log</div>
            <div className="max-h-[55vh] overflow-auto p-3 space-y-1 text-xs font-mono">
              {log.length === 0 && <div className="text-muted-foreground">Waiting to start…</div>}
              {log.map((l, i) => (
                <div key={i} className="text-muted-foreground">{l}</div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PhoneFinder;
