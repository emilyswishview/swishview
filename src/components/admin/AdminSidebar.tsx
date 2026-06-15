
import React from 'react';
import { LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SwishViewLogo from '@/components/SwishViewLogo';
import AdminNotificationBell from '@/components/AdminNotificationBell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface AdminSidebarProps {
  menuItems: MenuItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  menuItems,
  activeSection,
  onSectionChange,
}) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-elegant border-r border-gray-200 z-50">
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <SwishViewLogo size="lg" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-semibold font-display text-gray-700">Admin Panel</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-display ${
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        Bottom Actions
        <div className="p-4 border-t border-gray-200 space-y-4">
          Admin Notifications Section 
           <div>
            <AdminNotificationBell />
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 rounded-xl border-gray-300 hover:border-orange-500 hover:text-orange-500 font-display"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
