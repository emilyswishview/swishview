import { supabase } from "@/integrations/supabase/client";

export type ActivityType = 
  | "new_signup" 
  | "contact_message" 
  | "seo_purchase" 
  | "campaign_created" 
  | "payment_completed"
  | "user_request"
  | "newsletter_subscription"
  | "boost_attempt"
  | "audit_attempt";

export interface NotifyActivityParams {
  type: ActivityType;
  data: Record<string, any>;
}

export const notifyUserActivity = async ({ type, data }: NotifyActivityParams): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke("notify-user-activity", {
      body: { type, data },
    });

    if (error) {
      console.error("Failed to send activity notification:", error);
    } else {
      console.log(`Activity notification sent: ${type}`);
    }
  } catch (error) {
    // Don't throw - notifications are non-critical
    console.error("Error sending activity notification:", error);
  }
};
