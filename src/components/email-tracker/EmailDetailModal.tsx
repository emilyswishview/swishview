import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mail, 
  Clock, 
  FileText, 
  Shield, 
  Hash,
  Users,
  Globe,
  Tag,
  Paperclip,
  HardDrive
} from 'lucide-react';

interface EmailLog {
  id: string;
  message_id: string;
  recipients: string[];
  recipient_domains: string[];
  cc_recipients?: string[];
  bcc_recipients?: string[];
  subject: string;
  is_external: boolean;
  sent_at: string;
  attachment_count?: number;
  attachment_names?: string[];
  has_attachments?: boolean;
  message_size_bytes?: number;
  is_encrypted?: boolean;
  delivery_status?: string;
  labels?: string[];
  thread_id?: string;
}

interface EmailDetailModalProps {
  email: EmailLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailDetailModal({ email, open, onOpenChange }: EmailDetailModalProps) {
  if (!email) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Subject */}
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FileText className="h-4 w-4" />
                Subject
              </div>
              <p className="text-base font-medium bg-muted rounded-lg p-3 break-words text-foreground">
                {email.subject || '(No subject)'}
              </p>
            </div>

            {/* Timestamp & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Clock className="h-4 w-4" />
                  Sent At
                </div>
                <p className="text-sm font-medium">
                  {format(new Date(email.sent_at), 'MMM d, yyyy h:mm:ss a')}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Globe className="h-4 w-4" />
                  Type
                </div>
                <div className="flex gap-2">
                  <Badge variant={email.is_external ? 'outline' : 'secondary'}>
                    {email.is_external ? 'External' : 'Internal'}
                  </Badge>
                  {email.is_encrypted && (
                    <Badge variant="default" className="bg-green-500">
                      <Shield className="h-3 w-3 mr-1" />
                      Encrypted
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* To Recipients */}
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Users className="h-4 w-4" />
                To ({email.recipients.length})
              </div>
              <div className="flex flex-wrap gap-2 bg-muted rounded-lg p-3">
                {email.recipients.map((r, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono bg-background">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>

            {/* CC Recipients */}
            {email.cc_recipients && email.cc_recipients.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  CC ({email.cc_recipients.length})
                </div>
                <div className="flex flex-wrap gap-2 bg-muted rounded-lg p-3">
                  {email.cc_recipients.map((r, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono bg-background">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* BCC Recipients */}
            {email.bcc_recipients && email.bcc_recipients.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  BCC ({email.bcc_recipients.length})
                </div>
                <div className="flex flex-wrap gap-2 bg-muted rounded-lg p-3">
                  {email.bcc_recipients.map((r, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono bg-background">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Domains */}
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Globe className="h-4 w-4" />
                Domains
              </div>
              <div className="flex flex-wrap gap-2">
                {email.recipient_domains.map((d, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Attachments */}
            {email.attachment_names && email.attachment_names.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({email.attachment_count})
                </div>
                <div className="flex flex-wrap gap-2 bg-muted rounded-lg p-3">
                  {email.attachment_names.map((name, i) => (
                    <div key={i} className="flex items-center gap-1 text-sm bg-background rounded px-2 py-1 text-foreground">
                      <FileText className="h-3 w-3" />
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Size & Labels */}
            <div className="grid grid-cols-2 gap-4">
              {email.message_size_bytes && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <HardDrive className="h-4 w-4" />
                    Size
                  </div>
                  <p className="text-sm font-medium">
                    {Math.round(email.message_size_bytes / 1024)} KB
                  </p>
                </div>
              )}
              {email.labels && email.labels.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Tag className="h-4 w-4" />
                    Labels
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {email.labels.map((label, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Message ID & Thread ID */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Hash className="h-4 w-4" />
                  Message ID
                </div>
                <p className="text-xs font-mono bg-muted rounded-lg p-2 break-all text-foreground">
                  {email.message_id}
                </p>
              </div>
              {email.thread_id && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Hash className="h-4 w-4" />
                    Thread ID
                  </div>
                  <p className="text-xs font-mono bg-muted rounded-lg p-2 break-all text-foreground">
                    {email.thread_id}
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
