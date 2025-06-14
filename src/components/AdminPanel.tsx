
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import YouTubeThumbnail from "@/components/YouTubeThumbnail";

const AdminPanel = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailToPromote, setEmailToPromote] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch all campaigns including drafted ones
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      // Fetch all payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch all user profiles
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      setCampaigns(campaignsData || []);
      setPayments(paymentsData || []);
      setUsers(usersData || []);
    } catch (error: any) {
      console.error("Error fetching admin data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const makeUserAdmin = async () => {
    if (!emailToPromote.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('make_user_admin', {
        user_email: emailToPromote
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${emailToPromote} has been promoted to admin`,
      });

      setEmailToPromote("");
      fetchAdminData(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-100 text-gray-800 border-gray-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      active: "bg-green-100 text-green-800 border-green-200",
      completed: "bg-blue-100 text-blue-800 border-blue-200",
      paused: "bg-gray-100 text-gray-800 border-gray-200"
    };

    return (
      <Badge className={`${styles[status as keyof typeof styles]} text-xs`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Separate campaigns by status
  const draftedCampaigns = campaigns.filter(c => c.status === 'draft');
  const activeCampaigns = campaigns.filter(c => c.status !== 'draft');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      {/* Make User Admin Section */}
      <Card>
        <CardHeader>
          <CardTitle>Promote User to Admin</CardTitle>
          <CardDescription>
            Enter an email address to grant admin privileges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={emailToPromote}
                onChange={(e) => setEmailToPromote(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={makeUserAdmin}>
                Make Admin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drafted Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">{draftedCampaigns.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Drafted Campaigns Section */}
      {draftedCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Drafted Campaigns</CardTitle>
            <CardDescription>Campaigns that are saved as drafts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {draftedCampaigns.map((campaign) => (
                <div key={campaign.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {campaign.video_url && (
                      <YouTubeThumbnail 
                        videoUrl={campaign.video_url} 
                        size="sm"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold">{campaign.title}</h3>
                      <p className="text-sm text-gray-600">
                        Target: {campaign.target_views?.toLocaleString()} views | Budget: ${campaign.budget}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(campaign.status)}
                        <span className="text-xs text-gray-500">
                          User ID: {campaign.user_id}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Active Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Active Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeCampaigns.slice(0, 5).map((campaign) => (
              <div key={campaign.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {campaign.video_url && (
                    <YouTubeThumbnail 
                      videoUrl={campaign.video_url} 
                      size="sm"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{campaign.title}</h3>
                    <p className="text-sm text-gray-600">
                      Target: {campaign.target_views?.toLocaleString()} views | Budget: ${campaign.budget}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(campaign.status)}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(campaign.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <p className="font-semibold">${payment.amount}</p>
                  <p className="text-sm text-gray-600">Campaign ID: {payment.campaign_id}</p>
                  <p className="text-sm text-gray-500">Status: {payment.status}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(payment.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
