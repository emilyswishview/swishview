
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Search, Download, Eye, DollarSign, Edit2, Check, X } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

interface Payment {
  id: string;
  campaign_id: string;
  user_id: string;
  amount: number;
  status: PaymentStatus;
  stripe_payment_intent_id: string;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    full_name: string;
  };
  campaign?: {
    title: string;
    youtube_video_url: string;
  };
}

interface RevenueData {
  date: string;
  revenue: number;
}

const PaymentsSection = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editingStatus, setEditingStatus] = useState<{[key: string]: boolean}>({});
  const [editingAmount, setEditingAmount] = useState<{[key: string]: boolean}>({});
  const [editedAmounts, setEditedAmounts] = useState<{[key: string]: string}>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter]);

  const fetchPayments = async () => {
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (profilesError) throw profilesError;

      const { data: promotionsData, error: promotionsError } = await supabase
        .from("promotions")
        .select("id, title, youtube_video_url");

      if (promotionsError) throw promotionsError;

      const profilesMap = profilesData.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const promotionsMap = promotionsData?.reduce((acc, promotion) => {
        acc[promotion.id] = promotion;
        return acc;
      }, {} as Record<string, any>);

      const paymentsWithDetails = paymentsData.map(payment => ({
        ...payment,
        user: profilesMap[payment.user_id],
        campaign: promotionsMap[payment.campaign_id]
      }));

      setPayments(paymentsWithDetails);
      generateRevenueData(paymentsWithDetails);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRevenueData = (paymentsData: Payment[]) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return startOfDay(date);
    });

    const revenueByDate = last30Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayRevenue = paymentsData
        .filter(payment => 
          payment.status === 'completed' && 
          format(new Date(payment.created_at), 'yyyy-MM-dd') === dateStr
        )
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

      return {
        date: format(date, 'MMM dd'),
        revenue: dayRevenue
      };
    });

    setRevenueData(revenueByDate);
  };

  const filterPayments = () => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.campaign?.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      setEditingStatus({...editingStatus, [paymentId]: true});
      
      const { error } = await supabase
        .from("payments")
        .update({ 
          status: newStatus as PaymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });

      setPayments(payments.map(payment => 
        payment.id === paymentId 
          ? { ...payment, status: newStatus as PaymentStatus, updated_at: new Date().toISOString() }
          : payment
      ));
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    } finally {
      setEditingStatus({...editingStatus, [paymentId]: false});
    }
  };

  const updatePaymentAmount = async (paymentId: string, newAmount: string) => {
    try {
      const amount = parseFloat(newAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid amount",
          variant: "destructive",
        });
        return;
      }

      setEditingAmount({...editingAmount, [paymentId]: true});
      
      const { error } = await supabase
        .from("payments")
        .update({ 
          amount: amount,
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment amount updated successfully",
      });

      setPayments(payments.map(payment => 
        payment.id === paymentId 
          ? { ...payment, amount: amount, updated_at: new Date().toISOString() }
          : payment
      ));

      setEditedAmounts({...editedAmounts, [paymentId]: ""});
      setEditingAmount({...editingAmount, [paymentId]: false});
    } catch (error) {
      console.error("Error updating payment amount:", error);
      toast({
        title: "Error",
        description: "Failed to update payment amount",
        variant: "destructive",
      });
    } finally {
      setEditingAmount({...editingAmount, [paymentId]: false});
    }
  };

  const cancelAmountEdit = (paymentId: string) => {
    setEditedAmounts({...editedAmounts, [paymentId]: ""});
    setEditingAmount({...editingAmount, [paymentId]: false});
  };

  const startAmountEdit = (paymentId: string, currentAmount: number) => {
    setEditedAmounts({...editedAmounts, [paymentId]: currentAmount.toString()});
    setEditingAmount({...editingAmount, [paymentId]: true});
  };

  const getYouTubeVideoTitle = (url: string) => {
    if (!url) return "N/A";
    
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoId) return "Invalid YouTube URL";
    
    return `Video ID: ${videoId[1]}`;
  };

  const exportToCSV = () => {
    const headers = ["User Email", "Campaign Title", "YouTube Video", "Amount", "Status", "Payment Date", "Payment ID"];
    const csvContent = [
      headers.join(","),
      ...filteredPayments.map(payment =>
        [
          payment.user?.email || "Unknown",
          payment.campaign?.title || "Unknown",
          getYouTubeVideoTitle(payment.campaign?.youtube_video_url || ""),
          payment.amount,
          payment.status,
          format(new Date(payment.created_at), "yyyy-MM-dd HH:mm:ss"),
          payment.stripe_payment_intent_id || payment.id
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-white";
      case "failed":
        return "bg-red-500 text-white";
      case "refunded":
        return "bg-orange-500 text-white";
      case "pending":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--primary))",
    },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium font-display text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display text-gray-900">${totalRevenue.toFixed(2)}</div>
            <p className="text-sm font-display text-gray-500 mt-1">From completed payments</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">Revenue Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="var(--color-revenue)" 
                    strokeWidth={2}
                    dot={{ fill: "var(--color-revenue)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-display">Payment Management</CardTitle>
              <CardDescription className="font-display">Manage all payment transactions and their statuses</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="rounded-full">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by user email, name, or campaign..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-full border-gray-200 focus:border-orange-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="font-display">User</TableHead>
                  <TableHead className="font-display">Campaign Title</TableHead>
                  <TableHead className="font-display">YouTube Video</TableHead>
                  <TableHead className="font-display">Amount</TableHead>
                  <TableHead className="font-display">Status</TableHead>
                  <TableHead className="font-display">Date</TableHead>
                  <TableHead className="font-display">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500 font-display">
                      No payments found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-gray-50/50 transition-colors group">
                      <TableCell>
                        <div className="font-medium font-display">{payment.user?.full_name || "Unknown"}</div>
                        <div className="text-sm text-gray-500 font-display">{payment.user?.email || "Unknown"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium font-display max-w-[200px] truncate" title={payment.campaign?.title || "Unknown Campaign"}>
                          {payment.campaign?.title || "Unknown Campaign"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-display max-w-[150px] truncate" title={getYouTubeVideoTitle(payment.campaign?.youtube_video_url || "")}>
                          {getYouTubeVideoTitle(payment.campaign?.youtube_video_url || "")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {editingAmount[payment.id] ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={editedAmounts[payment.id] || ""}
                                onChange={(e) => setEditedAmounts({...editedAmounts, [payment.id]: e.target.value})}
                                className="w-20 h-8 text-sm"
                                placeholder="Amount"
                              />
{/*                               <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updatePaymentAmount(payment.id, editedAmounts[payment.id])}
                                className="h-8 w-8 p-0"
                                disabled={editingAmount[payment.id]}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button> */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const value = editedAmounts[payment.id];
                                  if (value && parseFloat(value) > 0) {
                                    updatePaymentAmount(payment.id, value);
                                  } else {
                                    toast({
                                      title: "Error",
                                      description: "Please enter a valid amount",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="h-8 w-8 p-0"
                                disabled={editingAmount[payment.id]}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelAmountEdit(payment.id)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium font-display">${payment.amount}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startAmountEdit(payment.id, payment.amount)}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={payment.status}
                          onValueChange={(value) => updatePaymentStatus(payment.id, value)}
                          disabled={editingStatus[payment.id]}
                        >
                          <SelectTrigger className="w-32 h-8 rounded-full">
                            <Badge className={`${getStatusBadgeColor(payment.status)} rounded-full border-0`}>
                              {payment.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm font-display">
                        <div>{format(new Date(payment.created_at), "MMM dd, yyyy HH:mm")}</div>
                        {payment.updated_at !== payment.created_at && (
                          <div className="text-xs text-gray-500">
                            Updated: {format(new Date(payment.updated_at), "MMM dd, HH:mm")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPayment(payment)}
                              className="rounded-full hover:bg-orange-50 hover:border-orange-200"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 font-display">
                                <DollarSign className="h-5 w-5" />
                                Payment Details
                              </DialogTitle>
                              <DialogDescription className="font-display">
                                Complete payment information
                              </DialogDescription>
                            </DialogHeader>
                            {selectedPayment && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold text-sm text-gray-600 font-display">Payment ID</h4>
                                    <p className="font-mono text-sm">{selectedPayment.id}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm text-gray-600 font-display">Amount</h4>
                                    <p className="font-medium text-lg font-display">${selectedPayment.amount}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm text-gray-600 font-display">Status</h4>
                                    <Badge className={getStatusBadgeColor(selectedPayment.status)}>
                                      {selectedPayment.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm text-gray-600 font-display">Date</h4>
                                    <p className="font-medium font-display">
                                      {format(new Date(selectedPayment.created_at), "PPpp")}
                                    </p>
                                  </div>
                                  <div className="col-span-2">
                                    <h4 className="font-semibold text-sm text-gray-600 font-display">User</h4>
                                    <p className="font-medium font-display">{selectedPayment.user?.full_name || "Unknown"}</p>
                                    <p className="text-sm text-gray-500 font-display">{selectedPayment.user?.email || "Unknown"}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <h4 className="font-semibold text-sm text-gray-600 font-display">Campaign</h4>
                                    <p className="font-medium font-display">{selectedPayment.campaign?.title || "Unknown Campaign"}</p>
                                    <p className="text-sm text-gray-500 font-display">{getYouTubeVideoTitle(selectedPayment.campaign?.youtube_video_url || "")}</p>
                                  </div>
                                  {selectedPayment.stripe_payment_intent_id && (
                                    <div className="col-span-2">
                                      <h4 className="font-semibold text-sm text-gray-600 font-display">Stripe Payment Intent</h4>
                                      <p className="font-mono text-sm">{selectedPayment.stripe_payment_intent_id}</p>
                                    </div>
                                  )}
                                  {selectedPayment.updated_at !== selectedPayment.created_at && (
                                    <div className="col-span-2">
                                      <h4 className="font-semibold text-sm text-gray-600 font-display">Last Updated</h4>
                                      <p className="font-medium font-display">
                                        {format(new Date(selectedPayment.updated_at), "PPpp")}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsSection;
