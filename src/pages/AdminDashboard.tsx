import React, { useState, useEffect } from 'react';
import { Users, CreditCard, BarChart3, MessageSquare, Mail, Settings, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ResponsiveAdminSidebar from '@/components/admin/ResponsiveAdminSidebar';
import DashboardOverview from '@/components/admin/DashboardOverview';
import UsersSection from '@/components/admin/UsersSection';
import CampaignsSection from '@/components/admin/CampaignsSection';
import PaymentsSection from '@/components/admin/PaymentsSection';
import ContactMessagesSection from '@/components/admin/ContactMessagesSection';
import SubscribersSection from '@/components/admin/SubscribersSection';
import AdminMessaging from '@/components/admin/AdminMessaging';
import BlogsSection from '@/components/admin/BlogsSection';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminNotifications();
      
      // Set up real-time subscription for new requests
      const channel = supabase
        .channel('user-requests-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_requests'
          },
          () => {
            fetchAdminNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || profile?.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminNotifications = async () => {
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('user_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (requestsError) throw requestsError;

      // Get user profiles separately
      const userIds = requestsData?.map(r => r.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const notifications = requestsData?.map(request => {
        const profile = profilesData?.find(p => p.id === request.user_id);
        return {
          id: request.id,
          title: `${request.request_type.replace('_', ' ')} Request`,
          message: `${profile?.full_name || profile?.email || 'User'} - ${request.subject}`,
          created_at: request.created_at,
          read: request.status !== 'pending'
        };
      }) || [];

      setAdminNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    }
  };

  const markNotificationAsRead = async (requestId: string) => {
    try {
      await supabase
        .from('user_requests')
        .update({ status: 'in_progress' })
        .eq('id', requestId);
      
      await fetchAdminNotifications();
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('user_requests')
        .update({ status: 'in_progress' })
        .eq('status', 'pending');
      
      await fetchAdminNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return null;
  }

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'campaigns', label: 'Campaigns', icon: Settings },
    { id: 'blogs', label: 'Blogs', icon: Settings },
    { id: 'sendmessages', label: 'Send Message', icon: Settings },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'subscribers', label: 'Subscribers', icon: Mail },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <DashboardOverview />;
      case 'users':
        return <UsersSection />;
      case 'campaigns':
        return <CampaignsSection />;
      case 'blogs':
        return <BlogsSection />;
      case 'payments':
        return <PaymentsSection />;
      case 'messages':
        return <ContactMessagesSection />;
      case 'sendmessages':
        return <AdminMessaging />;
      case 'subscribers':
        return <SubscribersSection />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Admin Header with Notifications */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          
          {/* Notification Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Support Requests</h4>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                      Mark all read
                    </Button>
                  )}
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {adminNotifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No support requests
                  </div>
                ) : (
                  adminNotifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="p-3 border-b last:border-b-0 cursor-pointer"
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className={`w-2 h-2 rounded-full mt-2 ${!notification.read ? 'bg-primary' : 'bg-gray-300'}`} />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ResponsiveAdminSidebar
        menuItems={menuItems}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        {renderContent()}
      </ResponsiveAdminSidebar>
    </div>
  );
};

export default AdminDashboard;
