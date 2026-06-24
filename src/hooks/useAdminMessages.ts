import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminMessage {
  id: string;
  user_id: string;
  title: string;
  message: string;
  updated_by: string;
  admin_id: string;
  read: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
  admin_profiles?: {
    email: string;
    full_name: string;
  };
}

export const useAdminMessages = (userId?: string) => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const fetchMessages = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles and admin profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(msg => msg.user_id))];
        const adminIds = [...new Set(data.map(msg => msg.updated_by))];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', adminIds);

        const messagesWithProfiles = data.map(msg => ({
          ...msg,
          profiles: profiles?.find(p => p.id === msg.user_id),
          admin_profiles: adminProfiles?.find(p => p.id === msg.updated_by)
        }));
        
        setMessages(messagesWithProfiles as AdminMessage[]);
        setUnreadCount(messagesWithProfiles.filter(m => !m.read).length);
      } else {
        setMessages([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching admin messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('admin_messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, read: true } : m)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('admin_messages')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      setMessages(prev => prev.map(m => ({ ...m, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [userId]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('admin-message-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchMessages(); // Refetch to get user details
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    messages,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchMessages,
  };
};