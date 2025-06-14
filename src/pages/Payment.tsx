
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, CheckCircle } from "lucide-react";
import SwishViewLogo from "@/components/SwishViewLogo";

// PayPal configuration - Replace with your actual PayPal Client ID
const PAYPAL_CLIENT_ID = "AQnBofuVcGPQ9mnTOJmxlqxIrGyWgqOstXlg9QMLqly0EDMuQIVDlsKKOOdmNA2VhUpYJeL5eeC5lHIu";

declare global {
  interface Window {
    paypal?: any;
  }
}

const Payment = () => {
  const { campaignId } = useParams();
  const [searchParams] = useSearchParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for payment success from URL params
  const paymentStatus = searchParams.get('payment');

  useEffect(() => {
    fetchCampaign();
    
    // Handle successful payment from PayPal redirect
    if (paymentStatus === 'success') {
      handlePaymentSuccess();
    }

    // Load PayPal SDK
    loadPayPalSDK();
  }, [campaignId, paymentStatus]);

  useEffect(() => {
    if (paypalLoaded && campaign && window.paypal) {
      initializePayPal();
    }
  }, [paypalLoaded, campaign]);

  const loadPayPalSDK = () => {
    if (window.paypal) {
      setPaypalLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.onload = () => {
      setPaypalLoaded(true);
    };
    script.onerror = () => {
      toast({
        title: "PayPal Loading Error",
        description: "Failed to load PayPal SDK. Please refresh the page.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);
  };

  const initializePayPal = () => {
    const paypalContainer = document.getElementById('paypal-button-container');
    if (!paypalContainer || !window.paypal) return;

    // Clear any existing PayPal buttons
    paypalContainer.innerHTML = '';

    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'paypal'
      },
      createOrder: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error("Authentication required");
          }

          const response = await supabase.functions.invoke('create-paypal-order', {
            body: {
              campaignId: campaign.id,
              amount: campaign.budget,
              campaignTitle: campaign.title,
              returnUrl: window.location.origin + `/payment/${campaignId}`
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (response.error) {
            throw new Error(response.error.message || 'Failed to create PayPal order');
          }

          return response.data.orderId;
        } catch (error: any) {
          console.error('Error creating PayPal order:', error);
          toast({
            title: "Payment Error",
            description: error.message || "Failed to create payment order",
            variant: "destructive",
          });
          throw error;
        }
      },
      onApprove: async (data: any) => {
        setProcessing(true);
        try {
          // Here you would typically capture the payment on your backend
          // For now, we'll mark the payment as successful
          await handlePayPalSuccess(data);
        } catch (error) {
          console.error('Error processing payment:', error);
          toast({
            title: "Payment Processing Error",
            description: "There was an error processing your payment.",
            variant: "destructive",
          });
        } finally {
          setProcessing(false);
        }
      },
      onError: (err: any) => {
        console.error('PayPal Error:', err);
        toast({
          title: "Payment Failed",
          description: "There was an error processing your payment with PayPal.",
          variant: "destructive",
        });
      },
      onCancel: () => {
        toast({
          title: "Payment Cancelled",
          description: "You have cancelled the payment process.",
        });
      }
    }).render('#paypal-button-container');
  };

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
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
      // Update campaign status to active
      const { error: campaignError } = await supabase
        .from("campaigns")
        .update({ status: "active" })
        .eq("id", campaignId);

      if (campaignError) throw campaignError;

      toast({
        title: "Payment Successful!",
        description: "Your campaign is now active and running.",
      });

      // Redirect to dashboard after a short delay
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

  const handlePayPalSuccess = async (details: any) => {
    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          campaign_id: campaignId,
          user_id: campaign.user_id,
          amount: campaign.budget,
          status: "completed",
          paypal_order_id: details.orderID,
        }]);

      if (paymentError) throw paymentError;

      // Update campaign status
      const { error: campaignError } = await supabase
        .from("campaigns")
        .update({ status: "active" })
        .eq("id", campaignId);

      if (campaignError) throw campaignError;

      toast({
        title: "Payment Successful!",
        description: "Your campaign is now active and running.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg sm:text-xl">Loading...</div>
      </div>
    );
  }

  // Show success message if payment was successful
  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
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
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="mr-2 sm:mr-4 p-2 sm:p-3"
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
        <Card className="w-full">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Complete Your Payment</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Pay for your campaign to activate it and start getting views
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Campaign Summary</h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Campaign:</span>
                  <span className="text-right font-medium max-w-[60%] break-words">{campaign?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Target Views:</span>
                  <span className="font-medium">{campaign?.target_views?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{campaign?.campaign_duration} days</span>
                </div>
                <div className="flex justify-between font-semibold text-base sm:text-lg border-t pt-2 mt-3">
                  <span>Total:</span>
                  <span>${campaign?.budget}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                <h3 className="font-semibold text-sm sm:text-base">Pay with PayPal</h3>
              </div>
              
              {!paypalLoaded ? (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-600">Loading PayPal...</div>
                </div>
              ) : (
                <div id="paypal-button-container" className="w-full min-h-[50px]"></div>
              )}
              
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
