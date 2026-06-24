import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Rocket, Video, FileSearch, Target, Zap, Shield, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InstantAuditCTA } from "@/components/InstantAuditCTA";

const Product = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [channelUrl, setChannelUrl] = useState("");
  const [channelData, setChannelData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleChannelSubmit = async () => {
    if (!channelUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid YouTube channel URL",
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('youtube-channel-analytics', {
        body: { channelUrl },
      });

      if (response.error) throw response.error;
      
      setChannelData(response.data);
    } catch (error: any) {
      console.error('Error fetching channel data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch channel data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuditPayment = () => {
    navigate('/payment', { 
      state: { 
        service: 'channel_audit',
        amount: 29,
        channelUrl,
        channelData 
      } 
    });
  };

  const services = [
    {
      icon: Play,
      title: "Video Promotion",
      description: "Get more views and engagement on your videos.",
      features: [
        "Real people watching no bots or fake views",
        "Choose how many viewers you'd like to gain",
        "Pick your audience region to target the right viewers",
        "Easy to use dashboard to track your growth",
        "Dedicated manager to guide and support you anytime"
      ],
      buttonText: "Click here to start",
      buttonVariant: "default" as const,
      available: true,
      action: () => navigate("/create-promotion")
    },
    {
      icon: Rocket,
      title: "Channel Optimization & Promotion",
      description: "Grow your whole channel with SEO and long term strategies.",
      features: [
        "Complete channel and video optimization",
        "SEO with keywords, titles, tags, and thumbnails",
        "Reach audiences truly interested in your content",
        "Growth dashboard with insights and updates",
        "Personal SEO expert to guide your journey"
      ],
      buttonText: "Click here to start",
      buttonVariant: "default" as const,
      available: true,
      action: () => navigate("/create-seo")
    },
    /* {
      icon: FileSearch,
      title: "YouTube Channel Audit - 1 Week Performance Checkup",
      description: "Find out exactly what's holding your channel back and what to fix for better reach.",
      features: [
        "Review of your channel's current performance and structure",
        "Analysis of recent videos and engagement trends",
        "Insights on how YouTube's algorithm reads your content",
        "Audience and discovery review to reveal growth gaps",
        "Personalized improvement report delivered within 7 days"
      ],
      buttonText: "Click to continue",
      buttonVariant: "default" as const,
      available: true,
      action: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login');
          return;
        }
        setShowAuditModal(true);
      }
    },*/
    {
      icon: Video,
      title: "YouTube Video Editing & Enhancement",
      description: "Whether your video is uploaded or still waiting to go live we make it ready to perform better.",
      features: [
        "Re-edit uploaded videos to improve watch time & engagement",
        "Professionally edit new content before upload",
        "Add hooks, intros/outros, subtitles, and graphics",
        "Optimize length, flow, and style for YouTube's algorithm",
        "Deliver polished, HD/4K YouTube ready files"
      ],
      buttonText: "Coming Soon",
      buttonVariant: "default" as const,
      available: false,
      action: () => {}
    },
   
  ];

  const benefits = [
    {
      icon: Target,
      title: "Targeted Growth",
      description: "Reach your ideal audience with precision targeting and strategic promotion"
    },
    {
      icon: Zap,
      title: "Fast Results",
      description: "See measurable growth in views and engagement within days, not months"
    },
    {
      icon: Shield,
      title: "Safe & Compliant",
      description: "100% organic growth methods that comply with YouTube's terms of service"
    },
    {
      icon: Users,
      title: "Expert Support",
      description: "Dedicated account managers and 24/7 customer support"
    }
  ];

  return (
    <>
      <SEOHead 
        title="YouTube Growth Services — Promotion, SEO & Editing | Swish View"
        description="Complete YouTube growth suite: video promotion, channel SEO, thumbnail design, audits, and editing. Real views, real subscribers, real growth."
        keywords="youtube growth services, video promotion, youtube seo, channel optimization, thumbnail design, swishview products"
        url="https://www.swishview.com/product"
        canonical="https://www.swishview.com/product"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "YouTube Growth & Promotion",
          provider: { "@type": "Organization", name: "Swish View", url: "https://www.swishview.com" },
          areaServed: "Worldwide",
          description: "Video promotion, channel SEO, thumbnail design, channel audits, and editing for YouTube creators."
        }}
      />
      <div className="min-h-screen bg-background">
        <Navbar />
        
        {/* Hero Section */}
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-background to-muted/20">
          <div className="container mx-auto max-w-7xl text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Rocket className="w-3 h-3 mr-1" />
              Complete YouTube Growth Suite
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
              Products & Services
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Everything you need to grow your YouTube channel, increase engagement, 
              and maximize your reach with professional-grade tools and services.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/signup")} className="group">
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/contact")}>
                Contact Us
              </Button>
            </div>
          </div>
        </section>

        {/* Instant Audit CTA */}
        <InstantAuditCTA />

        {/* Main Services Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                Our Services
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Choose from our suite of professional YouTube growth services
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => {
                const Icon = service.icon;
                const isComingSoon = !service.available;
                
                return (
                  <div 
                    key={index} 
                    className={`p-8 rounded-2xl flex flex-col ${
                      isComingSoon 
                        ? 'bg-muted/30' 
                        : 'bg-background border-2 border-border'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-6 ${
                      isComingSoon 
                        ? 'bg-muted' 
                        : 'bg-primary/10'
                    }`}>
                      <Icon className={`w-7 h-7 ${
                        isComingSoon 
                          ? 'text-muted-foreground' 
                          : 'text-primary'
                      }`} />
                    </div>

                    {/* Title */}
                    <h3 className={`text-2xl font-bold mb-4 ${
                      isComingSoon 
                        ? 'text-muted-foreground' 
                        : 'text-foreground'
                    }`}>
                      {service.title}
                    </h3>

                    {/* Description */}
                    <p className={`mb-6 ${
                      isComingSoon 
                        ? 'text-muted-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {service.description}
                    </p>

                    {/* Features List */}
                    <ul className="space-y-3 mb-8 flex-1">
                      {service.features.map((feature, idx) => (
                        <li 
                          key={idx} 
                          className={`flex items-start gap-2 text-sm ${
                            isComingSoon 
                              ? 'text-muted-foreground/70' 
                              : 'text-muted-foreground'
                          }`}
                        >
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                            isComingSoon 
                              ? 'bg-muted-foreground/40' 
                              : 'bg-primary'
                          }`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button 
                      className="w-full rounded-full text-base py-6 mt-auto"
                      variant={service.buttonVariant}
                      onClick={service.action}
                      disabled={isComingSoon}
                    >
                      {service.buttonText}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                Why Choose SwishView?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Trusted by thousands of creators worldwide
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="text-center p-6 rounded-lg bg-background/50 hover:bg-background transition-colors">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary to-primary/80">
          <div className="container mx-auto max-w-4xl text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Ready to Grow Your Channel?
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Join thousands of creators who have accelerated their YouTube success with SwishView
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate("/signup")}
                className="group"
              >
                Start Your Campaign
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/contact")}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </section>

        {/* Channel Audit Modal */}
        <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">YouTube Channel Audit</DialogTitle>
              <DialogDescription>
                Enter your YouTube channel URL to get started with your performance checkup
              </DialogDescription>
            </DialogHeader>

            {!channelData ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="channel-url">YouTube Channel URL</Label>
                  <Input
                    id="channel-url"
                    placeholder="https://www.youtube.com/@yourchannel"
                    value={channelUrl}
                    onChange={(e) => setChannelUrl(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleChannelSubmit} 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Fetching Channel Data..." : "Continue"}
                </Button>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{channelData.videoCount || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Videos</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">{channelData.viewCount || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Views</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">{channelData.subscriberCount || 0}</div>
                        <div className="text-sm text-muted-foreground">Subscribers</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">You will be assigned a YouTube Growth Expert</h3>
                      <p className="text-sm text-muted-foreground">
                        They'll personally review your channel and share a detailed report with a clear roadmap to grow your channel faster and more effectively.
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleAuditPayment}
                    className="w-full"
                    size="lg"
                  >
                    Click here to complete your $29 Channel Audit
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Footer />
      </div>
    </>
  );
};

export default Product;
