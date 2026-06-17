import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmailTrackerDashboard } from '@/components/email-tracker/EmailTrackerDashboard';
import { EmailTrackerAuthModal } from '@/components/email-tracker/EmailTrackerAuthModal';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function EmailTracker() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // No session, show auth modal
        setShowAuthModal(true);
        setIsLoading(false);
        return;
      }

      // Check user_roles table first
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (roleData) {
        setIsAdmin(true);
        setIsLoading(false);
        return;
      }

      // Fallback to profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileData?.role === 'admin') {
        setIsAdmin(true);
      } else {
        // Not admin, show auth modal
        setShowAuthModal(true);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      setShowAuthModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticated = () => {
    setShowAuthModal(false);
    setIsAdmin(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <EmailTrackerAuthModal 
          open={showAuthModal} 
          onAuthenticated={handleAuthenticated} 
        />
      </div>
    );
  }

  return <EmailTrackerDashboard />;
}