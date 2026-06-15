import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSearch, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { notifyUserActivity } from "@/utils/notifyActivity";

interface InstantAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstantAuditModal = ({ isOpen, onClose }: InstantAuditModalProps) => {
  const [channelUrl, setChannelUrl] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const validateYouTubeUrl = (url: string): boolean => {
    if (!url) return false;
    
    // Accept various YouTube channel formats
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/@[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/channel\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/c\/[\w-]+/,
      /^@[\w-]+$/,
    ];
    
    return patterns.some(pattern => pattern.test(url));
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isFormValid = validateYouTubeUrl(channelUrl) && validateEmail(email);

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      // Notify admin about audit purchase attempt
      await notifyUserActivity({
        type: "audit_attempt",
        data: {
          email,
          channelUrl,
          amount: 29,
        },
      });

      // Create checkout session for the audit
      const { data, error } = await supabase.functions.invoke('create-audit-checkout', {
        body: {
          channelUrl,
          email,
          amount: 2900,
          returnUrl: window.location.origin,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setChannelUrl("");
      setEmail("");
      setSuccess(false);
      onClose();
    }
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-green-500/10 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl">Payment Successful!</DialogTitle>
            </DialogHeader>
            <p className="mb-2 text-lg font-medium">
              Your audit report will be delivered to
            </p>
            <p className="mb-4 text-primary font-semibold">{email}</p>
            <p className="text-muted-foreground text-sm">
              We'll email your personalized report shortly. Thanks for choosing SwishView.
            </p>
            <Button onClick={handleClose} className="mt-6">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileSearch className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl">
              Instant YouTube Channel Audit
            </DialogTitle>
          </div>
          <p className="text-muted-foreground">
            Get a quick performance checkup and personalized improvement report sent to your inbox.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="channel">YouTube Channel</Label>
            <Input
              id="channel"
              placeholder="Paste your channel URL or type your @handle"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              disabled={loading}
            />
            {channelUrl && !validateYouTubeUrl(channelUrl) && (
              <p className="text-sm text-destructive">
                Please enter a valid YouTube channel URL or @handle
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Examples: https://youtube.com/@handle, @channelname, or full URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            {email && !validateEmail(email) && (
              <p className="text-sm text-destructive">
                Please enter a valid email address
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              We'll send your personal audit report to this email.
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="font-semibold">What's included:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Review of your channel's current performance and structure</li>
              <li>• Analysis of recent videos and engagement trends</li>
              <li>• Insights on how YouTube's algorithm reads your content</li>
              <li>• Audience and discovery review to reveal growth gaps</li>
              <li>• Personalized improvement report delivered within 7 days</li>
            </ul>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Continue to Payment — $29</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};