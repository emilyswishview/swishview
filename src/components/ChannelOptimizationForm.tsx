import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Youtube, Users, Eye, Loader2, CheckCircle, DollarSign } from "lucide-react";
import SwishViewLogo from "@/components/SwishViewLogo";

interface ChannelOptimizationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ChannelOptimizationForm: React.FC<ChannelOptimizationFormProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingAnalytics, setFetchingAnalytics] = useState(false);
  const [channelAnalytics, setChannelAnalytics] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeData, setPromoCodeData] = useState<any>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [formData, setFormData] = useState({
    channelUrl: "",
  });
  const { toast } = useToast();

  const plans = [
    { id: "3", duration: "3 months", price: 750, originalPrice: 750 },
    { id: "6", duration: "6 months", price: 1350, originalPrice: 1400 },
    { id: "9", duration: "9 months", price: 1950, originalPrice: 2000 },
    { id: "12", duration: "12 months", price: 2500, originalPrice: 2500 },
  ];

  const validateChannelUrl = (url: string) => {
    const patterns = [
      /youtube\.com\/channel\/[a-zA-Z0-9_-]+/,
      /youtube\.com\/c\/[a-zA-Z0-9_-]+/,
      /youtube\.com\/user\/[a-zA-Z0-9_-]+/,
      /youtube\.com\/@[a-zA-Z0-9_-]+/,
    ];
    
    return patterns.some(pattern => pattern.test(url));
  };

  const fetchChannelAnalytics = async () => {
    if (!validateChannelUrl(formData.channelUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube channel URL",
        variant: "destructive",
      });
      return;
    }

    setFetchingAnalytics(true);
    try {
      console.log('Fetching channel analytics for:', formData.channelUrl);
      
      const { data, error } = await supabase.functions.invoke('youtube-channel-analytics', {
        body: { channelUrl: formData.channelUrl }
      });

      if (error) {
        console.error('Channel analytics error:', error);
        throw new Error(error.message || 'Failed to fetch channel analytics');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log('Channel analytics fetched:', data);
      setChannelAnalytics(data);
      
      toast({
        title: "Channel Analytics Loaded",
        description: "Successfully fetched your channel statistics",
      });
    } catch (error: any) {
      console.error('Error fetching channel analytics:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch channel analytics. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setFetchingAnalytics(false);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;

    setValidatingPromo(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { promoCode: promoCode.trim() }
      });

      if (error) throw error;

      if (data.valid) {
        setPromoCodeData(data);
        toast({
          title: "Promo Code Applied!",
          description: `You saved $${data.discountAmount}!`,
        });
      } else {
        setPromoCodeData(null);
        toast({
          title: "Invalid Promo Code",
          description: data.error || "Please check your promo code and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error validating promo code:', error);
      setPromoCodeData(null);
      toast({
        title: "Error",
        description: "Failed to validate promo code",
        variant: "destructive",
      });
    } finally {
      setValidatingPromo(false);
    }
  };

  const calculateFinalPrice = (originalPrice: number) => {
    if (promoCodeData) {
      return Math.max(0, originalPrice - promoCodeData.discountAmount);
    }
    return originalPrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!channelAnalytics) {
      toast({
        title: "Missing Analytics",
        description: "Please fetch channel analytics first",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPlan) {
      toast({
        title: "Select a Plan",
        description: "Please select a channel optimization plan",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      if (!selectedPlanData) throw new Error("Invalid plan selected");

      const finalPrice = calculateFinalPrice(selectedPlanData.price);

      // Create the channel optimization promotion
      const promotionData = {
        user_id: session.user.id,
        title: `Channel Optimization - ${selectedPlanData.duration}`,
        promotion_type: 'channel' as const,
        channel_url: formData.channelUrl,
        channel_total_views: channelAnalytics.totalViews,
        channel_total_subscribers: channelAnalytics.totalSubscribers,
        channel_starting_views: channelAnalytics.totalViews,
        channel_current_views: channelAnalytics.totalViews,
        channel_starting_subscribers: channelAnalytics.totalSubscribers,
        channel_current_subscribers: channelAnalytics.totalSubscribers,
        budget: finalPrice,
        target_views: 0, // Not applicable for channel optimization
        campaign_duration: parseInt(selectedPlan) * 30, // Convert months to days
        status: 'pending' as const,
        account_manager: ['Ashley', 'Daisy', 'Sophie'][Math.floor(Math.random() * 3)], // Random assignment
        youtube_video_url: '', // Required field, empty for channel optimization
      };

      const { data: promotion, error: promotionError } = await supabase
        .from("promotions")
        .insert(promotionData)
        .select()
        .single();

      if (promotionError) throw promotionError;

      // If promo code was used, record it
      if (promoCodeData) {
        const { data: promoCodeRecord, error: promoError } = await supabase
          .from("promo_codes")
          .select("id")
          .eq("code", promoCodeData.code)
          .single();

        if (!promoError && promoCodeRecord) {
          await supabase
            .from("promotion_promo_codes")
            .insert({
              promotion_id: promotion.id,
              promo_code_id: promoCodeRecord.id,
              discount_applied: promoCodeData.discountAmount
            });

          // Update usage count
          const { error: updateError } = await supabase
            .from("promo_codes")
            .update({ usage_count: ((promoCodeRecord as any).usage_count || 0) + 1 })
            .eq("id", promoCodeRecord.id);

          if (updateError) console.error('Error updating promo code usage:', updateError);
        }
      }

      toast({
        title: "Channel Optimization Created!",
        description: `Your ${selectedPlanData.duration} plan has been created. Complete payment to activate it.`,
      });

      // Navigate to payment page (you'll need to implement this)
      // For now, call success callback
      onSuccess();
    } catch (error: any) {
      console.error('Channel optimization creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create channel optimization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChannelUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ channelUrl: e.target.value });
    setChannelAnalytics(null); // Reset analytics when URL changes
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={onCancel}
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Channel Optimization & Promotion
            </h1>
            <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
              New
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            Comprehensive channel growth and optimization service
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Channel URL Input */}
          <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="p-6">
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                Channel Information
              </CardTitle>
              <CardDescription>
                Enter your YouTube channel URL to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="channelUrl" className="text-sm font-semibold">YouTube Channel URL</Label>
                  <Input
                    id="channelUrl"
                    value={formData.channelUrl}
                    onChange={handleChannelUrlChange}
                    placeholder="https://www.youtube.com/@yourchannel"
                    className="mt-2 h-12 text-base"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={fetchChannelAnalytics}
                    disabled={fetchingAnalytics || !formData.channelUrl}
                    className="h-12 px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                  >
                    {fetchingAnalytics ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      "Fetch Analytics"
                    )}
                  </Button>
                </div>
              </div>

              {fetchingAnalytics && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Fetching channel data... This may take a moment
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Channel Analytics Display */}
          {channelAnalytics && (
            <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm animate-fade-in">
              <CardHeader className="p-6">
                <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Channel Analytics
                </CardTitle>
                <CardDescription>
                  Your current channel performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Eye className="h-6 w-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-blue-900">Total Views</h3>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                      {channelAnalytics.totalViews?.toLocaleString() || '0'}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="h-6 w-6 text-red-600" />
                      <h3 className="text-lg font-semibold text-red-900">Total Subscribers</h3>
                    </div>
                    <p className="text-3xl font-bold text-red-600">
                      {channelAnalytics.totalSubscribers?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Selection */}
          {channelAnalytics && (
            <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm animate-fade-in">
              <CardHeader className="p-6">
                <CardTitle className="text-xl text-gray-900">Choose Your Plan</CardTitle>
                <CardDescription>
                  Select the duration that best fits your growth goals
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                        selectedPlan === plan.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900">{plan.duration}</h3>
                        <div className="mt-2">
                          <p className="text-2xl font-bold text-orange-600">
                            ${calculateFinalPrice(plan.price)}
                          </p>
                          {promoCodeData && plan.price !== calculateFinalPrice(plan.price) && (
                            <div className="text-sm">
                              <span className="line-through text-gray-500">${plan.price}</span>
                              <span className="ml-2 text-green-600 font-medium">
                                Save ${promoCodeData.discountAmount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Promo Code Section */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Promo Code</h3>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter promo code"
                        className="h-12"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={validatePromoCode}
                      disabled={validatingPromo || !promoCode.trim()}
                      variant="outline"
                      className="h-12 px-6"
                    >
                      {validatingPromo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  
                  {promoCodeData && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">
                        ✓ Promo code applied! You saved ${promoCodeData.discountAmount}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          {channelAnalytics && selectedPlan && (
            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={loading}
                className="w-full max-w-md h-14 text-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating Optimization Plan...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-5 w-5 mr-2" />
                    Proceed to Payment - ${calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0)}
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChannelOptimizationForm;