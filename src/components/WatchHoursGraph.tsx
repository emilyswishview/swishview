import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Clock, Calendar } from "lucide-react";

interface WatchHoursGraphProps {
  userId: string;
}

interface ManualEntry {
  id: string;
  entry_date: string;
  watch_time_hours: number;
}

const WatchHoursGraph = ({ userId }: WatchHoursGraphProps) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWatchHoursData();
  }, [userId]);

  const fetchWatchHoursData = async () => {
    try {
      const { data: manualEntries, error } = await supabase
        .from('seo_analytics_manual_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true });

      if (error) throw error;

      if (manualEntries && manualEntries.length > 0) {
        const formattedData = manualEntries.map(entry => ({
          date: new Date(entry.entry_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: '2-digit' 
          }),
          fullDate: entry.entry_date,
          watchHours: entry.watch_time_hours || 0
        }));

        setChartData(formattedData);
      }
    } catch (error: any) {
      console.error('Failed to fetch watch hours data:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border border-border rounded-xl p-4 shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <p className="text-sm text-blue-600">
            🕒 Watch Hours: {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="text-center">Loading watch hours data...</div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-purple-100">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            Watch Hours Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Watch Hours Data</h3>
            <p className="text-muted-foreground">Watch hours data will appear here when added by your account manager</p>
          </div>
        </CardContent>
      </Card>
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
    
    if (dataPoints <= 12) return 0;
    if (days <= 30) return Math.floor(dataPoints / 10);
    if (days <= 180) return Math.floor(dataPoints / 8);
    return Math.floor(dataPoints / 10);
  };

  const formatXAxisDate = (dateStr: string) => {
    const days = getDateRangeDays();
    const date = chartData.find(d => d.date === dateStr);
    if (!date) return dateStr;
    
    const fullDate = new Date(date.fullDate);
    if (days <= 30) {
      return fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (days <= 180) {
      return fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return fullDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  };

  return (
    <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
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
              label={{ value: "", angle: -90, position: 'insideLeft' }}
              domain={(() => {
                const values = chartData.map(d => d.watchHours).filter(v => v != null);
                if (values.length === 0) return [0, 100];
                const min = Math.min(...values);
                const max = Math.max(...values);
                const stepSize = 300;
                const roundedMin = Math.floor(min / stepSize) * stepSize;
                const roundedMax = Math.ceil(max / stepSize) * stepSize;
                const buffer = stepSize;
                return [Math.max(0, roundedMin - buffer), roundedMax + buffer];
              })()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="watchHours" 
              stroke="#7c3aed" 
              strokeWidth={3} 
              dot={{ r: 4, fill: "#7c3aed" }} 
              isAnimationActive 
              activeDot={{ r: 6, stroke: "#7c3aed", strokeWidth: 2, fill: "#ffffff" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default WatchHoursGraph;