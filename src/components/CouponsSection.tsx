import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Coupon {
  id: string;
  code: string;
  amount: number;
  status: string;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
  seo_purchase_id: string;
}

const CouponsSection = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error: any) {
      console.error('Error fetching coupons:', error);
      toast({
        title: "Error",
        description: "Failed to fetch coupons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Copied!",
        description: "Coupon code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy coupon code",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (coupon: Coupon) => {
    if (coupon.used_at) {
      return <Badge variant="secondary">Used</Badge>;
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-lg font-display text-gray-600">Loading coupons...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Coupons & Credits</h2>
          <p className="text-gray-600">Your available coupon codes and credit balances</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            ${coupons.filter(c => c.status === 'active' && !c.used_at).reduce((sum, c) => sum + c.amount, 0)}
          </div>
          <div className="text-sm text-gray-500">Available Credits</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{coupons.filter(c => c.status === 'active' && !c.used_at).length}</div>
                <div className="text-sm text-gray-600">Active Coupons</div>
              </div>
              <Gift className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{coupons.filter(c => c.used_at).length}</div>
                <div className="text-sm text-gray-600">Used Coupons</div>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{coupons.length}</div>
                <div className="text-sm text-gray-600">Total Earned</div>
              </div>
              <Clock className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Your Coupon Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No coupons yet</h3>
              <p className="text-gray-600">
                Purchase an SEO Optimization plan to receive a $250 bonus coupon!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-lg font-bold text-gray-900 bg-white px-3 py-1 rounded border">
                        {coupon.code}
                      </code>
                      {getStatusBadge(coupon)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="font-medium text-green-700">${coupon.amount} Credit</span>
                      <span>Created: {formatDate(coupon.created_at)}</span>
                      {coupon.expires_at && (
                        <span>Expires: {formatDate(coupon.expires_at)}</span>
                      )}
                      {coupon.used_at && (
                        <span>Used: {formatDate(coupon.used_at)}</span>
                      )}
                    </div>
                  </div>
                  
                  {!coupon.used_at && coupon.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(coupon.code)}
                      className="ml-4"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to Use */}
      <Card className="glass-card bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2 text-blue-900">How to use your coupons</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Copy your coupon code using the button above</li>
            <li>• Use the code when creating new video promotion campaigns</li>
            <li>• Each coupon provides $250 credit towards campaign costs</li>
            <li>• Coupons are automatically generated when you purchase SEO plans</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CouponsSection;
