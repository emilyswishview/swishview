import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import { InstantAuditCTA } from "@/components/InstantAuditCTA";
import { FileSearch, ArrowRight, CheckCircle2, BarChart3, Eye, TrendingUp, Users, Lightbulb, ClipboardCheck } from "lucide-react";
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

const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

const ChannelAudit = () => {
  const navigate = useNavigate();

  const features = [
    { icon: BarChart3, title: "Performance Deep Dive", description: "We review your channel's overall performance including views, subscribers, engagement rate, and growth trends." },
    { icon: Eye, title: "Video-Level Analysis", description: "Each of your recent videos is analyzed for watch time, retention, CTR, and discoverability." },
    { icon: TrendingUp, title: "Algorithm Readiness Check", description: "Understand how YouTube's algorithm perceives your content and what signals you're sending." },
    { icon: Users, title: "Audience & Discovery Review", description: "We identify where your audience comes from and uncover untapped discovery opportunities." },
    { icon: Lightbulb, title: "Actionable Recommendations", description: "Get a clear, prioritized list of changes that will have the biggest impact on your channel growth." },
    { icon: ClipboardCheck, title: "Personalized Report in 7 Days", description: "Your detailed audit report is delivered within 7 days, written specifically for your channel." },
  ];

  const whatYouGet = [
    "Full review of channel structure and branding",
    "Analysis of your top-performing and underperforming videos",
    "SEO health check — titles, tags, descriptions, thumbnails",
    "Audience demographics and traffic source breakdown",
    "Competitor benchmarking within your niche",
    "Personalized growth roadmap with next steps",
  ];

  const howItWorks = [
    { step: "01", title: "Enter Your Channel URL", description: "Provide your YouTube channel link — no sign-in required to get started." },
    { step: "02", title: "Pay $29 One-Time Fee", description: "A single payment gets you a full professional channel audit." },
    { step: "03", title: "Expert Reviews Your Channel", description: "A YouTube Growth Expert personally analyzes every aspect of your channel." },
    { step: "04", title: "Receive Your Report", description: "Get your detailed audit report with actionable recommendations within 7 days." },
  ];

  const faqs = [
    { q: "What exactly is a channel audit?", a: "It's a comprehensive review of your YouTube channel's performance, SEO, content strategy, and growth potential — performed by a human expert, not a tool." },
    { q: "Do I need to sign in or give access to my channel?", a: "No. You just need to provide your channel URL. We analyze all publicly available data along with YouTube analytics insights." },
    { q: "How long does the audit take?", a: "Your personalized report is delivered within 7 days of payment." },
    { q: "Who performs the audit?", a: "A dedicated YouTube Growth Expert with deep experience in channel optimization and YouTube's algorithm." },
    { q: "Is this a one-time thing or a subscription?", a: "The channel audit is a monthly subscription at $29/month. You can cancel anytime after receiving your report." },
    { q: "What if my channel is brand new?", a: "Even better — we'll help you start on the right foot with foundational recommendations for growth." },
  ];

  return (
    <>
      <SEOHead
        title="YouTube Channel Audit - $29 Expert Review | SwishView"
        description="Get a professional YouTube channel audit from a dedicated growth expert. Performance analysis, SEO review, and personalized growth roadmap delivered in 7 days."
      />
      <div className="min-h-screen bg-background overflow-hidden">
        <Navbar />

        {/* Hero */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="container mx-auto max-w-6xl text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1.5">
                <FileSearch className="w-3.5 h-3.5 mr-1.5" />
                Channel Audit
              </Badge>
            </motion.div>
            <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Find Out What's Holding <br className="hidden sm:block" />
              <span className="text-primary">Your Channel Back</span>
            </motion.h1>
            <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
              A professional, human-reviewed audit of your YouTube channel with a clear roadmap to grow faster and smarter.
            </motion.p>
            <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2.5} className="text-2xl font-display font-bold text-primary mb-10">Just $29 / month</motion.p>
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/product")} className="group text-base px-8 py-6">
                Get Your Audit
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/contact")} className="text-base px-8 py-6">
                Talk to Us
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Instant Audit CTA */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}>
          <InstantAuditCTA />
        </motion.div>

        {/* Features */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">What We Analyze</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">A thorough review of every factor affecting your channel's growth</p>
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

        {/* What You Get */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Your Audit Report Includes</h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 gap-4">
              {whatYouGet.map((item, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} variants={slideInLeft} custom={i} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow duration-300">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">How It Works</h2>
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
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
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
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Get Your Channel Audit Today</h2>
            <p className="text-lg text-white/90 mb-8">A YouTube Growth Expert will personally review your channel and deliver a roadmap for success</p>
            <Button size="lg" variant="secondary" onClick={() => navigate("/product")} className="group text-base px-8 py-6">
              Start for $29
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.section>

        <Footer />
      </div>
    </>
  );
};

export default ChannelAudit;
