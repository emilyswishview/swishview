import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, Eye, Video, ExternalLink, User, Loader2, Play, Calendar, Target, DollarSign, TrendingUp, CreditCard, CheckCircle, Pencil, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { extractVideoId, fetchVideoViewCount } from '@/utils/youtube';

type PromotionStatus = Database["public"]["Enums"]["promotion_status"];

interface Campaign {
  id: string;
  title: string;
  user_id: string;
  status: PromotionStatus;
  budget: number;
  target_views: number;
  current_views: number;
  starting_views: number;
  youtube_video_url: string;
  target_audience: string | null;
  campaign_duration: number;
  created_at: string;
  channel_url: string | null;
  payment_status?: 'paid' | 'not_paid';
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  channel_name: string | null;
  channel_url: string | null;
}

interface CampaignFormData {
  title: string;
  youtube_video_url: string;
  target_views: string;
  budget: string;
  target_audience: string;
  campaign_duration: string;
  starting_views: string;
  channel_url: string;
}

const defaultFormData: CampaignFormData = {
  title: '',
  youtube_video_url: '',
  target_views: '',
  budget: '',
  target_audience: '',
  campaign_duration: '30',
  starting_views: '0',
  channel_url: '',
};

// Reusable campaign form with live preview
const CampaignFormDialog = ({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  submitting,
  userName,
  mode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: CampaignFormData;
  setForm: (f: CampaignFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  userName: string;
  mode: 'create' | 'edit';
}) => {
  const [fetchingViews, setFetchingViews] = useState(false);
  const { toast } = useToast();

  const videoId = extractVideoId(form.youtube_video_url);

  const fetchLiveViews = async () => {
    if (!videoId) {
      toast({ title: 'Invalid URL', description: 'Enter a valid YouTube video URL first', variant: 'destructive' });
      return;
    }
    setFetchingViews(true);
    try {
      const views = await fetchVideoViewCount(videoId);
      if (views !== null) {
        setForm({ ...form, starting_views: views.toString() });
        toast({ title: 'Views Fetched', description: `Current views: ${views.toLocaleString()}` });
      } else {
        toast({ title: 'Error', description: 'Could not fetch views', variant: 'destructive' });
      }
    } finally {
      setFetchingViews(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create' : 'Edit'} Campaign for {userName}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'This campaign will appear on the user\'s dashboard.' : 'Update campaign details.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Campaign Title *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Growth Campaign" required />
          </div>
          <div className="space-y-2">
            <Label>YouTube Video URL *</Label>
            <Input value={form.youtube_video_url} onChange={e => setForm({ ...form, youtube_video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." required />
          </div>

          {/* Live Video Preview */}
          {videoId && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Video Preview</Label>
              <div className="rounded-lg overflow-hidden border">
                <YouTubeEmbed url={form.youtube_video_url} title="Preview" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Channel URL</Label>
            <Input value={form.channel_url} onChange={e => setForm({ ...form, channel_url: e.target.value })} placeholder="https://youtube.com/@channel" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Views *</Label>
              <Input type="number" value={form.target_views} onChange={e => setForm({ ...form, target_views: e.target.value })} placeholder="10000" required min="0" />
            </div>
            <div className="space-y-2">
              <Label>Budget ($) *</Label>
              <Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="200" required min="0" step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Starting Views</Label>
              <div className="flex gap-2">
                <Input type="number" value={form.starting_views} onChange={e => setForm({ ...form, starting_views: e.target.value })} placeholder="0" min="0" className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={fetchLiveViews} disabled={fetchingViews || !videoId} className="gap-1 shrink-0">
                  {fetchingViews ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Fetch Live
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Initial view count before promotion starts</p>
            </div>
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Input type="number" value={form.campaign_duration} onChange={e => setForm({ ...form, campaign_duration: e.target.value })} placeholder="30" min="1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Textarea value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })} placeholder="Describe the target audience..." rows={2} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? (mode === 'create' ? 'Creating...' : 'Saving...') : (mode === 'create' ? 'Create Campaign' : 'Save Changes')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const CampaignUserDetail = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [createForm, setCreateForm] = useState<CampaignFormData>({ ...defaultFormData });
  const [editForm, setEditForm] = useState<CampaignFormData>({ ...defaultFormData });

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: profileData, error: profileErr }, { data: promos, error: promoErr }] = await Promise.all([
        (supabase as any).rpc('get_campaign_management_client', { _client_id: userId }),
        supabase
        .from('promotions')
        .select('id, title, user_id, status, budget, target_views, current_views, starting_views, youtube_video_url, target_audience, campaign_duration, created_at, channel_url')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      ]);

      if (profileErr) throw profileErr;
      if (promoErr) throw promoErr;

      setUser((profileData?.[0] as UserProfile | undefined) || null);

      const campaignIds = (promos || []).map((promo) => promo.id);

      const { data: payments, error: paymentsErr } = campaignIds.length
        ? await supabase
            .from('payments')
            .select('campaign_id, status')
            .in('campaign_id', campaignIds)
            .eq('status', 'completed')
        : { data: [], error: null };

      if (paymentsErr) throw paymentsErr;

      const payMap: Record<string, string> = {};
      payments?.forEach(p => { payMap[p.campaign_id] = 'paid'; });

      const campaignsWithPayment = (promos || []).map(p => ({
        ...p,
        payment_status: (payMap[p.id] || 'not_paid') as 'paid' | 'not_paid',
      }));

      setCampaigns(campaignsWithPayment);
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { error } = await supabase.from('promotions').insert([{
        user_id: userId,
        title: createForm.title,
        youtube_video_url: createForm.youtube_video_url,
        target_views: parseInt(createForm.target_views) || 0,
        budget: parseFloat(createForm.budget) || 0,
        target_audience: createForm.target_audience || null,
        campaign_duration: parseInt(createForm.campaign_duration) || 30,
        starting_views: parseInt(createForm.starting_views) || 0,
        channel_url: createForm.channel_url || null,
        status: 'pending' as PromotionStatus,
      }]);
      if (error) throw error;
      toast({ title: 'Success', description: 'Campaign created successfully' });
      setShowCreateForm(false);
      setCreateForm({ ...defaultFormData });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const openEditForm = (campaign: Campaign) => {
    setEditForm({
      title: campaign.title,
      youtube_video_url: campaign.youtube_video_url,
      target_views: campaign.target_views.toString(),
      budget: campaign.budget.toString(),
      target_audience: campaign.target_audience || '',
      campaign_duration: (campaign.campaign_duration || 30).toString(),
      starting_views: (campaign.starting_views || 0).toString(),
      channel_url: campaign.channel_url || '',
    });
    setEditingCampaign(campaign);
  };

  const handleEditCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setEditing(true);
    try {
      const { error } = await supabase.from('promotions').update({
        title: editForm.title,
        youtube_video_url: editForm.youtube_video_url,
        target_views: parseInt(editForm.target_views) || 0,
        budget: parseFloat(editForm.budget) || 0,
        target_audience: editForm.target_audience || null,
        campaign_duration: parseInt(editForm.campaign_duration) || 30,
        starting_views: parseInt(editForm.starting_views) || 0,
        channel_url: editForm.channel_url || null,
      }).eq('id', editingCampaign.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Campaign updated successfully' });
      setEditingCampaign(null);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setEditing(false);
    }
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ status: newStatus as PromotionStatus })
        .eq('id', campaignId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Status updated' });
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: newStatus as PromotionStatus } : c));
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const updatePaymentStatus = async (campaignId: string, paid: boolean) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      if (paid) {
        const { data: existing } = await supabase.from('payments').select('id').eq('campaign_id', campaignId).maybeSingle();
        if (existing) {
          await supabase.from('payments').update({ status: 'completed' as const }).eq('campaign_id', campaignId);
        } else {
          await supabase.from('payments').insert({ campaign_id: campaignId, user_id: userId, amount: campaign.budget, status: 'completed' as const });
        }
        await supabase.from('promotions').update({ status: 'active' as PromotionStatus }).eq('id', campaignId);
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, payment_status: 'paid', status: 'active' as PromotionStatus } : c));
      } else {
        await supabase.from('payments').delete().eq('campaign_id', campaignId);
        await supabase.from('promotions').update({ status: 'pending' as PromotionStatus }).eq('id', campaignId);
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, payment_status: 'not_paid', status: 'pending' as PromotionStatus } : c));
      }
      toast({ title: 'Success', description: `Payment ${paid ? 'marked as paid' : 'removed'}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update payment', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-white';
      case 'completed': return 'bg-blue-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getVideoId = (url: string) => {
    const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const filteredCampaigns = statusFilter === 'all' ? campaigns : campaigns.filter(c => c.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + User Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/campaign-management')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="h-7 w-7 text-gray-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{user?.full_name || 'Unknown User'}</h2>
            <p className="text-gray-500">{user?.email}</p>
            {user?.channel_name && <p className="text-sm text-gray-400">{user.channel_name}</p>}
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2 rounded-full">
            <Plus className="h-4 w-4" /> Add Campaign
          </Button>
        </CardContent>
      </Card>

      {/* Create Form Dialog */}
      <CampaignFormDialog
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={handleCreateCampaign}
        submitting={creating}
        userName={user?.full_name || user?.email || ''}
        mode="create"
      />

      {/* Edit Form Dialog */}
      <CampaignFormDialog
        open={!!editingCampaign}
        onOpenChange={(v) => { if (!v) setEditingCampaign(null); }}
        form={editForm}
        setForm={setEditForm}
        onSubmit={handleEditCampaign}
        submitting={editing}
        userName={user?.full_name || user?.email || ''}
        mode="edit"
      />

      {/* Campaigns Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Campaigns ({campaigns.length})
          </h3>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 rounded-full h-9">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredCampaigns.length === 0 ? (
          <Card className="border border-dashed border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Video className="h-10 w-10 mb-3 text-gray-300" />
              <p className="font-medium">No campaigns {statusFilter !== 'all' ? `with status "${statusFilter}"` : 'yet'}</p>
              <p className="text-sm mt-1">Click "Add Campaign" to create one for this user.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Views (Starting → Current)</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map(campaign => {
                  const viewsGained = Math.max((campaign.current_views || 0) - (campaign.starting_views || 0), 0);
                  const goalTotal = (campaign.starting_views || 0) + (campaign.target_views || 0);
                  const isCompleted = campaign.status === 'completed' || 
                    (goalTotal > 0 && (campaign.current_views || 0) >= goalTotal) ||
                    (campaign.target_views === 0 && viewsGained > 0);
                  const progressPct = campaign.target_views > 0 
                    ? Math.min((viewsGained / campaign.target_views) * 100, 100) 
                    : (isCompleted || viewsGained > 0 ? 100 : 0);

                  return (
                    <TableRow key={campaign.id} className="hover:bg-gray-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getVideoId(campaign.youtube_video_url) ? (
                            <img
                              src={`https://img.youtube.com/vi/${getVideoId(campaign.youtube_video_url)}/default.jpg`}
                              alt=""
                              className="w-16 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center">
                              <Play className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-sm">{campaign.title}</div>
                            {campaign.target_audience && (
                              <div className="text-xs text-gray-400 truncate max-w-40">{campaign.target_audience}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={campaign.status} onValueChange={v => updateCampaignStatus(campaign.id, v)}>
                          <SelectTrigger className="w-28 h-7 rounded-full text-xs p-1">
                            <Badge className={`${getStatusColor(campaign.status)} rounded-full border-0 text-xs`}>
                              {campaign.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={campaign.payment_status || 'not_paid'}
                          onValueChange={v => updatePaymentStatus(campaign.id, v === 'paid')}
                        >
                          <SelectTrigger className="w-28 h-7 rounded-full text-xs p-1">
                            <Badge className={`${campaign.payment_status === 'paid' ? 'bg-green-500' : 'bg-red-500'} text-white rounded-full border-0 text-xs`}>
                              {campaign.payment_status === 'paid' ? 'Paid' : 'Not Paid'}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="not_paid">Not Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-medium text-sm">${campaign.budget}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-gray-500">{(campaign.starting_views || 0).toLocaleString()}</span>
                          <span className="mx-1 text-gray-300">→</span>
                          <span className="font-semibold text-gray-900">{(campaign.current_views || 0).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          +{viewsGained.toLocaleString()} gained
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{(campaign.target_views || 0).toLocaleString()}</TableCell>
                      <TableCell>
                      <div className="w-24">
                          <Progress value={progressPct} className="h-2" />
                          <span className="text-xs text-gray-500">
                            {isCompleted ? '100%' : `${progressPct.toFixed(0)}%`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {format(new Date(campaign.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-full" title="Edit Campaign" onClick={() => openEditForm(campaign)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <a href={campaign.youtube_video_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-full" title="View on YouTube">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dashboard Preview */}
      {campaigns.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Dashboard Preview</CardTitle>
            <CardDescription>How this user sees their campaigns on their dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaigns.map(campaign => {
              const viewsGained = Math.max((campaign.current_views || 0) - (campaign.starting_views || 0), 0);
              const goalTotal = (campaign.starting_views || 0) + (campaign.target_views || 0);
              const isCompleted = campaign.status === 'completed' || 
                (goalTotal > 0 && (campaign.current_views || 0) >= goalTotal) ||
                (campaign.target_views === 0 && viewsGained > 0);
              const progressPct = campaign.target_views > 0 
                ? Math.min((viewsGained / campaign.target_views) * 100, 100) 
                : (isCompleted || viewsGained > 0 ? 100 : 0);
              const isLocked = campaign.status === 'pending';
              const videoId = getVideoId(campaign.youtube_video_url);

              return (
                <Card key={campaign.id} className="border border-gray-100">
                  <CardContent className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      <div className="md:col-span-3">
                        <div className="relative rounded-xl overflow-hidden">
                          {videoId ? (
                            <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt="" className="w-full h-32 object-cover" />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 flex items-center justify-center"><Play className="h-8 w-8 text-gray-300" /></div>
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge variant={isCompleted ? 'default' : campaign.status === 'active' ? 'default' : 'secondary'}>
                              {isCompleted ? 'completed' : campaign.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-9 space-y-4">
                        <div>
                          <h4 className="font-bold text-gray-900">{campaign.title}</h4>
                          <p className="text-sm text-gray-500">{campaign.target_audience || 'General Audience'}</p>
                        </div>

                        <div className={`${isLocked ? 'blur-sm' : ''} relative`}>
                          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 flex items-center gap-1"><Eye className="h-3 w-3" /> YouTube View Tracking</span>
                              {!isCompleted && campaign.status === 'active' && (
                                <span className="text-green-600 text-xs flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-400">Starting views</p>
                                <p className="font-bold">{(campaign.starting_views || 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Current views</p>
                                <p className="font-bold">{(campaign.current_views || 0).toLocaleString()}</p>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Views Gained</span>
                              <span className="text-green-600 font-medium">+{viewsGained.toLocaleString()} / {campaign.target_views.toLocaleString()}</span>
                              </div>
                              <Progress value={progressPct} className="h-2" />
                              <span className="text-xs text-gray-400">
                                {isCompleted ? 'Campaign Completed' : `${progressPct.toFixed(1)}% complete`}
                              </span>
                            </div>
                          </div>

                          {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                              <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-xl max-w-xs">
                                <CreditCard className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                                <p className="text-sm font-medium text-orange-800">Payment Required</p>
                                <p className="text-xs text-orange-600 mt-1">User needs to complete payment to activate</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <Calendar className="h-3 w-3 text-gray-400 mx-auto mb-0.5" />
                            <p className="text-xs text-gray-400">Start Date</p>
                            <p className="text-xs font-semibold">{format(new Date(campaign.created_at), 'MMM dd, yyyy')}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <Target className="h-3 w-3 text-gray-400 mx-auto mb-0.5" />
                            <p className="text-xs text-gray-400">Target Views</p>
                            <p className="text-xs font-semibold">{campaign.target_views.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CampaignUserDetail;
