import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lock, AlertCircle, Calendar, Activity, Youtube } from "lucide-react";
import LiveYouTubeAnalytics from './LiveYouTubeAnalytics';

interface SimplifiedAnalyticsProps {
  userId: string;
}

interface SEOAccess {
  seo_access_enabled: boolean;
  campaign_start_date?: string;
}

interface RecentActivity {
  id: string;
  activity_text: string;
  activity_date: string;
  created_at: string;
}

interface SEOPurchase {
  id: string;
  status: string;
  created_at: string;
}

interface Profile {
  google_access_token?: string;
}

const SimplifiedAnalytics = ({ userId }: SimplifiedAnalyticsProps) => {
  const [seoAccess, setSeoAccess] = useState<SEOAccess | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [seoPurchase, setSeoPurchase] = useState<SEOPurchase | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSEOAccess();
    fetchRecentActivities();
    fetchSeoPurchase();
    checkGoogleConnection();
  }, [userId]);

  const fetchSEOAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_analytics')
        .select('seo_access_enabled, campaign_start_date, channel_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setSeoAccess(data || { seo_access_enabled: false });
    } catch (error: any) {
      console.error('Failed to fetch SEO access:', error);
      toast({
        title: "Error",
        description: "Failed to check SEO access",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSeoPurchase = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_purchases')
        .select('id, status, created_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setSeoPurchase(data);
    } catch (error: any) {
      console.error('Failed to fetch SEO purchase:', error);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('google_access_token')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setGoogleConnected(!!data?.google_access_token);
    } catch (error: any) {
      console.error('Failed to check Google connection:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('recent_activities')
        .select('*')
        .eq('user_id', userId)
        .order('activity_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentActivities(data || []);
    } catch (error: any) {
      console.error('Failed to fetch recent activities:', error);
    }
  };

  const handleConnectGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard?tab=seo`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
        scopes: [
          'openid',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/yt-analytics.readonly'
        ].join(' '),
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg font-display text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  // Check if user has SEO access enabled
  if (!seoAccess?.seo_access_enabled) {
    // Check if user has purchased but not enabled
    if (seoPurchase) {
      return (
        <div className="relative">
          {/* Blurred Background Content */}
          <div className="filter blur-md pointer-events-none select-none">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-0 shadow-elegant bg-white/70">
                  <CardContent className="p-6">
                    <div className="h-20 bg-muted rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="h-[400px] bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          </div>

          {/* Overlay Message */}
          <div className="absolute inset-0 flex items-center font-display justify-center">
            <Card className="max-w-md w-full mx-4 shadow-2xl border-2 border-pulse-500 bg-pulse">
              <CardContent className="p-8 text-center">
                <Lock className="w-16 h-16 mx-auto mb-4 text-pulse-600" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Finish payment to get access.</h3>
                <p className="text-gray-700 mb-6">
                 Paid but still can’t see analytics?.  Contact <strong>SwishView Support</strong> to enable your SEO Analytics access.
                </p>
                <Button
                  onClick={() => window.location.href = '/contact'}
                  className="rounded-full font-display"
                >
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    
    return (
      <div className="relative">
        {/* Blurred Background Content */}
        <div className="filter blur-md pointer-events-none select-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-0 shadow-elegant bg-white/70">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="h-[400px] bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        </div>

        {/* Overlay Message */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4 shadow-2xl border-2 border-orange-500 bg-white">
            <CardContent className="p-8 text-center">
              <Lock className="w-16 h-16 mx-auto mb-4 text-orange-600" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Premium Access Required</h3>
              <p className="text-gray-700 mb-6">
                Unlock SEO Analytics by purchasing a plan to track your YouTube growth and performance.
              </p>
              <Button
                onClick={() => window.location.href = '/pricing'}
                className="rounded-full font-display"
              >
                View Plans & Pay
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show start date missing message
  if (!seoAccess.campaign_start_date) {
    return (
      <div className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <Calendar className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900 font-display">
            <strong>Campaign Start Date Not Set</strong>
            <p className="mt-2">
              Your admin needs to set a campaign start date for analytics tracking. 
              Please contact support or your account manager.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Validate campaign start date format
  const isValidDate = (dateString: string) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  if (!isValidDate(seoAccess.campaign_start_date)) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900 font-display">
            <strong>Invalid Campaign Start Date</strong>
            <p className="mt-2">
              The campaign start date format is invalid. Please contact admin to fix this.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if Google is connected
  if (!googleConnected) {
    return (
      <div className="relative">
        {/* Blurred Background Content */}
        <div className="filter blur-md pointer-events-none select-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-0 shadow-elegant bg-white/70">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="h-[400px] bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        </div>

        {/* Overlay Message */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4 shadow-2xl border-2 border-red-500 bg-white">
            <CardContent className="p-8 text-center">
              <Youtube className="w-16 h-16 mx-auto mb-4 text-red-600" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Connect Google Account</h3>
              <p className="text-gray-700 mb-6">
                Your SEO Analytics is enabled! Connect your Google account to fetch live YouTube data and view your analytics.
              </p>
              <Button 
                onClick={handleConnectGoogle}
                className="rounded-full font-display"
              >
                Connect with Google
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">
          SEO Analytics Dashboard
        </h2>
        <p className="text-muted-foreground font-display">
          Tracking your growth from {new Date(seoAccess.campaign_start_date).toLocaleDateString()}
        </p>
      </div>

      {/* Live YouTube Analytics */}
      <LiveYouTubeAnalytics userId={userId} />

      {/* Recent Activities */}
      {recentActivities.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Activity className="w-5 h-5 text-primary" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display text-foreground">{activity.activity_text}</p>
                    <p className="text-xs font-display text-muted-foreground mt-1">
                      {new Date(activity.activity_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimplifiedAnalytics;
