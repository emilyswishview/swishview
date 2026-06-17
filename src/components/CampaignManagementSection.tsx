import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Eye, Video, ExternalLink, Plus, Pencil, UserCircle, BarChart3, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import UserAnalyticsModal from "@/components/admin/UserAnalyticsModal";
import ChannelAnalytics from "@/components/ChannelAnalytics";
import type { Database } from "@/integrations/supabase/types";

type PromotionStatus = Database["public"]["Enums"]["promotion_status"];

interface Promotion {
  id: string;
  title: string;
  user_id: string;
  status: PromotionStatus;
  budget: number;
  target_views: number;
  current_views: number;
  starting_views: number;
  youtube_video_url: string;
  target_audience: string;
  campaign_duration: number;
  created_at: string;
  promotion_type: 'video' | 'channel';
  channel_url?: string;
  account_manager?: string;
  user?: {
    email: string;
    full_name: string;
  };
  payment_status?: 'paid' | 'not_paid';
}

const CampaignManagementSection = () => {
  const [campaigns, setCampaigns] = useState<Promotion[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState<Promotion | null>(null);
  const [editingStatus, setEditingStatus] = useState<{[key: string]: boolean}>({});
  const [editingPayment, setEditingPayment] = useState<{[key: string]: boolean}>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStartingViews, setEditingStartingViews] = useState<string | null>(null);
  const [startingViewsValue, setStartingViewsValue] = useState("");
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [detailsUser, setDetailsUser] = useState<{id: string; email: string; full_name: string; role: string; created_at: string} | null>(null);
  const [showChannelAnalytics, setShowChannelAnalytics] = useState(false);
  const [analyticsUser, setAnalyticsUser] = useState<{id: string; email: string; full_name: string} | null>(null);
  const { toast } = useToast();

  // Create form state
  const [users, setUsers] = useState<{id: string; email: string; full_name: string}[]>([]);
  const [createForm, setCreateForm] = useState({
    user_id: "",
    title: "",
    youtube_video_url: "",
    target_views: "",
    budget: "",
    target_audience: "",
    campaign_duration: "30",
    starting_views: "0",
    channel_url: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchUsers();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm, statusFilter]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .order("email");
    if (!error && data) setUsers(data);
  };

  const fetchCampaigns = async () => {
    try {
      const { data: promotionsData, error: promotionsError } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });

      if (promotionsError) throw promotionsError;

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (profilesError) throw profilesError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("campaign_id, status")
        .eq("status", "completed");

      if (paymentsError) throw paymentsError;

      const profilesMap = profilesData.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const paymentsMap = paymentsData.reduce((acc, payment) => {
        acc[payment.campaign_id] = 'paid';
        return acc;
      }, {} as Record<string, 'paid'>);

      const campaignsWithUsers = promotionsData.map(promotion => ({
        ...promotion,
        user: profilesMap[promotion.user_id],
        payment_status: paymentsMap[promotion.id] || 'not_paid' as const,
        promotion_type: (promotion.promotion_type || 'video') as 'video' | 'channel'
      }));

      setCampaigns(campaignsWithUsers);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast({ title: "Error", description: "Failed to fetch campaigns", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filterCampaigns = () => {
    let filtered = campaigns;
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    setFilteredCampaigns(filtered);
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      setEditingStatus({...editingStatus, [campaignId]: true});
      const { error } = await supabase
        .from("promotions")
        .update({ status: newStatus as PromotionStatus })
        .eq("id", campaignId);
      if (error) throw error;
      toast({ title: "Success", description: "Campaign status updated" });
      setCampaigns(campaigns.map(c => c.id === campaignId ? { ...c, status: newStatus as PromotionStatus } : c));
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setEditingStatus({...editingStatus, [campaignId]: false});
    }
  };

  const updatePaymentStatus = async (campaignId: string, newPaymentStatus: 'paid' | 'not_paid') => {
    try {
      setEditingPayment({...editingPayment, [campaignId]: true});
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) throw new Error("Campaign not found");

      if (newPaymentStatus === 'paid') {
        const { data: existingPayment, error: checkError } = await supabase
          .from("payments").select("id").eq("campaign_id", campaignId).maybeSingle();
        if (checkError) throw checkError;

        if (existingPayment) {
          await supabase.from("payments").update({ status: 'completed' as const }).eq("campaign_id", campaignId);
        } else {
          await supabase.from("payments").insert({
            campaign_id: campaignId, user_id: campaign.user_id, amount: campaign.budget, status: 'completed' as const,
          });
        }
        await supabase.from("promotions").update({ status: 'active' as PromotionStatus }).eq("id", campaignId);
        toast({ title: "Success", description: "Payment marked as paid and campaign activated" });
        setCampaigns(campaigns.map(c => c.id === campaignId ? { ...c, payment_status: newPaymentStatus, status: 'active' as PromotionStatus } : c));
      } else {
        await supabase.from("payments").delete().eq("campaign_id", campaignId);
        await supabase.from("promotions").update({ status: 'pending' as PromotionStatus }).eq("id", campaignId);
        toast({ title: "Success", description: "Payment removed and campaign set to pending" });
        setCampaigns(campaigns.map(c => c.id === campaignId ? { ...c, payment_status: newPaymentStatus, status: 'pending' as PromotionStatus } : c));
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update payment status", variant: "destructive" });
    } finally {
      setEditingPayment({...editingPayment, [campaignId]: false});
    }
  };

  const updateStartingViews = async (campaignId: string) => {
    try {
      const views = parseInt(startingViewsValue);
      if (isNaN(views) || views < 0) {
        toast({ title: "Invalid", description: "Please enter a valid number", variant: "destructive" });
        return;
      }
      const { error } = await supabase
        .from("promotions")
        .update({ starting_views: views })
        .eq("id", campaignId);
      if (error) throw error;
      toast({ title: "Success", description: "Starting views updated" });
      setCampaigns(campaigns.map(c => c.id === campaignId ? { ...c, starting_views: views } : c));
      setEditingStartingViews(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update starting views", variant: "destructive" });
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.user_id) {
      toast({ title: "Error", description: "Please select a client", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from("promotions").insert([{
        user_id: createForm.user_id,
        title: createForm.title,
        youtube_video_url: createForm.youtube_video_url,
        target_views: parseInt(createForm.target_views),
        budget: parseFloat(createForm.budget),
        target_audience: createForm.target_audience,
        campaign_duration: parseInt(createForm.campaign_duration),
        starting_views: parseInt(createForm.starting_views) || 0,
        channel_url: createForm.channel_url || null,
        status: 'pending' as PromotionStatus,
      }]);
      if (error) throw error;
      toast({ title: "Success", description: "Campaign created for client" });
      setShowCreateForm(false);
      setCreateForm({ user_id: "", title: "", youtube_video_url: "", target_views: "", budget: "", target_audience: "", campaign_duration: "30", starting_views: "0", channel_url: "" });
      fetchCampaigns();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Title", "User Email", "Status", "Payment", "Budget", "Target Views", "Starting Views", "Current Views", "Created"];
    const csvContent = [
      headers.join(","),
      ...filteredCampaigns.map(c =>
        [c.title, c.user?.email || "Unknown", c.status, c.payment_status || "not_paid", c.budget, c.target_views, c.starting_views || 0, c.current_views || 0, format(new Date(c.created_at), "yyyy-MM-dd")].join(",")
      )
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaigns.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500 text-white";
      case "completed": return "bg-blue-500 text-white";
      case "cancelled": return "bg-red-500 text-white";
      case "pending": return "bg-yellow-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded mb-3"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Campaign Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Campaign for Client</DialogTitle>
            <DialogDescription>Fill in the campaign details. Starting views can be set here.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Client *</Label>
              <Select value={createForm.user_id} onValueChange={(v) => setCreateForm({...createForm, user_id: v})}>
                <SelectTrigger><SelectValue placeholder="Choose a client..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Campaign Title *</Label>
              <Input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="e.g. Summer Growth Campaign" required />
            </div>
            <div className="space-y-2">
              <Label>YouTube Video URL *</Label>
              <Input value={createForm.youtube_video_url} onChange={e => setCreateForm({...createForm, youtube_video_url: e.target.value})} placeholder="https://youtube.com/watch?v=..." required />
            </div>
            <div className="space-y-2">
              <Label>Channel URL</Label>
              <Input value={createForm.channel_url} onChange={e => setCreateForm({...createForm, channel_url: e.target.value})} placeholder="https://youtube.com/@channel" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Views *</Label>
                <Input type="number" value={createForm.target_views} onChange={e => setCreateForm({...createForm, target_views: e.target.value})} placeholder="10000" required min="1" />
              </div>
              <div className="space-y-2">
                <Label>Budget ($) *</Label>
                <Input type="number" value={createForm.budget} onChange={e => setCreateForm({...createForm, budget: e.target.value})} placeholder="200" required min="1" step="0.01" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starting Views</Label>
                <Input type="number" value={createForm.starting_views} onChange={e => setCreateForm({...createForm, starting_views: e.target.value})} placeholder="0" min="0" />
                <p className="text-xs text-muted-foreground">Set the initial view count before promotion starts</p>
              </div>
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Input type="number" value={createForm.campaign_duration} onChange={e => setCreateForm({...createForm, campaign_duration: e.target.value})} placeholder="30" min="1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Textarea value={createForm.target_audience} onChange={e => setCreateForm({...createForm, target_audience: e.target.value})} placeholder="Describe the target audience..." rows={2} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create Campaign"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-display">All Campaigns</CardTitle>
              <CardDescription>Manage campaigns, update statuses, and create new ones for clients</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowCreateForm(true)} size="sm" className="rounded-full gap-2">
                <Plus className="h-4 w-4" /> Create Campaign
              </Button>
              <Button onClick={exportToCSV} variant="outline" size="sm" className="rounded-full">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search campaigns, titles, or user emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-full border-gray-200"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-full">
                <SelectValue placeholder="Filter by status" />
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

          <div className="rounded-xl border border-gray-200 overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Starting Views</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No campaigns found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id} className="hover:bg-gray-50/50">
                      <TableCell>
                        <div className="font-medium">{campaign.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-48">{campaign.target_audience}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{campaign.user?.full_name || "Unknown"}</div>
                        <div className="text-sm text-gray-500">{campaign.user?.email || "Unknown"}</div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={campaign.status}
                          onValueChange={(v) => updateCampaignStatus(campaign.id, v)}
                          disabled={editingStatus[campaign.id]}
                        >
                          <SelectTrigger className="w-32 h-8 rounded-full">
                            <Badge className={`${getStatusBadgeColor(campaign.status)} rounded-full border-0`}>
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
                          onValueChange={(v: 'paid' | 'not_paid') => updatePaymentStatus(campaign.id, v)}
                          disabled={editingPayment[campaign.id]}
                        >
                          <SelectTrigger className="w-32 h-8 rounded-full">
                            <Badge className={`${campaign.payment_status === 'paid' ? 'bg-green-500' : 'bg-red-500'} text-white rounded-full border-0`}>
                              {campaign.payment_status === 'paid' ? 'Paid' : 'Not Paid'}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="not_paid">Not Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-medium">${campaign.budget}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {(campaign.current_views || 0).toLocaleString()} / {((campaign.target_views || 0) + (campaign.starting_views || 0)).toLocaleString()}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(((campaign.current_views || 0) / ((campaign.target_views || 0) + (campaign.starting_views || 0))) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingStartingViews === campaign.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={startingViewsValue}
                              onChange={e => setStartingViewsValue(e.target.value)}
                              className="w-24 h-8 text-sm"
                              min="0"
                            />
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => updateStartingViews(campaign.id)}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setEditingStartingViews(null)}>✕</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{(campaign.starting_views || 0).toLocaleString()}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setEditingStartingViews(campaign.id);
                                setStartingViewsValue(String(campaign.starting_views || 0));
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(campaign.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* View Campaign Details */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(campaign)} className="rounded-full" title="Campaign Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{selectedCampaign?.title}</DialogTitle>
                                <DialogDescription>Campaign details</DialogDescription>
                              </DialogHeader>
                              {selectedCampaign && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm font-medium">Client</Label>
                                      <p>{selectedCampaign.user?.full_name} ({selectedCampaign.user?.email})</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Status</Label>
                                      <Badge className={`${getStatusBadgeColor(selectedCampaign.status)} ml-2`}>{selectedCampaign.status}</Badge>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Budget</Label>
                                      <p>${selectedCampaign.budget}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Target Views</Label>
                                      <p>{selectedCampaign.target_views?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Starting Views</Label>
                                      <p>{(selectedCampaign.starting_views || 0).toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Current Views</Label>
                                      <p>{(selectedCampaign.current_views || 0).toLocaleString()}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Target Audience</Label>
                                    <p>{selectedCampaign.target_audience || "Not specified"}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">YouTube Video</Label>
                                    <div className="flex items-center gap-2">
                                      <Video className="h-4 w-4" />
                                      <a href={selectedCampaign.youtube_video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        View Video <ExternalLink className="h-3 w-3 inline ml-1" />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          {/* View User Analytics */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            title="View User Analytics"
                            onClick={() => {
                              setDetailsUser({
                                id: campaign.user_id,
                                email: campaign.user?.email || '',
                                full_name: campaign.user?.full_name || '',
                                role: 'user',
                                created_at: campaign.created_at,
                              });
                              setShowUserDetails(true);
                            }}
                          >
                            <UserCircle className="h-4 w-4" />
                          </Button>
                          {/* View Channel Analytics */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            title="Channel Analytics"
                            onClick={() => {
                              setAnalyticsUser({
                                id: campaign.user_id,
                                email: campaign.user?.email || '',
                                full_name: campaign.user?.full_name || '',
                              });
                              setShowChannelAnalytics(true);
                            }}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              User Details - {detailsUser?.full_name || detailsUser?.email}
            </DialogTitle>
            <DialogDescription>Complete analytics and information overview</DialogDescription>
          </DialogHeader>
          {detailsUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{detailsUser.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-sm">{detailsUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge variant="secondary">{detailsUser.role}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registration</p>
                  <p className="font-medium">{format(new Date(detailsUser.created_at), 'MMM dd, yyyy')}</p>
                </div>
              </div>
              <UserAnalyticsModal user={detailsUser} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Channel Analytics Modal */}
      <Dialog open={showChannelAnalytics} onOpenChange={setShowChannelAnalytics}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Channel Analytics - {analyticsUser?.full_name || analyticsUser?.email}
            </DialogTitle>
            <DialogDescription>Live channel growth data</DialogDescription>
          </DialogHeader>
          {analyticsUser && (
            <ChannelAnalytics userId={analyticsUser.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignManagementSection;
