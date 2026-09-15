import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminNotifications, AdminNotification } from '@/hooks/useAdminNotifications';
import NotificationModal from '@/components/NotificationModal';

const AdminNotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    setSelectedNotification(notification);
    setModalOpen(true);
    setOpen(false);
    if (notification.status === 'pending') {
      handleMarkAsRead(notification.id);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`relative ${unreadCount > 0 ? 'ring-2 ring-primary ring-opacity-50' : ''}`}
          >
            <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 bg-background border shadow-lg z-50" align="end">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Notifications</h4>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAllAsRead}
                  className="h-6 px-2 text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>
          
          <ScrollArea className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-3 hover:bg-muted/50 cursor-pointer border-b border-muted/20 ${
                      notification.status === 'pending' ? 'bg-primary/5' : 'bg-muted/20'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-2">
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                          {notification.subject}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Type: {notification.request_type}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.user_email && (
                          <p className="text-xs text-primary mt-1">
                            From: {notification.user_name || notification.user_email}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                      {notification.status === 'pending' && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      
      <NotificationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        notification={selectedNotification}
        isAdmin={true}
      />
    </>
  );
};

export default AdminNotificationBell;