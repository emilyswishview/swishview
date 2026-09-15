import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhoWeAreTimeline from "@/components/WhoWeAreTimeline";
import TeamSection from "@/components/TeamSection";
import { Button } from "@/components/ui/button";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About Swish View | Our Story, Team & Mission</title>
        <meta
          name="description"
          content="Meet the Swish View team — niche-specialist YouTube SEO and growth managers helping creators grow with real, organic results since 2016."
        />
        
        <meta property="og:type" content="website" />
        <meta property="og:title" content="About Swish View | Our Story, Team & Mission" />
        <meta
          property="og:description"
          content="Meet the Swish View team — niche-specialist YouTube SEO and growth managers helping creators grow organically."
        />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Navbar />

      <main className="pt-24 md:pt-28 pb-16">
        <section className="section-container text-center max-w-3xl mx-auto px-5 sm:px-6">
          <span className="inline-block text-xs uppercase tracking-widest font-semibold text-primary mb-4">
            About us
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-foreground leading-tight mb-5">
            A team built only for organic YouTube growth
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Swish View pairs every creator with niche-specialist SEO and growth managers.
            No bots, no fake numbers — just strategies built around YouTube's real ranking
            signals, run by people who have done it for hundreds of channels.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link to="/request-callback">Talk to our team</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/product">See our services</Link>
            </Button>
          </div>
        </section>

        <WhoWeAreTimeline />
        <TeamSection />
      </main>

      <Footer />
    </div>
  );
};

export default About;
