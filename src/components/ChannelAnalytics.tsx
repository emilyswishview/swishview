import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Youtube, RefreshCw, TrendingUp, Eye, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfMonth, subMonths, isSameMonth } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChannelAnalyticsProps {
  userId: string;
}

interface ChannelAccess {
  channel_analytics_access: boolean;
  channel_url: string | null;
  channel_start_date: string | null;
}

interface ChartDataPoint {
  date: string;
  rawDate: Date;
  views: number;
  viewsGained: number;
}

const ChannelAnalytics = ({ userId }: ChannelAnalyticsProps) => {
  const [access, setAccess] = useState<ChannelAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [startingViews, setStartingViews] = useState(0);
  const [currentViews, setCurrentViews] = useState(0);
  const [currentSubscribers, setCurrentSubscribers] = useState(0);
  const [viewMode, setViewMode] = useState<'all' | 'monthly' | 'current-month'>('all');
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
  }, [userId]);

  const checkAccess = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('channel_analytics_access, channel_url, channel_start_date')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setAccess(data);

      if (data?.channel_analytics_access && data?.channel_start_date && data?.channel_url) {
        await fetchAnalytics(data.channel_url, data.channel_start_date);
      }
    } catch (error: any) {
      console.error('Error checking access:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (channelUrl: string, startDate: string) => {
    setRefreshing(true);
    try {
      // Fetch current channel stats using public API
      const { data, error } = await supabase.functions.invoke('youtube-channel-analytics', {
        body: { channelUrl },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const currentTotal = data.totalViews || 0;
      const currentSubs = data.totalSubscribers || 0;
      
      setCurrentViews(currentTotal);
      setCurrentSubscribers(currentSubs);

      // Fetch historical data from cache to build growth chart
      const { data: cacheData } = await supabase
        .from('youtube_channel_cache')
        .select('*')
        .eq('channel_url', channelUrl)
        .order('last_updated', { ascending: true });

      // Build chart data showing growth over time
      const points: ChartDataPoint[] = [];
      const startDateTime = new Date(startDate).getTime();
      
      // Calculate or estimate starting views
      let baselineViews = 0;
      if (cacheData && cacheData.length > 0) {
        const oldestEntry = cacheData[0];
        const oldestDate = new Date(oldestEntry.created_at).getTime();
        
        if (oldestDate <= startDateTime) {
          // We have data from before or at start date
          const startEntry = cacheData.find(entry => 
            new Date(entry.created_at).getTime() >= startDateTime
          ) || cacheData[0];
          baselineViews = startEntry.total_views || 0;
        } else {
          // Estimate baseline conservatively
          baselineViews = Math.max(0, currentTotal - Math.floor(currentTotal * 0.1));
        }
      } else {
        // No historical data, make conservative estimate
        baselineViews = Math.max(0, currentTotal - Math.floor(currentTotal * 0.1));
      }
      
      setStartingViews(baselineViews);

      // Add start date point
      const startDateObj = new Date(startDate);
      points.push({
        date: format(startDateObj, 'MMM d, yyyy'),
        rawDate: startDateObj,
        views: baselineViews,
        viewsGained: 0,
      });

      // Add cached data points that are after start date
      if (cacheData) {
        cacheData.forEach(entry => {
          const entryDate = new Date(entry.last_updated);
          if (entryDate.getTime() >= startDateTime) {
            points.push({
              date: format(entryDate, 'MMM d, yyyy'),
              rawDate: entryDate,
              views: entry.total_views || 0,
              viewsGained: Math.max(0, (entry.total_views || 0) - baselineViews),
            });
          }
        });
      }

      // Add current point
      const nowDate = new Date();
      points.push({
        date: format(nowDate, 'MMM d, yyyy'),
        rawDate: nowDate,
        views: currentTotal,
        viewsGained: Math.max(0, currentTotal - baselineViews),
      });

      setChartData(points);
      
      toast({
        title: 'Success',
        description: 'Channel analytics updated successfully',
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch channel analytics',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (access?.channel_url && access?.channel_start_date) {
      await fetchAnalytics(access.channel_url, access.channel_start_date);
    }
  };

  // Derive monthly aggregated data (last 12 months) and current-month daily data
  // IMPORTANT: must be called before any early returns to keep hook order stable
  const { monthlyData, currentMonthData } = useMemo(() => {
    if (chartData.length === 0) return { monthlyData: [] as any[], currentMonthData: [] as any[] };

    const sorted = [...chartData].sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    const now = new Date();

    const monthMap = new Map<string, { month: Date; entries: ChartDataPoint[] }>();
    sorted.forEach((p) => {
      const key = format(startOfMonth(p.rawDate), 'yyyy-MM');
      if (!monthMap.has(key)) monthMap.set(key, { month: startOfMonth(p.rawDate), entries: [] });
      monthMap.get(key)!.entries.push(p);
    });

    const monthly: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = startOfMonth(subMonths(now, i));
      const key = format(monthDate, 'yyyy-MM');
      const bucket = monthMap.get(key);
      if (bucket && bucket.entries.length > 0) {
        const last = bucket.entries[bucket.entries.length - 1];
        const first = bucket.entries[0];
        const prevKey = format(startOfMonth(subMonths(monthDate, 1)), 'yyyy-MM');
        const prevBucket = monthMap.get(prevKey);
        const prevTotal = prevBucket
          ? prevBucket.entries[prevBucket.entries.length - 1].views
          : first.views;
        monthly.push({
          label: format(monthDate, 'MMM yyyy'),
          totalViews: last.views,
          monthlyGain: Math.max(0, last.views - prevTotal),
        });
      } else {
        monthly.push({
          label: format(monthDate, 'MMM yyyy'),
          totalViews: null,
          monthlyGain: 0,
        });
      }
    }

    const current = sorted
      .filter((p) => isSameMonth(p.rawDate, now))
      .map((p) => ({
        label: format(p.rawDate, 'MMM d'),
        views: p.views,
        viewsGained: p.viewsGained,
      }));

    return { monthlyData: monthly, currentMonthData: current };
  }, [chartData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading channel analytics...</div>
      </div>
    );
  }

  // No access granted
  if (!access?.channel_analytics_access) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Channel Analytics access has not been enabled for your account. Please contact SwishView support to enable this feature.
        </AlertDescription>
      </Alert>
    );
  }

  // No start date or channel URL set
  if (!access.channel_start_date || !access.channel_url) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Campaign start date and channel URL have not been configured. Please contact SwishView support to set up your channel analytics.
        </AlertDescription>
      </Alert>
    );
  }

  const viewsGained = currentViews - startingViews;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Youtube className="h-6 w-6 sm:h-8 sm:w-8" />
            Channel Analytics
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Tracking from {format(parseISO(access.channel_start_date), 'PP')} to present
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm" className="w-fit">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Starting Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{startingViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(access.channel_start_date), 'PP')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total channel views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Views Gained</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">+{viewsGained.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Since campaign start</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentSubscribers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current count</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart with view toggle */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Channel View Growth</CardTitle>
              <CardDescription>
                {viewMode === 'all' && `From ${format(parseISO(access.channel_start_date), 'PP')} to now`}
                {viewMode === 'monthly' && 'Aggregated by month — last 12 months'}
                {viewMode === 'current-month' && `Daily progress — ${format(new Date(), 'MMMM yyyy')}`}
              </CardDescription>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All time</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="current-month">This month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No historical data available. Data will accumulate over time.
            </div>
          ) : viewMode === 'all' ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} name="Total Views" />
                <Line type="monotone" dataKey="viewsGained" stroke="#22c55e" strokeWidth={2} name="Views Gained" />
              </LineChart>
            </ResponsiveContainer>
          ) : viewMode === 'monthly' ? (
            monthlyData.every((m) => m.totalViews === null) ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm text-center">
                Not enough monthly data yet. Keep refreshing — monthly aggregates will populate as data accumulates.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => (value ?? 0).toLocaleString()} />
                  <Legend />
                  <Bar dataKey="monthlyGain" fill="#22c55e" name="Views Gained This Month" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : currentMonthData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm text-center">
              No data points yet for {format(new Date(), 'MMMM yyyy')}. Click Refresh to capture today's view count.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={currentMonthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} name="Total Views" />
                <Line type="monotone" dataKey="viewsGained" stroke="#22c55e" strokeWidth={2} name="Views Gained" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChannelAnalytics;
