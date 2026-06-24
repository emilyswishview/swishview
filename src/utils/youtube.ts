
import { supabase } from '@/integrations/supabase/client';

// YouTube API utilities for view count tracking

export const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

export const fetchVideoViewCount = async (videoId: string): Promise<number | null> => {
  try {
    console.log('Fetching views for video ID via edge function:', videoId);
    
    const { data, error } = await supabase.functions.invoke('youtube-views', {
      body: { videoId, action: 'getViews' }
    });
    
    if (error) {
      console.error('Edge function error:', error);
      return null;
    }
    
    if (data?.error) {
      console.error('YouTube API error from edge function:', data.error);
      return null;
    }
    
    const viewCount = data?.viewCount;
    console.log('Successfully fetched view count via edge function:', viewCount);
    return viewCount || null;
  } catch (error) {
    console.error('Error fetching YouTube view count:', error);
    return null;
  }
};

export const calculateViewsGained = (currentViews: number, startingViews: number): number => {
  return Math.max(0, currentViews - startingViews);
};

// Helper function to validate YouTube URL
export const isValidYouTubeUrl = (url: string): boolean => {
  const videoId = extractVideoId(url);
  return videoId !== null && videoId.length === 11;
};

// Helper function to get YouTube video info and thumbnail
export const getVideoInfo = async (videoId: string): Promise<{title?: string, channelTitle?: string, thumbnail?: string} | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('youtube-views', {
      body: { videoId, action: 'getInfo' }
    });
    
    if (error || data?.error) {
      console.error('Error fetching video info:', error || data?.error);
      return null;
    }
    
    return data?.info || null;
  } catch (error) {
    console.error('Error fetching video info:', error);
    return null;
  }
};

// Helper function to get video thumbnail URL
export const getVideoThumbnail = async (videoUrl: string): Promise<string | null> => {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return null;
  
  try {
    const { data, error } = await supabase.functions.invoke('youtube-views', {
      body: { videoId, action: 'getViews' }
    });
    
    if (error || data?.error) {
      console.error('Error fetching video thumbnail:', error || data?.error);
      return null;
    }
    
    return data?.thumbnail || null;
  } catch (error) {
    console.error('Error fetching video thumbnail:', error);
    return null;
  }
};

// New function to fetch and store initial view count on campaign creation
export const fetchAndStoreInitialViews = async (youtubeUrl: string): Promise<number | null> => {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    console.error('Invalid YouTube URL provided');
    return null;
  }
  
  const viewCount = await fetchVideoViewCount(videoId);
  if (viewCount !== null) {
    console.log('Initial view count fetched successfully:', viewCount);
  }
  
  return viewCount;
};
