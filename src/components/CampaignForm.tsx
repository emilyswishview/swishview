
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Target, DollarSign, Calendar, Users, Play, ExternalLink } from "lucide-react";

interface CampaignFormProps {
  campaign?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const CampaignForm: React.FC<CampaignFormProps> = ({ campaign, onSuccess, onCancel }) => {
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

  // Auto-sync budget with views (rate: $0.02 per view)
  const VIEW_RATE = 0.02;

  useEffect(() => {
    if (formData.target_views && !isNaN(Number(formData.target_views))) {
      const calculatedBudget = (Number(formData.target_views) * VIEW_RATE).toFixed(2);
      setFormData(prev => ({ ...prev, budget: calculatedBudget }));
    }
  }, [formData.target_views]);

  useEffect(() => {
    if (formData.budget && !isNaN(Number(formData.budget))) {
      const calculatedViews = Math.round(Number(formData.budget) / VIEW_RATE);
      if (calculatedViews !== Number(formData.target_views)) {
        setFormData(prev => ({ ...prev, target_views: calculatedViews.toString() }));
      }
    }
  }, [formData.budget]);

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

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, youtube_video_url: url });
    
    if (validateYouTubeUrl(url)) {
      const videoId = getYouTubeVideoId(url);
      setVideoPreview({
        id: videoId,
        thumbnail: getYouTubeThumbnail(url),
        url: url
      });
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
        // Update existing campaign
        const { error } = await supabase
          .from("campaigns")
          .update(campaignData)
          .eq("id", campaign.id);

        if (error) throw error;

        toast({
          title: "Campaign Updated!",
          description: "Your campaign has been successfully updated.",
        });
      } else {
        // Create new campaign
        const { error } = await supabase
          .from("campaigns")
          .insert([{
            ...campaignData,
            user_id: session.user.id,
            status: 'pending'
          }]);

        if (error) throw error;

        toast({
          title: "Campaign Created!",
          description: "Your campaign has been saved successfully.",
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{campaign ? 'Edit Campaign' : 'Create New Campaign'}</CardTitle>
            <CardDescription>
              {campaign ? 'Update your campaign details' : 'Set up your video promotion campaign'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter a catchy campaign title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube_video_url">YouTube Video URL</Label>
                <Input
                  id="youtube_video_url"
                  name="youtube_video_url"
                  value={formData.youtube_video_url}
                  onChange={handleVideoUrlChange}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
                {formData.youtube_video_url && !validateYouTubeUrl(formData.youtube_video_url) && (
                  <p className="text-sm text-red-600">Please enter a valid YouTube URL</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_views" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Target Views
                  </Label>
                  <Input
                    id="target_views"
                    name="target_views"
                    type="number"
                    value={formData.target_views}
                    onChange={handleInputChange}
                    placeholder="10000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Budget ($)
                  </Label>
                  <Input
                    id="budget"
                    name="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={handleInputChange}
                    placeholder="200.00"
                    required
                  />
                  <p className="text-xs text-gray-500">Rate: $0.02 per view</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign_duration" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_audience" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Target Audience (Optional)
                </Label>
                <Textarea
                  id="target_audience"
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleInputChange}
                  placeholder="Describe your target audience demographics, interests, etc..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Saving..." : campaign ? "Update Campaign" : "Create Campaign"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {videoPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Video Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative group">
                <img
                  src={videoPreview.thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-40 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow duration-300"
                />
                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Play className="h-12 w-12 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <a 
                  href={videoPreview.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on YouTube
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {(formData.target_views || formData.budget) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.target_views && (
                <div>
                  <p className="text-sm text-gray-600">Target Views</p>
                  <p className="text-xl font-bold text-primary">{Number(formData.target_views).toLocaleString()}</p>
                </div>
              )}
              
              {formData.budget && (
                <div>
                  <p className="text-sm text-gray-600">Budget</p>
                  <p className="text-xl font-bold text-green-600">${Number(formData.budget).toFixed(2)}</p>
                </div>
              )}
              
              {formData.campaign_duration && (
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-lg font-semibold text-blue-600">{formData.campaign_duration} days</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CampaignForm;
