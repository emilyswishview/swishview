import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Zap, Star, Gift, ArrowRight } from "lucide-react";

interface SEOPlan {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  description: string;
  features: string[];
}

const CreateSEOService = () => {
  const [seoPlans, setSeoPlans] = useState<SEOPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
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

  const handlePurchase = async (plan: SEOPlan) => {
    try {
      setPurchasing(plan.id);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      const response = await supabase.functions.invoke('create-seo-checkout', {
        body: {
          planId: plan.id,
          amount: Math.round(plan.price * 100),
          planName: plan.name,
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
      setPurchasing(null);
    }
  };

  const getPlanIcon = (index: number) => {
    const icons = [<Zap className="w-6 h-6" />, <Star className="w-6 h-6" />, <Crown className="w-6 h-6" />, <Gift className="w-6 h-6" />];
    return icons[index] || <Zap className="w-6 h-6" />;
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight leading-tight mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            SEO Optimization Plans
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
            Boost your YouTube channel's visibility and organic growth with our comprehensive SEO optimization services.
          </p>
          
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full border border-green-200">
            <Gift className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">
              Get a $250 bonus coupon with every plan purchase!
            </span>
          </div>
        </div>

        {/* SEO Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {seoPlans.map((plan, index) => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 hover:shadow-xl transform hover:scale-105 ${
                isPopular(index) ? 'ring-2 ring-primary/20 shadow-xl scale-105 bg-gradient-to-b from-white to-primary/5' : 'bg-white/80 backdrop-blur-sm'
              }`}
            >
              {isPopular(index) && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white px-4 py-1 rounded-full">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 flex items-center justify-center mx-auto mb-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/20 text-primary`}>
                  {getPlanIcon(index)}
                </div>
                <CardTitle className="text-2xl font-display font-bold">{plan.duration_months} Months</CardTitle>
                <div className="text-4xl font-bold text-primary">
                  ${plan.price}
                </div>
                <CardDescription className="text-sm mt-2">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4">
                  <Button 
                    className={`w-full h-12 rounded-full font-medium transition-all duration-300 transform hover:scale-105 ${
                      isPopular(index) 
                        ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg" 
                        : "bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white"
                    }`}
                    onClick={() => handlePurchase(plan)}
                    disabled={purchasing === plan.id}
                  >
                    {purchasing === plan.id ? (
                      "Processing..."
                    ) : (
                      <>
                        Choose Plan
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    <Gift className="w-3 h-3" />
                    +$250 Bonus Coupon
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display">What You'll Get</CardTitle>
            <CardDescription>Comprehensive SEO optimization for maximum growth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Keyword Optimization</h3>
                <p className="text-sm text-gray-600">Strategic keyword research and implementation for better discoverability</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Content Optimization</h3>
                <p className="text-sm text-gray-600">Title, description, and thumbnail optimization for maximum engagement</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Crown className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Analytics Tracking</h3>
                <p className="text-sm text-gray-600">Detailed performance tracking and growth insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateSEOService;