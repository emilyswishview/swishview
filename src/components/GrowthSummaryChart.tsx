import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Calendar, Users, Eye } from "lucide-react";

interface GrowthSummaryChartProps {
  userId: string;
}

interface WeeklyGrowth {
  week: string;
  subscriberGrowth: number;
  viewGrowth: number;
  totalSubscribers: number;
  totalViews: number;
}

const GrowthSummaryChart = ({ userId }: GrowthSummaryChartProps) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyGrowth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyGrowthData();
  }, [userId]);

  const fetchWeeklyGrowthData = async () => {
    try {
      const { data: manualEntries, error } = await supabase
        .from('seo_analytics_manual_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true });

      if (error) throw error;

      if (manualEntries && manualEntries.length > 0) {
        const weeklyGrowth: WeeklyGrowth[] = [];

        for (let i = 1; i < manualEntries.length; i++) {
          const current = manualEntries[i];
          const previous = manualEntries[i - 1];

          const subscriberGrowth = (current.subscribers_count || 0) - (previous.subscribers_count || 0);
          const viewGrowth = (current.views_count || 0) - (previous.views_count || 0);

          weeklyGrowth.push({
            week: new Date(current.entry_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: '2-digit'
            }),
            subscriberGrowth,
            viewGrowth,
            totalSubscribers: current.subscribers_count || 0,
            totalViews: current.views_count || 0
          });
        }

        setWeeklyData(weeklyGrowth);
      }
    } catch (error: any) {
      console.error('Failed to fetch weekly growth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
          <p className="font-medium text-foreground mb-2">Week: {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'subscriberGrowth' ? 'Subscriber Growth' : 'View Growth'}:
              {` +${entry.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (weeklyData.length === 0) {
    return (
      <Card className="bg-muted/20">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Growth Data</h3>
            <p className="text-muted-foreground">
              Weekly growth data will appear once multiple data entries are available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Growth Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm  ">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold ">
                  {weeklyData.length > 0
                    ? Math.round(weeklyData.reduce((sum, week) => sum + week.subscriberGrowth, 0) / weeklyData.length).toLocaleString()
                    : '0'
                  }
                </div>
                <div className="text-sm text-gray-500 font-medium">Avg Weekly Subs Growth</div>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm  ">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold ">
                  {weeklyData.length > 0
                    ? Math.round(weeklyData.reduce((sum, week) => sum + week.viewGrowth, 0) / weeklyData.length).toLocaleString()
                    : '0'
                  }
                </div>
                <div className="text-sm text-gray-500 font-medium">Avg Weekly Views Growth</div>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Eye className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm  ">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold ">
                  +{weeklyData.reduce((sum, week) => sum + week.subscriberGrowth, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 font-medium">Total Subscriber Growth</div>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm  ">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold ">
                  +{weeklyData.reduce((sum, week) => sum + week.viewGrowth, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 font-medium">Total View Growth</div>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Weekly Subscriber Growth
            </CardTitle>
            <p className="text-muted-foreground text-sm">Track weekly subscriber gains</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  tickFormatter={(value) => value >= 0 ? `+${value}` : value.toString()}
                  domain={['dataMin - 50', 'dataMax + 50']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="subscriberGrowth"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-600" />
              Weekly Views Growth
            </CardTitle>
            <p className="text-muted-foreground text-sm">Track weekly view gains</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  tickFormatter={(value) => value >= 0 ? `+${value.toLocaleString()}` : value.toString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="viewGrowth"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div> */}
    </div>
  );
};

export default GrowthSummaryChart;
