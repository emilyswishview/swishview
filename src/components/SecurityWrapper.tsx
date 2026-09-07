import { useEffect, ReactNode } from 'react';
import { initSecurity, setSecurityHeaders } from '@/utils/security';

interface SecurityWrapperProps {
  children: ReactNode;
}

export const SecurityWrapper = ({ children }: SecurityWrapperProps) => {
  useEffect(() => {
    try {
      // Initialize security measures
      initSecurity();
      setSecurityHeaders();
      
      // Clear sensitive data on page unload
      const handleBeforeUnload = () => {
        // Clear any sensitive data from memory
        if (window.performance && window.performance.clearResourceTimings) {
          window.performance.clearResourceTimings();
        }
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } catch (error) {
      console.warn('Security initialization failed:', error);
    }
  }, []);

  return <>{children}</>;
};