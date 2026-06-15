import React from 'react';
import { LogOut, Shield, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SwishViewLogo from '@/components/SwishViewLogo';
import AdminNotificationBell from '@/components/AdminNotificationBell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface ResponsiveAdminSidebarProps {
  menuItems: MenuItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  children: React.ReactNode;
}

const AdminSidebarContent: React.FC<{
  menuItems: MenuItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
}> = ({ menuItems, activeSection, onSectionChange }) => {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2">
          <SwishViewLogo size={isCollapsed ? "sm" : "lg"} />
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-semibold font-display text-sidebar-foreground">Admin Panel</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onSectionChange(item.id)}
                      isActive={activeSection === item.id}
                      className="w-full justify-start gap-3 font-display"
                    >
                      <Icon className="h-5 w-5" />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="space-y-2">
          {/* Admin Notifications */}
          <div className={isCollapsed ? "flex justify-center" : ""}>
            {/* <AdminNotificationBell /> */}
          </div>
          
          <Button
            variant="outline"
            onClick={handleSignOut}
            className={`w-full justify-start gap-3 font-display ${
              isCollapsed ? "px-2" : ""
            }`}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && "Sign Out"}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

const ResponsiveAdminSidebar: React.FC<ResponsiveAdminSidebarProps> = ({
  menuItems,
  activeSection,
  onSectionChange,
  children,
}) => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full">
        <AdminSidebarContent
          menuItems={menuItems}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header with trigger */}
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-semibold font-display">Admin Panel</span>
            </div>
          </header>
          
          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ResponsiveAdminSidebar;