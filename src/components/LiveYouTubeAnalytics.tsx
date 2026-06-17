import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Calendar as CalendarIcon, Users, Eye, Clock, Youtube, RefreshCw } from "lucide-react";
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';


interface LiveYouTubeAnalyticsProps {
  userId: string;
}

interface AnalyticsData {
  date: string;
  displayDate: string;
  subscribers: number;
  views: number;
  watchTime: number;
}

type ChartFilter = 'lifetime' | 'last90' | 'campaign' | 'custom';

const LiveYouTubeAnalytics = ({ userId }: LiveYouTubeAnalyticsProps) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [fullAnalyticsData, setFullAnalyticsData] = useState<AnalyticsData[]>([]); // Full lifetime data
  const [campaignStartDate, setCampaignStartDate] = useState<string>('');
  const [channelCreatedDate, setChannelCreatedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [channelUrl, setChannelUrl] = useState<string | null>(null);
  const [ownershipMismatch, setOwnershipMismatch] = useState(false);
  const [lastFetched, setLastFetched] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [chartFilter, setChartFilter] = useState<ChartFilter>('lifetime');
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      // Get campaign settings
      const { data: seoData, error } = await supabase
        .from('seo_analytics')
        .select('campaign_start_date, channel_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (seoData) {
        setCampaignStartDate(seoData.campaign_start_date);
        setChannelUrl(seoData.channel_url || null);
        
        // Fetch live data immediately - this will get full lifetime data
        if (seoData.campaign_start_date) {
          await fetchFullLifetimeAnalytics(seoData.channel_url);
        } else {
          setError('Campaign start date not set');
          setLoading(false);
        }
      } else {
        setError('SEO analytics not configured');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      setError('Failed to load analytics settings');
      setLoading(false);
    }
  };

  const fetchFullLifetimeAnalytics = async (channelUrlOverride?: string | null) => {
    setLoading(true);
    setError('');

    try {
      const adminChannelUrl = channelUrlOverride !== undefined ? channelUrlOverride : channelUrl;
      
      // First get channel info to find out when the channel was created
      const endDate = new Date().toISOString().split('T')[0];
      
      // Use a very old start date to get all data, then filter based on actual channel creation
      const veryOldDate = '2005-01-01'; // YouTube's founding year

      console.log('Fetching full lifetime YouTube Analytics');

      // Fetch all daily data in one call with 'day' dimension for time-series
      const { data, error } = await supabase.functions.invoke('youtube-analytics', {
        body: {
          userId,
          metrics: ['views', 'subscribersGained', 'estimatedMinutesWatched'],
          startDate: veryOldDate,
          endDate: endDate,
          dimensions: ['day'],
          maxResults: 10000 // Higher limit for lifetime data
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error('Failed to fetch analytics from YouTube');
      }

      if (data?.success === false || data?.error) {
        console.error('Analytics API error:', data);
        throw new Error(data?.error || data?.hint || 'YouTube Analytics API returned an error');
      }

      // Verify channel ownership if admin specified a channel URL
      if (adminChannelUrl && data?.channelInfo?.id) {
        const connectedChannelId = data.channelInfo.id;
        const match = adminChannelUrl.match(/\/channel\/([A-Za-z0-9_-]+)/);
        const expectedId = match?.[1];
        
        if (expectedId && expectedId !== connectedChannelId) {
          setOwnershipMismatch(true);
          throw new Error(
            `Connected Google account does not own the admin-selected channel. Expected channel ID: ${expectedId}, but got: ${connectedChannelId}. Please connect the correct Google account.`
          );
        }
      }
      setOwnershipMismatch(false);

      // Store channel info if available
      if (data?.channelInfo?.snippet?.publishedAt) {
        const channelCreated = data.channelInfo.snippet.publishedAt.split('T')[0];
        setChannelCreatedDate(channelCreated);
      }

      if (!data?.analytics?.rows || data.analytics.rows.length === 0) {
        console.warn('No analytics data returned from YouTube API');
        setFullAnalyticsData([]);
        setAnalyticsData([]);
        setLoading(false);
        toast({
          title: "No Data Available",
          description: "YouTube Analytics returned no data for this period. This channel may not have any activity yet.",
          variant: "default",
        });
        return;
      }

      // Process daily data
      console.log('Raw analytics data:', data.analytics);
      const dailyData = data.analytics.rows;
      
      // Find the actual first date with data
      const firstDataDate = dailyData.length > 0 ? dailyData[0][0] : veryOldDate;
      const actualStartDate = channelCreatedDate || firstDataDate;
      
      // Create a map of all dates from actual channel start to today
      const startDateObj = new Date(actualStartDate);
      const endDateObj = new Date(endDate);
      const allDatesMap: { [key: string]: { views: number; subscribers: number; watchTime: number } } = {};
      
      for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        allDatesMap[dateKey] = { views: 0, subscribers: 0, watchTime: 0 };
      }

      // Fill in actual data from YouTube
      dailyData.forEach((row: any) => {
        const day = row[0];
        const views = parseInt(row[1]) || 0;
        const subscribers = parseInt(row[2]) || 0;
        const watchMinutes = parseInt(row[3]) || 0;

        console.log('Processing day:', day, 'views:', views, 'subscribers:', subscribers, 'watchMinutes:', watchMinutes);

        if (allDatesMap[day]) {
          allDatesMap[day].views = views;
          allDatesMap[day].subscribers = subscribers;
          allDatesMap[day].watchTime = watchMinutes;
        }
      });

      // Convert to array format sorted by date
      const dailyDataPoints: AnalyticsData[] = Object.keys(allDatesMap)
        .sort()
        .map(dateKey => ({
          date: dateKey,
          displayDate: new Date(dateKey).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          views: allDatesMap[dateKey].views,
          subscribers: allDatesMap[dateKey].subscribers,
          watchTime: Math.round(allDatesMap[dateKey].watchTime / 60) // Convert minutes to hours
        }));

      console.log('Processed full lifetime data:', dailyDataPoints);
      
      // Store full lifetime data
      setFullAnalyticsData(dailyDataPoints);
      
      // Set initial chart data based on default filter (lifetime)
      setAnalyticsData(dailyDataPoints);
      setLastFetched(new Date().toLocaleString());
      
      toast({
        title: "Analytics Updated",
        description: `Successfully loaded ${dailyDataPoints.length} days of lifetime data`,
        variant: "default",
      });
    } catch (error: any) {
      console.error('Failed to fetch live analytics:', error);
      setError(error.message || 'Failed to load analytics data');
      toast({
        title: "Analytics Error",
        description: error.message || 'Failed to fetch YouTube analytics. Please try reconnecting your Google account.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchFullLifetimeAnalytics();
  };

  const applyChartFilter = (filter: ChartFilter) => {
    setChartFilter(filter);
    
    if (!fullAnalyticsData.length) return;
    
    const today = new Date();
    let filteredData: AnalyticsData[] = [];
    
    switch (filter) {
      case 'lifetime':
        filteredData = fullAnalyticsData;
        break;
        
      case 'last90':
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        filteredData = fullAnalyticsData.filter(d => new Date(d.date) >= ninetyDaysAgo);
        break;
        
      case 'campaign':
        if (campaignStartDate) {
          const campaignStart = new Date(campaignStartDate);
          filteredData = fullAnalyticsData.filter(d => new Date(d.date) >= campaignStart);
        } else {
          filteredData = fullAnalyticsData;
        }
        break;
        
      case 'custom':
        if (dateRange.from && dateRange.to) {
          filteredData = fullAnalyticsData.filter(d => {
            const date = new Date(d.date);
            return date >= dateRange.from! && date <= dateRange.to!;
          });
        } else {
          filteredData = fullAnalyticsData;
        }
        break;
    }
    
    setAnalyticsData(filteredData);
    
    toast({
      title: "Filter Applied",
      description: `Showing ${filteredData.length} days of data`,
    });
  };

  const handleDateRangeChange = async () => {
    if (dateRange.from && dateRange.to) {
      setChartFilter('custom');
      applyChartFilter('custom');
    }
  };

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
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        'https://www.googleapis.com/auth/yt-analytics-monetary.readonly'
      ].join(' '),
    },
  });
};

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-[300px] bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Youtube className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <div className="space-y-3">
            <div>
              <strong>Unable to Load Analytics</strong>
              <p className="mt-2">Please reconnect your Google account to view your YouTube analytics data.</p>
            </div>
            <Button onClick={handleConnect} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Connect Google Account
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (analyticsData.length === 0) {
    return (
      <Card className="bg-muted/20">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
            <p className="text-muted-foreground">
              YouTube analytics data will appear here once available
            </p>
            <Button onClick={handleRefresh} size="sm" className="mt-4">
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Dynamic aggregation by range: daily/weekly/monthly/yearly
  const getDateSpanDays = (data: AnalyticsData[]) => {
    if (!data.length) return 0;
    const start = new Date(data[0].date);
    const end = new Date(data[data.length - 1].date);
    return Math.max(1, Math.floor((+end - +start) / (1000 * 60 * 60 * 24)));
  };

  type Grouping = 'daily' | 'weekly' | 'monthly' | 'yearly';

  const getGrouping = (data: AnalyticsData[]): Grouping => {
    const days = getDateSpanDays(data);
    if (days <= 31) return 'daily';
    if (days <= 180) return 'weekly';
    if (days <= 730) return 'monthly';
    return 'yearly';
  };

  const startOfWeekMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0,0,0,0);
    return date;
  };

  const groupData = () => {
    const grouping = getGrouping(analyticsData);
    const agg: { [key: string]: { date: string; label: string; views: number; subscribers: number; watchTime: number } } = {};

    const add = (key: string, label: string, dateKey: string, dp: AnalyticsData) => {
      if (!agg[key]) agg[key] = { date: dateKey, label, views: 0, subscribers: 0, watchTime: 0 };
      agg[key].views += dp.views;
      agg[key].subscribers += dp.subscribers;
      agg[key].watchTime += dp.watchTime;
    };

    analyticsData.forEach(dp => {
      const d = new Date(dp.date + 'T00:00:00');
      let key: string;
      let label: string;

      if (grouping === 'daily') {
        key = d.toISOString().split('T')[0];
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        add(key, label, key, dp);
      } else if (grouping === 'weekly') {
        const weekStart = startOfWeekMonday(d);
        key = weekStart.toISOString().split('T')[0];
        label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        add(key, label, key, dp);
      } else if (grouping === 'monthly') {
        const keyDate = new Date(d.getFullYear(), d.getMonth(), 1);
        key = keyDate.toISOString().split('T')[0];
        label = keyDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        add(key, label, key, dp);
      } else {
        const keyDate = new Date(d.getFullYear(), 0, 1);
        key = keyDate.toISOString().split('T')[0];
        label = keyDate.getFullYear().toString();
        add(key, label, key, dp);
      }
    });

    return Object.keys(agg).sort().map(k => ({
      date: k,
      displayDate: agg[k].label,
      views: agg[k].views,
      subscribers: agg[k].subscribers,
      watchTime: agg[k].watchTime
    }));
  };

  const getXAxisIntervalByCount = (count: number) => {
    if (count <= 12) return 0;
    return Math.floor(count / 10);
  };

  const displayData = groupData();

  // Calculate totals from campaign start date for summary boxes
  const campaignData = fullAnalyticsData.filter(d => {
    if (!campaignStartDate) return true;
    return new Date(d.date) >= new Date(campaignStartDate);
  });
  
  const totalViewsFromCampaign = campaignData.reduce((sum, day) => sum + day.views, 0);
  const totalSubscribersFromCampaign = campaignData.reduce((sum, day) => sum + day.subscribers, 0);
  
  const dataPointsCount = displayData.length || 1;
  const avgViews = Math.round(totalViewsFromCampaign / (campaignData.length || 1));
  const avgSubscribers = Math.round(totalSubscribersFromCampaign / (campaignData.length || 1));

  return (
    
    <div className="space-y-6">
            {/* Growth Summary Stats */}
      <div className="grid grid-cols-1 font-display sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {avgSubscribers.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 font-medium">Avg Weekly Subs Growth</div>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {avgViews.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 font-medium">Avg Weekly Views Growth</div>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Eye className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  +{totalSubscribersFromCampaign.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 font-medium">Total Subscriber Growth (Campaign)</div>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  +{totalViewsFromCampaign.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 font-medium">Total View Growth (Campaign)</div>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Chart Filter Controls */}
      <Card className="bg-gradient-to-r from-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                <CalendarIcon className="w-4 h-4" />
                Chart View Filter
              </div>
              <Button onClick={handleRefresh} size="sm" variant="ghost" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={chartFilter === 'lifetime' ? 'default' : 'outline'}
                onClick={() => applyChartFilter('lifetime')}
                className="font-display"
              >
                Lifetime
              </Button>
              <Button
                size="sm"
                variant={chartFilter === 'last90' ? 'default' : 'outline'}
                onClick={() => applyChartFilter('last90')}
                className="font-display"
              >
                Last 90 Days
              </Button>
              <Button
                size="sm"
                variant={chartFilter === 'campaign' ? 'default' : 'outline'}
                onClick={() => applyChartFilter('campaign')}
                disabled={!campaignStartDate}
                className="font-display"
              >
                Campaign Start
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant={chartFilter === 'custom' ? 'default' : 'outline'}
                    className="font-display"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Custom Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      setDateRange({ from: range?.from, to: range?.to });
                    }}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date()}
                    className="pointer-events-auto"
                  />
                  <div className="p-3 border-t flex justify-end gap-2">
                    <Button size="sm" onClick={handleDateRangeChange} disabled={!dateRange.from || !dateRange.to}>
                      Apply Custom Range
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Subscribers Line Chart */}
      <Card className="border-0 font-display shadow-elegant bg-white/70 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-blue-100">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            Subscribers Growth
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="displayDate" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                interval={getXAxisIntervalByCount(displayData.length)}
                tick={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={(value) => value.toLocaleString()} allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="subscribers" 
                name="Subscribers" 
                stroke="#2563eb" 
                strokeWidth={2.5}
                fill="url(#colorSubscribers)"
                dot={{ r: 4, fill: "#2563eb" }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Views Line Chart */}
      <Card className="border-0 font-display  shadow-elegant bg-white/70 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-green-100">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            Views Growth
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="displayDate" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                interval={getXAxisIntervalByCount(displayData.length)}
                tick={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={(value) => value.toLocaleString()} allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="views" 
                name="Views" 
                stroke="#16a34a" 
                strokeWidth={2.5}
                fill="url(#colorViews)"
                dot={{ r: 4, fill: "#16a34a" }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Watch Hours Chart */}
      <Card className="border-0 shadow-elegant font-display  bg-white/70 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-purple-100">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            Watch Hours Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                <linearGradient id="colorWatchTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="displayDate" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                interval={getXAxisIntervalByCount(displayData.length)}
                tick={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={(value) => value.toLocaleString()} allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="watchTime"
                name="Watch Hours"
                fill="url(#colorWatchTime)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveYouTubeAnalytics;
