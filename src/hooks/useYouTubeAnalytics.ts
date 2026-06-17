import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  thumbnails: any;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

export interface AnalyticsData {
  columnHeaders: Array<{ name: string; columnType: string; dataType: string }>;
  rows: Array<Array<string | number>>;
}

export interface RevenueData {
  estimatedRevenue: number;
  estimatedAdRevenue: number;
  cpm: number;
  adImpressions: number;
  monetizedPlaybacks: number;
}

export const useYouTubeAnalytics = (userId: string, options?: { autoFetch?: boolean }) => {
  const autoFetch = options?.autoFetch ?? true;
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAnalytics = async (
    metrics: string[], 
    dimensions: string[] = [], 
    startDate: string, 
    endDate: string
  ) => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('youtube-analytics', {
        body: {
          userId,
          metrics,
          dimensions,
          startDate,
          endDate
        }
      });

      if (error) throw error;
      
      if (data?.success === false || data?.error) {
        const detailed = [data?.error, data?.hint, data?.details].filter(Boolean).join(' | ');
        throw new Error(detailed || 'Failed to fetch analytics');
      }

      if (data?.channelInfo) setChannelInfo(data.channelInfo);
      if (data?.analytics) setAnalytics(data.analytics);
      
      console.log('Analytics data fetched:', data);
      
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setError(err.message);
      toast({
        title: "Analytics Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async (startDate: string, endDate: string, dimensions: string[] = []) => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('youtube-revenue', {
        body: {
          userId,
          startDate,
          endDate,
          dimensions
        }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Process revenue data
      if (data.revenue.rows && data.revenue.rows.length > 0) {
        const row = data.revenue.rows[0];
        const headers = data.revenue.columnHeaders;
        
        const revenueData: RevenueData = {
          estimatedRevenue: 0,
          estimatedAdRevenue: 0,
          cpm: 0,
          adImpressions: 0,
          monetizedPlaybacks: 0
        };

        headers.forEach((header: any, index: number) => {
          const value = row[index] as number;
          switch (header.name) {
            case 'estimatedRevenue':
              revenueData.estimatedRevenue = value || 0;
              break;
            case 'estimatedAdRevenue':
              revenueData.estimatedAdRevenue = value || 0;
              break;
            case 'cpm':
              revenueData.cpm = value || 0;
              break;
            case 'adImpressions':
              revenueData.adImpressions = value || 0;
              break;
            case 'monetizedPlaybacks':
              revenueData.monetizedPlaybacks = value || 0;
              break;
          }
        });

        setRevenue(revenueData);
      }
      
      console.log('Revenue data fetched:', data);
      
    } catch (err: any) {
      console.error('Revenue fetch error:', err);
      setError(err.message);
      toast({
        title: "Revenue Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch today's data by default (only when autoFetch is enabled)
  useEffect(() => {
    if (userId && autoFetch) {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Fetch basic metrics
      fetchAnalytics(
        ['views', 'subscribersGained', 'estimatedMinutesWatched', 'likes', 'comments', 'shares'],
        ['day'],
        sevenDaysAgo,
        today
      );
      
      // Fetch revenue data
      // Revenue fetching disabled (channel may not be monetized)
    }
  }, [userId, autoFetch]);

  const refreshData = (startDate: string, endDate: string) => {
    if (!userId) return;
    
    // Refresh analytics
    fetchAnalytics(
      ['views', 'subscribersGained', 'estimatedMinutesWatched', 'likes', 'comments', 'shares'],
      ['day'],
      startDate,
      endDate
    );
    
    // Refresh revenue
    // Revenue refresh disabled
  };

  return {
    channelInfo,
    analytics,
    revenue,
    loading,
    error,
    fetchAnalytics,
    fetchRevenue,
    refreshData
  };
};