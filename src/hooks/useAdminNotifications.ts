import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminNotification {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  request_type: string;
  status: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
  attachment_urls?: string[];
}

export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const fetchAdminNotifications = async () => {
    try {
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') return;

      // Fetch all user requests that admins need to see (both pending and processed)
      const { data: requestsData, error: requestsError } = await supabase
        .from('user_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (requestsError) throw requestsError;

      // Fetch user details separately
      const userIds = requestsData?.map(r => r.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const formattedNotifications = requestsData?.map(request => {
        const userProfile = profilesData?.find(p => p.id === request.user_id);
        return {
          ...request,
          user_email: userProfile?.email,
          user_name: userProfile?.full_name
        };
      }) || [];

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => n.status === 'pending').length);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('user_requests')
        .update({ status: 'in_progress' })
        .eq('id', requestId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === requestId ? { ...n, status: 'in_progress' } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('user_requests')
        .update({ status: 'in_progress' })
        .eq('status', 'pending');

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, status: 'in_progress' }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error updating all requests:', error);
    }
  };

  useEffect(() => {
    fetchAdminNotifications();
  }, []);

  // Set up real-time subscription for new user requests
  useEffect(() => {
    const channel = supabase
      .channel('admin-user-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_requests'
        },
        () => {
          fetchAdminNotifications(); // Refetch to get user details
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchAdminNotifications,
  };
};