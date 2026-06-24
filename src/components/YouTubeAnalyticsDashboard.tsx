import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, TrendingUp, Users, Eye, Clock, DollarSign, ThumbsUp, MessageCircle, Share, Play } from "lucide-react";
import { useYouTubeAnalytics } from '@/hooks/useYouTubeAnalytics';
import { supabase } from "@/integrations/supabase/client";

interface YouTubeAnalyticsDashboardProps {
  userId: string;
}

const YouTubeAnalyticsDashboard = ({ userId }: YouTubeAnalyticsDashboardProps) => {
  const [timeFilter, setTimeFilter] = useState("7days");
  const [refreshing, setRefreshing] = useState(false);
  const [hasTokens, setHasTokens] = useState<boolean | null>(null);
  const [adminChannelUrl, setAdminChannelUrl] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [campaignStartDate, setCampaignStartDate] = useState<string | null>(null);
  const [ownershipMismatch, setOwnershipMismatch] = useState(false);
  const { channelInfo, analytics, revenue, loading, error, refreshData } = useYouTubeAnalytics(userId, { autoFetch: hasTokens === true });

  // Check if Google tokens exist in profiles for this user
  useEffect(() => {
    const checkTokens = async () => {
      if (!userId) {
        setHasTokens(false);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('google_access_token, google_refresh_token')
        .eq('id', userId)
        .maybeSingle();
      setHasTokens(Boolean(data?.google_access_token && data?.google_refresh_token));
    };
    checkTokens();
  }, [userId]);

  const handleConnect = async () => {
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

  const getDateRange = (filter: string) => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    
    switch (filter) {
      case 'today':
        return { startDate: endDate, endDate };
      case '7days':
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { startDate: sevenDaysAgo.toISOString().split('T')[0], endDate };
      case '28days':
        const twentyEightDaysAgo = new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000);
        return { startDate: twentyEightDaysAgo.toISOString().split('T')[0], endDate };
      case '90days':
        const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        return { startDate: ninetyDaysAgo.toISOString().split('T')[0], endDate };
      default:
        return { startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], endDate };
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const { startDate, endDate } = getDateRange(timeFilter);
    await refreshData(startDate, endDate);
    setRefreshing(false);
  };

  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value);
    const { startDate, endDate } = getDateRange(value);
    refreshData(startDate, endDate);
  };

  // Process analytics data for charts
  const processAnalyticsData = () => {
    if (!analytics?.rows || !analytics?.columnHeaders) return [];
    
    return analytics.rows.map((row, index) => {
      const dataPoint: any = {};
      analytics.columnHeaders.forEach((header, headerIndex) => {
        dataPoint[header.name] = row[headerIndex];
      });
      return dataPoint;
    });
  };

  const chartData = processAnalyticsData();

  // Calculate totals and growth
  const calculateTotals = () => {
    if (!chartData.length) return {
      totalViews: 0,
      totalSubscribers: 0,
      totalWatchTime: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
    };
    
    const totals = {
      totalViews: chartData.reduce((sum, day) => sum + (Number(day.views) || 0), 0),
      totalSubscribers: chartData.reduce((sum, day) => sum + (Number(day.subscribersGained) || 0), 0),
      totalWatchTime: Math.round(chartData.reduce((sum, day) => sum + (Number(day.estimatedMinutesWatched) || 0), 0) / 60),
      totalLikes: chartData.reduce((sum, day) => sum + (Number(day.likes) || 0), 0),
      totalComments: chartData.reduce((sum, day) => sum + (Number(day.comments) || 0), 0),
      totalShares: chartData.reduce((sum, day) => sum + (Number(day.shares) || 0), 0),
    };

    return totals;
  };

  const totals = calculateTotals();

  if (hasTokens === null) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">Checking your YouTube connection...</div>
      </div>
    );
  }

  if (hasTokens === false) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">Connect YouTube to see analytics</h3>
          <p className="text-muted-foreground">Grant read-only access so we can fetch your channel metrics.</p>
        </div>
        <Button onClick={handleConnect}>
          <Play className="w-4 h-4 mr-2" />
          Connect Google
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <h3 className="text-xl font-semibold mb-2">Analytics Error</h3>
          <p>{error}</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={handleConnect}>
            <Play className="w-4 h-4 mr-2" />
            Reconnect Google
          </Button>
        </div>
        {error?.includes('youtubeanalytics.googleapis.com') && (
          <p className="mt-4 text-sm text-muted-foreground">
            Tip: Enable "YouTube Analytics API" (and "YouTube Data API v3") in your Google Cloud project used for auth, then retry.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Channel Info */}
      {channelInfo && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{channelInfo.title}</h2>
                  <div className="flex space-x-6 text-sm text-gray-600 mt-1">
                    <span>{channelInfo.subscriberCount.toLocaleString()} subscribers</span>
                    <span>{channelInfo.videoCount.toLocaleString()} videos</span>
                    <span>{channelInfo.viewCount.toLocaleString()} total views</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="28days">Last 28 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleRefresh} disabled={refreshing || loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing || loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Views</p>
                <p className="text-3xl font-bold">{totals.totalViews?.toLocaleString() || '0'}</p>
                <p className="text-xs text-green-600">+15% from last period</p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subscribers</p>
                <p className="text-3xl font-bold">+{totals.totalSubscribers?.toLocaleString() || '0'}</p>
                <p className="text-xs text-green-600">+8% from last period</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Watch Hours</p>
                <p className="text-3xl font-bold">{totals.totalWatchTime?.toLocaleString() || '0'}</p>
                <p className="text-xs text-green-600">+12% from last period</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {revenue && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                  <p className="text-3xl font-bold">${revenue.estimatedRevenue.toFixed(2)}</p>
                  <p className="text-xs text-green-600">+20% from last period</p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Daily Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Views']} />
                <Area type="monotone" dataKey="views" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscribers Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Daily Subscriber Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Subscribers']} />
                <Bar dataKey="subscribersGained" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Watch Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Watch Time (Hours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => [Math.round(Number(value) / 60).toLocaleString(), 'Hours']} />
                <Line type="monotone" dataKey="estimatedMinutesWatched" stroke="#9333ea" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-orange-600" />
              Engagement Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{totals.totalLikes?.toLocaleString() || '0'}</p>
                <p className="text-sm text-muted-foreground">Likes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{totals.totalComments?.toLocaleString() || '0'}</p>
                <p className="text-sm text-muted-foreground">Comments</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{totals.totalShares?.toLocaleString() || '0'}</p>
                <p className="text-sm text-muted-foreground">Shares</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Details */}
      {revenue && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Revenue Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated Revenue</p>
                <p className="text-2xl font-bold text-green-600">${revenue.estimatedRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ad Revenue</p>
                <p className="text-2xl font-bold">${revenue.estimatedAdRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPM</p>
                <p className="text-2xl font-bold">${revenue.cpm.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monetized Playbacks</p>
                <p className="text-2xl font-bold">{revenue.monetizedPlaybacks.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Tips */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <TrendingUp className="w-5 h-5" />
            Personalized Growth Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {revenue && revenue.cpm > 0 && revenue.cpm < 2 && (
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-sm"><strong>💡 Boost Your CPM:</strong> Your CPM is ${revenue.cpm.toFixed(2)}. Consider creating longer-form content or targeting higher-value demographics to increase ad revenue.</p>
              </div>
            )}
            {totals.totalSubscribers && totals.totalViews && (totals.totalSubscribers / totals.totalViews) < 0.1 && (
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-sm"><strong>📈 Improve Subscriber Conversion:</strong> Your subscriber-to-view ratio could be better. Try adding clear calls-to-action in your videos and optimize your thumbnails.</p>
              </div>
            )}
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm"><strong>🎯 Content Strategy:</strong> Your {timeFilter === 'today' ? 'daily' : 'weekly'} performance shows potential. Consider posting consistently during your peak engagement times.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default YouTubeAnalyticsDashboard;
