import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Send,
  AlertCircle,
  X
} from "lucide-react";
import { notifyUserActivity } from "@/utils/notifyActivity";

interface RaiseRequestFormProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const RaiseRequestForm = ({ userId, isOpen, onClose }: RaiseRequestFormProps) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();

  const submitRequest = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Error",
        description: "Please provide both subject and message",
        variant: "destructive",
      });
      return;
    }

    try {
      setRequesting(true);

      // Get user profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      // Create notification for admin
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Support Request',
          message: `User ${profile?.full_name || profile?.email || 'Unknown'} raised a request: ${subject.trim()} - ${message.trim()}`,
          type: 'support_request'
        });

      if (notificationError) throw notificationError;

      // Call edge function to send email to support
      const { error: emailError } = await supabase.functions.invoke('send-support-email', {
        body: {
          userEmail: profile?.email,
          userName: profile?.full_name || profile?.email,
          subject: subject.trim(),
          message: message.trim(),
          requestType: 'support_request'
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
      }

      // Send notification email for user request
      await notifyUserActivity({
        type: "user_request",
        data: {
          user_email: profile?.email,
          request_type: "support_request",
          subject: subject.trim(),
          message: message.trim(),
        },
      });

      toast({
        title: "Success",
        description: "Your request has been sent to our support team",
      });

      setSubject('');
      setMessage('');
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send request",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Raise a Support Request
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Need help or have a question?</p>
                <p>Our support team will get back to you within 24 hours.</p>
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="request_subject">Subject</Label>
            <Input
              id="request_subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your request..."
            />
          </div>
          
          <div>
            <Label htmlFor="request_message">Message</Label>
            <Textarea
              id="request_message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please provide detailed information about your request..."
              rows={5}
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={submitRequest} 
              disabled={requesting || !subject.trim() || !message.trim()}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {requesting ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RaiseRequestForm;