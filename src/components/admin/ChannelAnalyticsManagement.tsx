import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarIcon, Youtube, Save, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface User {
  id: string;
  email: string;
  full_name: string;
  channel_analytics_access: boolean;
  channel_url: string | null;
  channel_start_date: string | null;
}

const ChannelAnalyticsManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [channelUrl, setChannelUrl] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [accessEnabled, setAccessEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      const user = users.find(u => u.id === selectedUserId);
      setSelectedUser(user || null);
      if (user) {
        setChannelUrl(user.channel_url || '');
        setStartDate(user.channel_start_date ? new Date(user.channel_start_date) : undefined);
        setAccessEnabled(user.channel_analytics_access);
      }
    }
  }, [selectedUserId, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, channel_analytics_access, channel_url, channel_start_date')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user',
        variant: 'destructive',
      });
      return;
    }

    if (accessEnabled && (!channelUrl || !startDate)) {
      toast({
        title: 'Error',
        description: 'Channel URL and start date are required when enabling access',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          channel_analytics_access: accessEnabled,
          channel_url: accessEnabled ? channelUrl : null,
          channel_start_date: accessEnabled && startDate ? format(startDate, 'yyyy-MM-dd') : null,
        })
        .eq('id', selectedUserId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Channel analytics settings updated successfully',
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Channel Analytics Management</h2>
          <p className="text-muted-foreground mt-1">
            Enable channel analytics access and set campaign parameters for users
          </p>
        </div>
        <Button onClick={fetchUsers} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Selection & Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5" />
              Configure User Access
            </CardTitle>
            <CardDescription>
              Select a user and configure their channel analytics settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Selection */}
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} {user.full_name ? `(${user.full_name})` : ''}
                      {user.channel_analytics_access && (
                        <Badge variant="secondary" className="ml-2">Active</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <>
                {/* Access Toggle */}
                <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="access-toggle">Enable Channel Analytics</Label>
                    <p className="text-sm text-muted-foreground">
                      Grant access to channel analytics dashboard
                    </p>
                  </div>
                  <Switch
                    id="access-toggle"
                    checked={accessEnabled}
                    onCheckedChange={setAccessEnabled}
                  />
                </div>

                {accessEnabled && (
                  <>
                    {/* Channel URL */}
                    <div className="space-y-2">
                      <Label htmlFor="channel-url">
                        Channel URL <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="channel-url"
                        type="url"
                        placeholder="https://www.youtube.com/@channelname"
                        value={channelUrl}
                        onChange={(e) => setChannelUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Full YouTube channel URL to track analytics
                      </p>
                    </div>

                    {/* Campaign Start Date */}
                    <div className="space-y-2">
                      <Label>
                        Campaign Start Date <span className="text-destructive">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-muted-foreground">
                        Analytics will be tracked from this date forward
                      </p>
                    </div>
                  </>
                )}

                {/* Save Button */}
                <Button 
                  onClick={handleSave} 
                  disabled={saving} 
                  className="w-full"
                  size="lg"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Users Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Users with Channel Analytics Access</CardTitle>
            <CardDescription>
              Overview of all users with active channel analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.filter(u => u.channel_analytics_access).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No users have channel analytics access enabled yet
                </p>
              ) : (
                users
                  .filter(u => u.channel_analytics_access)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{user.email}</p>
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        </div>
                        {user.full_name && (
                          <p className="text-xs text-muted-foreground">{user.full_name}</p>
                        )}
                        {user.channel_start_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            Started: {format(new Date(user.channel_start_date), 'PP')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChannelAnalyticsManagement;
