import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { checkRateLimit } from '@/utils/security';
import { useToast } from '@/hooks/use-toast';

export const useSecureAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Rate limit auth checks
    const clientId = navigator.userAgent + Date.now();
    if (!checkRateLimit(`auth_${clientId}`, 50, 60000)) {
      toast({
        title: "Security Alert",
        description: "Too many authentication attempts. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          setIsAuthenticated(false);
          return;
        }

        if (session?.user) {
          // Verify session is not expired
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          if (Date.now() > expiresAt) {
            await supabase.auth.signOut();
            setIsAuthenticated(false);
            navigate('/login');
            return;
          }

          setUser(session.user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setIsAuthenticated(false);
          setUser(null);
        } else if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const secureSignOut = async () => {
    try {
      // Clear all local storage data
      localStorage.clear();
      sessionStorage.clear();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Redirect to home
      navigate('/');
      
      toast({
        title: "Signed out successfully",
        description: "Your session has been securely ended.",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign out error",
        description: "There was an issue signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    isAuthenticated,
    user,
    secureSignOut,
  };
};