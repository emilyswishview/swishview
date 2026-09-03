import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import { Play, ArrowRight, CheckCircle2, Eye, Globe, BarChart3, Users, Zap, Shield, TrendingUp, Target } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

const VideoPromotion = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Eye, title: "Real Viewers, Real Growth", description: "Every view comes from real people genuinely interested in your content — no bots, no fake engagement." },
    { icon: Globe, title: "Region Targeting", description: "Choose your audience's location to reach the viewers most relevant to your niche and language." },
    { icon: BarChart3, title: "Live Tracking Dashboard", description: "Monitor views, engagement, and growth in real-time from your personal dashboard." },
    { icon: Users, title: "Dedicated Account Manager", description: "A personal manager guides your promotion strategy and ensures maximum results." },
    { icon: Target, title: "Customizable View Goals", description: "Set exactly how many views you want — whether it's 1,000 or 100,000+." },
    { icon: Shield, title: "YouTube Safe & Compliant", description: "Our methods are 100% compliant with YouTube's Terms of Service. Your channel stays safe." },
  ];

  const howItWorks = [
    { step: "01", title: "Submit Your Video", description: "Paste your YouTube video URL and choose your target views and audience region." },
    { step: "02", title: "We Launch Your Promotion", description: "Our team sets up your promotion and begins driving real viewers to your content." },
    { step: "03", title: "Track Your Growth", description: "Watch your views climb in real-time from your dashboard with detailed analytics." },
    { step: "04", title: "See Results", description: "Enjoy increased visibility, higher rankings, and organic growth that follows." },
  ];

  const faqs = [
    { q: "Are the views from real people?", a: "Yes — we only deliver views from real users. We never use bots, click farms, or artificial inflation." },
    { q: "Is this safe for my YouTube channel?", a: "Absolutely. Our promotion methods comply fully with YouTube's Terms of Service. Your channel is never at risk." },
    { q: "How quickly will I see results?", a: "Most promotions begin delivering views within 24–48 hours of launch." },
    { q: "Can I choose which countries the views come from?", a: "Yes! You can target specific regions to reach the most relevant audience for your content." },
    { q: "Do I get a dedicated manager?", a: "Yes, every promotion comes with a dedicated account manager who supports you throughout." },
  ];

  return (
    <>
      <SEOHead
        title="Video Promotion - Get Real YouTube Views | SwishView"
        description="Boost your YouTube video with real views from real people. Target specific regions, track growth in real-time, and enjoy dedicated support. Start today."
      />
      <div className="min-h-screen bg-background overflow-hidden">
        <Navbar />

        {/* Hero */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="container mx-auto max-w-6xl text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1.5">
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Video Promotion
              </Badge>
            </motion.div>
            <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Get More Views on <br className="hidden sm:block" />
              <span className="text-primary">Your YouTube Videos</span>
            </motion.h1>
            <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              Real people watching your content, targeted to your ideal audience.
              No bots. No fake views. Just genuine growth that YouTube rewards.
            </motion.p>
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/create-promotion")} className="group text-base px-8 py-6">
                Start Your Promotion
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/contact")} className="text-base px-8 py-6">
                Talk to Us
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">What's Included</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Everything you need to amplify your video's reach</p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((f, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={scaleIn} custom={i} className="p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="container mx-auto max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground">Four simple steps to more views</p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {howItWorks.map((step, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} custom={i} className="text-center">
                  <motion.div className="text-5xl font-display font-bold text-primary/20 mb-3" whileHover={{ scale: 1.15, color: "hsl(var(--primary))" }} transition={{ duration: 0.2 }}>
                    {step.step}
                  </motion.div>
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-3xl">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-3xl sm:text-4xl font-display font-bold text-center mb-12">Frequently Asked Questions</motion.h2>
            <div className="space-y-6">
              {faqs.map((faq, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} variants={fadeUp} custom={i} className="p-6 rounded-xl border border-border bg-card hover:shadow-md transition-shadow duration-300">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary to-primary/80">
          <div className="container mx-auto max-w-4xl text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Ready to Boost Your Views?</h2>
            <p className="text-lg text-white/90 mb-8">Join thousands of creators growing their channels with SwishView</p>
            <Button size="lg" variant="secondary" onClick={() => navigate("/create-promotion")} className="group text-base px-8 py-6">
              Get Started Now
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.section>

        <Footer />
      </div>
    </>
  );
};

export default VideoPromotion;
