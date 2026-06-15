import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Users, Eye, Calendar } from "lucide-react";

interface SEOAnalyticsGraphProps {
  userId: string;
}

interface ManualEntry {
  id: string;
  user_id: string;
  entry_date: string;
  entry_type: string;
  subscribers_count: number;
  views_count: number;
  starting_date?: string;
  created_at: string;
}

const SEOAnalyticsGraph = ({ userId }: SEOAnalyticsGraphProps) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [userId]);

  const fetchAnalyticsData = async () => {
    try {
      const { data: manualEntries, error } = await supabase
        .from('seo_analytics_manual_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true });

      if (error) throw error;

      if (manualEntries && manualEntries.length > 0) {
        const formattedData = manualEntries.map(entry => ({
          date: new Date(entry.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
          fullDate: entry.entry_date,
          subscribers: entry.subscribers_count,
          views: Number(entry.views_count),
          type: entry.entry_type
        }));

        setChartData(formattedData);
      }
    } catch (error: any) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border border-border rounded-xl p-4 shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'subscribers' ? '👥 Subscribers' : '👁 Views'}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No Analytics Data</h3>
        <p className="text-muted-foreground">Your account manager will add analytics data to track your growth</p>
      </div>
    );
  }

  const getDateRangeDays = () => {
    if (chartData.length === 0) return 0;
    const firstDate = new Date(chartData[0].fullDate);
    const lastDate = new Date(chartData[chartData.length - 1].fullDate);
    return Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getXAxisInterval = () => {
    const days = getDateRangeDays();
    const dataPoints = chartData.length;
    
    // Prevent too many labels - aim for 8-12 labels max
    if (dataPoints <= 12) return 0; // Show all
    if (days <= 30) return Math.floor(dataPoints / 10); // Daily data
    if (days <= 180) return Math.floor(dataPoints / 8); // Weekly-ish
    return Math.floor(dataPoints / 10); // Monthly-ish
  };

  const formatXAxisDate = (dateStr: string) => {
    const days = getDateRangeDays();
    const date = chartData.find(d => d.date === dateStr);
    if (!date) return dateStr;
    
    const fullDate = new Date(date.fullDate);
    if (days <= 30) {
      // Short range: show day and month
      return fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (days <= 180) {
      // Medium range: show week/month
      return fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // Long range: show month and year
      return fullDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  };

  const getYAxisProps = (dataKey: string) => {
    const values = chartData.map(d => d[dataKey]).filter(v => v != null);
    if (values.length === 0) return { domain: [0, 100] };

    const min = Math.min(...values);
    const max = Math.max(...values);
    
    let stepSize: number;
    let roundedMin: number;
    let roundedMax: number;
    
    if (dataKey === 'views') {
      stepSize = 25000;
      roundedMin = Math.floor(min / stepSize) * stepSize;
      roundedMax = Math.ceil(max / stepSize) * stepSize;
    } else if (dataKey === 'subscribers') {
      stepSize = 50;
      roundedMin = Math.floor(min / stepSize) * stepSize;
      roundedMax = Math.ceil(max / stepSize) * stepSize;
    } else {
      stepSize = 300; // watch time
      roundedMin = Math.floor(min / stepSize) * stepSize;
      roundedMax = Math.ceil(max / stepSize) * stepSize;
    }

    const buffer = stepSize;
    return {
      domain: [Math.max(0, roundedMin - buffer), roundedMax + buffer],
      ticks: generateTicks(roundedMin - buffer, roundedMax + buffer, stepSize)
    };
  };

  const generateTicks = (min: number, max: number, step: number) => {
    const ticks = [];
    for (let i = Math.ceil(min / step) * step; i <= max; i += step) {
      ticks.push(i);
    }
    return ticks;
  };

  return (
    <div className="space-y-6">
      {/* Subscribers Line Chart */}
      <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
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
            <LineChart data={chartData} margin={{ top: 20, right: 45, left: 45, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                interval={getXAxisInterval()}
                tickFormatter={formatXAxisDate}
              />
              <YAxis 
                tickFormatter={(value) => value.toLocaleString()}
                allowDecimals={false}
                {...getYAxisProps('subscribers')}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="subscribers" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Views Line Chart */}
      <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
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
            <LineChart data={chartData} margin={{ top: 20, right: 45, left: 45, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                interval={getXAxisInterval()}
                tickFormatter={formatXAxisDate}
              />
              <YAxis 
                tickFormatter={(value) => value.toLocaleString()}
                allowDecimals={false}
                {...getYAxisProps('views')}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="views" stroke="#16a34a" strokeWidth={3} dot={{ r: 3 }} isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SEOAnalyticsGraph;
