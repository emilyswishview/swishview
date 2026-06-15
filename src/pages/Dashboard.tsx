import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useYouTubeTracking } from "@/hooks/useYouTubeTracking";
import DashboardNavbar from "@/components/DashboardNavbar";
import DashboardTabs from "@/components/DashboardTabs";
import CampaignsList from "@/components/CampaignsList";
import DashboardAnalytics from "@/components/DashboardAnalytics";
import BillingSection from "@/components/BillingSection";
import SimplifiedAnalytics from "@/components/SimplifiedAnalytics";
import RequestButton from "@/components/RequestButton";
import ChannelAnalytics from "@/components/ChannelAnalytics";
import LoadingSpinner from "@/components/LoadingSpinner";
import UserBlogsSection from "@/components/UserBlogsSection";
import RecentBlogsPreview from "@/components/RecentBlogsPreview";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("promotions");
  const [refreshing, setRefreshing] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackActivePromotions, refreshSinglePromotion, isTracking } = useYouTubeTracking();

  // Persist Google OAuth tokens from the session into profiles for Edge Functions
  const saveGoogleTokensFromSession = async (session: any) => {
    try {
      const providerToken = (session as any)?.provider_token;
      const providerRefreshToken = (session as any)?.provider_refresh_token;
      const u = session?.user;
      if (!u) return;

      if (!providerToken && !providerRefreshToken) {
        console.log('No Google provider tokens present in session to store.');
        return;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
        google_access_token: providerToken || null,
        google_refresh_token: providerRefreshToken || null,
        google_picture: u.user_metadata?.picture || null,
        google_sub: u.user_metadata?.sub || null,
      });

      if (error) {
        console.error('Failed to upsert Google tokens into profiles:', error);
      } else {
        console.log('Stored Google tokens for user in profiles table.');
      }
    } catch (e) {
      console.error('Unexpected error storing Google tokens:', e);
    }
  };

  const tabs = [
    { id: "promotions", label: "Your Campaigns", count: campaigns.length },
    { id: "analytics", label: "Campaign Analytics" },
    { id: "channel", label: "Channel Analytics" },
    { id: "blogs", label: "Blogs" },
    { id: "seo", label: "SEO Services" },
    { id: "billing", label: "Billing" }
  ];
 
  useEffect(() => {
    checkUser();
    // ✅ read ?tab param but fallback to promotions
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    if (tab && tabs.find((t) => t.id === tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab("promotions");
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    setUser(session.user);
    // Persist Google tokens (if present) so edge functions can call YouTube APIs
    await saveGoogleTokensFromSession(session);
    setLoading(false);
  };

  const fetchCampaigns = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      console.log("User ID:", user?.id);
      console.log("Fetched campaigns:", data);

      if (error) {
        console.error("Error fetching campaigns:", error);
        toast({
          title: "Error",
          description: "Failed to fetch campaigns",
          variant: "destructive",
        });
        return;
      }

      setCampaigns(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshViews = async () => {
    try {
      setRefreshing(true);
      
      // Track all promotions (not just active ones)
      await trackActivePromotions();
      
      // Re-fetch campaigns to get updated data
      await fetchCampaigns();
      
      toast({
        title: "Success",
        description: "Views refreshed successfully",
      });
    } catch (error) {
      console.error("Refresh views error:", error);
      toast({
        title: "Error",
        description: "Failed to refresh views",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshAll = async () => {
    try {
      setRefreshing(true);
      
      // Track all promotions (not just active ones)
      await trackActivePromotions();
      
      // Fetch all campaigns
      await fetchCampaigns();
      
      toast({
        title: "Success",
        description: "All data refreshed successfully",
      });
    } catch (error) {
      console.error("Refresh all error:", error);
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-refresh functionality - every 10 minutes
  useEffect(() => {
    if (!user) return;
    
    const autoRefresh = async () => {
      try {
        console.log("Auto-refreshing campaign data...");
        await trackActivePromotions();
        await fetchCampaigns();
      } catch (error) {
        console.error("Auto-refresh error:", error);
      }
    };

    // Set up auto-refresh every 10 minutes (600,000 ms)
    const interval = setInterval(autoRefresh, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, trackActivePromotions]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "promotions":
        return (
          <>
            <CampaignsList
              campaigns={campaigns}
              onRefreshViews={handleRefreshViews}
              onRefreshAll={handleRefreshAll}
              loading={refreshing || isTracking}
            />
            <RecentBlogsPreview userEmail={user?.email} onViewAll={() => setActiveTab("blogs")} />
          </>
        );
      case "analytics":
        return <DashboardAnalytics campaigns={campaigns} user={user} />;
      case "channel":
        return (
          <>
            <ChannelAnalytics userId={user?.id} />
            <RecentBlogsPreview userEmail={user?.email} onViewAll={() => setActiveTab("blogs")} />
          </>
        );
      case "blogs":
        return <UserBlogsSection userId={user?.id} userEmail={user?.email} />;
      case "seo":
        return <SimplifiedAnalytics userId={user?.id} />;
      case "billing":
        return <BillingSection userId={user?.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar user={user} />

      <div className="navbar-offset">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-display font-bold text-foreground mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg">
              Manage your promotions and SEO plans
            </p>
          </div>

          {/* Tabs */}
          <DashboardTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Content */}
          <div className="min-h-[400px]">{renderTabContent()}</div>
        </div>

        {/* Floating Request Button */}
        <RequestButton
          userId={user?.id}
          variant="floating"
          requestType="general"
        />
      </div>
    </div>
  );
};

export default Dashboard;
