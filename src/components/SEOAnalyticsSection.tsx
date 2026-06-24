import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RequestChannelReport from './RequestChannelReport';
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
  BarChart,
  Bar,
  ReferenceLine,
  Brush,
  Legend
} from 'recharts';
import { 
  Eye, 
  TrendingUp, 
  Clock, 
  Users, 
  MousePointer, 
  BarChart3, 
  Target,
  Activity,
  Lock,
  Youtube,
  Search
} from "lucide-react";

interface SEOAnalyticsSectionProps {
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
}

interface SEOPurchase {
  id: string;
  status: string;
  seo_plans: {
    name: string;
    duration_months: number;
  };
}

const SEOAnalyticsSection = ({ userId }: SEOAnalyticsSectionProps) => {
  const [seoAnalytics, setSeoAnalytics] = useState<SEOAnalytics | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSEOAnalytics();
    fetchHistoryData();
  }, [userId]);

  const fetchSEOAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_analytics')
        .select('*')
        .eq('user_id', userId)
        .eq('seo_access_enabled', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setSeoAnalytics(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load SEO analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    try {
      // First fetch manual entries data with starting date filtering
      const { data: manualData, error: manualError } = await supabase
        .from('seo_analytics_manual_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true });

      if (manualError) throw manualError;

      let formattedData: any[] = [];

      if (manualData && manualData.length > 0) {
        // Use manual entries data
        const startingDate = manualData.find(entry => entry.starting_date)?.starting_date;
        
        formattedData = manualData
          .filter(item => {
            // Filter from starting date if available
            if (startingDate) {
              return new Date(item.entry_date) >= new Date(startingDate);
            }
            return true;
          })
          .map(item => ({
            date: new Date(item.entry_date).toLocaleDateString(),
            subscribers: item.subscribers_count,
            views: item.views_count,
            watchTime: item.watch_time_hours,
            impressions: 0, // Manual entries don't have impressions yet
            clicks: 0, // Manual entries don't have clicks yet 
            traffic: 0 // Manual entries don't have traffic yet
          }));
      } else {
        // Fallback to analytics history
        const { data: historyData, error: historyError } = await supabase
          .from('seo_analytics_history')
          .select('*')
          .eq('user_id', userId)
          .order('recorded_at', { ascending: true })
          .limit(30);

        if (historyError) throw historyError;
        
        formattedData = historyData?.map(item => ({
          date: new Date(item.recorded_at).toLocaleDateString(),
          subscribers: item.subscribers_count,
          views: item.views_count,
          watchTime: 0,
          impressions: item.search_impressions,
          clicks: item.search_clicks,
          traffic: item.organic_traffic
        })) || [];
      }
      
      setHistoryData(formattedData);
    } catch (error: any) {
      console.error('Failed to fetch history data:', error);
    }
  };

  const hasAccess = seoAnalytics?.seo_access_enabled;

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Growth calculations now handled within manual data visualization
  const getLatestGrowthMetrics = () => {
    if (historyData.length >= 2) {
      const latest = historyData[historyData.length - 1];
      const previous = historyData[historyData.length - 2];
      return {
        subscriberGrowth: calculateGrowth(latest.subscribers, previous.subscribers),
        viewsGrowth: calculateGrowth(latest.views, previous.views)
      };
    }
    return { subscriberGrowth: '0', viewsGrowth: '0' };
  };

  const keywordData = [
    { keyword: "video marketing", position: 8, traffic: 420 },
    { keyword: "youtube promotion", position: 15, traffic: 280 },
    { keyword: "content strategy", position: 22, traffic: 150 },
    { keyword: "social media growth", position: 12, traffic: 320 },
    { keyword: "digital marketing", position: 35, traffic: 90 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading SEO analytics...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        {/* Locked Analytics Notice */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-8 border border-orange-200">
          <div className="flex items-center justify-center mb-4">
            <Lock className="w-12 h-12 text-orange-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-orange-900 mb-2">SEO Analytics Locked</h3>
            <p className="text-orange-700 mb-4">
              Complete payment for an SEO plan to unlock detailed analytics and tracking features.
            </p>
            <div className="bg-white/50 rounded-lg p-4 text-sm text-orange-800">
              Access comprehensive SEO analytics including:
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Search impressions and click-through rates</li>
                <li>Keyword ranking positions and trends</li>
                <li>Organic traffic growth metrics</li>
                <li>Backlink analysis and domain authority</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold text-foreground mb-4">
          YouTube Analytics Dashboard
        </h2>
        <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
          Track your YouTube performance, subscriber growth, and view analytics.
        </p>
      </div>

      {/* Channel Overview */}
      {seoAnalytics?.channel_url && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-600" />
              YouTube Channel Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <a 
                href={seoAnalytics.channel_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-medium"
              >
                View Channel
              </a>
              <div className="text-center">
                <p className="text-muted-foreground">
                  Growth metrics are based on manual data entries tracked by our team.
                  View detailed analytics in the charts below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Search className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Search Impressions</p>
                <p className="text-2xl font-bold">{seoAnalytics?.search_impressions.toLocaleString() || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <MousePointer className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Search Clicks</p>
                <p className="text-2xl font-bold">{seoAnalytics?.search_clicks.toLocaleString() || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">CTR</p>
                <p className="text-2xl font-bold">{seoAnalytics?.click_through_rate || '0'}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Position</p>
                <p className="text-2xl font-bold">{seoAnalytics?.average_position || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Growth Charts with Zoom & Scroll */}
      {historyData.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Subscriber Growth Analytics
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Track subscriber growth from manual data entries. Use the brush to zoom into specific time periods.
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={420}>
                  <LineChart 
                    data={historyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <defs>
                      <linearGradient id="subscriberGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" strokeOpacity={0.7} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6366f1"
                      fontSize={12}
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      stroke="#6366f1" 
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000)}K`}
                      domain={['dataMin - 100', 'dataMax + 100']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '2px solid #3b82f6',
                        borderRadius: '12px',
                        boxShadow: '0 20px 40px rgba(59, 130, 246, 0.15)',
                        padding: '12px 16px'
                      }}
                      labelStyle={{ color: '#1e40af', fontWeight: '600', fontSize: '14px' }}
                      formatter={(value, name) => [
                        `${Number(value).toLocaleString()} subscribers`, 
                        'Subscribers'
                      ]}
                      labelFormatter={(date) => `Date: ${date}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="subscribers"
                      fill="url(#subscriberGradient)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="subscribers" 
                      stroke="#3b82f6" 
                      strokeWidth={4}
                      dot={{ fill: '#3b82f6', strokeWidth: 3, r: 8, stroke: '#ffffff' }}
                      activeDot={{ r: 12, stroke: '#1d4ed8', strokeWidth: 3, fill: '#3b82f6' }}
                    />
                    <Brush 
                      dataKey="date" 
                      height={30} 
                      stroke="#3b82f6"
                      fill="#f1f5f9"
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-600" />
                Views Growth Analytics
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Monitor view count progression over time. Scroll and zoom for detailed analysis.
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={420}>
                  <AreaChart 
                    data={historyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <defs>
                      <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" strokeOpacity={0.7} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#059669"
                      fontSize={12}
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      stroke="#059669" 
                      fontSize={12}
                      tickFormatter={(value) => value.toLocaleString()}
                      domain={['dataMin - 1000', 'dataMax + 1000']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '2px solid #10b981',
                        borderRadius: '12px',
                        boxShadow: '0 20px 40px rgba(16, 185, 129, 0.15)',
                        padding: '12px 16px'
                      }}
                      labelStyle={{ color: '#047857', fontWeight: '600', fontSize: '14px' }}
                      formatter={(value, name) => [
                        `${Number(value).toLocaleString()} views`, 
                        'Views'
                      ]}
                      labelFormatter={(date) => `Date: ${date}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="views" 
                      stroke="#10b981" 
                      fill="url(#viewsGradient)" 
                      strokeWidth={4}
                      dot={{ fill: '#10b981', strokeWidth: 3, r: 8, stroke: '#ffffff' }}
                    />
                    <Brush 
                      dataKey="date" 
                      height={30} 
                      stroke="#10b981"
                      fill="#f0fdf4"
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Watch Time Analytics Chart */}
      {historyData.length > 0 && historyData.some(item => item.watchTime > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Watch Time Growth Analytics
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Track accumulated watch time hours based on manual data entries.
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart 
                  data={historyData.filter(item => item.watchTime > 0)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <defs>
                    <linearGradient id="watchTimeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" strokeOpacity={0.7} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#7c3aed"
                    fontSize={12}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="#7c3aed" 
                    fontSize={12}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '2px solid #8b5cf6',
                      borderRadius: '12px',
                      boxShadow: '0 20px 40px rgba(139, 92, 246, 0.15)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ color: '#6b21a8', fontWeight: '600', fontSize: '14px' }}
                    formatter={(value) => [`${value} hours`, 'Watch Time']}
                    labelFormatter={(date) => `Date: ${date}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="watchTime" 
                    stroke="#8b5cf6" 
                    fill="url(#watchTimeGradient)" 
                    strokeWidth={4}
                    dot={{ fill: '#8b5cf6', strokeWidth: 3, r: 8, stroke: '#ffffff' }}
                  />
                  <Brush 
                    dataKey="date" 
                    height={30} 
                    stroke="#8b5cf6"
                    fill="#faf5ff"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEO Performance Charts */}
      {historyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              SEO Performance Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={300} minWidth={400}>
                <BarChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="impressions" fill="#8b5cf6" />
                  <Bar dataKey="clicks" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Channel Report */}
      <RequestChannelReport userId={userId} />

      {/* Traffic & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Organic Traffic
            </CardTitle>
            <CardDescription>Monthly organic search traffic</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-3xl font-bold text-blue-600">
                {seoAnalytics?.organic_traffic.toLocaleString() || '0'}
              </div>
              <Progress value={Math.min((seoAnalytics?.organic_traffic || 0) / 100, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              SEO Metrics
            </CardTitle>
            <CardDescription>Key SEO performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Keywords Ranking</span>
                <span className="font-semibold">{seoAnalytics?.keywords_ranking || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Backlinks</span>
                <span className="font-semibold">{seoAnalytics?.backlinks_count || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Domain Authority</span>
                <span className="font-semibold">{seoAnalytics?.domain_authority || 0}/100</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keyword Rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Top Keywords
          </CardTitle>
          <CardDescription>Current keyword rankings and traffic</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Keyword</th>
                  <th className="text-center py-2">Position</th>
                  <th className="text-right py-2">Traffic</th>
                </tr>
              </thead>
              <tbody>
                {keywordData.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 font-medium">{item.keyword}</td>
                    <td className="text-center py-3">
                      <Badge 
                        variant={item.position <= 10 ? "default" : "secondary"}
                        className={item.position <= 10 ? "bg-green-100 text-green-800" : ""}
                      >
                        #{item.position}
                      </Badge>
                    </td>
                    <td className="text-right py-3 font-semibold">
                      {item.traffic.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SEOAnalyticsSection;