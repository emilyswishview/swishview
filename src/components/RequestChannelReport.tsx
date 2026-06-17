import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Send,
  AlertCircle
} from "lucide-react";

interface RequestChannelReportProps {
  userId: string;
}

const RequestChannelReport = ({ userId }: RequestChannelReportProps) => {
  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();

  const requestReport = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please provide details about what you need in the report",
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

      // Create request in user_requests table
      const { data: requestData, error: requestError } = await supabase
        .from('user_requests')
        .insert({
          user_id: userId,
          subject: 'Channel Report Request',
          message: message.trim(),
          request_type: 'channel_report'
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create admin notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Channel Report Request',
          message: `${profile?.full_name || profile?.email || 'Unknown'} requested a channel report`,
          type: 'admin_alert'
        });

      if (notificationError) throw notificationError;

      // Send email to support@swishview.com
      const { error: emailError } = await supabase.functions.invoke('send-support-email', {
        body: {
          userEmail: profile?.email,
          userName: profile?.full_name || profile?.email,
          subject: 'Channel Report Request',
          message: message.trim(),
          requestType: 'channel_report',
          requestId: requestData.id
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
      }

      toast({
        title: "Success",
        description: "Your report request has been submitted successfully",
      });

      setMessage('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send report request",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Request Channel Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Need a detailed analytics report?</p>
              <p>Request a comprehensive channel report from our admin team. Include specific metrics or time periods you'd like analyzed.</p>
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="report_message">Report Details</Label>
          <Textarea
            id="report_message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe what specific analytics or metrics you need in the report..."
            rows={4}
          />
        </div>
        
        <Button 
          onClick={requestReport} 
          disabled={requesting || !message.trim()}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          {requesting ? 'Sending Request...' : 'Request Channel Report'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RequestChannelReport;