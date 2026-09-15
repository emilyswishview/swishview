import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/looseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, Trash2, Copy, Plus } from 'lucide-react';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export default function RoadmapsSection() {
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [channelUrl, setChannelUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('roadmaps').select('*').order('created_at', { ascending: false });
    setRoadmaps(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
      while ((await supabase.from('roadmaps').select('id').eq('slug', slug).maybeSingle()).data) {
        slug = `${base}-${++n}`;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('roadmaps').insert({
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
      });
      if (error) throw error;
      toast({ title: 'Roadmap created', description: `/roadmap/${slug}` });
      setChannelUrl('');
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this roadmap?')) return;
    await supabase.from('roadmaps').delete().eq('id', id);
    load();
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/roadmap/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: url });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Client Roadmaps</h2>
        <p className="text-sm text-gray-600 mt-1">Generate a shareable growth roadmap page for any YouTube channel.</p>
      </div>

      <Card className="p-6">
        <label className="text-sm font-medium text-gray-700 mb-2 block">YouTube Channel URL or Handle</label>
        <div className="flex gap-2">
          <Input
            placeholder="https://youtube.com/@channelname"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <Button onClick={create} disabled={creating || !channelUrl.trim()} className="bg-orange-500 hover:bg-orange-600">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />Create</>}
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roadmaps.map((r) => (
            <Card key={r.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                {r.channel_thumbnail && (
                  <img src={r.channel_thumbnail} alt="" className="w-12 h-12 rounded-full" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{r.channel_name}</div>
                  <div className="text-xs text-gray-500 truncate">/roadmap/{r.slug}</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 mb-3">
                {r.subscribers?.toLocaleString()} subs · {r.total_views?.toLocaleString()} views
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => copyLink(r.slug)}>
                  <Copy className="w-3 h-3 mr-1" />Copy
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`/roadmap/${r.slug}`, '_blank')}>
                  <ExternalLink className="w-3 h-3 mr-1" />Open
                </Button>
                <Button size="sm" variant="outline" onClick={() => del(r.id)}>
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
          {roadmaps.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">No roadmaps yet. Create one above.</div>
          )}
        </div>
      )}
    </div>
  );
}
