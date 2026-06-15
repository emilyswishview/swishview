import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Globe, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface SEOPurchase {
  id: string;
  user_id: string;
  status: string;
  amount: number;
  channel_url?: string;
  created_at: string;
  seo_plans: {
    name: string;
    duration_months: number;
  };
  user?: {
    email: string;
    full_name: string;
  };
}

const SEOSection = () => {
  const [seoPurchases, setSeoPurchases] = useState<SEOPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<SEOPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingStatus, setEditingStatus] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchSEOPurchases();
  }, []);

  useEffect(() => {
    filterPurchases();
  }, [seoPurchases, searchTerm, statusFilter]);

  const fetchSEOPurchases = async () => {
    try {
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("seo_purchases")
        .select(`
          *,
          seo_plans (*)
        `)
        .order("created_at", { ascending: false });

      if (purchasesError) throw purchasesError;

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (profilesError) throw profilesError;

      const profilesMap = profilesData.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const purchasesWithUsers = purchasesData.map(purchase => ({
        ...purchase,
        user: profilesMap[purchase.user_id]
      }));

      setSeoPurchases(purchasesWithUsers);
    } catch (error) {
      console.error("Error fetching SEO purchases:", error);
      toast({
        title: "Error",
        description: "Failed to fetch SEO purchases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPurchases = () => {
    let filtered = seoPurchases;

    if (searchTerm) {
      filtered = filtered.filter(purchase =>
        purchase.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.seo_plans.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(purchase => purchase.status === statusFilter);
    }

    setFilteredPurchases(filtered);
  };

  const updatePurchaseStatus = async (purchaseId: string, newStatus: string) => {
    try {
      setEditingStatus({...editingStatus, [purchaseId]: true});
      
      const { error } = await supabase
        .from("seo_purchases")
        .update({ status: newStatus })
        .eq("id", purchaseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "SEO purchase status updated successfully",
      });

      // Update local state
      setSeoPurchases(purchases => purchases.map(purchase => 
        purchase.id === purchaseId 
          ? { ...purchase, status: newStatus }
          : purchase
      ));
    } catch (error) {
      console.error("Error updating SEO purchase status:", error);
      toast({
        title: "Error",
        description: "Failed to update SEO purchase status",
        variant: "destructive",
      });
    } finally {
      setEditingStatus({...editingStatus, [purchaseId]: false});
    }
  };

  const exportToCSV = () => {
    const headers = ["Plan Name", "User Email", "Status", "Amount", "Channel URL", "Created Date"];
    const csvContent = [
      headers.join(","),
      ...filteredPurchases.map(purchase =>
        [
          purchase.seo_plans.name,
          purchase.user?.email || "Unknown",
          purchase.status,
          purchase.amount,
          purchase.channel_url || "N/A",
          format(new Date(purchase.created_at), "yyyy-MM-dd HH:mm:ss")
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seo_purchases.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-white";
      case "pending":
        return "bg-yellow-500 text-white";
      case "cancelled":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
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
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                SEO Service Management
              </CardTitle>
              <CardDescription className="font-display">Manage and monitor all SEO service purchases</CardDescription>
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
                placeholder="Search SEO purchases, plans, or user emails..."
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
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="font-display">Plan</TableHead>
                  <TableHead className="font-display">User</TableHead>
                  <TableHead className="font-display">Status</TableHead>
                  <TableHead className="font-display">Amount</TableHead>
                  <TableHead className="font-display">Channel</TableHead>
                  <TableHead className="font-display">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500 font-display">
                      No SEO purchases found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="font-medium font-display">{purchase.seo_plans.name}</div>
                        <div className="text-sm text-gray-500 font-display">
                          {purchase.seo_plans.duration_months} months
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium font-display">{purchase.user?.full_name || "Unknown"}</div>
                        <div className="text-sm text-gray-500 font-display">{purchase.user?.email || "Unknown"}</div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={purchase.status}
                          onValueChange={(value) => updatePurchaseStatus(purchase.id, value)}
                          disabled={editingStatus[purchase.id]}
                        >
                          <SelectTrigger className="w-32 h-8 rounded-full">
                            <Badge className={`${getStatusBadgeColor(purchase.status)} rounded-full border-0`}>
                              {purchase.status === 'completed' ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : purchase.status === 'cancelled' ? (
                                <XCircle className="w-3 h-3 mr-1" />
                              ) : null}
                              {purchase.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-display font-medium">${purchase.amount}</TableCell>
                      <TableCell>
                        {purchase.channel_url ? (
                          <a 
                            href={purchase.channel_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-display truncate max-w-32 block"
                          >
                            View Channel
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm font-display">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="font-display text-sm">
                        {format(new Date(purchase.created_at), "MMM dd, yyyy")}
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

export default SEOSection;