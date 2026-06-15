import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import SwishViewLogo from "@/components/SwishViewLogo";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Rocket, TrendingUp, Video, FileText, BarChart3, Eye,
  ArrowRight, CheckCircle2, Zap, DollarSign
} from "lucide-react";
import { notifyUserActivity } from "@/utils/notifyActivity";

const VIEW_RATE_MIN = 75; // views per dollar (min)
const VIEW_RATE_MAX = 100; // views per dollar (max)

const Boost = () => {
  const [amount, setAmount] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const numAmount = parseFloat(amount) || 0;
  const minViews = Math.round(numAmount * VIEW_RATE_MIN);
  const maxViews = Math.round(numAmount * VIEW_RATE_MAX);

  const formatViews = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
  };

  const handleCheckout = async () => {
    if (!email || !channelUrl || numAmount < 50) {
      toast({
        title: "Missing Information",
        description: "Please fill all fields. Minimum amount is $50.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Notify admin about boost attempt before checkout
      await notifyUserActivity({
        type: "boost_attempt",
        data: {
          email,
          name,
          channelUrl,
          amount: numAmount,
          minViews,
          maxViews,
        },
      });

      const { data, error } = await supabase.functions.invoke("create-boost-checkout", {
        body: {
          amount: numAmount,
          email,
          name,
          channelUrl,
          minViews,
          maxViews,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Video, title: "New Video Promotion", desc: "Every new upload gets promoted to targeted audiences automatically" },
    { icon: FileText, title: "Blog Creation", desc: "SEO-optimized blog posts created for every video to drive organic traffic" },
    { icon: TrendingUp, title: "Channel Content Promotion", desc: "Overall channel growth with strategic content distribution" },
    { icon: BarChart3, title: "Real-Time Tracking", desc: "Live promotion analytics on your dashboard with detailed insights" },
  ];

  const presets = [100, 200, 300, 500, 1000];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <SEOHead
        title="Promote Your YouTube Channel — Real Views & Growth | Swish View"
        description="Boost your YouTube channel with real, targeted views. Choose your investment from $100+ and watch your channel grow with Swish View's promotion engine."
        keywords="promote youtube channel, buy youtube views, youtube channel growth, video promotion, real youtube views, swishview boost"
        url="https://www.swishview.com/channel-growth"
        canonical="https://www.swishview.com/channel-growth"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "YouTube Channel Promotion",
          serviceType: "YouTube Promotion",
          provider: { "@type": "Organization", name: "Swish View" },
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: "100",
            priceSpecification: { "@type": "PriceSpecification", priceCurrency: "USD", minPrice: "100" }
          }
        }}
      />
      {/* Navbar */}
      <nav className="bg-background/80 backdrop-blur-md shadow-sm border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="cursor-pointer" onClick={() => navigate("/")}>
              <SwishViewLogo />
            </div>
            <Button variant="outline" onClick={() => navigate("/login")} className="text-sm">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1">
              <Rocket className="h-3.5 w-3.5 mr-1.5" /> Channel Boost Program
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight">
              Supercharge Your <span className="text-primary">YouTube Channel</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Get guaranteed views, automated blog creation, and full channel promotion — all tracked in real-time on your dashboard.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {features.map((f, i) => (
              <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-sm">{f.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Choose Your Investment */}
      <section className="relative py-16">
        <div className="absolute inset-0 bg-gradient-to-tl from-primary/10 via-orange-50/50 to-primary/5" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display text-2xl flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Choose Your Investment — Start Your Channel Promotion
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your budget — views scale proportionally at $100 = 7.5K–10K views
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presets */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Quick Select</Label>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <Button
                    key={p}
                    variant={numAmount === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(p.toString())}
                    className="text-sm"
                  >
                    ${p}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <Label htmlFor="amount" className="text-sm font-medium">Custom Amount (USD)</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input
                  id="amount"
                  type="number"
                  min={50}
                  step={50}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount (min $50)"
                  className="pl-7 text-lg font-semibold"
                />
              </div>
            </div>

            {/* View Estimation */}
            {numAmount >= 50 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Estimated Views</span>
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div className="text-3xl font-display font-bold text-primary">
                  {formatViews(minViews)} — {formatViews(maxViews)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Views delivered across your channel content over the promotion period
                </p>
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="channelUrl" className="text-sm font-medium">YouTube Channel URL</Label>
                <Input
                  id="channelUrl"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                  className="mt-1.5"
                />
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={loading || numAmount < 50 || !email || !channelUrl}
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  Proceed to Payment — ${numAmount || 0}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        </div>
      </section>
    </div>
  );
};

export default Boost;
