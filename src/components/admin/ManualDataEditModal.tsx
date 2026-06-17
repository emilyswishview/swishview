import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X } from "lucide-react";

interface ManualEntry {
  id: string;
  user_id: string;
  entry_date: string;
  entry_type: string;
  subscribers_count: number;
  views_count: number;
  watch_time_hours: number;
  starting_date?: string;
}

interface ManualDataEditModalProps {
  userId: string;
  onDataUpdated: () => void;
}

const ManualDataEditModal = ({ userId, onDataUpdated }: ManualDataEditModalProps) => {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<ManualEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchEntries();
    }
  }, [open, userId]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seo_analytics_manual_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch manual entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = async (entry: ManualEntry) => {
    try {
      const { error } = await supabase
        .from('seo_analytics_manual_entries')
        .update({
          entry_date: entry.entry_date,
          entry_type: entry.entry_type,
          subscribers_count: entry.subscribers_count,
          views_count: entry.views_count,
          watch_time_hours: entry.watch_time_hours,
          starting_date: entry.starting_date,
          entered_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry updated successfully",
      });
      
      setEditingEntry(null);
      fetchEntries();
      onDataUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update entry",
        variant: "destructive",
      });
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('seo_analytics_manual_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
      
      fetchEntries();
      onDataUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-2" />
          Edit Manual Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Manual Data Entries</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading entries...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No manual entries found for this user
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-4">
                  {editingEntry?.id === entry.id ? (
                    // Edit mode
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Entry Date</Label>
                        <Input
                          type="date"
                          value={editingEntry.entry_date}
                          onChange={(e) => setEditingEntry({ ...editingEntry, entry_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Entry Type</Label>
                        <Select 
                          value={editingEntry.entry_type} 
                          onValueChange={(value) => setEditingEntry({ ...editingEntry, entry_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="milestone">Milestone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Subscribers</Label>
                        <Input
                          type="number"
                          value={editingEntry.subscribers_count}
                          onChange={(e) => setEditingEntry({ ...editingEntry, subscribers_count: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label>Views</Label>
                        <Input
                          type="number"
                          value={editingEntry.views_count}
                          onChange={(e) => setEditingEntry({ ...editingEntry, views_count: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label>Watch Hours</Label>
                        <Input
                          type="number"
                          value={editingEntry.watch_time_hours}
                          onChange={(e) => setEditingEntry({ ...editingEntry, watch_time_hours: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label>Starting Date (Optional)</Label>
                        <Input
                          type="date"
                          value={editingEntry.starting_date || ''}
                          onChange={(e) => setEditingEntry({ ...editingEntry, starting_date: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2 flex gap-2">
                        <Button onClick={() => updateEntry(editingEntry)} size="sm">
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setEditingEntry(null)}
                          size="sm"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                          <div>
                            <span className="text-sm font-medium">Date:</span>
                            <p className="text-sm">{new Date(entry.entry_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Type:</span>
                            <p className="text-sm capitalize">{entry.entry_type}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Subscribers:</span>
                            <p className="text-sm">{entry.subscribers_count.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Views:</span>
                            <p className="text-sm">{entry.views_count.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingEntry(entry)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteEntry(entry.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Watch Hours:</span>
                          <span className="ml-2">{entry.watch_time_hours}</span>
                        </div>
                        {entry.starting_date && (
                          <div>
                            <span className="font-medium">Starting Date:</span>
                            <span className="ml-2">{new Date(entry.starting_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualDataEditModal;