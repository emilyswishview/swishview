import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/looseClient";
import {
  Clock,
  CheckCircle,
  FileBarChart,
  Loader2,
  ArrowRight,
  BarChart3,
  Lightbulb,
  Target,
  Sparkles,
  Lock,
} from "lucide-react";

const FreeReport = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [result, setResult] = useState<{ remaining: number } | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.email) setEmail(data.session.user.email);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user?.email) setEmail(newSession.user.email);
      }
    );

    return () => subscription.unsubscribe();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      toast({
        title: "Please sign in",
        description: "Sign in so we can attach the report to your account.",
        variant: "destructive",
      });
      navigate("/login?redirect=/free-report");
      return;
    }

    if (!email.trim() || !channelUrl.trim()) {
      toast({
        title: "Missing details",
        description: "Email and channel link are required.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc(
        "submit_free_report_request",
        {
          _email: email.trim(),
          _channel_url: channelUrl.trim(),
          _phone: phone.trim(),
        }
      );

      if (error) throw error;

      const res = data as any;

      if (!res?.ok) {
        if (res?.reason === "limit_reached") {
          setLimitReached(true);
          setResult(null);

          toast({
            title: "Free reports used up",
            description:
              "This channel has already received its 2 free reports.",
            variant: "destructive",
          });

          return;
        }

        if (res?.reason === "auth_required") {
          navigate("/login?redirect=/free-report");
          throw new Error("Please sign in to request a report.");
        }

        throw new Error("Please check the details and try again.");
      }

      // Notify the team by email (non-critical)
      try {
        await supabase.functions.invoke("send-support-email", {
          body: {
            userEmail: res.email || email.trim(),
            userName: res.name || res.email || email.trim(),
            subject: `Free Report Request — ${channelUrl.trim()}`,
            message: `A free YouTube channel report was requested.\n\nChannel: ${channelUrl.trim()}\nPhone: ${
              phone.trim() || "not provided"
            }\nRequested by: ${res.name || ""} (${res.email || email.trim()})`,
            requestType: "channel_report",
            requestId: res.id,
          },
        });
      } catch (notifyError) {
        console.error("Free report notification failed:", notifyError);
      }

      setLimitReached(false);
      setResult({ remaining: res.remaining ?? 0 });

      setChannelUrl("");
      setPhone("");

      toast({
        title: "Request received",
        description:
          "Your report will land in your inbox within 12–24 hours.",
      });
    } catch (err: any) {
      toast({
        title: "Something went wrong",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };


  const handlePay = async () => {
    setPayLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-report-payment-link",
        { body: {} }
      );

      if (error) throw error;
      if (!data?.url) {
        throw new Error("Payment link unavailable right now.");
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({
        title: "Payment error",
        description: err.message || "Could not open checkout.",
        variant: "destructive",
      });
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Free YouTube Channel Report in 12–24 Hours | Swish View"
        description="Get a free YouTube channel performance report delivered within 12–24 hours."
        keywords="free youtube channel report, youtube audit, channel performance report, weekly youtube report"
        url="https://www.swishview.com/free-report"
        canonical="https://www.swishview.com/free-report"
      />

      <Navbar />

      <main className="relative overflow-hidden pt-28 pb-20">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px]">
          <div className="absolute left-1/2 top-0 h-[350px] w-[700px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
        </div>

        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

          {/* HERO */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700">
              <Sparkles className="h-4 w-4" />
              Free YouTube Channel Analysis
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Know exactly what&apos;s
              <span className="text-orange-500"> holding your channel back.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Get a detailed breakdown of your YouTube channel — what&apos;s
              working, what isn&apos;t, and what you should fix next.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                12–24 hour delivery
              </span>

              <span className="inline-flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-orange-500" />
                2 reports free
              </span>

              <span className="inline-flex items-center gap-2">
                <FileBarChart className="h-4 w-4 text-orange-500" />
                Human analysis
              </span>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">

            {/* FREE REPORT */}
            <Card className="overflow-hidden border-border/70 shadow-sm">
              <CardHeader className="border-b bg-muted/20 px-6 py-6 sm:px-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <FileBarChart className="h-5 w-5" />
                  </div>

                  <div>
                    <CardTitle className="text-xl">
                      Get your free report
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Takes less than 60 seconds.
                    </CardDescription>
                  </div>
                </div>

                {/* Steps */}
                <div className="flex items-center gap-2 pt-2 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white">
                      1
                    </span>
                    Submit channel
                  </span>

                  <div className="h-px w-8 bg-border" />

                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                      2
                    </span>
                    We analyze
                  </span>

                  <div className="h-px w-8 bg-border" />

                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                      3
                    </span>
                    Get report
                  </span>
                </div>
              </CardHeader>

              <CardContent className="px-6 py-7 sm:px-8">
                <form onSubmit={handleSubmit} className="space-y-5">

                  {authChecked && !session && (
                    <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        Sign in first so your report and channel details stay
                        linked to your account.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      readOnly={!!session}
                      placeholder="you@example.com"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      {session
                        ? "Your report goes to your account email."
                        : "We'll send your report here."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="channel">
                      YouTube channel link
                    </Label>

                    <Input
                      id="channel"
                      required
                      value={channelUrl}
                      onChange={(e) => setChannelUrl(e.target.value)}
                      placeholder="https://youtube.com/@yourchannel"
                      className="h-11"
                    />

                    <p className="text-xs text-muted-foreground">
                      Your channel URL — not an individual video.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone number{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>

                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 000 1234"
                      className="h-11"
                    />
                  </div>

                  {authChecked && !session ? (
                    <Button
                      type="button"
                      onClick={() => navigate("/login?redirect=/free-report")}
                      className="h-12 w-full bg-orange-500 text-base font-semibold hover:bg-orange-600"
                    >
                      Sign in to continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submitting || !authChecked}
                      className="h-12 w-full bg-orange-500 text-base font-semibold hover:bg-orange-600"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending request...
                        </>
                      ) : (
                        <>
                          Get my free report
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}


                  <p className="text-center text-xs text-muted-foreground">
                    No payment required. 2 free reports per channel.
                  </p>
                </form>

                {result && (
                  <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    <div className="flex gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />

                      <div>
                        <p className="font-semibold">
                          Report request received
                        </p>

                        <p className="mt-1">
                          Your report will arrive within 12–24 hours.
                          {result.remaining > 0
                            ? ` You have ${result.remaining} free report${
                                result.remaining > 1 ? "s" : ""
                              } remaining.`
                            : " That was your last free report."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {limitReached && (
                  <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                    <p className="font-semibold">
                      You&apos;ve used both free reports
                    </p>
                    <p className="mt-1">
                      Upgrade to the weekly plan to keep receiving reports.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* WEEKLY PLAN */}
            <Card className="relative overflow-hidden border-orange-200 shadow-sm">
              <div className="absolute right-4 top-4 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                Most useful
              </div>

              <CardHeader className="px-6 py-7 sm:px-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <BarChart3 className="h-5 w-5" />
                </div>

                <CardTitle className="text-2xl">
                  Weekly Channel Reports
                </CardTitle>

                <CardDescription className="mt-2 leading-6">
                  Stop guessing. Get fresh insights every week and know
                  exactly what to improve.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 pb-7 sm:px-7">

                <div className="mb-7 flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight">
                    $50
                  </span>
                  <span className="text-muted-foreground">
                    / month
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      icon: BarChart3,
                      title: "Weekly performance report",
                      description: "Track what changed and why.",
                    },
                    {
                      icon: Target,
                      title: "Video-by-video breakdown",
                      description: "Find your winners and weak spots.",
                    },
                    {
                      icon: Lightbulb,
                      title: "Actionable recommendations",
                      description: "Titles, thumbnails, SEO and growth.",
                    },
                    {
                      icon: Clock,
                      title: "Priority delivery",
                      description: "Fresh report within 12–24 hours.",
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.title}
                        className="flex gap-3"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="my-7 border-t" />

                <Button
                  onClick={handlePay}
                  disabled={payLoading}
                  className="h-12 w-full bg-orange-500 text-base font-semibold hover:bg-orange-600"
                >
                  {payLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening checkout...
                    </>
                  ) : (
                    <>
                      Start weekly reports
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Cancel anytime
                  <span>•</span>
                  Secure Stripe checkout
                </div>
              </CardContent>
            </Card>
          </div>

          {/* WHAT'S INCLUDED */}
          <div className="mx-auto mt-14 max-w-5xl">
            <div className="mb-7 text-center">
              <h2 className="text-2xl font-bold tracking-tight">
                What&apos;s inside your report?
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Clear insights you can actually use.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: BarChart3,
                  title: "Channel performance",
                  text: "Growth, views, watch time and engagement.",
                },
                {
                  icon: Target,
                  title: "Content analysis",
                  text: "Identify which videos are driving your growth.",
                },
                {
                  icon: Lightbulb,
                  title: "What to fix next",
                  text: "Specific recommendations for your next moves.",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-xl border bg-card p-5"
                  >
                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                      <Icon className="h-4 w-4" />
                    </div>

                    <h3 className="font-semibold">
                      {item.title}
                    </h3>

                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BOTTOM TRUST */}
          <div className="mt-12 text-center">
            <p className="text-xs text-muted-foreground">
              Your information is only used to deliver your report.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FreeReport;

