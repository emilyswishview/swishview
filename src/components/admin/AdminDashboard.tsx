import React, { useState, useEffect } from 'react';
import { Users, CreditCard, BarChart3, MessageSquare, Mail, Settings, Search, Gift, Globe, UserCog, PenSquare, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ResponsiveAdminSidebar from '@/components/admin/ResponsiveAdminSidebar';
import AdminNotificationBell from '@/components/AdminNotificationBell';
import DashboardOverview from '@/components/admin/DashboardOverview';
import UsersSection from '@/components/admin/UsersSection';
import CampaignsSection from '@/components/admin/CampaignsSection';
import PaymentsSection from '@/components/admin/PaymentsSection';
import ContactMessagesSection from '@/components/admin/ContactMessagesSection';
import SubscribersSection from '@/components/admin/SubscribersSection';
import SEOPurchasesSection from '@/components/admin/SEOPurchasesSection';
import SEOSection from '@/components/admin/SEOSection';
import SEOAnalyticsManagement from '@/components/admin/SEOAnalyticsManagement';
import CouponsSection from '@/components/admin/CouponsSection';
import ChannelAnalyticsManagement from '@/components/admin/ChannelAnalyticsManagement';
import AdminMessaging from './AdminMessaging';
import SEOPartnersSection from '@/components/admin/SEOPartnersSection';
import BlogsSection from '@/components/admin/BlogsSection';
import TrackerSection from '@/components/admin/TrackerSection';
import LoadingSpinner from '@/components/LoadingSpinner';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

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
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'sendmessage', label: 'Send Message', icon: CreditCard },
    { id: 'seo-purchases', label: 'SEO Purchases', icon: Search },
    { id: 'seo', label: 'SEO Management', icon: Globe },
    { id: 'seo-analytics', label: 'SEO Analytics', icon: BarChart3 },
    { id: 'channel-analytics', label: 'Channel Analytics', icon: BarChart3 },
    { id: 'seo-partners', label: 'SEO Partners', icon: UserCog },
    { id: 'coupons', label: 'Bonus Coupons', icon: Gift },
    { id: 'blogs', label: 'Blogs', icon: PenSquare },
    { id: 'daily-pulse', label: 'Daily Pulse', icon: Clock },
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
      case 'payments':
        return <PaymentsSection />;
      case 'sendmessage':
        return <AdminMessaging />;
      case 'seo-purchases':
        return <SEOPurchasesSection />;
      case 'seo':
        return <SEOSection />;
      case 'seo-analytics':
        return <SEOAnalyticsManagement />;
      case 'channel-analytics':
        return <ChannelAnalyticsManagement />;
      case 'seo-partners':
        return <SEOPartnersSection />;
      case 'coupons':
        return <CouponsSection />;
      case 'blogs':
        return <BlogsSection />;
      case 'daily-pulse':
        return <TrackerSection />;
      case 'messages':
        return <ContactMessagesSection />;
      case 'subscribers':
        return <SubscribersSection />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
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