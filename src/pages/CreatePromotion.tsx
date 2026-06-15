import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Users, Target, Zap } from "lucide-react";
import SwishViewLogo from "@/components/SwishViewLogo";
import PromotionForm from "@/components/PromotionForm";
import ChannelOptimizationForm from "@/components/ChannelOptimizationForm";
import { useToast } from "@/hooks/use-toast";
import SEOCreationForm from "@/components/SEOCreationForm";
import LoadingSpinner from "@/components/LoadingSpinner";

type PromotionType = 'video' | 'channel';

const CreatePromotion = () => {
  const [user, setUser] = useState<any>(null);
  const [promotionType, setPromotionType] = useState<PromotionType | null>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (campaignId && user) {
      fetchCampaign();
    } else {
      setLoading(false);
    }
  }, [campaignId, user]);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      
      setCampaign(data);
      setPromotionType((data.promotion_type as PromotionType) || 'video');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load campaign data",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    setUser(session.user);
  };

  const handlePromotionTypeSelect = (type: PromotionType) => {
    setPromotionType(type);
  };

  const handleBackToSelection = () => {
    setPromotionType(null);
  };

  const handleSuccess = () => {
    toast({
      title: "Promotion Created!",
      description: "Your promotion has been created successfully.",
    });
    navigate("/dashboard");
  };

  if (!user || loading) {
    return <LoadingSpinner />;
  }

  if (promotionType === 'video') {
    return (
      <PromotionForm
        campaign={campaign}
        onSuccess={handleSuccess}
        onCancel={handleBackToSelection}
      />
    );
  }

  if (promotionType === 'channel') {
    return (
      <SEOCreationForm
        onSuccess={handleSuccess}
        onCancel={handleBackToSelection}
      />
    );
  }

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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            {campaign ? 'Edit Campaign' : 'Start New Promotion'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            {campaign ? 'Update your campaign settings' : 'Choose the type of promotion you want to create'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Promote Video Option */}
          <Card 
            className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-0 shadow-elegant bg-white/70 backdrop-blur-sm group"
            onClick={() => handlePromotionTypeSelect('video')}
          >
            <CardHeader className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300">
                <Play className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-display font-bold text-gray-900">
                Promote Video
              </CardTitle>
              <CardDescription className="text-base font-display text-gray-600 mt-2">
                Boost views and engagement for a specific YouTube video
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span>Set target views and budget</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>Define target audience</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>Track real-time performance</span>
                </div>
              </div>
              <Button 
                className="w-full mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-full"
                onClick={() => handlePromotionTypeSelect('video')}
              >
                Select Video Promotion
              </Button>
            </CardContent>
          </Card>

          {/* Channel Optimization Option */}
          <Card 
            className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-0 shadow-elegant bg-white/70 backdrop-blur-sm group relative"
            onClick={() => navigate('/create-seo')}
          >
            <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
              New
            </Badge>
            <CardHeader className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center group-hover:from-orange-200 group-hover:to-orange-300 transition-all duration-300">
                <Zap className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl font-display font-bold text-gray-900">
                Channel Optimization & Promotion
              </CardTitle>
              <CardDescription className="text-base font-display text-gray-600 mt-2">
                Comprehensive channel growth and optimization service
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-500" />
                  <span>Full channel analytics review</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  <span>SEO optimization strategies</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span>Long-term growth plans</span>
                </div>
              </div>
              <Button 
                className="w-full mt-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-full"
                onClick={() => navigate('/create-seo')}
              >
                Select Channel Optimization
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreatePromotion;