
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Eye, User, Mail, Calendar, Activity, Plus, TrendingUp, BarChart3, PenSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import CampaignForm from "@/components/CampaignForm";
import UserAnalyticsModal from "./UserAnalyticsModal";
import ChannelAnalytics from "@/components/ChannelAnalytics";
import BlogsSection from "./BlogsSection";
import RecentBlogsPreview from "@/components/RecentBlogsPreview";
import RecentUserActivity from "./RecentUserActivity";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  campaignCount?: number;
  totalSpent?: number;
  channel_analytics_access?: boolean;
  google_sub?: string | null;
  authMethod?: 'google' | 'email';
}

const UsersSection = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignTargetUser, setCampaignTargetUser] = useState<UserProfile | null>(null);
  const [showChannelAnalytics, setShowChannelAnalytics] = useState(false);
  const [analyticsUser, setAnalyticsUser] = useState<UserProfile | null>(null);
  const [showBlogsForUser, setShowBlogsForUser] = useState(false);
  const [blogsTargetUser, setBlogsTargetUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // Fetch campaign counts and spending for each user
      const { data: promotionsData, error: promotionsError } = await supabase
        .from("promotions")
        .select("user_id, budget");

      if (promotionsError) throw promotionsError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("user_id, amount")
        .eq("status", "completed");

      if (paymentsError) throw paymentsError;

      // Calculate stats for each user
      const usersWithStats = usersData.map(user => {
        const userPromotions = promotionsData.filter(c => c.user_id === user.id);
        const userPayments = paymentsData.filter(p => p.user_id === user.id);
        
        return {
          ...user,
          campaignCount: userPromotions.length,
          totalSpent: userPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
          authMethod: (user as any).google_sub ? 'google' as const : 'email' as const,
        };
      });

      setUsers(usersWithStats);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const exportToCSV = () => {
    const headers = ["Full Name", "Email", "Role", "Campaigns", "Total Spent", "Registration Date"];
    const csvContent = [
      headers.join(","),
      ...filteredUsers.map(user =>
        [
          user.full_name || "Not provided",
          user.email,
          user.role,
          user.campaignCount || 0,
          user.totalSpent || 0,
          format(new Date(user.created_at), "yyyy-MM-dd")
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "moderator":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleCreateCampaign = (user: UserProfile) => {
    setCampaignTargetUser(user);
    setShowCreateCampaign(true);
  };

  const handleCampaignSuccess = () => {
    setShowCreateCampaign(false);
    setCampaignTargetUser(null);
    fetchUsers(); // Refresh user data to update campaign counts
    toast({
      title: "Campaign Created",
      description: `Campaign created successfully for ${campaignTargetUser?.full_name || campaignTargetUser?.email}`,
    });
  };

  const handleCampaignCancel = () => {
    setShowCreateCampaign(false);
    setCampaignTargetUser(null);
  };

  const toggleChannelAnalyticsAccess = async (userId: string, currentAccess: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ channel_analytics_access: !currentAccess })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Channel analytics access ${!currentAccess ? 'enabled' : 'disabled'}`,
      });

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, channel_analytics_access: !currentAccess }
          : user
      ));
    } catch (error) {
      console.error("Error updating channel analytics access:", error);
      toast({
        title: "Error",
        description: "Failed to update channel analytics access",
        variant: "destructive",
      });
    }
  };

  const handleViewChannelAnalytics = (user: UserProfile) => {
    setAnalyticsUser(user);
    setShowChannelAnalytics(true);
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
    <div className="space-y-4 lg:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium font-display text-gray-600">Total Users</CardTitle>
            <User className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display text-gray-900">{users.length}</div>
            <p className="text-sm font-display text-gray-500 mt-1">Registered accounts</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium font-display text-gray-600">Active Users</CardTitle>
            <Activity className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display text-gray-900">
              {users.filter(u => (u.campaignCount || 0) > 0).length}
            </div>
            <p className="text-sm font-display text-gray-500 mt-1">Users with campaigns</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium font-display text-gray-600">Admin Users</CardTitle>
            <User className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display text-gray-900">
              {users.filter(u => u.role === 'admin').length}
            </div>
            <p className="text-sm font-display text-gray-500 mt-1">Administrative accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-display">User Management</CardTitle>
              <CardDescription className="font-display">View and manage all registered users</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="rounded-full">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-full border-gray-200 focus:border-orange-500"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48 rounded-full">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action key — explains what each icon in the Actions column does */}
          <div className="mb-4 p-3 rounded-lg bg-blue-50/60 border border-blue-100">
            <p className="text-xs font-semibold text-gray-700 mb-2 font-display">Action buttons guide:</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600">
              <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-orange-500" /> <strong>Details</strong> — full user info, campaigns & SEO</span>
              <span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-blue-600" /> <strong>Channel</strong> — channel growth, recent activity & blogs (same as user view)</span>
              <span className="flex items-center gap-1.5"><PenSquare className="h-3.5 w-3.5 text-purple-600" /> <strong>Blogs</strong> — manage blogs linked to this user's email</span>
              <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5 text-green-600" /> <strong>Campaign</strong> — create a new promotion for this user</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-display min-w-[200px]">User</TableHead>
                    <TableHead className="font-display hidden sm:table-cell">Role</TableHead>
                    <TableHead className="font-display hidden sm:table-cell">Auth</TableHead>
                    <TableHead className="font-display hidden md:table-cell">Campaigns</TableHead>
                    <TableHead className="font-display hidden md:table-cell">Total Spent</TableHead>
                    <TableHead className="font-display hidden lg:table-cell">Registered</TableHead>
                    <TableHead className="font-display">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500 font-display">
                      No users found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium font-display truncate">{user.full_name || "Not provided"}</div>
                            <div className="text-sm text-gray-500 font-display flex items-center gap-1">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            {/* Mobile-only additional info */}
                            <div className="sm:hidden mt-1 text-xs text-gray-400 space-y-1">
                              <div>Role: {user.role}</div>
                              <div>Campaigns: {user.campaignCount || 0} • Spent: ${(user.totalSpent || 0).toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={`${getRoleBadgeColor(user.role)} rounded-full`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className={`rounded-full text-xs ${user.authMethod === 'google' ? 'border-blue-300 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-600 bg-gray-50'}`}>
                          {user.authMethod === 'google' ? '🔵 Google' : '✉️ Email'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-display hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <Activity className="h-4 w-4 text-gray-400" />
                          {user.campaignCount || 0}
                        </div>
                      </TableCell>
                      <TableCell className="font-display font-medium hidden md:table-cell">
                        ${(user.totalSpent || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm font-display hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {format(new Date(user.created_at), "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                                className="rounded-full hover:bg-orange-50 hover:border-orange-200 gap-1.5"
                                title="View full user details, campaigns & SEO analytics"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden xl:inline text-xs font-medium">Details</span>
                              </Button>
                            </DialogTrigger>
                           <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                             <DialogHeader>
                               <DialogTitle className="flex items-center gap-2 font-display">
                                 <User className="h-5 w-5" />
                                 User Details - {selectedUser?.full_name || selectedUser?.email}
                               </DialogTitle>
                               <DialogDescription className="font-display">
                                 Complete analytics and information overview
                               </DialogDescription>
                             </DialogHeader>
                             {selectedUser && (
                               <div className="space-y-6">
                                 {/* Basic User Info */}
                                 <Card className="border-0 shadow-sm bg-muted/30">
                                   <CardContent className="p-4">
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                       <div>
                                         <h4 className="font-semibold text-sm text-gray-600 font-display">Full Name</h4>
                                         <p className="font-medium font-display">{selectedUser.full_name || "Not provided"}</p>
                                       </div>
                                       <div>
                                         <h4 className="font-semibold text-sm text-gray-600 font-display">Email</h4>
                                         <p className="font-medium font-display">{selectedUser.email}</p>
                                       </div>
                                       <div>
                                         <h4 className="font-semibold text-sm text-gray-600 font-display">Role</h4>
                                         <Badge className={getRoleBadgeColor(selectedUser.role)}>
                                           {selectedUser.role}
                                         </Badge>
                                       </div>
                                       <div>
                                         <h4 className="font-semibold text-sm text-gray-600 font-display">Registration</h4>
                                         <p className="font-medium font-display text-sm">
                                           {format(new Date(selectedUser.created_at), "MMM dd, yyyy")}
                                         </p>
                                       </div>
                                     </div>
                                   </CardContent>
                                 </Card>

                                  {/* Channel Analytics Access Toggle */}
                                  <Card className="border-0 shadow-sm bg-muted/30">
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <TrendingUp className="w-5 h-5 text-blue-600" />
                                          <div>
                                            <h4 className="font-semibold font-display">Channel Analytics Access</h4>
                                            <p className="text-sm text-muted-foreground">Enable user to view channel growth analytics</p>
                                          </div>
                                        </div>
                                        <Switch
                                          checked={selectedUser.channel_analytics_access || false}
                                          onCheckedChange={() => toggleChannelAnalyticsAccess(selectedUser.id, selectedUser.channel_analytics_access || false)}
                                        />
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Analytics Section */}
                                  <UserAnalyticsModal user={selectedUser} />
                               </div>
                             )}
                           </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewChannelAnalytics(user)}
                          className="rounded-full hover:bg-blue-50 hover:border-blue-200 text-blue-600 hover:text-blue-700 gap-1.5"
                          title="View channel growth analytics, recent activity & blogs preview (same view as user dashboard)"
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span className="hidden xl:inline text-xs font-medium">Channel</span>
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBlogsTargetUser(user);
                            setShowBlogsForUser(true);
                          }}
                          className="rounded-full hover:bg-purple-50 hover:border-purple-200 text-purple-600 hover:text-purple-700 gap-1.5"
                          title="View / manage blogs for this user (matched by email)"
                        >
                          <PenSquare className="h-4 w-4" />
                          <span className="hidden xl:inline text-xs font-medium">Blogs</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateCampaign(user)}
                          className="rounded-full hover:bg-green-50 hover:border-green-200 text-green-600 hover:text-green-700 gap-1.5"
                          title="Create a new video promotion campaign on behalf of this user"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="hidden xl:inline text-xs font-medium">Campaign</span>
                        </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Campaign Modal */}
      <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Plus className="h-5 w-5" />
              Create Campaign for {campaignTargetUser?.full_name || campaignTargetUser?.email}
            </DialogTitle>
            <DialogDescription className="font-display">
              Create a new campaign on behalf of this user. The campaign will appear in their dashboard.
            </DialogDescription>
          </DialogHeader>
          {campaignTargetUser && (
            <CampaignForm
              onSuccess={handleCampaignSuccess}
              onCancel={handleCampaignCancel}
              targetUserId={campaignTargetUser.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Channel Analytics Modal — mirrors user dashboard "Channel" tab */}
      <Dialog open={showChannelAnalytics} onOpenChange={setShowChannelAnalytics}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <BarChart3 className="h-5 w-5" />
              Channel Analytics — {analyticsUser?.full_name || analyticsUser?.email}
            </DialogTitle>
            <DialogDescription className="font-display">
              Exact same view this user sees in their dashboard: channel growth analytics, recent activity & latest blogs preview.
            </DialogDescription>
          </DialogHeader>
          {analyticsUser && (
            <div className="space-y-6">
              <ChannelAnalytics userId={analyticsUser.id} />

              {/* Recent Activity — user's latest campaigns (mirrors what user sees) */}
              <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-display">
                    <Activity className="h-5 w-5 text-orange-500" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest campaigns this user has launched</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentUserActivity userId={analyticsUser.id} />
                </CardContent>
              </Card>

              {/* Blogs preview — same widget shown at bottom of user's Channel tab */}
              <RecentBlogsPreview userEmail={analyticsUser.email} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Blogs for User Modal */}
      <Dialog open={showBlogsForUser} onOpenChange={setShowBlogsForUser}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <PenSquare className="h-5 w-5" />
              Blogs for {blogsTargetUser?.full_name || blogsTargetUser?.email}
            </DialogTitle>
            <DialogDescription className="font-display">
              Showing blog creators matched to this user's email ({blogsTargetUser?.email}). Add a creator with this email to start writing blogs that show up in the user's dashboard.
            </DialogDescription>
          </DialogHeader>
          {blogsTargetUser && (
            <BlogsSection initialFilterEmail={blogsTargetUser.email} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersSection;
