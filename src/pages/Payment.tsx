
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, CheckCircle } from "lucide-react";
import SwishViewLogo from "@/components/SwishViewLogo";
import LoadingSpinner from "@/components/LoadingSpinner";

const Payment = () => {
  const { campaignId } = useParams();
  const [searchParams] = useSearchParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const paymentStatus = searchParams.get('payment');

  useEffect(() => {
    fetchCampaign();
    
    if (paymentStatus === 'success') {
      handlePaymentSuccess();
    }
  }, [campaignId, paymentStatus]);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Campaign not found",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      const { error: campaignError } = await supabase
        .from("promotions")
        .update({ status: "active" })
        .eq("id", campaignId);

      if (campaignError) throw campaignError;

      toast({
        title: "Payment Successful!",
        description: "Your campaign is now active and running.",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error: any) {
      console.error("Error updating campaign:", error);
      toast({
        title: "Payment received but campaign activation failed",
        description: "Please contact support if your campaign doesn't activate soon.",
        variant: "destructive",
      });
    }
  };

  const handleStripePayment = async () => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Authentication required");
      }

      const response = await supabase.functions.invoke('create-checkout', {
        body: {
          campaignId: campaign.id,
          amount: Math.round(campaign.budget * 100),
          campaignTitle: campaign.title,
          returnUrl: window.location.origin + `/payment/${campaignId}`
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create checkout session');
      }

      window.open(response.data.url, '_blank');
    } catch (error: any) {
      console.error('Error creating Stripe checkout:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create payment session",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto bg-white border-gray-200">
          <CardContent className="text-center p-6 sm:p-8">
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">Your campaign is being activated...</p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="mr-2 sm:mr-4 p-2 sm:p-3 text-gray-700 hover:bg-gray-100"
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Card className="w-full bg-white border-gray-200">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl text-gray-900">Complete Your Payment</CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600">
              Pay for your campaign to activate it and start getting views
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2 text-sm sm:text-base text-gray-900">Campaign Summary</h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Campaign:</span>
                  <span className="text-right font-medium max-w-[60%] break-words text-gray-900">{campaign?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Target Views:</span>
                  <span className="font-medium text-gray-900">{campaign?.target_views?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-gray-900">{campaign?.campaign_duration} days</span>
                </div>
                <div className="flex justify-between font-semibold text-base sm:text-lg border-t border-gray-300 pt-2 mt-3">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">${campaign?.budget}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
                <h3 className="font-semibold text-sm sm:text-base text-gray-900">Payment</h3>
              </div>
              
              <Button
                onClick={handleStripePayment}
                disabled={processing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm sm:text-base"
              >
                {processing ? "Processing..." : `Pay $${campaign?.budget} with Stripe`}
              </Button>
              
              {processing && (
                <div className="text-center">
                  <p className="text-sm text-gray-600">Processing payment...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
