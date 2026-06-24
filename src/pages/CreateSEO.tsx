import React, { useState } from "react";
import ChannelDetailsForm from "@/components/ChannelDetailsForm";
import SEOServiceForm from "@/components/SEOServiceForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import RequestButton from "@/components/RequestButton";
import { notifyUserActivity } from "@/utils/notifyActivity";

interface ChannelData {
  channelName: string;
  channelUrl: string;
  description: string;
  metrics: {
    totalViews: number;
    totalSubscribers: number;
    cached: boolean;
  };
}

const CreateSEO = () => {
  const [step, setStep] = useState<'channel' | 'plan'>('channel');
  const [channelData, setChannelData] = useState<ChannelData | null>(null);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  React.useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }
    setUser(session.user);
  };

  const handleChannelData = (data: ChannelData) => {
    setChannelData(data);
    setStep('plan');
  };

  const handlePlanSelected = async (planId: string, amount: number, promoData?: { code: string; discount: number }) => {
    if (!channelData) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      // Save as draft with channel data
      const { data, error } = await supabase
        .from('seo_purchases')
        .insert({
          user_id: session.user.id,
          seo_plan_id: planId,
          amount: amount,
          status: 'draft',
          channel_url: channelData.channelUrl,
          promo_code_used: promoData?.code || null,
          discount_applied: promoData?.discount || 0
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification email for SEO purchase
      await notifyUserActivity({
        type: "seo_purchase",
        data: {
          user_email: session.user.email,
          plan_name: planId,
          amount: amount,
          channel_url: channelData.channelUrl,
        },
      });

      toast({
        title: "Draft Saved",
        description: "Your SEO service has been saved as draft. Complete payment to activate.",
      });

      navigate('/dashboard?tab=seo');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-4">
            SEO Optimization Service
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get your YouTube channel optimized by our SEO experts
          </p>
        </div>

        {step === 'channel' ? (
          <ChannelDetailsForm onChannelData={handleChannelData} />
        ) : (
          <div className="space-y-6">
            {/* Channel Summary */}
            <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg border shadow-sm">
              <h3 className="font-semibold mb-2">Channel: {channelData?.channelName}</h3>
              <p className="text-sm text-gray-600 mb-2">{channelData?.description}</p>
              <div className="flex gap-4 text-sm">
                <span>{channelData?.metrics.totalSubscribers.toLocaleString()} subscribers</span>
                <span>{channelData?.metrics.totalViews.toLocaleString()} views</span>
              </div>
            </div>
            
            {/* Plan Selection */}
            <SEOServiceForm onPlanSelected={handlePlanSelected} channelData={channelData} />
          </div>
        )}
      </div>

      {/* Floating Request Button */}
      <RequestButton
        userId={user?.id}
        variant="floating"
        requestType="seo_service"
      />
    </div>
  );
};

export default CreateSEO;