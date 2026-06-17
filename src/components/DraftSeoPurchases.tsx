import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, CreditCard } from "lucide-react";

interface SEOPurchase {
  id: string;
  seo_plan_id: string;
  amount: number;
  status: string;
  promo_code_used: string | null;
  discount_applied: number;
  created_at: string;
  assigned_manager: string | null;
  seo_plans: {
    name: string;
    duration_months: number;
  } | null;
}

interface DraftSeoPurchasesProps {
  userId: string;
}

const DraftSeoPurchases = ({ userId }: DraftSeoPurchasesProps) => {
  const [draftPurchases, setDraftPurchases] = useState<SEOPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchDraftPurchases();
    }
  }, [userId]);

  const fetchDraftPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_purchases')
        .select(`
          *,
          seo_plans (name, duration_months)
        `)
        .eq('user_id', userId)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDraftPurchases(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load draft purchases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const proceedToPayment = async (purchase: SEOPurchase) => {
    try {
      setProcessing(purchase.id);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }

      const response = await supabase.functions.invoke('create-seo-checkout', {
        body: {
          planId: purchase.seo_plan_id,
          amount: Math.round(purchase.amount * 100),
          planName: purchase.seo_plans?.name,
          promoCode: purchase.promo_code_used,
          discount: purchase.discount_applied,
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
      setProcessing(null);
    }
  };

  const deleteDraft = async (purchaseId: string) => {
    try {
      const { error } = await supabase
        .from('seo_purchases')
        .delete()
        .eq('id', purchaseId);

      if (error) throw error;

      toast({
        title: "Draft Deleted",
        description: "Draft SEO service has been deleted",
      });

      fetchDraftPurchases();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete draft",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-lg">Loading draft purchases...</div>
      </div>
    );
  }

  if (draftPurchases.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Draft SEO Services</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {draftPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-gray-900">
                    {purchase.seo_plans?.name} ({purchase.seo_plans?.duration_months} months)
                  </h4>
                  <Badge variant="outline">Draft</Badge>
                  {purchase.assigned_manager ? (
                    <Badge variant="secondary">{purchase.assigned_manager}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600">Yet to be assigned</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  <div>Amount: ${purchase.amount}</div>
                  {purchase.promo_code_used && (
                    <div className="text-green-600">
                      Promo code applied: {purchase.promo_code_used} (Save ${purchase.discount_applied})
                    </div>
                  )}
                  <div>Created: {new Date(purchase.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => proceedToPayment(purchase)}
                  disabled={processing === purchase.id}
                  className="bg-primary hover:bg-primary/90"
                >
                  {processing === purchase.id ? (
                    "Processing..."
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Now
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteDraft(purchase.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DraftSeoPurchases;