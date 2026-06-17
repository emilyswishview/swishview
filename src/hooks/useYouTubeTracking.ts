import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useYouTubeTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const { toast } = useToast();

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const fetchVideoViews = async (videoUrl: string) => {
    try {
      const videoId = getYouTubeVideoId(videoUrl);
      if (!videoId) return null;

      const { data, error } = await supabase.functions.invoke('youtube-views', {
        body: { videoId, action: 'getViews' }
      });

      if (error) throw error;
      return data?.viewCount || 0;
    } catch (error) {
      console.error('Error fetching YouTube views:', error);
      return null;
    }
  };

  const updatePromotionViews = async (promotionId: string, currentViews: number, startingViews?: number) => {
    try {
      const updateData: any = { 
        current_views: currentViews,
        last_view_update: new Date().toISOString()
      };
      
      // If starting views are provided, update them too
      if (startingViews !== undefined) {
        updateData.starting_views = startingViews;
      }

      const { error } = await supabase
        .from('promotions')
        .update(updateData)
        .eq('id', promotionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating promotion views:', error);
      return false;
    }
  };

  const initializeActivePromotion = async (promotionId: string, videoUrl: string) => {
    try {
      const currentViews = await fetchVideoViews(videoUrl);
      
      if (currentViews !== null) {
        // Set both starting_views and current_views when activating
        const success = await updatePromotionViews(promotionId, currentViews, currentViews);
        if (success) {
          toast({
            title: "Campaign Activated",
            description: `Starting view count recorded: ${currentViews.toLocaleString()}`,
          });
          return currentViews;
        }
      }
      return null;
    } catch (error) {
      console.error('Error initializing active promotion:', error);
      return null;
    }
  };

  const trackActivePromotions = async () => {
    if (isTracking) return;
    
    setIsTracking(true);
    
    try {
      // Get all promotions for the current user (not just active ones)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: promotions, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;

      if (promotions && promotions.length > 0) {
        console.log(`Tracking ${promotions.length} promotions...`);
        
        for (const promotion of promotions) {
          const currentViews = await fetchVideoViews(promotion.youtube_video_url);
          
          if (currentViews !== null) {
            // If starting_views is not set, set it now
            const startingViews = promotion.starting_views || currentViews;
            await updatePromotionViews(promotion.id, currentViews, promotion.starting_views ? undefined : startingViews);
            
            // Only check for completion if campaign is active
            if (promotion.status === 'active') {
              const gained = Math.max(0, currentViews - (promotion.starting_views || currentViews));
              if (gained >= promotion.target_views) {
                const { error: statusError } = await supabase
                  .from('promotions')
                  .update({ status: 'completed' })
                  .eq('id', promotion.id);
                
                if (!statusError) {
                  toast({
                    title: "Target Reached! 🎉",
                    description: `Your campaign "${promotion.title}" has reached its target views!`,
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error tracking promotions:', error);
    } finally {
      setIsTracking(false);
    }
  };

  const refreshSinglePromotion = async (promotionId: string, videoUrl: string) => {
    try {
      const currentViews = await fetchVideoViews(videoUrl);
      
      if (currentViews !== null) {
        const success = await updatePromotionViews(promotionId, currentViews);
        if (success) {
          toast({
            title: "Views Updated",
            description: `Current views: ${currentViews.toLocaleString()}`,
          });
          return currentViews;
        }
      }
      return null;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh views",
        variant: "destructive",
      });
      return null;
    }
  };

  // Auto-track every 5 minutes for active promotions
  useEffect(() => {
    trackActivePromotions();
    
    const interval = setInterval(() => {
      trackActivePromotions();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return {
    trackActivePromotions,
    refreshSinglePromotion,
    initializeActivePromotion,
    isTracking,
  };
};