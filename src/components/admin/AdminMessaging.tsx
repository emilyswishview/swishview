import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare,
  Send,
  User,
  Clock,
  CheckCircle2,
  Circle
} from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface AdminMessage {
  id: string;
  title: string;
  message: string;
  updated_by: string;
  read: boolean;
  created_at: string;
  user_id: string;
  profiles?: {
    email: string;
    full_name: string;
  };
}

const AdminMessaging = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');
  const [sentMessages, setSentMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchSentMessages();
  }, []);

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

  const fetchSentMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(msg => msg.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const messagesWithProfiles = data.map(msg => ({
          ...msg,
          profiles: profiles?.find(p => p.id === msg.user_id)
        }));
        
        setSentMessages(messagesWithProfiles as AdminMessage[]);
      } else {
        setSentMessages([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch sent messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedUserId || !title.trim() || !message.trim() || !updatedBy.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Send admin message
      const { error: messageError } = await supabase
        .from('admin_messages')
        .insert({
          user_id: selectedUserId,
          title: title.trim(),
          message: message.trim(),
          updated_by: updatedBy.trim(),
          admin_id: user.id
        });

      if (messageError) throw messageError;

      // Also create a notification for the user
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedUserId,
          title: `Message from ${updatedBy.trim()}: ${title}`,
          message: message.trim(),
          type: 'admin_message'
        });

      if (notificationError) throw notificationError;

      // Reset form
      setSelectedUserId('');
      setTitle('');
      setMessage('');
      setUpdatedBy('');

      // Refresh messages
      fetchSentMessages();

      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
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
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Admin → User Messaging System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Send New Message */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Send New Message</Label>
            
            {/* User Selection */}
            <div className="space-y-2">
              <Label htmlFor="user_search">Select User</Label>
              <Input
                id="user_search"
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50 max-h-60">
                  {filteredUsers.map((user) => (
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

            {/* Message Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="message_title">Message Title *</Label>
                <Input
                  id="message_title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., SEO Report Update, Campaign Progress..."
                />
              </div>
              <div>
                <Label htmlFor="updated_by">Updated By *</Label>
                <Input
                  id="updated_by"
                  value={updatedBy}
                  onChange={(e) => setUpdatedBy(e.target.value)}
                  placeholder="Your name (e.g., Ashley, Daisy, Sophie, Emily)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="message_body">Message Body *</Label>
              <Textarea
                id="message_body"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message to the user..."
                rows={4}
              />
            </div>

            <Button 
              onClick={sendMessage} 
              disabled={sending || !selectedUserId || !title.trim() || !message.trim() || !updatedBy.trim()}
              className="w-full md:w-auto"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Message History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            {sentMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No messages sent yet
              </div>
            ) : (
              <div className="space-y-3">
                {sentMessages.map((msg) => (
                  <div key={msg.id} className="p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {msg.profiles?.full_name || msg.profiles?.email}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {msg.profiles?.email}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{msg.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{msg.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>By: {msg.updated_by}</span>
                          <span>{new Date(msg.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {msg.read ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className={msg.read ? "text-green-600" : "text-muted-foreground"}>
                          {msg.read ? 'Read' : 'Unread'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMessaging;
