import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/looseClient";
import { Clock, CheckCircle, FileBarChart, Loader2 } from "lucide-react";

const FreeReport = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [result, setResult] = useState<{ remaining: number } | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !channelUrl.trim()) {
      toast({ title: "Missing details", description: "Email and channel link are required.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("submit_free_report_request", {
        _email: email.trim(),
        _channel_url: channelUrl.trim(),
        _phone: phone.trim(),
      });

      if (error) throw error;

      const res = data as any;
      if (!res?.ok) {
        if (res?.reason === "limit_reached") {
          setLimitReached(true);
          setResult(null);
          toast({
            title: "Free reports used up",
            description: "This channel has already received its 2 free reports. Continue with the weekly plan below.",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Please check the details and try again.");
      }

      setLimitReached(false);
      setResult({ remaining: res.remaining ?? 0 });
      setEmail("");
      setChannelUrl("");
      setPhone("");
      toast({ title: "Request received", description: "Your report will land in your inbox within 12–24 hours." });
    } catch (err: any) {
      toast({ title: "Something went wrong", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async () => {
    setPayLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-report-payment-link", { body: {} });
      if (error) throw error;
      if (!data?.url) throw new Error("Payment link unavailable right now.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({ title: "Payment error", description: err.message || "Could not open checkout.", variant: "destructive" });
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Free YouTube Channel Report in 12–24 Hours | Swish View"
        description="Get a free YouTube channel performance report delivered within 12–24 hours. Two free reports per channel, then upgrade to weekly reports for $50."
        keywords="free youtube channel report, youtube audit, channel performance report, weekly youtube report"
        url="https://www.swishview.com/free-report"
        canonical="https://www.swishview.com/free-report"
      />
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Get Your Free Channel Report
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Share your channel and we send back a full performance breakdown — growth, watch time, titles,
              thumbnails and what to fix next.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" /> Delivered in 12–24 hours
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-orange-500" /> 2 free reports per channel
              </span>
              <span className="inline-flex items-center gap-2">
                <FileBarChart className="h-4 w-4 text-orange-500" /> Built by real analysts
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Request your report</CardTitle>
                <CardDescription>Free for the first 2 reports on each channel link.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="channel">YouTube channel link</Label>
                    <Input
                      id="channel"
                      required
                      value={channelUrl}
                      onChange={(e) => setChannelUrl(e.target.value)}
                      placeholder="https://www.youtube.com/@yourchannel"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 000 1234"
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitting ? "Sending..." : "Get my free report"}
                  </Button>
                </form>

                {result && (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    Request received. Your report arrives within 12–24 hours.{" "}
                    {result.remaining > 0
                      ? `You have ${result.remaining} free report left for this channel.`
                      : "That was the last free report for this channel."}
                  </div>
                )}

                {limitReached && (
                  <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                    This channel already used both free reports. Continue with weekly reports for $50.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-xl">Weekly Report Plan</CardTitle>
                <CardDescription>Keep the insights coming every single week.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-foreground">$50</span>
                  <span className="pb-1 text-muted-foreground">/ week</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    "A fresh channel report every week",
                    "Video-by-video performance breakdown",
                    "Title, thumbnail and SEO recommendations",
                    "Priority delivery within 12–24 hours",
                    "Cancel anytime",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={handlePay} disabled={payLoading} className="w-full bg-orange-500 hover:bg-orange-600">
                  {payLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {payLoading ? "Opening checkout..." : "Pay $50 — Weekly Reports"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">Secure checkout powered by Stripe.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FreeReport;
