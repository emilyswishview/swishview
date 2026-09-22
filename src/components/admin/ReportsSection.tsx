import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/looseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, Trash2, Copy, Plus, FileText, Pencil, X } from 'lucide-react';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// admin_notes is stored as JSON: { notes, seoFeedback }. Fallback: plain text = notes only.
const parseNotes = (raw: any): { notes: string; seoFeedback: string } => {
  if (!raw) return { notes: '', seoFeedback: '' };
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && ('notes' in p || 'seoFeedback' in p)) {
        return { notes: p.notes || '', seoFeedback: p.seoFeedback || '' };
      }
    } catch {}
    return { notes: raw, seoFeedback: '' };
  }
  return { notes: raw?.notes || '', seoFeedback: raw?.seoFeedback || '' };
};
const packNotes = (notes: string, seoFeedback: string) =>
  JSON.stringify({ notes: notes.trim(), seoFeedback: seoFeedback.trim() });

export default function ReportsSection() {
  const [reports, setReports] = useState<any[]>([]);
  const [channelUrl, setChannelUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [seoFeedback, setSeoFeedback] = useState('');
  const [recs, setRecs] = useState<string[]>(['']);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cleanRecs = (arr: string[]) => arr.map((r) => r.trim()).filter(Boolean);

  const create = async () => {
    if (!channelUrl.trim()) return;
    setCreating(true);
    try {
      const { data: yt, error: ytErr } = await supabase.functions.invoke('youtube-channel-info', {
        body: { channelUrl: channelUrl.trim(), includeVideos: false },
      });
      if (ytErr || yt?.error) throw new Error(yt?.error || ytErr?.message || 'Failed to fetch channel');

      let base = slugify(yt.channelName || 'channel');
      let slug = base;
      let n = 1;
      while ((await supabase.from('reports').select('id').eq('slug', slug).maybeSingle()).data) {
        slug = `${base}-${++n}`;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('reports').insert({
        slug,
        channel_url: channelUrl.trim(),
        channel_id: yt.channelId,
        channel_name: yt.channelName,
        channel_handle: yt.customUrl,
        channel_thumbnail: yt.thumbnail,
        subscribers: yt.subscribers,
        total_views: yt.totalViews,
        video_count: yt.videoCount,
        description: yt.description,
        created_by: user?.id,
        admin_notes: packNotes(notes, seoFeedback),
        recommendations: cleanRecs(recs),
      });
      if (error) throw error;
      toast({ title: 'Report created', description: `/report/${slug}` });
      setChannelUrl('');
      setNotes('');
      setSeoFeedback('');
      setRecs(['']);
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    await supabase.from('reports').delete().eq('id', id);
    load();
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/report/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: url });
  };

  const openEdit = (r: any) => {
    const parsed = parseNotes(r.admin_notes);
    setEditing({
      ...r,
      _notes: parsed.notes,
      _seoFeedback: parsed.seoFeedback,
      recommendations: Array.isArray(r.recommendations) && r.recommendations.length ? r.recommendations : [''],
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase.from('reports')
      .update({
        admin_notes: packNotes(editing._notes || '', editing._seoFeedback || ''),
        recommendations: cleanRecs(editing.recommendations),
      })
      .eq('id', editing.id);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved' });
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-orange-500" /> Channel Growth Reports
        </h2>
        <p className="text-sm text-gray-600 mt-1">Generate a beautiful, personalized SwishView growth report for any YouTube channel.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">YouTube Channel URL or Handle</label>
          <div className="flex gap-2">
            <Input
              placeholder="https://youtube.com/@channelname"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && create()}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Analyst Notes (optional)</label>
          <Textarea
            placeholder="Free-form analyst summary shown at the bottom of the report..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            SEO Feedback (optional — leave blank to show "NA" on the report)
          </label>
          <Textarea
            placeholder="Manual SEO feedback — appears as section 12 on the report. You can also add this later via Edit."
            value={seoFeedback}
            onChange={(e) => setSeoFeedback(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Recommendations (optional)</label>
          <div className="space-y-2">
            {recs.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Recommendation ${i + 1}`}
                  value={r}
                  onChange={(e) => setRecs(recs.map((x, idx) => idx === i ? e.target.value : x))}
                />
                <Button variant="outline" size="icon" onClick={() => setRecs(recs.filter((_, idx) => idx !== i))} disabled={recs.length <= 1}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setRecs([...recs, ''])}>
              <Plus className="w-3 h-3 mr-1" /> Add recommendation
            </Button>
          </div>
        </div>

        <Button onClick={create} disabled={creating || !channelUrl.trim()} className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Generate Report</>}
        </Button>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <Card key={r.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                {r.channel_thumbnail && (
                  <img src={r.channel_thumbnail} alt="" className="w-12 h-12 rounded-full" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{r.channel_name}</div>
                  <div className="text-xs text-gray-500 truncate">/report/{r.slug}</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 mb-3">
                {Number(r.subscribers).toLocaleString()} subs · {Number(r.total_views).toLocaleString()} views
                {Array.isArray(r.recommendations) && r.recommendations.length > 0 && (
                  <span className="ml-2 inline-block px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px]">
                    {r.recommendations.length} rec
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => copyLink(r.slug)}>
                  <Copy className="w-3 h-3 mr-1" />Copy
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(`/report/${r.slug}`, '_blank')}>
                  <ExternalLink className="w-3 h-3 mr-1" />Open
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                  <Pencil className="w-3 h-3 mr-1" />Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => del(r.id)}>
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
          {reports.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">No reports yet. Generate one above.</div>
          )}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit report notes · {editing?.channel_name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Analyst Notes</label>
                <Textarea
                  value={editing._notes}
                  onChange={(e) => setEditing({ ...editing, _notes: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  SEO Feedback <span className="text-orange-600">(section 12 on report)</span>
                </label>
                <Textarea
                  placeholder="Leave blank to display 'NA' on the report."
                  value={editing._seoFeedback}
                  onChange={(e) => setEditing({ ...editing, _seoFeedback: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Recommendations</label>
                <div className="space-y-2">
                  {editing.recommendations.map((r: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={r}
                        onChange={(e) => setEditing({
                          ...editing,
                          recommendations: editing.recommendations.map((x: string, idx: number) => idx === i ? e.target.value : x),
                        })}
                      />
                      <Button variant="outline" size="icon" onClick={() => setEditing({
                        ...editing,
                        recommendations: editing.recommendations.filter((_: any, idx: number) => idx !== i),
                      })} disabled={editing.recommendations.length <= 1}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setEditing({
                    ...editing,
                    recommendations: [...editing.recommendations, ''],
                  })}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} className="bg-orange-500 hover:bg-orange-600">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
