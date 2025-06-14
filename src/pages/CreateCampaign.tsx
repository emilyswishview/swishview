
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play, ExternalLink, Target, DollarSign, Calendar, Users } from "lucide-react";
import SwishViewLogo from "@/components/SwishViewLogo";

const CreateCampaign = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [videoPreview, setVideoPreview] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    youtube_video_url: "",
    target_views: "",
    budget: "",
    target_audience: "",
    campaign_duration: "30",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

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
    if (!user) return;

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
      const { data, error } = await supabase
        .from("campaigns")
        .insert([{
          user_id: user.id,
          title: formData.title,
          youtube_video_url: formData.youtube_video_url,
          target_views: parseInt(formData.target_views),
          budget: parseFloat(formData.budget),
          target_audience: formData.target_audience,
          campaign_duration: parseInt(formData.campaign_duration),
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Campaign Draft Created!",
        description: "Your campaign has been saved. Complete payment to activate it.",
      });

      navigate(`/payment/${data.id}`);
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

  const targetViewsNum = formData.target_views ? parseInt(formData.target_views) : 0;
  const budgetNum = formData.budget ? parseFloat(formData.budget) : 0;
  const estimatedReach = targetViewsNum > 0 ? targetViewsNum * 1.2 : 0;
  const costPerView = budgetNum > 0 && targetViewsNum > 0 ? 
    (budgetNum / targetViewsNum).toFixed(4) : "0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="mr-2 sm:mr-4 hover:bg-gray-100 transition-colors p-2 sm:p-3"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <SwishViewLogo />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Create New Campaign
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Set up your video promotion campaign details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl text-gray-900">Campaign Details</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Fill in the details for your video promotion campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold">Campaign Title</Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter a catchy campaign title"
                      required
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="youtube_video_url" className="text-sm font-semibold">YouTube Video URL</Label>
                    <Input
                      id="youtube_video_url"
                      name="youtube_video_url"
                      value={formData.youtube_video_url}
                      onChange={handleVideoUrlChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base"
                    />
                    {formData.youtube_video_url && !validateYouTubeUrl(formData.youtube_video_url) && (
                      <p className="text-xs sm:text-sm text-red-600">Please enter a valid YouTube URL</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target_views" className="text-sm font-semibold flex items-center gap-2">
                        <Target className="h-3 w-3 sm:h-4 sm:w-4" />
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
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget" className="text-sm font-semibold flex items-center gap-2">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
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
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="campaign_duration" className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
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
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_audience" className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      Target Audience (Optional)
                    </Label>
                    <Textarea
                      id="target_audience"
                      name="target_audience"
                      value={formData.target_audience}
                      onChange={handleInputChange}
                      placeholder="Describe your target audience demographics, interests, etc..."
                      rows={3}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base resize-none"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] text-sm sm:text-base py-2 sm:py-3" 
                    disabled={loading}
                  >
                    {loading ? "Creating Campaign..." : "Save Campaign & Proceed to Payment"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {videoPreview && (
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm animate-fade-in">
                <CardHeader className="p-4 sm:p-5">
                  <CardTitle className="text-base sm:text-lg">Video Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0">
                  <div className="relative group">
                    <img
                      src={videoPreview.thumbnail}
                      alt="Video thumbnail"
                      className="w-full h-32 sm:h-40 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Play className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4">
                    <a 
                      href={videoPreview.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors text-xs sm:text-sm"
                    >
                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                      View on YouTube
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {(formData.target_views || formData.budget) && (
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm animate-fade-in">
                <CardHeader className="p-4 sm:p-5">
                  <CardTitle className="text-base sm:text-lg">Campaign Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-5 pt-0">
                  {formData.target_views && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Target Views</p>
                      <p className="text-lg sm:text-2xl font-bold text-primary">{targetViewsNum.toLocaleString()}</p>
                    </div>
                  )}
                  
                  {formData.budget && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Budget</p>
                      <p className="text-lg sm:text-2xl font-bold text-green-600">${budgetNum.toFixed(2)}</p>
                    </div>
                  )}
                  
                  {estimatedReach > 0 && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Estimated Reach</p>
                      <p className="text-base sm:text-xl font-semibold text-blue-600">{estimatedReach.toLocaleString()}</p>
                    </div>
                  )}
                  
                  {costPerView !== "0" && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Cost per View</p>
                      <p className="text-sm sm:text-lg font-medium text-purple-600">${costPerView}</p>
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

export default CreateCampaign;
