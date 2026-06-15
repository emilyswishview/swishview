import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Download, 
  ExternalLink, 
  Eye, 
  Receipt,
  Calendar,
  DollarSign 
} from 'lucide-react';
import RequestButton from '@/components/RequestButton';

interface Payment {
  id: string;
  campaign_title: string;
  amount: number;
  status: string;
  created_at: string;
  stripe_invoice_id?: string;
  invoice_url?: string;
  invoice_pdf_url?: string;
  campaign_id: string;
  promotions?: {
    title: string;
    youtube_video_url: string;
  } | null;
}

interface BillingSectionProps {
  userId?: string;
}

const BillingSection = ({ userId }: BillingSectionProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          promotions!campaign_id (
            title,
            youtube_video_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayments((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payment history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [userId]);

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: "bg-green-100 text-green-800 border-green-300",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      failed: "bg-red-100 text-red-800 border-red-300",
    };

    return (
      <Badge className={`${styles[status as keyof typeof styles] || styles.pending} px-2 py-1 text-xs`}>
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

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const handleInvoiceRequest = async () => {
    try {
      // Get user profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      const { error } = await supabase
        .from('notifications')
        .insert({
          title: 'Invoice Request',
          message: `User ${profile?.full_name || profile?.email || 'Unknown'} has requested invoices for their payment history`,
          type: 'invoice_request'
        });

      if (error) throw error;

      // Send email to support
      const { error: emailError } = await supabase.functions.invoke('send-support-email', {
        body: {
          userEmail: profile?.email,
          userName: profile?.full_name || profile?.email,
          subject: 'Invoice Request',
          message: 'User has requested invoices for their payment history',
          requestType: 'invoice_request'
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
      }

      toast({
        title: 'Request Sent',
        description: 'Your invoice request has been sent to the admin team',
      });
    } catch (error) {
      console.error('Error requesting invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invoice request',
        variant: 'destructive',
      });
    }
  };

  const totalSpent = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-lg font-display text-gray-600">Loading payment history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              Across {payments.filter(p => p.status === 'completed').length} campaigns
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">
              All payment records
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Payment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.length > 0 ? formatAmount(payments[0].amount) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {payments.length > 0 ? formatDate(payments[0].created_at) : 'No payments yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments yet</h3>
              <p className="text-gray-600">
                Your payment history will appear here once you create and pay for campaigns.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                     <h4 className="font-semibold text-gray-900">
                        {payment.promotions?.title || payment.campaign_title || 'Campaign Payment'}
                     </h4>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatAmount(payment.amount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(payment.created_at)}
                      </span>
                    </div>
                  </div>

                   <div className="flex items-center gap-2">
                     {payment.invoice_url && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => window.open(payment.invoice_url, '_blank')}
                         className="flex items-center gap-1"
                       >
                         <Eye className="h-3 w-3" />
                         View Invoice
                       </Button>
                     )}
                     {payment.invoice_pdf_url && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => window.open(payment.invoice_pdf_url, '_blank')}
                         className="flex items-center gap-1"
                       >
                         <Download className="h-3 w-3" />
                         Download PDF
                       </Button>
                     )}
                   </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Invoice Request Button */}
      <Button
        onClick={handleInvoiceRequest}
        className="fixed bottom-6 right-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 z-50 bg-primary hover:bg-primary/90"
        title="Request Invoice"
      >
        <Download className="w-5 h-5 mr-2" />
        Request Invoice
      </Button>

      <div className="mt-6 pt-4 border-t">
        <p className="text-sm text-muted-foreground mb-3">
          Have questions about billing, invoices, or need help with payments?
        </p>
        <RequestButton
          userId={userId}
          variant="inline"
          requestType="billing"
          className=""
        />
      </div>
    </div>
  );
};

export default BillingSection;