import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Gift, DollarSign, Calendar, User, RefreshCw, Settings, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SEOPurchase {
  id: string;
  user_id: string;
  seo_plan_id: string;
  stripe_session_id: string;
  amount: number;
  status: string;
  channel_url: string;
  coupon_generated: boolean;
  assigned_manager: string | null;
  promo_code_used: string | null;
  discount_applied: number;
  created_at: string;
  updated_at: string;
  seo_plans: {
    name: string;
    duration_months: number;
  } | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

const SEOPurchasesSection = () => {
  const [purchases, setPurchases] = useState<SEOPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchSEOPurchases();
  }, []);

  const fetchSEOPurchases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seo_purchases')
        .select(`
          *,
          seo_plans (name, duration_months),
          profiles (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching SEO purchases:', error);
      toast({
        title: "Error",
        description: "Failed to fetch SEO purchases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (purchaseId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('seo_purchases')
        .update({ status: newStatus })
        .eq('id', purchaseId);

      if (error) throw error;
      
      toast({
        title: "Status Updated",
        description: `Payment status changed to ${newStatus}`,
      });
      
      fetchSEOPurchases();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const assignManager = async (purchaseId: string, manager: string) => {
    try {
      const { error } = await supabase
        .from('seo_purchases')
        .update({ assigned_manager: manager })
        .eq('id', purchaseId);

      if (error) throw error;
      
      toast({
        title: "Manager Assigned",
        description: `${manager} has been assigned to this service`,
      });
      
      fetchSEOPurchases();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to assign manager",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-100 text-gray-800 border-gray-300",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      completed: "bg-green-100 text-green-800 border-green-300",
      failed: "bg-red-100 text-red-800 border-red-300",
    };

    return (
      <Badge className={`${styles[status as keyof typeof styles] || styles.pending} border`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPurchases = purchases.filter(purchase =>
    purchase.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.seo_plans?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-lg font-display text-gray-600">Loading SEO purchases...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SEO Optimization Purchases</h2>
          <p className="text-gray-600">Manage SEO optimization service purchases</p>
        </div>
        <Button onClick={fetchSEOPurchases} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by email, name, plan, or status..."
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
                <div className="text-2xl font-bold">{purchases.length}</div>
                <div className="text-sm text-gray-600">Total Purchases</div>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{purchases.filter(p => p.status === 'completed').length}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <Gift className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{purchases.filter(p => p.coupon_generated).length}</div>
                <div className="text-sm text-gray-600">Coupons Generated</div>
              </div>
              <Gift className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  ${purchases.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchases List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            SEO Purchases ({filteredPurchases.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No SEO purchases found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No purchases match your search criteria.' : 'No SEO purchases have been made yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {purchase.seo_plans?.name || 'SEO Plan'}
                      </h4>
                      {getStatusBadge(purchase.status)}
                      {purchase.coupon_generated && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          <Gift className="w-3 h-3 mr-1" />
                          Coupon Generated
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{purchase.profiles?.full_name || purchase.profiles?.email || 'Unknown User'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>
                          ${purchase.amount}
                          {purchase.promo_code_used && (
                            <span className="ml-1 text-green-600 text-xs">
                              (Code: {purchase.promo_code_used}, Saved: ${purchase.discount_applied})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(purchase.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">ID: {purchase.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                    
                    {/* Manager Assignment */}
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Manager:</span>
                      <Select
                        value={purchase.assigned_manager || ""}
                        onValueChange={(value) => assignManager(purchase.id, value)}
                      >
                        <SelectTrigger className="w-48 h-8">
                          <SelectValue placeholder="Assign Manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ashley">Ashley</SelectItem>
                          <SelectItem value="daisy">Daisy</SelectItem>
                          <SelectItem value="sophie">Sophie</SelectItem>
                          <SelectItem value="emily">Emily</SelectItem>
                        </SelectContent>
                      </Select>
                      {!purchase.assigned_manager && (
                        <span className="text-xs text-orange-600">Yet to be assigned</span>
                      )}
                    </div>
                    {purchase.channel_url && (
                      <div className="mt-2 text-sm text-blue-600">
                        Channel: {purchase.channel_url}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={purchase.status}
                      onValueChange={(value) => updatePaymentStatus(purchase.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
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

export default SEOPurchasesSection;