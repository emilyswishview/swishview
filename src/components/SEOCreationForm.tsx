import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Target, DollarSign, Calendar, Search, TrendingUp, Star, Crown, Gift } from "lucide-react";
import { notifyUserActivity } from "@/utils/notifyActivity";

interface SEOCreationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const seoPlans = [
  {
    id: "3-month",
    duration: 3,
    price: 750,
    title: "Quick Boost",
    icon: <TrendingUp className="w-5 h-5" />,
    description: "Perfect for immediate SEO improvements",
    features: [
      "Video title optimization",
      "Description enhancement",
      "Tags optimization",
      "Thumbnail analysis",
      "Basic analytics review"
    ]
  },
  {
    id: "6-month",
    duration: 6,
    price: 1400,
    title: "Growth Accelerator",
    icon: <Star className="w-5 h-5" />,
    description: "Comprehensive SEO strategy for sustained growth",
    features: [
      "Everything in Quick Boost",
      "Channel audit & strategy",
      "Content planning",
      "Audience targeting",
      "Monthly performance reports",
      "SEO trend analysis"
    ],
    popular: true
  },
  {
    id: "9-month",
    duration: 9,
    price: 2000,
    title: "Authority Builder",
    icon: <Crown className="w-5 h-5" />,
    description: "Advanced optimization for channel authority",
    features: [
      "Everything in Growth Accelerator",
      "Competition analysis",
      "Advanced keyword research",
      "Cross-platform optimization",
      "Brand positioning strategy",
      "Bi-weekly strategy calls"
    ]
  },
  {
    id: "12-month",
    duration: 12,
    price: 2500,
    title: "Market Dominator",
    icon: <Gift className="w-5 h-5" />,
    description: "Complete market domination strategy",
    features: [
      "Everything in Authority Builder",
      "Full brand overhaul",
      "Advanced analytics setup",
      "Industry trend forecasting",
      "Custom automation tools",
      "Weekly strategy sessions",
      "Priority support"
    ]
  }
];

const SEOCreationForm: React.FC<SEOCreationFormProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    channel_url: "",
    objectives: "",
  });
  const { toast } = useToast();

  const validateYouTubeUrl = (url: string) => {
    if (!url) return false;
    const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(channel\/|c\/|user\/|@)|youtu\.be\/)/;
    return youtubePattern.test(url);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateYouTubeUrl(formData.channel_url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube channel URL",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPlan) {
      toast({
        title: "Plan Required",
        description: "Please select an SEO optimization plan",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // First, get the corresponding SEO plan from the database
      const { data: seoPlan, error: planError } = await supabase
        .from('seo_plans')
        .select('*')
        .eq('duration_months', selectedPlan.duration)
        .single();

      if (planError || !seoPlan) {
        throw new Error("SEO plan not found in database");
      }

      // Proceed to payment
      const response = await supabase.functions.invoke('create-seo-checkout', {
        body: {
          planId: seoPlan.id,
          amount: Math.round(selectedPlan.price * 100),
          planName: selectedPlan.title,
          returnUrl: window.location.origin + '/dashboard?tab=seo'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create checkout session');
      }

      // Notify about SEO purchase
      await notifyUserActivity({
        type: "seo_purchase",
        data: {
          user_email: session.user.email,
          plan_name: selectedPlan.title,
          amount: selectedPlan.price,
          channel_url: formData.channel_url,
        },
      });

      // Open payment page in new tab
      window.open(response.data.url, '_blank');
      
      toast({
        title: "Redirecting to Payment",
        description: "Opening payment page in a new tab...",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating SEO service:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create SEO service",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight leading-tight mb-6 text-gray-900">
            SEO Optimization Service
          </h1>
          <p className="text-lg sm:text-xl font-display text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Boost your YouTube channel's discoverability with professional SEO optimization
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full border border-green-200 mt-6">
            <Gift className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">
              Get a $250 bonus coupon with every plan purchase!
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
              <CardHeader className="p-8">
                <CardTitle className="text-2xl font-display font-bold text-gray-900">Service Details</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-sm font-semibold font-display text-gray-900">Service Title</Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter a descriptive title for your SEO service"
                      required
                      className="h-12 text-base font-display rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="channel_url" className="text-sm font-semibold font-display text-gray-900">YouTube Channel URL</Label>
                    <Input
                      id="channel_url"
                      name="channel_url"
                      value={formData.channel_url}
                      onChange={handleInputChange}
                      placeholder="https://www.youtube.com/@yourchannel"
                      required
                      className="h-12 text-base font-display rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                    {formData.channel_url && !validateYouTubeUrl(formData.channel_url) && (
                      <p className="text-sm text-red-600 font-display">Please enter a valid YouTube channel URL</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="objectives" className="text-sm font-semibold font-display text-gray-900 flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Objectives & Goals
                    </Label>
                    <Textarea
                      id="objectives"
                      name="objectives"
                      value={formData.objectives}
                      onChange={handleInputChange}
                      placeholder="Describe your SEO goals: discoverability, CTR improvement, watch time optimization, etc."
                      rows={4}
                      className="text-base font-display rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 resize-none"
                      required
                    />
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button 
                      type="submit" 
                      className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-medium font-display" 
                      disabled={loading || !selectedPlan}
                    >
                      {loading ? "Processing..." : selectedPlan ? `Purchase ${selectedPlan.title} - $${selectedPlan.price}` : "Select a Plan First"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onCancel}
                      className="h-12 px-8 font-display"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* SEO Plans Selection */}
          <div className="space-y-6">
            <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
              <CardHeader className="p-6">
                <CardTitle className="text-lg font-display font-bold text-gray-900">Choose Your Plan</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                {seoPlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => handlePlanSelect(plan)}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                      selectedPlan?.id === plan.id
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2 -right-2 bg-primary text-white">
                        Most Popular
                      </Badge>
                    )}
                    
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        selectedPlan?.id === plan.id ? 'bg-primary text-white' : 'bg-gray-100'
                      }`}>
                        {plan.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold font-display">{plan.title}</h4>
                        <p className="text-sm text-gray-600">{plan.duration} months</p>
                      </div>
                    </div>
                    
                    <div className="text-2xl font-bold text-primary mb-2">
                      ${plan.price}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {plan.description}
                    </p>
                    
                    <ul className="space-y-1 text-xs text-gray-600">
                      {plan.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-primary rounded-full"></div>
                          {feature}
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-primary font-medium">
                          +{plan.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SEOCreationForm;