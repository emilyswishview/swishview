import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import React, { useState } from 'react';
import { Bell, Check, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import NotificationModal from '@/components/NotificationModal';

interface NotificationBellProps {
  userId?: string;
}

const NotificationBell = ({ userId }: NotificationBellProps) => {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const getNotificationIcon = () => {
    return <Info className="text-blue-500" />;
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setModalOpen(true);
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!userId) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`relative ${unreadCount > 0 ? '' : ''}`}
          >
            <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-orange-500' : ''}`} />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs "
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
            {unreadCount > 0 && (
              <div className="absolute inset-0 rounded-full bg-orange-400/20 "></div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center font-display  justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="h-6 px-2 font-display text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {loading ? (
            <div className="p-4 text-center text-sm font-display  text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm font-display  text-muted-foreground">
              No messages from admin yet
            </div>
          ) : (
            <ScrollArea className="h-96">
              {notifications.slice(0, 10).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex font-display  items-start gap-3 p-3 ${
                    !notification.read ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 text-lg">
                    {getNotificationIcon()}
                  </div>
                   <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none mb-1">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                  )}
                </DropdownMenuItem>
              ))}
              {notifications.length > 10 && (
                <div className="p-2 text-center text-xs text-muted-foreground border-t">
                  Showing 10 of {notifications.length} notifications
                </div>
              )}
            </ScrollArea>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <NotificationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        notification={selectedNotification}
        isAdmin={false}
      />
    </>
  );
};

export default NotificationBell;