import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  TrendingUp, 
  Eye, 
  Users, 
  Activity, 
  Calendar,
  PlayCircle,
  Target,
  DollarSign,
  FileText,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import GrowthSummaryChart from "@/components/GrowthSummaryChart";
import SEOAnalyticsGraph from "@/components/SEOAnalyticsGraph";
import WatchHoursGraph from "@/components/WatchHoursGraph";
import UserSEOAnalyticsView from "./UserSEOAnalyticsView";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  campaignCount?: number;
  totalSpent?: number;
}

interface Promotion {
  id: string;
  title: string;
  youtube_video_url: string;
  target_views: number;
  current_views: number;
  starting_views: number;
  status: string;
  budget: number;
  created_at: string;
  target_audience?: string;
  campaign_duration?: number;
}

interface SEOPurchase {
  id: string;
  status: string;
  amount: number;
  created_at: string;
  channel_url: string;
  assigned_manager: string;
  seo_plans: {
    name: string;
    duration_months: number;
    features: string[];
  };
}

interface UserAnalyticsModalProps {
  user: UserProfile;
}

const UserAnalyticsModal = ({ user }: UserAnalyticsModalProps) => {
  const [campaignsExpanded, setCampaignsExpanded] = useState(true);
  const [seoExpanded, setSeoExpanded] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [seoPurchases, setSeoPurchases] = useState<SEOPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingViews, setRefreshingViews] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initAndRefresh = async () => {
      await fetchUserAnalytics();
      // After loading data, silently refresh views from YouTube
      await refreshAllViews(true);
    };
    initAndRefresh();
  }, [user.id]);

  const fetchUserAnalytics = async () => {
    try {
      // Fetch user campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('promotions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Fetch SEO purchases with plan details
      const { data: seoData, error: seoError } = await supabase
        .from('seo_purchases')
        .select(`
          *,
          seo_plans:seo_plan_id (
            name,
            duration_months,
            features
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (seoError) throw seoError;

      setPromotions(campaignsData || []);
      setSeoPurchases(seoData || []);
    } catch (error: any) {
      console.error('Error fetching user analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const refreshAllViews = async (silent = false) => {
    if (refreshingViews) return;
    setRefreshingViews(true);
    try {
      let updated = 0;
      for (const promo of promotions.length > 0 ? promotions : (await supabase.from('promotions').select('*').eq('user_id', user.id)).data || []) {
        const videoId = getYouTubeVideoId(promo.youtube_video_url);
        if (!videoId) continue;
        
        try {
          const { data } = await supabase.functions.invoke('youtube-views', {
            body: { videoId, action: 'getViews' }
          });
          if (data?.viewCount != null) {
            const updateData: any = {
              current_views: data.viewCount,
              last_view_update: new Date().toISOString(),
            };
            // Set starting_views if not yet set
            if (!promo.starting_views) {
              updateData.starting_views = data.viewCount;
            }
            await supabase.from('promotions').update(updateData).eq('id', promo.id);
            updated++;
          }
        } catch (e) {
          console.error('Error fetching views for', promo.title, e);
        }
      }
      // Re-fetch to show updated data
      await fetchUserAnalytics();
      if (!silent && updated > 0) {
        toast({ title: "Views Updated", description: `Updated ${updated} campaign(s) with latest YouTube views` });
      }
    } catch (error) {
      console.error('Error refreshing views:', error);
      if (!silent) {
        toast({ title: "Error", description: "Failed to refresh views", variant: "destructive" });
      }
    } finally {
      setRefreshingViews(false);
    }
  };

  const calculateProgress = (current: number, target: number, starting: number = 0) => {
    const gained = Math.max(0, current - starting);
    if (target === 0) return gained > 0 ? 100 : 0;
    return Math.min(100, (gained / target) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const exportReport = async () => {
    try {
      const reportData = {
        user: {
          name: user.full_name || 'Not provided',
          email: user.email,
          registrationDate: format(new Date(user.created_at), 'PPP'),
          totalCampaigns: promotions.length,
          totalSpent: user.totalSpent || 0,
          seoPurchases: seoPurchases.length
        },
        campaigns: promotions.map(p => ({
          title: p.title,
          targetViews: p.target_views,
          currentViews: p.current_views,
          viewsGained: Math.max(0, p.current_views - (p.starting_views || 0)),
          progress: calculateProgress(p.current_views, p.target_views, p.starting_views),
          status: p.status,
          budget: p.budget,
          createdAt: format(new Date(p.created_at), 'PPP')
        })),
        seoServices: seoPurchases.map(s => ({
          plan: s.seo_plans?.name || 'Unknown Plan',
          duration: s.seo_plans?.duration_months || 0,
          amount: s.amount,
          status: s.status,
          manager: s.assigned_manager || 'Not assigned',
          features: s.seo_plans?.features || [],
          purchaseDate: format(new Date(s.created_at), 'PPP')
        }))
      };

      // Create CSV content
      const csvContent = generateCSVReport(reportData);
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${user.full_name || user.email.split('@')[0]}_analytics_report.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: "Analytics report has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export analytics report",
        variant: "destructive",
      });
    }
  };

  const generateCSVReport = (data: any) => {
    let csv = '';
    
    // Header
    csv += `SwishView Analytics Report\n`;
    csv += `Generated on: ${format(new Date(), 'PPP')}\n\n`;
    
    // User Info
    csv += `USER INFORMATION\n`;
    csv += `Name,${data.user.name}\n`;
    csv += `Email,${data.user.email}\n`;
    csv += `Registration Date,${data.user.registrationDate}\n`;
    csv += `Total Campaigns,${data.user.totalCampaigns}\n`;
    csv += `Total Spent,$${data.user.totalSpent.toFixed(2)}\n`;
    csv += `SEO Purchases,${data.user.seoPurchases}\n\n`;
    
    // Campaigns
    csv += `VIDEO CAMPAIGNS\n`;
    csv += `Title,Target Views,Current Views,Views Gained,Progress %,Status,Budget,Created Date\n`;
    data.campaigns.forEach((campaign: any) => {
      csv += `"${campaign.title}",${campaign.targetViews},${campaign.currentViews},${campaign.viewsGained},${campaign.progress.toFixed(1)}%,${campaign.status},$${campaign.budget},${campaign.createdAt}\n`;
    });
    
    csv += `\nSEO SERVICES\n`;
    csv += `Plan,Duration (Months),Amount,Status,Manager,Purchase Date\n`;
    data.seoServices.forEach((seo: any) => {
      csv += `"${seo.plan}",${seo.duration},$${seo.amount},${seo.status},"${seo.manager}",${seo.purchaseDate}\n`;
    });
    
    return csv;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg font-display">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Analytics Dashboard</h3>
          <p className="text-muted-foreground text-sm">Complete overview of user's campaign and SEO data</p>
        </div>
        <Button onClick={exportReport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Video Campaign Analytics */}
      <Collapsible open={campaignsExpanded} onOpenChange={setCampaignsExpanded}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" />
                  Video Campaign Analytics
                  <Badge variant="secondary">{promotions.length} campaigns</Badge>
                </div>
                {campaignsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex justify-end mt-2 mb-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); refreshAllViews(); }}
              disabled={refreshingViews}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshingViews ? 'animate-spin' : ''}`} />
              {refreshingViews ? 'Refreshing...' : 'Refresh Views'}
            </Button>
          </div>
          <Card className="mt-0">
            <CardContent className="p-6">
              {promotions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No campaigns found for this user</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <div className="space-y-4 pr-2">
                    {promotions.map((campaign) => {
                      const progress = calculateProgress(campaign.current_views, campaign.target_views, campaign.starting_views);
                      const viewsGained = Math.max(0, campaign.current_views - (campaign.starting_views || 0));
                      const goalTotal = (campaign.starting_views || 0) + (campaign.target_views || 0);
                      const isCompleted = campaign.status === "completed" || 
                        (goalTotal > 0 && campaign.current_views >= goalTotal) ||
                        (campaign.target_views === 0 && viewsGained > 0);
                      const derivedStatus = isCompleted ? "completed" : (campaign.status === "pending" ? "pending" : "active");
                      
                      return (
                        <Card key={campaign.id} className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-bold text-lg truncate">{campaign.title}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Created: {format(new Date(campaign.created_at), 'MMM dd, yyyy')}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Target Audience: {campaign.target_audience || 'General Audience'}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge className={getStatusColor(derivedStatus)}>
                                    {derivedStatus}
                                  </Badge>
                                  <Badge variant="outline">
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    ${campaign.budget}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                                <div>
                                  <div className="text-muted-foreground">Starting Views</div>
                                  <div className="font-bold text-lg flex items-center gap-1">
                                    <PlayCircle className="h-4 w-4" />
                                    {(campaign.starting_views || 0).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Current Views</div>
                                  <div className="font-bold text-lg flex items-center gap-1">
                                    <Eye className="h-4 w-4" />
                                    {campaign.current_views.toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Views Gained</div>
                                  <div className="font-bold text-lg flex items-center gap-1 text-green-600">
                                    <TrendingUp className="h-4 w-4" />
                                    +{viewsGained.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">Progress to Target ({campaign.target_views.toLocaleString()} views)</span>
                                  <span className="font-bold text-primary">{progress.toFixed(1)}%</span>
                                </div>
                                <Progress value={progress} className="h-3" />
                                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                  <div>Campaign Duration: {campaign.campaign_duration || 30} days</div>
                                  <div>Video URL: <a href={campaign.youtube_video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Video</a></div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* SEO Analytics */}
      <Collapsible open={seoExpanded} onOpenChange={setSeoExpanded}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  SEO Analytics
                  <Badge variant="secondary">{seoPurchases.length} services</Badge>
                </div>
                {seoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* SEO Plans Summary (if any) */}
                {seoPurchases.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No SEO services found for this user</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="font-semibold">SEO Service Purchases</h4>
                    {seoPurchases.map((purchase) => (
                      <Card key={purchase.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-semibold">{purchase.seo_plans?.name || 'Unknown Plan'}</h5>
                                <p className="text-sm text-muted-foreground">
                                  {purchase.seo_plans?.duration_months} months duration
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge className={getStatusColor(purchase.status)}>
                                  {purchase.status}
                                </Badge>
                                <p className="text-sm font-medium mt-1">${purchase.amount}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">Channel URL</div>
                                <div className="font-medium truncate">{purchase.channel_url || 'Not provided'}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Account Manager</div>
                                <div className="font-medium">{purchase.assigned_manager || 'Not assigned'}</div>
                              </div>
                            </div>

                            {purchase.seo_plans?.features && (
                              <div>
                                <div className="text-muted-foreground text-sm mb-2">Plan Features</div>
                                <div className="flex flex-wrap gap-1">
                                  {purchase.seo_plans.features.map((feature, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {feature}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              Purchased: {format(new Date(purchase.created_at), 'PPP')}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* User's SEO Analytics - Same as they see in their dashboard */}
                <div className="space-y-6">
                  <h4 className="font-semibold">SEO Analytics (User's View)</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700 mb-2">
                      <strong>Note:</strong> This shows the exact same SEO analytics data that this user sees in their own dashboard.
                    </p>
                  </div>
                  <UserSEOAnalyticsView userId={user.id} />
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default UserAnalyticsModal;
