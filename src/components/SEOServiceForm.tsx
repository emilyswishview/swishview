import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Zap, Star, Gift, Loader2, Tag } from "lucide-react";

interface SEOPlan {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  description: string;
  features: string[];
}

interface PromoCode {
  valid: boolean;
  discount?: number;
  code?: string;
  error?: string;
}

interface SEOServiceFormProps {
  onPlanSelected?: (planId: string, amount: number, promoData?: { code: string; discount: number }) => void;
  channelData?: any;
}

const SEOServiceForm = ({ onPlanSelected, channelData }: SEOServiceFormProps = {}) => {
  const [seoPlans, setSeoPlans] = useState<SEOPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SEOPlan | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [validatedPromo, setValidatedPromo] = useState<PromoCode | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSEOPlans();
  }, []);

  const fetchSEOPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_plans')
        .select('*')
        .order('duration_months');

      if (error) throw error;
      setSeoPlans(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load SEO plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setValidatedPromo(null);
      return;
    }

    setValidatingPromo(true);
    try {
      const response = await supabase.functions.invoke('validate-promo-code', {
        body: { promoCode: promoCode.trim() }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setValidatedPromo(response.data);
    } catch (error: any) {
      setValidatedPromo({ valid: false, error: 'Failed to validate promo code' });
    } finally {
      setValidatingPromo(false);
    }
  };

  const calculateFinalPrice = (originalPrice: number) => {
    if (validatedPromo?.valid && validatedPromo.discount) {
      return Math.max(0, originalPrice - validatedPromo.discount);
    }
    return originalPrice;
  };

  const handleSaveDraft = async () => {
    if (!selectedPlan) {
      toast({
        title: "Error",
        description: "Please select a plan first",
        variant: "destructive",
      });
      return;
    }

    const finalAmount = calculateFinalPrice(selectedPlan.price);
    const promoData = validatedPromo?.valid ? {
      code: validatedPromo.code!,
      discount: validatedPromo.discount || 0
    } : undefined;

    if (onPlanSelected) {
      onPlanSelected(selectedPlan.id, finalAmount, promoData);
    } else {
      // Original save draft logic for standalone use
      try {
        setProcessing(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/login');
          return;
        }

        const { data, error } = await supabase
          .from('seo_purchases')
          .insert({
            user_id: session.user.id,
            seo_plan_id: selectedPlan.id,
            amount: finalAmount,
            status: 'draft',
            promo_code_used: validatedPromo?.valid ? validatedPromo.code : null,
            discount_applied: validatedPromo?.valid ? validatedPromo.discount || 0 : 0
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Draft Saved",
          description: "Your SEO service has been saved as draft. You can proceed to payment later.",
        });

        navigate('/dashboard?tab=seo');
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to save draft",
          variant: "destructive",
        });
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedPlan) {
      toast({
        title: "Error",
        description: "Please select a plan first",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      const finalAmount = calculateFinalPrice(selectedPlan.price);

      const response = await supabase.functions.invoke('create-seo-checkout', {
        body: {
          planId: selectedPlan.id,
          amount: Math.round(finalAmount * 100),
          planName: selectedPlan.name,
          promoCode: validatedPromo?.valid ? validatedPromo.code : null,
          discount: validatedPromo?.valid ? validatedPromo.discount || 0 : 0,
          returnUrl: window.location.origin + '/dashboard?tab=seo'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create checkout session');
      }

      window.open(response.data.url, '_blank');
      
      toast({
        title: "Redirecting to Payment",
        description: "Opening payment page in a new tab...",
      });
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create payment session",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getPlanDetails = (durationMonths: number) => {
    const baseFeatures = [
      "Channel & Video Optimization: Every video optimized for better discoverability among your target audience",
      "Targeted Audience Growth: Reaching individuals who genuinely resonate with your content", 
      "SEO & Algorithm Strategy: Keywords, metadata, and descriptions designed to maximize visibility and engagement",
      "Performance Analytics Dashboard: Insights and recommendations to continually improve your channel's reach",
      "Dedicated Support: Your personal SEO assistant to make the process seamless and results-driven"
    ];

    switch(durationMonths) {
      case 3:
        return {
          views: "50K–80K views",
          subscribers: "3K–6K new subscribers",
          features: baseFeatures
        };
      case 6:
        return {
          views: "100K–200K views", 
          subscribers: "7K–12K new subscribers",
          features: baseFeatures
        };
      case 9:
        return {
          views: "300K–500K views",
          subscribers: "15K–25K new subscribers", 
          features: baseFeatures
        };
      case 12:
        return {
          views: "750K–1M views",
          subscribers: "25K–40K new subscribers",
          features: baseFeatures
        };
      default:
        return null;
    }
  };

  const getPlanIcon = (index: number) => {
    const icons = [<Zap className="w-5 h-5" />, <Star className="w-5 h-5" />, <Crown className="w-5 h-5" />, <Gift className="w-5 h-5" />];
    return icons[index] || <Zap className="w-5 h-5" />;
  };

  const isPopular = (index: number) => index === 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading SEO plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-6">
            Choose Your SEO Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Select the perfect SEO optimization plan for your YouTube channel
          </p>
        </div>

        {/* Plan Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {seoPlans.map((plan, index) => (
            <Card 
              key={plan.id} 
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg ${
                selectedPlan?.id === plan.id ? 'ring-2 ring-primary shadow-lg' : 
                isPopular(index) ? 'ring-2 ring-primary/20 shadow-lg scale-105 bg-gradient-to-b from-white to-primary/5' : 'bg-white/60 backdrop-blur-sm'
              }`}
              onClick={() => setSelectedPlan(plan)}
            >
              {isPopular(index) && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white px-4 py-1">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  {getPlanIcon(index)}
                </div>
                <CardTitle className="text-xl font-display">{plan.duration_months} Months</CardTitle>
                <div className="space-y-1">
                  {validatedPromo?.valid && selectedPlan?.id === plan.id && (
                    <div className="text-lg text-gray-500 line-through">
                      ${plan.price}
                    </div>
                  )}
                  <div className="text-3xl font-bold text-primary">
                    ${calculateFinalPrice(plan.price)}
                  </div>
                  {validatedPromo?.valid && selectedPlan?.id === plan.id && (
                    <div className="text-sm text-green-600 font-medium">
                      Save ${validatedPromo.discount}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="text-center">
                  <Button 
                    variant={selectedPlan?.id === plan.id ? "default" : "outline"}
                    className="w-full"
                  >
                    {selectedPlan?.id === plan.id ? "Selected" : "Select Plan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Plan Details */}
        {selectedPlan && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex  items-center gap-2">
                <Check className="w-5 h-5  text-green-600" />
                Selected: {selectedPlan.duration_months} Month Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const planDetails = getPlanDetails(selectedPlan.duration_months);
                if (!planDetails) return null;
                
                return (
                  <div className="space-y-4 font-display">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-800">{planDetails.views}</div>
                        <div className="text-sm text-blue-600">New audience growth</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-800">{planDetails.subscribers}</div>
                        <div className="text-sm text-green-600">Subscriber growth</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold text-lg">What You'll Get:</h4>
                      {planDetails.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Coupon Code Display */}
        { /* 
        <Card className="mb-8 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                <div>
                  <h3 className="font-semibold text-green-800">Special Gift from SwishView</h3>
                  <p className="text-sm text-green-700">Exclusive coupon code for you!</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-800">$250 OFF</div>
                <div className="text-sm font-mono bg-green-100 px-3 py-1 rounded border text-green-800">
                  Code: SV250ZX7H
                </div>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Promo Code Input */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Promo Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
              <Button 
                onClick={validatePromoCode}
                disabled={validatingPromo || !promoCode.trim()}
                variant="outline"
              >
                {validatingPromo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Validate"
                )}
              </Button>
            </div>
            
            {validatedPromo && (
              <div className={`p-3 rounded-lg ${
                validatedPromo.valid 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {validatedPromo.valid ? (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Code applied! You save ${validatedPromo.discount}</span>
                  </div>
                ) : (
                  <span>{validatedPromo.error}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {selectedPlan && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-lg font-semibold">
                  Selected: {selectedPlan.duration_months} Months Plan - ${calculateFinalPrice(selectedPlan.price)}
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={handleSaveDraft}
                    disabled={processing}
                    variant="outline"
                    className="min-w-[150px]"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Save as Draft
                  </Button>
                  <Button 
                    onClick={handleProceedToPayment}
                    disabled={processing}
                    className="min-w-[150px]"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Proceed to Payment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SEOServiceForm;
