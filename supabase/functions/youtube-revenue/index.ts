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

interface RevenueRequest {
  userId: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Helper: refresh Google access token if possible
  const refreshAccessToken = async (refreshToken: string) => {
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
  };

  try {
    const { userId, startDate, endDate, dimensions = [] }: RevenueRequest = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing userId' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Fetching YouTube Revenue for user:', userId);

    // Get user's Google access token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_access_token, google_refresh_token')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.google_access_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Google access token not found. Please reconnect your Google account.', action: 'reconnect' }),
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
      if (res.status === 401 && refreshToken) {
        try {
          console.log('Access token expired. Attempting refresh for revenue...');
          const newToken = await refreshAccessToken(refreshToken);
          await supabase.from('profiles').update({ google_access_token: newToken }).eq('id', userId);
          accessToken = newToken;
          res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
          });
        } catch (e) {
          console.error('Token refresh failed (revenue):', e);
        }
      }
      return res;
    };

    // Get channel ID first
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`;
    const channelResponse = await authedFetch(channelUrl);

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      const hint = channelResponse.status === 403
        ? 'Insufficient permissions. Reconnect Google with YouTube scopes.'
        : channelResponse.status === 401
          ? 'Access token expired or invalid. Try reconnecting Google.'
          : 'Ensure the YouTube Data API v3 is enabled on your Google Cloud project.';
      return new Response(
        JSON.stringify({ success: false, error: `Failed to get channel info: ${channelResponse.status}`, details: errorText, hint }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelData = await channelResponse.json();
    if (!channelData.items || channelData.items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No YouTube channel found for this user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelId = channelData.items[0].id as string;

    // Fetch revenue metrics
    const revenueMetrics = [
      'estimatedRevenue',
      'estimatedAdRevenue', 
      'estimatedRedPartnerRevenue',
      'cpm',
      'playbackBasedCpm',
      'adImpressions',
      'monetizedPlaybacks'
    ];

    const queryParams = new URLSearchParams({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: revenueMetrics.join(','),
    });

    if (dimensions.length > 0) {
      queryParams.append('dimensions', dimensions.join(','));
    }

    const revenueUrl = `https://youtubeanalytics.googleapis.com/v2/reports?${queryParams}`;
    const revenueResponse = await authedFetch(revenueUrl);

    if (!revenueResponse.ok) {
      const errorText = await revenueResponse.text();
      console.error('Revenue API error:', revenueResponse.status, errorText);
      const hint = revenueResponse.status === 403
        ? 'Insufficient permissions. Reconnect Google with yt-analytics-monetary.readonly scope.'
        : revenueResponse.status === 401
          ? 'Access token expired or invalid. Try reconnecting Google.'
          : 'Ensure the YouTube Analytics API is enabled on your Google Cloud project.';
      return new Response(
        JSON.stringify({ success: false, error: `YouTube Revenue API failed: ${revenueResponse.status}`, details: errorText, hint }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const revenueData = await revenueResponse.json();
    console.log('Revenue data retrieved:', revenueData);

    // Also fetch top earning videos
    const topVideosParams = new URLSearchParams({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: 'estimatedRevenue,views',
      dimensions: 'video',
      sort: '-estimatedRevenue',
      maxResults: '10',
    });

    const topVideosUrl = `https://youtubeanalytics.googleapis.com/v2/reports?${topVideosParams}`;
    const topVideosResponse = await authedFetch(topVideosUrl);

    let topVideos = null;
    if (topVideosResponse.ok) {
      topVideos = await topVideosResponse.json();
    }

    return new Response(
      JSON.stringify({
        revenue: revenueData,
        topEarningVideos: topVideos,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in youtube-revenue function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error', hint: 'Try reconnecting Google and ensure the YouTube Analytics API is enabled.' }),
      {
        // Return 200 so the client can surface the detailed error instead of a generic one
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});