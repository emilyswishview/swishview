import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";

interface SessionData {
  email: string;
  channelUrl?: string;
  amount?: number;
}

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!sessionId) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase.functions.invoke(
          "get-checkout-session",
          {
            body: { sessionId }
          }
        );

        if (fetchError) throw fetchError;

        setSessionData({
          email: data.email,
          channelUrl: data.channelUrl,
          amount: data.amount
        });
      } catch (err) {
        console.error("Error fetching session:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [searchParams]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/20">
          <CardContent className="p-12 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Unable to Verify Payment</h1>
            <p className="text-muted-foreground">
              We couldn't verify your payment session. Please check your email for confirmation or contact support if you need assistance.
            </p>
            <Button onClick={() => navigate("/")} className="mt-6">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardContent className="p-8 sm:p-12 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Payment Successful!
            </h1>
            <p className="text-lg text-muted-foreground">
              Your SwishView audit report will be delivered to{" "}
              <span className="font-semibold text-foreground">{sessionData.email}</span>
            </p>
          </div>

          <div className="rounded-xl bg-card border p-6 space-y-3 text-left">
            <h3 className="font-semibold text-lg text-center mb-4">Order Details</h3>
            
            {sessionData.channelUrl && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">YouTube Channel:</p>
                <p className="font-medium break-all">{sessionData.channelUrl}</p>
              </div>
            )}
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Delivery Email:</p>
              <p className="font-medium">{sessionData.email}</p>
            </div>

            {sessionData.amount && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Amount Paid:</p>
                <p className="font-medium">${(sessionData.amount / 100).toFixed(2)}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <p className="text-sm font-medium">
              ✓ We've also sent a confirmation to your inbox
            </p>
          </div>

          <div className="pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Your personalized YouTube channel audit will be delivered within 7 days. 
              A SwishView expert will personally review your channel and send detailed recommendations.
            </p>
            <Button 
              onClick={() => navigate("/")} 
              size="lg"
              className="w-full sm:w-auto"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
