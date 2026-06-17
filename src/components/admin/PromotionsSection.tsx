import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Eye, Video, ExternalLink, Youtube, Users } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type PromotionStatus = Database["public"]["Enums"]["promotion_status"];

interface Promotion {
  id: string;
  title: string;
  user_id: string;
  status: PromotionStatus;
  budget: number;
  target_views: number;
  current_views: number;
  youtube_video_url: string;
  target_audience: string;
  campaign_duration: number;
  created_at: string;
  promotion_type: 'video' | 'channel';
  channel_url?: string;
  account_manager?: string;
  channel_total_subscribers?: number;
  channel_total_views?: number;
  user?: {
    email: string;
    full_name: string;
  };
  payment_status?: 'paid' | 'not_paid';
}

const PromotionsSection = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [editingStatus, setEditingStatus] = useState<{[key: string]: boolean}>({});
  const [editingPayment, setEditingPayment] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPromotions();
  }, []);

  useEffect(() => {
    filterPromotions();
  }, [promotions, searchTerm, statusFilter]);

  const fetchPromotions = async () => {
    try {
      const { data: promotionsData, error: promotionsError } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });

      if (promotionsError) throw promotionsError;

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (profilesError) throw profilesError;

      // Fetch payment statuses for promotions
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("campaign_id, status")
        .eq("status", "completed");

      if (paymentsError) throw paymentsError;

      const profilesMap = profilesData.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const paymentsMap = paymentsData.reduce((acc, payment) => {
        acc[payment.campaign_id] = 'paid';
        return acc;
      }, {} as Record<string, 'paid'>);

      const promotionsWithUsers = promotionsData.map(promotion => ({
        ...promotion,
        user: profilesMap[promotion.user_id],
        payment_status: paymentsMap[promotion.id] || 'not_paid' as const
      }));

      setPromotions(promotionsWithUsers as any);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch promotions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPromotions = () => {
    let filtered = promotions;

    if (searchTerm) {
      filtered = filtered.filter(promotion =>
        promotion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promotion.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promotion.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(promotion => promotion.status === statusFilter);
    }

    setFilteredPromotions(filtered);
  };

  const updatePromotionStatus = async (promotionId: string, newStatus: string) => {
    try {
      setEditingStatus({...editingStatus, [promotionId]: true});
      
      const { error } = await supabase
        .from("promotions")
        .update({ status: newStatus as PromotionStatus })
        .eq("id", promotionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promotion status updated successfully",
      });

      // Update local state
      setPromotions(promotions.map(promotion => 
        promotion.id === promotionId 
          ? { ...promotion, status: newStatus as PromotionStatus }
          : promotion
      ));
    } catch (error) {
      console.error("Error updating promotion status:", error);
      toast({
        title: "Error",
        description: "Failed to update promotion status",
        variant: "destructive",
      });
    } finally {
      setEditingStatus({...editingStatus, [promotionId]: false});
    }
  };

  const updatePaymentStatus = async (promotionId: string, newPaymentStatus: 'paid' | 'not_paid') => {
    try {
      setEditingPayment({...editingPayment, [promotionId]: true});
      
      const promotion = promotions.find(c => c.id === promotionId);
      if (!promotion) throw new Error("Promotion not found");

      if (newPaymentStatus === 'paid') {
        // Check if payment record already exists
        const { data: existingPayment, error: checkError } = await supabase
          .from("payments")
          .select("id")
          .eq("campaign_id", promotionId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingPayment) {
          // Update existing payment
          const { error: updateError } = await supabase
            .from("payments")
            .update({ status: 'completed' as const })
            .eq("campaign_id", promotionId);

          if (updateError) throw updateError;
        } else {
          // Create new payment record
          const { error: insertError } = await supabase
            .from("payments")
            .insert({
              campaign_id: promotionId,
              user_id: promotion.user_id,
              amount: promotion.budget,
              status: 'completed' as const,
            });

          if (insertError) throw insertError;
        }

        // Automatically set promotion status to active when payment is marked as paid
        const { error: promotionUpdateError } = await supabase
          .from("promotions")
          .update({ status: 'active' as PromotionStatus })
          .eq("id", promotionId);

        if (promotionUpdateError) throw promotionUpdateError;

        toast({
          title: "Success",
          description: "Payment marked as paid and promotion activated",
        });

        // Update local state for both payment and promotion status
        setPromotions(promotions.map(promotion => 
          promotion.id === promotionId 
            ? { ...promotion, payment_status: newPaymentStatus, status: 'active' as PromotionStatus }
            : promotion
        ));

      } else {
        // Delete payment record and set promotion back to pending
        const { error: deleteError } = await supabase
          .from("payments")
          .delete()
          .eq("campaign_id", promotionId);

        if (deleteError) throw deleteError;

        // Set promotion status back to pending when payment is removed
        const { error: promotionUpdateError } = await supabase
          .from("promotions")
          .update({ status: 'pending' as PromotionStatus })
          .eq("id", promotionId);

        if (promotionUpdateError) throw promotionUpdateError;

        toast({
          title: "Success",
          description: "Payment removed and promotion set to pending",
        });

        // Update local state for both payment and promotion status
        setPromotions(promotions.map(promotion => 
          promotion.id === promotionId 
            ? { ...promotion, payment_status: newPaymentStatus, status: 'pending' as PromotionStatus }
            : promotion
        ));
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    } finally {
      setEditingPayment({...editingPayment, [promotionId]: false});
    }
  };

  const exportToCSV = () => {
    const headers = ["Title", "Type", "User Email", "Status", "Payment Status", "Budget", "Target Views", "Current Views", "Account Manager", "Created Date"];
    const csvContent = [
      headers.join(","),
      ...filteredPromotions.map(promotion =>
        [
          promotion.title,
          promotion.promotion_type || 'video',
          promotion.user?.email || "Unknown",
          promotion.status,
          promotion.payment_status || "not_paid",
          promotion.budget,
          promotion.target_views,
          promotion.current_views || 0,
          promotion.account_manager || "Not assigned",
          format(new Date(promotion.created_at), "yyyy-MM-dd HH:mm:ss")
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "promotions.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500 text-white";
      case "completed":
        return "bg-blue-500 text-white";
      case "cancelled":
        return "bg-red-500 text-white";
      case "pending":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getPaymentStatusBadgeColor = (status: 'paid' | 'not_paid') => {
    return status === 'paid' ? "bg-green-500 text-white" : "bg-red-500 text-white";
  };

  const getPromotionTypeIcon = (type: 'video' | 'channel') => {
    return type === 'channel' ? <Youtube className="h-4 w-4" /> : <Video className="h-4 w-4" />;
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
      <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-display">Promotion Management</CardTitle>
              <CardDescription className="font-display">Manage and monitor all promotion requests</CardDescription>
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
                placeholder="Search promotions, titles, or user emails..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="font-display">Promotion</TableHead>
                  <TableHead className="font-display">Type</TableHead>
                  <TableHead className="font-display">User</TableHead>
                  <TableHead className="font-display">Status</TableHead>
                  <TableHead className="font-display">Payment</TableHead>
                  <TableHead className="font-display">Budget</TableHead>
                  <TableHead className="font-display">Views/Metrics</TableHead>
                  <TableHead className="font-display">Manager</TableHead>
                  <TableHead className="font-display">Created</TableHead>
                  <TableHead className="font-display">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPromotions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500 font-display">
                      No promotions found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPromotions.map((promotion) => (
                    <TableRow key={promotion.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="font-medium font-display">{promotion.title}</div>
                        <div className="text-sm text-gray-500 font-display truncate max-w-48">
                          {promotion.target_audience}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPromotionTypeIcon(promotion.promotion_type || 'video')}
                          <span className="capitalize font-display">
                            {promotion.promotion_type === 'channel' ? 'Channel' : 'Video'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium font-display">{promotion.user?.full_name || "Unknown"}</div>
                        <div className="text-sm text-gray-500 font-display">{promotion.user?.email || "Unknown"}</div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={promotion.status}
                          onValueChange={(value) => updatePromotionStatus(promotion.id, value)}
                          disabled={editingStatus[promotion.id]}
                        >
                          <SelectTrigger className="w-32 h-8 rounded-full">
                            <Badge className={`${getStatusBadgeColor(promotion.status)} rounded-full border-0`}>
                              {promotion.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={promotion.payment_status || 'not_paid'}
                          onValueChange={(value: 'paid' | 'not_paid') => updatePaymentStatus(promotion.id, value)}
                          disabled={editingPayment[promotion.id]}
                        >
                          <SelectTrigger className="w-32 h-8 rounded-full">
                            <Badge className={`${getPaymentStatusBadgeColor(promotion.payment_status || 'not_paid')} rounded-full border-0`}>
                              {promotion.payment_status === 'paid' ? 'Paid' : 'Not Paid'}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="not_paid">Not Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-display font-medium">${promotion.budget}</TableCell>
                      <TableCell>
                        {promotion.promotion_type === 'channel' ? (
                          <div className="text-sm font-display">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {promotion.channel_total_views?.toLocaleString() || '0'} views
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {promotion.channel_total_subscribers?.toLocaleString() || '0'} subs
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-display">
                            {promotion.current_views || 0} / {promotion.target_views?.toLocaleString()}
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(
                                    ((promotion.current_views || 0) / promotion.target_views) * 100,
                                    100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-display">
                        {promotion.account_manager || 'Not assigned'}
                      </TableCell>
                      <TableCell className="text-sm font-display">
                        {format(new Date(promotion.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full"
                                onClick={() => setSelectedPromotion(promotion)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="font-display">Promotion Details</DialogTitle>
                                <DialogDescription className="font-display">
                                  Complete information for this promotion
                                </DialogDescription>
                              </DialogHeader>
                              {selectedPromotion && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-semibold text-gray-600 font-display">Title</label>
                                      <p className="font-display">{selectedPromotion.title}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-semibold text-gray-600 font-display">Type</label>
                                      <p className="font-display capitalize">{selectedPromotion.promotion_type || 'video'}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-semibold text-gray-600 font-display">Status</label>
                                      <Badge className={`${getStatusBadgeColor(selectedPromotion.status)} rounded-full border-0 ml-2`}>
                                        {selectedPromotion.status}
                                      </Badge>
                                    </div>
                                    <div>
                                      <label className="text-sm font-semibold text-gray-600 font-display">Budget</label>
                                      <p className="font-display">${selectedPromotion.budget}</p>
                                    </div>
                                  </div>
                                  
                                  {selectedPromotion.youtube_video_url && (
                                    <div>
                                      <label className="text-sm font-semibold text-gray-600 font-display">YouTube URL</label>
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="font-display text-sm text-blue-600 truncate flex-1">
                                          {selectedPromotion.youtube_video_url}
                                        </p>
                                        <a 
                                          href={selectedPromotion.youtube_video_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800"
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                        </a>
                                      </div>
                                    </div>
                                  )}

                                  {selectedPromotion.channel_url && (
                                    <div>
                                      <label className="text-sm font-semibold text-gray-600 font-display">Channel URL</label>
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="font-display text-sm text-blue-600 truncate flex-1">
                                          {selectedPromotion.channel_url}
                                        </p>
                                        <a 
                                          href={selectedPromotion.channel_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800"
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {selectedPromotion.target_audience && (
                                    <div>
                                      <label className="text-sm font-semibold text-gray-600 font-display">Target Audience</label>
                                      <p className="font-display text-sm">{selectedPromotion.target_audience}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
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

export default PromotionsSection;