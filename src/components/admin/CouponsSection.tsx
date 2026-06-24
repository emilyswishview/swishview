import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Gift, DollarSign, Calendar, User, RefreshCw, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Coupon {
  id: string;
  user_id: string;
  seo_purchase_id: string;
  code: string;
  amount: number;
  status: string;
  used_at: string;
  expires_at: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  seo_purchases: {
    seo_plans: {
      name: string;
    } | null;
  } | null;
}

const CouponsSection = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coupons')
        .select(`
          *,
          profiles (full_name, email),
          seo_purchases (
            seo_plans (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data as any) || []);
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

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    const actualStatus = isExpired ? 'expired' : status;
    
    const styles = {
      active: "bg-green-100 text-green-800 border-green-300",
      used: "bg-blue-100 text-blue-800 border-blue-300",
      expired: "bg-red-100 text-red-800 border-red-300",
    };

    return (
      <Badge className={`${styles[actualStatus as keyof typeof styles] || styles.active} border`}>
        {actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Coupon code copied to clipboard",
    });
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold text-gray-900">Bonus Coupons</h2>
          <p className="text-gray-600">Manage $250 bonus coupons from SEO purchases</p>
        </div>
        <Button onClick={fetchCoupons} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by email, name, code, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{coupons.length}</div>
                <div className="text-sm text-gray-600">Total Coupons</div>
              </div>
              <Gift className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{coupons.filter(c => c.status === 'active' && new Date(c.expires_at) > new Date()).length}</div>
                <div className="text-sm text-gray-600">Active</div>
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
                <div className="text-sm text-gray-600">Used</div>
              </div>
              <Gift className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  ${coupons.filter(c => c.used_at).reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Used Value</div>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Bonus Coupons ({filteredCoupons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCoupons.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No coupons found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No coupons match your search criteria.' : 'No bonus coupons have been generated yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-mono font-bold text-lg text-primary bg-white px-3 py-1 rounded border">
                        {coupon.code}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(coupon.code)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {getStatusBadge(coupon.status, coupon.expires_at)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{coupon.profiles?.full_name || coupon.profiles?.email || 'Unknown User'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>${coupon.amount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Expires: {formatDate(coupon.expires_at)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">
                          From: {coupon.seo_purchases?.seo_plans?.name || 'SEO Plan'}
                        </span>
                      </div>
                    </div>
                    {coupon.used_at && (
                      <div className="mt-2 text-sm text-blue-600">
                        Used on: {formatDate(coupon.used_at)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CouponsSection;