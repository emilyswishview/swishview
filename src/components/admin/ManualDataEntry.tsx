import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar,
  TrendingUp, 
  Users, 
  Eye,
  Clock,
  Save,
  Plus
} from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface ManualEntry {
  id?: string;
  entry_date: string;
  entry_type: 'daily' | 'weekly';
  subscribers_count: number;
  views_count: number;
  watch_time_hours: number;
  starting_date?: string;
  created_at?: string;
  updated_at?: string;
  entered_by?: string;
  user_id?: string;
}

const ManualDataEntry = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [entryType, setEntryType] = useState<'daily' | 'weekly'>('weekly');
  const [startingDate, setStartingDate] = useState<string>('');
  const [entry, setEntry] = useState<ManualEntry>({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: 'weekly',
    subscribers_count: 0,
    views_count: 0,
    watch_time_hours: 0
  });
  const [existingEntries, setExistingEntries] = useState<ManualEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchExistingEntries();
      fetchStartingDate();
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

  const fetchExistingEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_analytics_manual_entries')
        .select('*')
        .eq('user_id', selectedUserId)
        .order('entry_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setExistingEntries((data || []).map(entry => ({
        ...entry,
        entry_type: entry.entry_type as 'daily' | 'weekly'
      })));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch existing entries",
        variant: "destructive",
      });
    }
  };

  const fetchStartingDate = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_analytics_manual_entries')
        .select('starting_date')
        .eq('user_id', selectedUserId)
        .not('starting_date', 'is', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data?.starting_date) {
        setStartingDate(data.starting_date);
      }
    } catch (error: any) {
      console.log('No starting date found');
    }
  };

  const saveEntry = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const entryData = {
        ...entry,
        user_id: selectedUserId,
        entry_type: entryType,
        starting_date: startingDate || null,
        entered_by: user?.id
      };

      const { error } = await supabase
        .from('seo_analytics_manual_entries')
        .upsert(entryData, { 
          onConflict: 'user_id,entry_date,entry_type' 
        });

      if (error) throw error;

      // Reset form
      setEntry({
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: entryType,
        subscribers_count: 0,
        views_count: 0,
        watch_time_hours: 0
      });

      // Refresh entries
      fetchExistingEntries();

      toast({
        title: "Success",
        description: "Data entry saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save entry",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Manual SEO Data Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Select User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{user.full_name || user.email}</span>
                      <span className="text-sm text-muted-foreground ml-2">{user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUser && (
              <Badge variant="outline">{selectedUser.email}</Badge>
            )}
          </div>

          {selectedUserId && (
            <>
              <Separator />
              
              {/* Starting Date Configuration */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Service Starting Date</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="starting_date">Starting Date</Label>
                    <Input
                      id="starting_date"
                      type="date"
                      value={startingDate}
                      onChange={(e) => setStartingDate(e.target.value)}
                      placeholder="When did SEO service start?"
                    />
                  </div>
                  <div className="flex items-end">
                    <Badge variant="secondary">
                      {startingDate ? `Service started: ${new Date(startingDate).toLocaleDateString()}` : 'No starting date set'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Entry Type Selection */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Data Entry Type</Label>
                <Select value={entryType} onValueChange={(value: 'daily' | 'weekly') => {
                  setEntryType(value);
                  setEntry({ ...entry, entry_type: value });
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="weekly">Week-wise Entry</SelectItem>
                    <SelectItem value="daily">Day-wise Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Entry Form */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Enter Data</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="entry_date">
                      {entryType === 'weekly' ? 'Week Starting Date' : 'Date'}
                    </Label>
                    <Input
                      id="entry_date"
                      type="date"
                      value={entry.entry_date}
                      onChange={(e) => setEntry({ ...entry, entry_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="subscribers">Subscribers Count</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="subscribers"
                        type="number"
                        value={entry.subscribers_count}
                        onChange={(e) => setEntry({ ...entry, subscribers_count: parseInt(e.target.value) || 0 })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="views">Views Count</Label>
                    <div className="relative">
                      <Eye className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="views"
                        type="number"
                        value={entry.views_count}
                        onChange={(e) => setEntry({ ...entry, views_count: parseInt(e.target.value) || 0 })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="watch_time">Watch Time (Hours)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="watch_time"
                        type="number"
                        value={entry.watch_time_hours}
                        onChange={(e) => setEntry({ ...entry, watch_time_hours: parseInt(e.target.value) || 0 })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={saveEntry} 
                  disabled={saving}
                  className="w-full md:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>

              {/* Existing Entries */}
              {existingEntries.length > 0 && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Recent Entries</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <div className="grid grid-cols-5 gap-2 p-3 bg-muted/50 font-medium text-sm">
                      <div>Date</div>
                      <div>Type</div>
                      <div>Subscribers</div>
                      <div>Views</div>
                      <div>Watch Time</div>
                    </div>
                    {existingEntries.map((existingEntry) => (
                      <div key={existingEntry.id} className="grid grid-cols-5 gap-2 p-3 border-t text-sm">
                        <div>{new Date(existingEntry.entry_date).toLocaleDateString()}</div>
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {existingEntry.entry_type}
                          </Badge>
                        </div>
                        <div>{existingEntry.subscribers_count.toLocaleString()}</div>
                        <div>{existingEntry.views_count.toLocaleString()}</div>
                        <div>{existingEntry.watch_time_hours.toLocaleString()}h</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualDataEntry;
