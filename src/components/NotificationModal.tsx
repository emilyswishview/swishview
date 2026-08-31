import React from 'react';
import { X, User, Calendar, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: {
    id: string;
    title?: string;
    subject?: string;
    message: string;
    type?: string;
    request_type?: string;
    created_at: string;
    user_name?: string;
    user_email?: string;
    status?: string;
    read?: boolean;
    attachment_urls?: string[];
  } | null;
  isAdmin?: boolean;
}

const NotificationModal = ({ open, onOpenChange, notification, isAdmin = false }: NotificationModalProps) => {
  if (!notification) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const variant = status === 'pending' ? 'destructive' : 
                   status === 'completed' ? 'default' : 'secondary';
    
    return (
      <Badge variant={variant} className="capitalize">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const title = notification.title || notification.subject || 'Notification';
  const type = notification.type || notification.request_type || 'general';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-lg font-semibold">{title}</span>
            <div className="flex items-center gap-2">
              {notification.status && getStatusBadge(notification.status)}
              {!notification.read && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadata Section */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Tag className="w-4 h-4" />
              <span className="font-medium">Type:</span>
              <span className="capitalize">{type.replace('_', ' ')}</span>
            </div>
            
            {isAdmin && notification.user_name && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span className="font-medium">From:</span>
                <span>{notification.user_name}</span>
              </div>
            )}
            
            {isAdmin && notification.user_email && !notification.user_name && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span className="font-medium">From:</span>
                <span>{notification.user_email}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Date:</span>
              <span>{formatDate(notification.created_at)}</span>
            </div>
          </div>

          <Separator />

          {/* Message Content */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Message:</h4>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {notification.message}
              </p>
            </div>
          </div>

          {/* Attachments Section */}
          {notification.attachment_urls && notification.attachment_urls.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Attachments:</h4>
                <div className="space-y-2">
                  {notification.attachment_urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(url, '_blank')}
                        className="text-xs"
                      >
                        View Attachment {index + 1}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationModal;