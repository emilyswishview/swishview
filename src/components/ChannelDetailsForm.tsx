import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Youtube, Users, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChannelMetrics {
  totalViews: number;
  totalSubscribers: number;
  cached: boolean;
}

interface ChannelDetailsProps {
  onChannelData: (data: {
    channelName: string;
    channelUrl: string;
    description: string;
    metrics: ChannelMetrics;
  }) => void;
}

const ChannelDetailsForm = ({ onChannelData }: ChannelDetailsProps) => {
  const [channelName, setChannelName] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [description, setDescription] = useState('');
  const [metrics, setMetrics] = useState<ChannelMetrics | null>(null);
  const [fetchingMetrics, setFetchingMetrics] = useState(false);
  const { toast } = useToast();

  const isValidChannelUrl = (url: string) => {
    const patterns = [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_-]+)/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const fetchChannelMetrics = async (url: string) => {
    if (!isValidChannelUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube channel URL",
        variant: "destructive",
      });
      return;
    }

    setFetchingMetrics(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-channel-analytics', {
        body: { channelUrl: url }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const channelMetrics = {
        totalViews: data.totalViews || 0,
        totalSubscribers: data.totalSubscribers || 0,
        cached: data.cached || false
      };

      setMetrics(channelMetrics);
      
      toast({
        title: "Metrics Fetched",
        description: `Found ${channelMetrics.totalSubscribers.toLocaleString()} subscribers and ${channelMetrics.totalViews.toLocaleString()} views`,
      });
    } catch (error: any) {
      console.error('Error fetching channel metrics:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch channel metrics",
        variant: "destructive",
      });
    } finally {
      setFetchingMetrics(false);
    }
  };

  const handleSubmit = () => {
    if (!channelName.trim() || !channelUrl.trim() || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!metrics) {
      toast({
        title: "Missing Metrics",
        description: "Please fetch channel metrics first",
        variant: "destructive",
      });
      return;
    }

    onChannelData({
      channelName: channelName.trim(),
      channelUrl: channelUrl.trim(),
      description: description.trim(),
      metrics
    });
  };

  useEffect(() => {
    if (channelUrl && isValidChannelUrl(channelUrl) && !metrics) {
      const timeoutId = setTimeout(() => {
        fetchChannelMetrics(channelUrl);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [channelUrl]);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="w-6 h-6 text-red-600" />
          Channel Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="channelName">Channel Name</Label>
          <Input
            id="channelName"
            placeholder="Enter your channel name"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="channelUrl">Channel URL</Label>
          <Input
            id="channelUrl"
            placeholder="https://youtube.com/@yourchannel or https://youtube.com/channel/..."
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
          />
          {channelUrl && !isValidChannelUrl(channelUrl) && (
            <p className="text-sm text-red-600">Please enter a valid YouTube channel URL</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Channel Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your channel and content..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        {channelUrl && isValidChannelUrl(channelUrl) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Channel Metrics</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchChannelMetrics(channelUrl)}
                disabled={fetchingMetrics}
              >
                {fetchingMetrics ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {metrics ? 'Refresh' : 'Fetch'} Metrics
              </Button>
            </div>

            {fetchingMetrics && (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Fetching channel metrics...</p>
              </div>
            )}

            {metrics && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Subscribers</p>
                    <p className="font-semibold">{metrics.totalSubscribers.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Views</p>
                    <p className="font-semibold">{metrics.totalViews.toLocaleString()}</p>
                  </div>
                </div>
                {metrics.cached && (
                  <div className="col-span-2">
                    <Badge variant="outline" className="text-xs">
                      Cached data (updated within 24 hours)
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          className="w-full"
          disabled={!channelName.trim() || !channelUrl.trim() || !description.trim() || !metrics}
        >
          Continue to Plan Selection
        </Button>
      </CardContent>
    </Card>
  );
};

export default ChannelDetailsForm;