import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Zap, Star, Gift, Search, AlertCircle } from "lucide-react";
import DraftSeoPurchases from './DraftSeoPurchases';

interface SEOPlan {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  description: string;
  features: string[];
}

interface SEOPurchase {
  id: string;
  seo_plan_id: string;
  amount: number;
  status: string;
  created_at: string;
  seo_plans: SEOPlan;
}

interface SEOPlansSectionProps {
  userId: string;
}

const SEOPlansSection = ({ userId }: SEOPlansSectionProps) => {
  const [seoPlans, setSeoPlans] = useState<SEOPlan[]>([]);
  const [userPurchases, setUserPurchases] = useState<SEOPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    try {
      const [plansResponse, purchasesResponse] = await Promise.all([
        supabase.from('seo_plans').select('*').order('duration_months'),
        supabase.from('seo_purchases').select(`
          *,
          seo_plans (*)
        `).eq('user_id', userId)
      ]);

      if (plansResponse.error) throw plansResponse.error;
      if (purchasesResponse.error) throw purchasesResponse.error;

      setSeoPlans(plansResponse.data || []);
      setUserPurchases(purchasesResponse.data || []);
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
    const icons = [<Zap className="w-5 h-5" />, <Star className="w-5 h-5" />, <Crown className="w-5 h-5" />, <Gift className="w-5 h-5" />];
    return icons[index] || <Zap className="w-5 h-5" />;
  };

  const isPopular = (index: number) => index === 1;

  const getPurchaseStatus = (planId: string) => {
    const purchase = userPurchases.find(p => p.seo_plan_id === planId);
    return purchase?.status || null;
  };

  const hasPaidPlan = () => {
    return userPurchases.some(p => p.status === 'completed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading SEO plans...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">
            SEO Optimization Plans
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto mb-6">
            Optimize your YouTube videos for maximum reach, engagement, and discoverability. 
            Choose the plan that fits your content strategy.
          </p>
          
          <div className="flex justify-center mb-6">
            <Button 
              onClick={() => navigate('/create-seo')}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-medium rounded-full px-8"
            >
              Create SEO Service
            </Button>
          </div>

        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full border border-green-200">
          <Gift className="w-5 h-5 text-green-600" />
          <span className="text-green-700 font-medium">
            Get a $250 bonus coupon with every plan purchase!
          </span>
        </div>
      </div>

      {/* Draft Purchases */}
      <DraftSeoPurchases userId={userId} />

      {/* User's Purchases */}
      {userPurchases.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Your SEO Plans
          </h3>
          <div className="grid gap-4">
            {userPurchases.map((purchase) => (
              <div key={purchase.id} className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{purchase.seo_plans.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      ${purchase.amount} • {purchase.seo_plans.duration_months} months
                    </p>
                  </div>
                  <Badge 
                    variant={purchase.status === 'completed' ? 'default' : 'secondary'}
                    className={purchase.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {purchase.status === 'completed' ? 'Active' : 'Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Access Banner */}
      {!hasPaidPlan() && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="font-semibold text-orange-900">Complete payment to access analytics</h3>
              <p className="text-orange-700 text-sm">
                Purchase an SEO plan to unlock detailed analytics and full optimization features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SEO Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {seoPlans.map((plan, index) => {
          const purchaseStatus = getPurchaseStatus(plan.id);
          const isPlanPurchased = purchaseStatus === 'completed';
          const isPlanPending = purchaseStatus === 'pending';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative glass-card transition-all duration-300 hover:shadow-lg ${
                isPopular(index) ? 'ring-2 ring-primary/20 shadow-lg scale-105 bg-gradient-to-b from-white to-primary/5' : 'bg-white/60 backdrop-blur-sm'
              } ${isPlanPurchased ? 'ring-2 ring-green-500/30 bg-green-50/50' : ''}`}
            >
              {isPopular(index) && !isPlanPurchased && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white px-4 py-1">Most Popular</Badge>
                </div>
              )}
              
              {isPlanPurchased && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-600 text-white px-4 py-1">Active</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`w-12 h-12 flex items-center justify-center mx-auto mb-4 ${
                  isPlanPurchased ? 'bg-green-100' : 'bg-primary/10'
                }`}>
                  {getPlanIcon(index)}
                </div>
                <CardTitle className="text-xl font-display">{plan.duration_months} Months</CardTitle>
                <div className="text-3xl font-bold text-primary">
                  ${plan.price}
                </div>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="pt-4">
                  {isPlanPurchased ? (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      disabled
                    >
                      Plan Active
                    </Button>
                  ) : isPlanPending ? (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      disabled
                    >
                      Payment Pending
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant={isPopular(index) ? "default" : "outline"}
                      onClick={() => handlePurchase(plan)}
                      disabled={purchasing === plan.id}
                    >
                      {purchasing === plan.id ? "Processing..." : "Buy Now"}
                    </Button>
                  )}
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1">
                    <Gift className="w-3 h-3" />
                    +$250 Bonus Coupon
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SEOPlansSection;