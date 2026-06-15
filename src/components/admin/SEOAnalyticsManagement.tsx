import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RecentActivityMessaging from './RecentActivityMessaging';
import { 
  BarChart3,
  Save,
  Lock,
  Unlock,
  Calendar
} from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface SEOAnalytics {
  id?: string;
  user_id: string;
  channel_url?: string;
  seo_access_enabled: boolean;
  campaign_start_date?: string;
}

const SEOAnalyticsManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [analytics, setAnalytics] = useState<SEOAnalytics>({
    user_id: '',
    channel_url: '',
    seo_access_enabled: false,
    campaign_start_date: undefined
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserAnalytics(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAnalytics = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seo_analytics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setAnalytics(data);
      } else {
        setAnalytics({
          user_id: userId,
          channel_url: '',
          seo_access_enabled: false,
          campaign_start_date: undefined
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch user analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAnalytics = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user first",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      const analyticsData = {
        ...analytics,
        user_id: selectedUserId,
        updated_by: (await supabase.auth.getUser()).data.user?.id
      };

      let error;
      if (analytics.id) {
        const result = await supabase
          .from('seo_analytics')
          .update(analyticsData)
          .eq('id', analytics.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('seo_analytics')
          .insert(analyticsData)
          .select()
          .single();
        
        if (result.data) {
          setAnalytics({ ...analyticsData, id: result.data.id });
        }
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: "SEO settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save analytics",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <BarChart3 className="w-5 h-5 text-primary" />
            SEO Analytics Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Access List */}
          <div className="space-y-4">
            <Label className="text-base font-semibold font-display">Users with SEO Access</Label>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
              {(() => {
                const [usersWithAccess, setUsersWithAccess] = useState<{id: string, email: string, full_name: string}[]>([]);
                
                useEffect(() => {
                  const fetchUsersWithAccess = async () => {
                    const { data } = await supabase
                      .from('seo_analytics')
                      .select(`
                        user_id,
                        profiles:user_id (
                          id,
                          email,
                          full_name
                        )
                      `)
                      .eq('seo_access_enabled', true);
                    
                    if (data) {
                      const usersWithSEO = data
                        .filter(item => item.profiles)
                        .map(item => item.profiles)
                        .filter(Boolean);
                      setUsersWithAccess(usersWithSEO as any[]);
                    }
                  };
                  
                  fetchUsersWithAccess();
                }, []);

                return usersWithAccess.length > 0 ? (
                  <div className="grid gap-2">
                    {usersWithAccess.map((user) => (
                      <Button
                        key={user.id}
                        variant="ghost"
                        className="justify-start h-auto p-2 text-left font-display"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{user.full_name || user.email}</div>
                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm font-display">
                    No users with SEO access yet
                  </div>
                );
              })()}
            </div>
          </div>

          <Separator />

          {/* User Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold font-display">Select User</Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search users by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2 font-display"
                />
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="font-display">
                    <SelectValue placeholder="Choose a user to manage" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center justify-between w-full font-display">
                          <span>{user.full_name || user.email}</span>
                          <span className="text-sm text-muted-foreground ml-2">{user.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedUser && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-display">{selectedUser.email}</Badge>
                </div>
              )}
            </div>
          </div>

          {selectedUserId && (
            <>
              <Separator />
              
              {/* Access Control */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {analytics.seo_access_enabled ? (
                    <Unlock className="w-5 h-5 text-green-600" />
                  ) : (
                    <Lock className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <Label className="font-medium font-display">SEO Dashboard Access</Label>
                    <p className="text-sm text-muted-foreground font-display">
                      Grant access to view SEO analytics dashboard
                    </p>
                  </div>
                </div>
                <Switch
                  checked={analytics.seo_access_enabled}
                  onCheckedChange={(checked) => 
                    setAnalytics({ ...analytics, seo_access_enabled: checked })
                  }
                />
              </div>

              <Separator />

              {/* Campaign Start Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <Label htmlFor="campaign_start_date" className="font-display">Campaign Start Date</Label>
                </div>
                <Input
                  id="campaign_start_date"
                  type="date"
                  value={analytics.campaign_start_date || ''}
                  onChange={(e) =>
                    setAnalytics({ ...analytics, campaign_start_date: e.target.value })
                  }
                  className="font-display"
                />
                <p className="text-sm text-muted-foreground font-display">
                  Set the baseline date for calculating growth metrics from Google Analytics
                </p>
              </div>

              <Separator />

              {/* Channel URL */}
              <div className="space-y-2">
                <Label htmlFor="channel_url" className="font-display">YouTube Channel URL</Label>
                <Input
                  id="channel_url"
                  type="url"
                  placeholder="https://www.youtube.com/@channelname"
                  value={analytics.channel_url || ''}
                  onChange={(e) =>
                    setAnalytics({ ...analytics, channel_url: e.target.value })
                  }
                  className="font-display"
                />
              </div>

              {/* Save Button */}
              <Button
                onClick={saveAnalytics}
                disabled={saving || !selectedUserId}
                className="w-full font-display"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save SEO Analytics Settings'}
              </Button>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-display">
                  <strong>How it works:</strong> When you enable SEO access and set a start date, the user will be able to connect their Google account and view real YouTube analytics from the specified start date onwards.
                </p>
              </div>

              {/* Recent Activity Messaging */}
              {analytics.seo_access_enabled && selectedUser && (
                <RecentActivityMessaging 
                  userId={selectedUserId} 
                  userEmail={selectedUser.email}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SEOAnalyticsManagement;
