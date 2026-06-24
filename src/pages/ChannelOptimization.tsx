import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import { Rocket, ArrowRight, CheckCircle2, Search, Tags, Image, TrendingUp, Users, BarChart3 } from "lucide-react";
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

const ChannelOptimization = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Search, title: "Full Channel SEO Audit", description: "We analyze every aspect of your channel — titles, descriptions, tags, thumbnails, and metadata — to find optimization opportunities." },
    { icon: Tags, title: "Keyword & Tag Optimization", description: "Research and apply the highest-performing keywords and tags so your videos rank higher in YouTube search results." },
    { icon: Image, title: "Thumbnail & Title Strategy", description: "Get expert guidance on creating click-worthy thumbnails and titles that increase your click-through rate." },
    { icon: TrendingUp, title: "Long-Term Growth Strategy", description: "We don't just optimize once — we build a sustainable growth roadmap tailored to your content niche." },
    { icon: Users, title: "Personal SEO Expert", description: "Work directly with a dedicated SEO specialist who understands YouTube's algorithm inside and out." },
    { icon: BarChart3, title: "Growth Dashboard & Insights", description: "Track your channel's SEO performance, keyword rankings, and growth metrics from a single dashboard." },
  ];

  const benefits = [
    "Higher search rankings for your videos",
    "More organic traffic and discovery",
    "Increased click-through rate on thumbnails",
    "Better audience retention and watch time",
    "Targeted promotion to interested viewers",
    "Monthly performance reports and updates",
  ];

  const howItWorks = [
    { step: "01", title: "Channel Analysis", description: "We deep-dive into your channel's current SEO performance and identify gaps." },
    { step: "02", title: "Strategy & Optimization", description: "Our experts optimize your channel metadata, thumbnails, titles, and tags." },
    { step: "03", title: "Targeted Promotion", description: "We promote your channel to audiences genuinely interested in your content." },
    { step: "04", title: "Monitor & Refine", description: "Continuous tracking and adjustments to keep your growth trajectory climbing." },
  ];

  const faqs = [
    { q: "What does channel optimization include?", a: "It includes a full SEO audit, keyword research, title/tag/description optimization, thumbnail review, and a long-term growth strategy." },
    { q: "How long before I see results?", a: "Most creators begin seeing improved rankings and organic traffic within 2–4 weeks of optimization." },
    { q: "Do you handle everything or do I need to make changes?", a: "Our team handles all the optimization. We provide recommendations for thumbnails and titles that you can approve." },
    { q: "Is this a one-time service or ongoing?", a: "It's a monthly subscription — we continuously optimize and promote your channel for sustained growth." },
    { q: "Will this work for small channels?", a: "Absolutely. In fact, smaller channels often see the most dramatic improvements from proper SEO optimization." },
  ];

  return (
    <>
      <SEOHead
        title="Channel Optimization & Promotion - YouTube SEO | SwishView"
        description="Grow your YouTube channel with expert SEO optimization, keyword research, and targeted promotion. Get a dedicated SEO expert and track your growth."
      />
      <div className="min-h-screen bg-background overflow-hidden">
        <Navbar />

        {/* Hero */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="container mx-auto max-w-6xl text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1.5">
                <Rocket className="w-3.5 h-3.5 mr-1.5" />
                Channel Optimization & Promotion
              </Badge>
            </motion.div>
            <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Grow Your Channel with <br className="hidden sm:block" />
              <span className="text-primary">Expert YouTube SEO</span>
            </motion.h1>
            <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              Complete channel optimization with keyword research, metadata tuning, and targeted promotion — powered by a dedicated SEO expert.
            </motion.p>
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/create-seo")} className="group text-base px-8 py-6">
                Start Optimizing
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/contact")} className="text-base px-8 py-6">
                Talk to Us
              </Button>
            </motion.div>
          </div>
        </section>

        {/* What You Get */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">What's Included</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">A complete SEO & growth package for your YouTube channel</p>
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

        {/* Benefits */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Why Creators Choose This</h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((b, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} variants={slideInLeft} custom={i} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow duration-300">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">{b}</span>
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
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Ready to Optimize Your Channel?</h2>
            <p className="text-lg text-white/90 mb-8">Start ranking higher and growing faster with expert YouTube SEO</p>
            <Button size="lg" variant="secondary" onClick={() => navigate("/create-seo")} className="group text-base px-8 py-6">
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

export default ChannelOptimization;
