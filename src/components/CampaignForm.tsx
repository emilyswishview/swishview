
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Target, DollarSign, Calendar, Users, Play, ExternalLink, Eye, TrendingUp, CheckCircle } from "lucide-react";

interface CampaignFormProps {
  campaign?: any;
  onSuccess: () => void;
  onCancel: () => void;
  targetUserId?: string; // For admin-created campaigns
}

const CampaignForm: React.FC<CampaignFormProps> = ({ campaign, onSuccess, onCancel, targetUserId }) => {
  const [loading, setLoading] = useState(false);
  const [videoPreview, setVideoPreview] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: campaign?.title || "",
    youtube_video_url: campaign?.youtube_video_url || "",
    target_views: campaign?.target_views?.toString() || "",
    budget: campaign?.budget?.toString() || "",
    target_audience: campaign?.target_audience || "",
    campaign_duration: campaign?.campaign_duration?.toString() || "30",
  });
  const { toast } = useToast();

  // Users can set their own views and budget independently

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  };

  const validateYouTubeUrl = (url: string) => {
    if (!url) return false;
    const videoId = getYouTubeVideoId(url);
    return !!videoId;
  };

  const handleVideoUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, youtube_video_url: url });
    
    if (validateYouTubeUrl(url)) {
      const videoId = getYouTubeVideoId(url);
      const thumbnailUrl = getYouTubeThumbnail(url);
      
      // Try to validate thumbnail exists
      try {
        const img = new Image();
        img.onload = () => {
          setVideoPreview({
            id: videoId,
            thumbnail: thumbnailUrl,
            url: url,
            thumbnailAvailable: true
          });
        };
        img.onerror = () => {
          setVideoPreview({
            id: videoId,
            thumbnail: '/public/placeholder.svg',
            url: url,
            thumbnailAvailable: false
          });
        };
        img.src = thumbnailUrl;
      } catch (error) {
        setVideoPreview({
          id: videoId,
          thumbnail: '/public/placeholder.svg',
          url: url,
          thumbnailAvailable: false
        });
      }
    } else {
      setVideoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateYouTubeUrl(formData.youtube_video_url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube video URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const campaignData = {
        title: formData.title,
        youtube_video_url: formData.youtube_video_url,
        target_views: parseInt(formData.target_views),
        budget: parseFloat(formData.budget),
        target_audience: formData.target_audience,
        campaign_duration: parseInt(formData.campaign_duration),
      };

      if (campaign) {
        // Update existing promotion
        const { error } = await supabase
          .from("promotions")
          .update(campaignData)
          .eq("id", campaign.id);

        if (error) throw error;

        toast({
          title: "Promotion Updated!",
          description: "Your promotion has been successfully updated.",
        });
      } else {
        // Fetch current YouTube views before creating campaign
        let initialViews = 0;
        const videoId = getYouTubeVideoId(formData.youtube_video_url);
        if (videoId) {
          try {
            console.log('Fetching initial views for video:', videoId);
            const { data: viewData, error: viewError } = await supabase.functions.invoke('youtube-views', {
              body: { videoId, action: 'getViews' }
            });
            console.log('View fetch response:', viewData, 'Error:', viewError);
            if (viewData?.viewCount != null) {
              initialViews = viewData.viewCount;
              console.log('Initial views set to:', initialViews);
            }
          } catch (viewError) {
            console.error('Could not fetch initial views:', viewError);
          }
        }

        // Create new promotion with initial view counts
        const { error } = await supabase
          .from("promotions")
          .insert([{
            ...campaignData,
            user_id: targetUserId || session.user.id,
            status: 'pending',
            starting_views: initialViews,
            current_views: initialViews,
          }]);

        if (error) throw error;

        toast({
          title: "Campaign Created!",
          description: targetUserId ? "Campaign created successfully for the user." : "Your campaign has been saved successfully.",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300",
      active: "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300",
      completed: "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300",
      paused: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300"
    };

    return (
      <Badge className={`${styles[status as keyof typeof styles]} px-3 py-1 text-xs font-medium rounded-full border`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight leading-tight mb-6 text-gray-900">
            {campaign ? 'Edit Campaign' : targetUserId ? 'Create Campaign for User' : 'Create Campaign'}
          </h1>
          <p className="text-lg sm:text-xl font-display text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {campaign ? 'Update your campaign settings and track performance' : targetUserId ? 'Set up a video promotion campaign for the selected user' : 'Set up your video promotion campaign'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
              <CardHeader className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-display font-bold text-gray-900">Campaign Details</CardTitle>
                    <CardDescription className="text-base font-display text-gray-600 mt-2">
                      {campaign ? 'Update your campaign information' : 'Fill in your campaign details'}
                    </CardDescription>
                  </div>
                  {campaign && (
                    <div className="flex items-center space-x-4">
                      {getStatusBadge(campaign.status)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-sm font-semibold font-display text-gray-900">Campaign Title</Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter a compelling campaign title"
                      required
                      className="h-12 text-base font-display rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="youtube_video_url" className="text-sm font-semibold font-display text-gray-900">YouTube Video URL</Label>
                    <Input
                      id="youtube_video_url"
                      name="youtube_video_url"
                      value={formData.youtube_video_url}
                      onChange={handleVideoUrlChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                      className="h-12 text-base font-display rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                    />
                    {formData.youtube_video_url && !validateYouTubeUrl(formData.youtube_video_url) && (
                      <p className="text-sm text-red-600 font-display">Please enter a valid YouTube URL</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="target_views" className="text-sm font-semibold font-display text-gray-900 flex items-center gap-2">
                        <Target className="h-4 w-4 text-orange-500" />
                        Target Views
                      </Label>
                      <Input
                        id="target_views"
                        name="target_views"
                        type="number"
                        value={formData.target_views}
                        onChange={handleInputChange}
                        placeholder="15,000"
                        required
                        className="h-12 text-base font-display rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="budget" className="text-sm font-semibold font-display text-gray-900 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        Budget ($)
                      </Label>
                      <Input
                        id="budget"
                        name="budget"
                        type="number"
                        step="0.01"
                        value={formData.budget}
                        onChange={handleInputChange}
                        placeholder="100.00"
                        required
                        className="h-12 text-base font-display rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                      />
                      
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="campaign_duration" className="text-sm font-semibold font-display text-gray-900 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      Campaign Duration (days)
                    </Label>
                    <Input
                      id="campaign_duration"
                      name="campaign_duration"
                      type="number"
                      value={formData.campaign_duration}
                      onChange={handleInputChange}
                      placeholder="30"
                      required
                      className="h-12 text-base font-display rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="target_audience" className="text-sm font-semibold font-display text-gray-900 flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      Target Audience (Optional)
                    </Label>
                    <Textarea
                      id="target_audience"
                      name="target_audience"
                      value={formData.target_audience}
                      onChange={handleInputChange}
                      placeholder="Describe your target audience demographics, interests, and preferences..."
                      rows={4}
                      className="text-base font-display rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 resize-none"
                    />
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button 
                      type="submit" 
                      className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium font-display rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]" 
                      disabled={loading}
                    >
                      {loading ? "Saving..." : campaign ? "Update Campaign" : "Create Campaign"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onCancel}
                      className="h-12 px-8 font-display rounded-full border-gray-300 hover:border-orange-500 hover:text-orange-500 transition-colors"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Campaign Status Summary */}
            {campaign && (
              <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
                <CardHeader className="p-6">
                  <CardTitle className="text-lg font-display font-bold text-gray-900">Campaign Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 font-display">Progress to Target</span>
                      <span className="text-sm font-bold text-gray-900 font-display">
                        {campaign.current_views?.toLocaleString() || 0} / {campaign.target_views?.toLocaleString()}
                      </span>
                    </div>
                    <Progress 
                      value={getProgressPercentage(campaign.current_views || 0, campaign.target_views)} 
                      className="h-3 bg-gray-100"
                    />
                    <div className="text-xs text-gray-500 font-display">
                      {getProgressPercentage(campaign.current_views || 0, campaign.target_views).toFixed(1)}% complete
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50/50 rounded-xl">
                      <Eye className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-display">Views Gained</p>
                      <p className="text-lg font-bold text-gray-900 font-display">
                        +{campaign.current_views?.toLocaleString() || 0}
                      </p>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50/50 rounded-xl">
                      <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-display">Total Spent</p>
                      <p className="text-lg font-bold text-gray-900 font-display">
                        ${campaign.budget}
                      </p>
                    </div>
                  </div>

                  {campaign.status === 'completed' && (
                    <div className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-xl">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-800 font-display">Campaign Completed!</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Video Preview */}
            {videoPreview && (
              <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
                <CardHeader className="p-6">
                  <CardTitle className="text-lg font-display font-bold text-gray-900">Video Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  {!videoPreview.thumbnailAvailable && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 font-display">
                        No thumbnail available for this video. Campaign creation will still proceed with a placeholder.
                      </p>
                    </div>
                  )}
                  <div className="relative group">
                    <img
                      src={videoPreview.thumbnail}
                      alt="Video thumbnail"
                      className="w-full h-40 object-cover rounded-xl shadow-md group-hover:shadow-lg transition-shadow duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/public/placeholder.svg';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Play className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <a 
                      href={videoPreview.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors text-sm font-display"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on YouTube
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Campaign Summary */}
            {(formData.target_views || formData.budget) && (
              <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
                <CardHeader className="p-6">
                  <CardTitle className="text-lg font-display font-bold text-gray-900">Campaign Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  {formData.target_views && (
                    <div>
                      <p className="text-sm text-gray-600 font-display">Target Views</p>
                      <p className="text-2xl font-bold text-orange-600 font-display">{Number(formData.target_views).toLocaleString()}</p>
                    </div>
                  )}
                  
                  {formData.budget && (
                    <div>
                      <p className="text-sm text-gray-600 font-display">Budget</p>
                      <p className="text-2xl font-bold text-green-600 font-display">${Number(formData.budget).toFixed(2)}</p>
                    </div>
                  )}
                  
                  {formData.campaign_duration && (
                    <div>
                      <p className="text-sm text-gray-600 font-display">Duration</p>
                      <p className="text-lg font-semibold text-blue-600 font-display">{formData.campaign_duration} days</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignForm;
