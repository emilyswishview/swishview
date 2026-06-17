import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { 
  Eye, 
  TrendingUp, 
  Users, 
  MousePointer, 
  Target,
  Lock,
  Youtube,
  Search,
  Calendar
} from "lucide-react";
import LiveYouTubeAnalytics from '../LiveYouTubeAnalytics';

interface UserSEOAnalyticsViewProps {
  userId: string;
}

interface SEOAnalytics {
  id: string;
  channel_url?: string;
  subscribers_current: number;
  subscribers_last_week: number;
  views_current: number;
  views_last_week: number;
  watch_time_hours: number;
  search_impressions: number;
  search_clicks: number;
  click_through_rate: number;
  average_position: number;
  organic_traffic: number;
  keywords_ranking: number;
  backlinks_count: number;
  domain_authority: number;
  seo_access_enabled: boolean;
  campaign_start_date?: string;
}

interface SEOPurchase {
  id: string;
  status: string;
}

interface Profile {
  google_access_token?: string;
}



const UserSEOAnalyticsView = ({ userId }: UserSEOAnalyticsViewProps) => {
  const [seoAnalytics, setSeoAnalytics] = useState<SEOAnalytics | null>(null);
  const [seoPurchase, setSeoPurchase] = useState<SEOPurchase | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSEOAnalytics();
    fetchSeoPurchase();
    checkGoogleConnection();
  }, [userId]);

  const fetchSEOAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_analytics')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setSeoAnalytics(data);
    } catch (error: any) {
      console.error('Failed to fetch SEO analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeoPurchase = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_purchases')
        .select('id, status')
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

  const hasAccess = seoAnalytics?.seo_access_enabled;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading SEO analytics...</div>
      </div>
    );
  }

  if (!hasAccess) {
    // Check if user has purchased but not enabled
    if (seoPurchase) {
      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
            <div className="flex items-center justify-center mb-4">
              <Lock className="w-12 h-12 text-blue-600" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-blue-900 mb-2">Activation Pending</h3>
              <p className="text-blue-700 mb-4">
                This user has paid for an SEO plan. Enable SEO access and set a campaign start date in SEO Management.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-8 border border-orange-200">
          <div className="flex items-center justify-center mb-4">
            <Lock className="w-12 h-12 text-orange-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-orange-900 mb-2">SEO Analytics Locked</h3>
            <p className="text-orange-700 mb-4">
              This user hasn't purchased an SEO plan or doesn't have SEO access enabled.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if campaign start date is missing
  if (!seoAnalytics.campaign_start_date) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
          <div className="flex items-center justify-center mb-4">
            <Calendar className="w-12 h-12 text-blue-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-blue-900 mb-2">Campaign Start Date Not Set</h3>
            <p className="text-blue-700 mb-4">
              Set a campaign start date for this user in SEO Management to enable analytics tracking.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if Google is connected
  if (!googleConnected) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-8 border border-red-200">
          <div className="flex items-center justify-center mb-4">
            <Youtube className="w-12 h-12 text-red-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-red-900 mb-2">Google Not Connected</h3>
            <p className="text-red-700 mb-4">
              This user needs to connect their Google account to view live analytics. They can do this from their dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          User's SEO Analytics Dashboard
        </h2>
        <p className="text-muted-foreground">
          Viewing the same SEO analytics data as shown to this user.
        </p>
      </div>
      {/* Live YouTube Analytics */}
      <LiveYouTubeAnalytics userId={userId} />
    </div>
  );
};

export default UserSEOAnalyticsView;
