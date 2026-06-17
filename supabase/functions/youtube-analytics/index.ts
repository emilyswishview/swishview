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

interface AnalyticsRequest {
  userId: string;
  metrics: string[];
  dimensions?: string[];
  startDate: string;
  endDate: string;
  maxResults?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Helper: refresh Google access token if possible
  const refreshAccessToken = async (refreshToken: string) => {
    try {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
      if (!clientId || !clientSecret) {
        throw new Error('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET on server.');
      }
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const json = await resp.json();
      if (!resp.ok) {
        console.error('Google token refresh failed:', resp.status, json);
        throw new Error(json.error_description || 'Failed to refresh Google token');
      }
      return json.access_token as string;
    } catch (e) {
      throw e;
    }
  };

  try {
    const { userId, metrics, dimensions = [], startDate, endDate, maxResults = 200 }: AnalyticsRequest = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing userId' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Fetching YouTube Analytics for user:', userId);

    // Get user's Google access token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_access_token, google_refresh_token')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.google_access_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google access token not found. Please reconnect your Google account.',
          action: 'reconnect',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = profile.google_access_token as string;
    const refreshToken = profile.google_refresh_token as string | null;

    const authedFetch = async (url: string) => {
      let res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      // Try token refresh on 401
      if (res.status === 401 && refreshToken) {
        try {
          console.log('Access token expired. Attempting refresh...');
          const newToken = await refreshAccessToken(refreshToken);
          // Persist the new token
          await supabase.from('profiles').update({ google_access_token: newToken }).eq('id', userId);
          accessToken = newToken;
          // retry original request
          res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          });
        } catch (e) {
          console.error('Token refresh failed:', e);
        }
      }

      return res;
    };

    // First get channel ID from YouTube Data API
    const channelUrl = 'https://www.googleapis.com/youtube/v3/channels?part=id,snippet,statistics&mine=true';
    const channelResponse = await authedFetch(channelUrl);

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      console.error('Channel API error:', channelResponse.status, errorText);
      const hint = channelResponse.status === 403
        ? 'Insufficient permissions. Reconnect Google and ensure you grant YouTube and YouTube Analytics read-only scopes.'
        : channelResponse.status === 401
          ? 'Access token expired or invalid. Try reconnecting Google.'
          : 'Make sure the YouTube Data API v3 is enabled on your Google Cloud project.';
      return new Response(
        JSON.stringify({ success: false, error: `Failed to get channel info: ${channelResponse.status}`, details: errorText, hint }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelData = await channelResponse.json();
    console.log('Channel data:', channelData);

    if (!channelData.items || channelData.items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No YouTube channel found for this user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelId = channelData.items[0].id as string;
    const channelInfo = {
      id: channelId,
      title: channelData.items[0].snippet.title,
      description: channelData.items[0].snippet.description,
      thumbnails: channelData.items[0].snippet.thumbnails,
      subscriberCount: parseInt(channelData.items[0].statistics.subscriberCount) || 0,
      videoCount: parseInt(channelData.items[0].statistics.videoCount) || 0,
      viewCount: parseInt(channelData.items[0].statistics.viewCount) || 0,
    };

    // Build YouTube Analytics API query
    const queryParams = new URLSearchParams({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: metrics.join(','),
      maxResults: maxResults.toString(),
    });

    // Add dimensions if specified (required for time-series data)
    if (dimensions.length > 0) {
      queryParams.append('dimensions', dimensions.join(','));
      // Sort by date when day dimension is used
      if (dimensions.includes('day')) {
        queryParams.append('sort', 'day');
      }
    }

    console.log('Fetching analytics with params:', {
      channelId,
      startDate,
      endDate,
      metrics: metrics.join(','),
      dimensions: dimensions.join(',') || 'none',
      maxResults
    });

    // Fetch analytics data
    const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?${queryParams}`;
    const analyticsResponse = await authedFetch(analyticsUrl);

    if (!analyticsResponse.ok) {
      const errorText = await analyticsResponse.text();
      console.error('Analytics API error:', analyticsResponse.status, errorText);
      const hint = analyticsResponse.status === 403
        ? 'Insufficient permissions. Reconnect Google with yt-analytics.readonly and yt-analytics-monetary.readonly scopes enabled.'
        : analyticsResponse.status === 401
          ? 'Access token expired or invalid. Try reconnecting Google.'
          : 'Ensure the YouTube Analytics API is enabled on your Google Cloud project.';
      return new Response(
        JSON.stringify({ success: false, error: `YouTube Analytics API failed: ${analyticsResponse.status}`, details: errorText, hint }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analyticsData = await analyticsResponse.json();
    console.log('Analytics data retrieved:', analyticsData);

    // Cache the results for instant loading next time
    const { data: existingCache } = await supabase
      .from('youtube_analytics_cache')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const cacheData = {
      user_id: userId,
      channel_id: channelId,
      channel_title: channelInfo.title,
      channel_subscribers: channelInfo.subscriberCount,
      channel_videos: channelInfo.videoCount,
      channel_views: channelInfo.viewCount,
      analytics_data: analyticsData,
      last_fetched_at: new Date().toISOString()
    };

    if (existingCache) {
      await supabase
        .from('youtube_analytics_cache')
        .update(cacheData)
        .eq('id', existingCache.id);
    } else {
      await supabase
        .from('youtube_analytics_cache')
        .insert(cacheData);
    }

    return new Response(
      JSON.stringify({ channelInfo, analytics: analyticsData, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in youtube-analytics function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error', hint: 'Try reconnecting Google from the SEO Services tab and ensure YouTube APIs are enabled.' }),
      {
        // IMPORTANT: return 200 so client can read detailed error instead of generic non-2xx
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});