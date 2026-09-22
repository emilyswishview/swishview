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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, action } = await req.json();
    
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not configured');
    }

    console.log('Fetching YouTube data for video ID:', videoId, 'Action:', action);

    let apiUrl = '';
    if (action === 'getInfo') {
      apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics&key=${YOUTUBE_API_KEY}`;
    } else {
      apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=statistics,snippet&key=${YOUTUBE_API_KEY}`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error:', response.status, errorText);
      
      // Handle rate limiting
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`YouTube API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('YouTube API response:', data);

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found or no data available');
    }

    const video = data.items[0];
    
    if (action === 'getInfo') {
      return new Response(
        JSON.stringify({ 
          info: {
            title: video.snippet?.title,
            channelTitle: video.snippet?.channelTitle,
            thumbnail: video.snippet?.thumbnails?.maxresdefault?.url || 
                      video.snippet?.thumbnails?.high?.url ||
                      video.snippet?.thumbnails?.medium?.url ||
                      video.snippet?.thumbnails?.default?.url
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      const viewCount = parseInt(video.statistics?.viewCount) || 0;
      console.log('Successfully fetched view count:', viewCount);

      return new Response(
        JSON.stringify({ 
          viewCount,
          thumbnail: video.snippet?.thumbnails?.maxresdefault?.url || 
                    video.snippet?.thumbnails?.high?.url ||
                    video.snippet?.thumbnails?.medium?.url ||
                    video.snippet?.thumbnails?.default?.url
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error in youtube-views function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});