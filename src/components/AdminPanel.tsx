
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import YouTubeThumbnail from "@/components/YouTubeThumbnail";

const AdminPanel = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailToPromote, setEmailToPromote] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch all promotions including drafted ones
      const { data: promotionsData, error: promotionsError } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });

      if (promotionsError) throw promotionsError;

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

      // Fetch email subscriptions
      const { data: subscribersData, error: subscribersError } = await supabase
        .from("email_subscriptions")
        .select("*")
        .order("subscribed_at", { ascending: false });

      if (subscribersError) throw subscribersError;

      // Fetch contact messages
      const { data: contactData, error: contactError } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (contactError) throw contactError;

      setCampaigns(promotionsData || []);
      setPayments(paymentsData || []);
      setUsers(usersData || []);
      setSubscribers(subscribersData || []);
      setContactMessages(contactData || []);
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
      fetchAdminData();
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
            <CardTitle>Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{subscribers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{contactMessages.length}</div>
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

      {/* Email Subscribers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Email Subscribers</CardTitle>
          <CardDescription>Newsletter subscribers list</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Subscribed Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell>{subscriber.email}</TableCell>
                  <TableCell>{new Date(subscriber.subscribed_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contact Messages Section */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Form Submissions</CardTitle>
          <CardDescription>Messages from contact form</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactMessages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>{message.full_name}</TableCell>
                  <TableCell>{message.email}</TableCell>
                  <TableCell>{message.subject || "No subject"}</TableCell>
                  <TableCell className="max-w-xs truncate">{message.message}</TableCell>
                  <TableCell>{new Date(message.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                    {campaign.youtube_video_url && (
                      <YouTubeThumbnail 
                        videoUrl={campaign.youtube_video_url} 
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
                  {campaign.youtube_video_url && (
                    <YouTubeThumbnail 
                      videoUrl={campaign.youtube_video_url} 
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
