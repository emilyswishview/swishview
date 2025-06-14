
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, DollarSign, TrendingUp, Play, Pause, CheckCircle, XCircle, BarChart3, Video, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SwishViewLogo from "@/components/SwishViewLogo";

const AdminDashboard = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || profile?.role !== "admin") {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      fetchAdminData();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/auth");
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch campaigns without join
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (campaignsError) {
        console.error("Campaigns error:", campaignsError);
        throw campaignsError;
      }

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) {
        console.error("Users error:", usersError);
        throw usersError;
      }

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (paymentsError) {
        console.error("Payments error:", paymentsError);
        throw paymentsError;
      }

      // Fetch analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("campaign_analytics")
        .select("*")
        .order("recorded_at", { ascending: false });

      if (analyticsError) {
        console.error("Analytics error:", analyticsError);
      }

      // Create a map of users for easy lookup
      const usersMap = (usersData || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      // Add user info to campaigns
      const campaignsWithUsers = (campaignsData || []).map(campaign => ({
        ...campaign,
        user: usersMap[campaign.user_id] || null
      }));

      setCampaigns(campaignsWithUsers);
      setUsers(usersData || []);
      setPayments(paymentsData || []);
      setAnalytics(analyticsData || []);
    } catch (error: any) {
      console.error("Error fetching admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: 'pending' | 'active' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign status updated successfully",
      });

      fetchAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const totalViews = analytics.reduce((sum, analytic) => sum + (analytic.views_count || 0), 0);
  const avgEngagement = analytics.length > 0 
    ? (analytics.reduce((sum, analytic) => sum + (analytic.engagement_rate || 0), 0) / analytics.length).toFixed(2)
    : "0.00";

  const getUserInitials = (name: string, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full animate-spin"></div>
          <div className="text-xl text-gray-600">Loading admin dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {/* <SwishViewLogo size="xl" /> */}
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Admin Dashboard
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-blue-700">Total Users</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{users.length}</div>
              <p className="text-xs text-blue-600 mt-1">Registered users</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-green-700">Active Campaigns</CardTitle>
              <div className="p-2 bg-green-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{activeCampaigns}</div>
              <p className="text-xs text-green-600 mt-1">Currently running</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-purple-700">Total Revenue</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">${totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-purple-600 mt-1">Total earnings</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-orange-700">Total Views</CardTitle>
              <div className="p-2 bg-orange-500 rounded-lg">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-orange-600 mt-1">Views delivered</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Campaign Management */}
          <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <Video className="h-5 w-5" />
                Campaign Management
              </CardTitle>
              <CardDescription>Manage and monitor campaign requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {campaigns.map((campaign) => {
                  const thumbnail = getYouTubeThumbnail(campaign.youtube_video_url);
                  
                  return (
                    <div key={campaign.id} className="group border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300 bg-white/80 space-y-3">
                      <div className="flex gap-4">
                        {thumbnail && (
                          <div className="relative flex-shrink-0">
                            <img
                              src={thumbnail}
                              alt="Video thumbnail"
                              className="w-20 h-16 object-cover rounded shadow-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder.svg';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Video className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900 truncate">{campaign.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                                    {getUserInitials(campaign.user?.full_name || '', campaign.user?.email || '')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-gray-600 truncate">{campaign.user?.full_name || campaign.user?.email || 'Unknown User'}</span>
                              </div>
                            </div>
                            <Badge className={getStatusBadgeColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>Budget: ${campaign.budget} | Views: {campaign.target_views?.toLocaleString()}</p>
                            {campaign.youtube_video_url && (
                              <a 
                                href={campaign.youtube_video_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View Video
                              </a>
                            )}
                          </div>
                          
                          <div className="flex gap-1 mt-3">
                            {campaign.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => updateCampaignStatus(campaign.id, "active")}
                                className="h-7 px-2 text-xs bg-green-500 hover:bg-green-600"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            )}
                            {campaign.status === "active" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCampaignStatus(campaign.id, "completed")}
                                  className="h-7 px-2 text-xs hover:bg-blue-50"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateCampaignStatus(campaign.id, "cancelled")}
                                  className="h-7 px-2 text-xs"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>All registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-300 bg-white/80">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary text-white text-xs">
                          {getUserInitials(user.full_name || '', user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{user.full_name || user.email}</h3>
                        <p className="text-xs text-gray-600 truncate">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"} className="ml-2 flex-shrink-0">
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics and Payments */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Campaign Analytics
              </CardTitle>
              <CardDescription>Performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{totalViews.toLocaleString()}</div>
                    <div className="text-sm text-blue-700">Total Views</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{avgEngagement}%</div>
                    <div className="text-sm text-green-700">Avg Engagement</div>
                  </div>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {analytics.map((analytic) => (
                    <div key={analytic.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-300 bg-white/80">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm">Campaign {analytic.campaign_id}</h3>
                        <p className="text-xs text-gray-600">
                          Views: {analytic.views_count?.toLocaleString()} | Clicks: {analytic.clicks_count}
                        </p>
                        <p className="text-xs text-gray-500">
                          Engagement: {analytic.engagement_rate}%
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 flex-shrink-0">
                        {new Date(analytic.recorded_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>All payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-300 bg-white/80">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-lg text-gray-900">${payment.amount}</p>
                      <p className="text-xs text-gray-600">Campaign ID: {payment.campaign_id}</p>
                      <Badge 
                        variant={payment.status === "completed" ? "default" : "secondary"}
                        className="mt-1"
                      >
                        {payment.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
