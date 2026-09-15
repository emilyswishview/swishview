import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const extractChannelId = (channelUrl: string): string | null => {
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = channelUrl.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

const getChannelIdFromHandle = async (handle: string, apiKey: string): Promise<string | null> => {
  try {
    console.log('Searching for channel with handle:', handle);
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&key=${apiKey}&maxResults=1`
    );
    
    if (!searchResponse.ok) {
      console.error('Search API error:', searchResponse.status);
      return null;
    }
    
    const searchData = await searchResponse.json();
    console.log('Search API response:', searchData);
    
    if (searchData.items && searchData.items.length > 0) {
      return searchData.items[0].snippet.channelId;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for channel:', error);
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channelUrl } = await req.json();
    
    if (!channelUrl) {
      throw new Error('Channel URL is required');
    }

    console.log('Fetching channel analytics for:', channelUrl);

    // Check cache first
    const { data: cachedData, error: cacheError } = await supabase
      .from('youtube_channel_cache')
      .select('*')
      .eq('channel_url', channelUrl)
      .gte('last_updated', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24 hours cache
      .single();

    if (cacheError && cacheError.code !== 'PGRST116') {
      console.error('Cache error:', cacheError);
    }

    if (cachedData) {
      console.log('Returning cached data:', cachedData);
      return new Response(
        JSON.stringify({
          totalViews: cachedData.total_views,
          totalSubscribers: cachedData.total_subscribers,
          cached: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not configured');
    }

    let channelId = extractChannelId(channelUrl);
    let realChannelId = channelId;
    
    if (!channelId) {
      throw new Error('Invalid YouTube channel URL');
    }

    // If it's an @ handle, we need to find the actual channel ID
    if (channelUrl.includes('/@')) {
      console.log('Handle detected, searching for channel ID...');
      realChannelId = await getChannelIdFromHandle(channelId, YOUTUBE_API_KEY);
      if (!realChannelId) {
        throw new Error('Could not find channel ID for handle');
      }
      console.log('Found channel ID:', realChannelId);
    }

    // Fetch channel statistics from YouTube API
    let response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${realChannelId}&key=${YOUTUBE_API_KEY}`
    );

    // If channel ID doesn't work, try forUsername
    if (!response.ok || response.status === 404) {
      console.log('Trying forUsername method...');
      response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&forUsername=${channelId}&key=${YOUTUBE_API_KEY}`
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error:', response.status, errorText);
      throw new Error(`YouTube API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('YouTube API response:', data);

    if (!data.items || data.items.length === 0) {
      throw new Error('Channel not found');
    }

    const stats = data.items[0].statistics;
    const totalViews = parseInt(stats.viewCount) || 0;
    const totalSubscribers = parseInt(stats.subscriberCount) || 0;

    console.log('Channel stats:', { totalViews, totalSubscribers });

    // Cache the results
    await supabase
      .from('youtube_channel_cache')
      .upsert({
        channel_url: channelUrl,
        channel_id: channelId,
        total_views: totalViews,
        total_subscribers: totalSubscribers,
        last_updated: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({ totalViews, totalSubscribers, cached: false }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in youtube-channel-analytics function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});