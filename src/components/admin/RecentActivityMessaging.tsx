import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquarePlus, Send } from "lucide-react";

interface RecentActivityMessagingProps {
  userId: string;
  userEmail: string;
}

const RecentActivityMessaging = ({ userId, userEmail }: RecentActivityMessagingProps) => {
  const [activityText, setActivityText] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSendActivity = async () => {
    if (!activityText.trim()) {
      toast({
        title: "Error",
        description: "Please enter an activity message",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);

      const { error } = await supabase
        .from('recent_activities')
        .insert({
          user_id: userId,
          activity_text: activityText,
          activity_date: activityDate
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity message sent to user",
      });

      // Reset form
      setActivityText('');
      setActivityDate(new Date().toISOString().split('T')[0]);
    } catch (error: any) {
      console.error('Failed to send activity:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send activity message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <MessageSquarePlus className="w-5 h-5 text-primary" />
          Send Recent Activity Message
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground font-display">
          Send an activity update to <strong>{userEmail}</strong>. This will appear in their Recent Activities section on the SEO Services tab.
        </div>

        <div className="space-y-2">
          <Label htmlFor="activity_date" className="font-display">Activity Date</Label>
          <Input
            id="activity_date"
            type="date"
            value={activityDate}
            onChange={(e) => setActivityDate(e.target.value)}
            className="font-display"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="activity_text" className="font-display">Activity Message</Label>
          <Textarea
            id="activity_text"
            placeholder="e.g., Optimized 5 video titles and descriptions for better SEO performance"
            value={activityText}
            onChange={(e) => setActivityText(e.target.value)}
            rows={4}
            className="font-display"
          />
          <p className="text-xs text-muted-foreground font-display">
            Write a clear, concise update about the work completed or progress made.
          </p>
        </div>

        <Button
          onClick={handleSendActivity}
          disabled={sending || !activityText.trim()}
          className="w-full font-display"
        >
          <Send className="w-4 h-4 mr-2" />
          {sending ? 'Sending...' : 'Send Activity to User'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RecentActivityMessaging;
