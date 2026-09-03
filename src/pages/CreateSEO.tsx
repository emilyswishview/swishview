import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import {
  Sparkles,
  ArrowRight,
  Search,
  Target,
  TrendingUp,
  Zap,
  Users,
  BarChart3,
  Video,
  Check,
  Clock,
  ShieldCheck,
} from "lucide-react";

/* -------- lightweight reveal-on-scroll (matches /whyswishview) -------- */
const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = "" }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
};

const CreateSEO: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const openBooking = () => {
    navigate("/request-callback");
  };


  const pillars = [
    {
      icon: Search,
      title: "Deep SEO Audit",
      copy: "We tear down every title, tag, description, chapter, and end screen. Nothing hidden, no fluff — just the exact gaps holding your channel back.",
    },
    {
      icon: Target,
      title: "Niche Keyword Mapping",
      copy: "Purpose-built keyword clusters mapped to your niche and audience intent — not generic tags scraped off tools.",
    },
    {
      icon: Video,
      title: "Thumbnail & CTR Strategy",
      copy: "Frame-by-frame breakdown of your thumbnails against category leaders. We tell you what to change and why.",
    },
    {
      icon: TrendingUp,
      title: "Long-Term Growth Roadmap",
      copy: "A month-by-month plan tailored to your upload cadence, budget and goals. Not a checklist — a strategy.",
    },
    {
      icon: Users,
      title: "Dedicated SEO Lead",
      copy: "One senior specialist owns your channel end-to-end. Same person every call. No account manager relay.",
    },
    {
      icon: BarChart3,
      title: "Weekly Growth Reports",
      copy: "Real numbers, real deltas — impressions, CTR, watch time, keyword rank. Delivered every Monday.",
    },
  ];

  const proof = [
    { k: "10M+", v: "Views delivered" },
    { k: "0", v: "Bots. Ever." },
    { k: "3–4 wks", v: "First measurable lift" },
    { k: "20+", v: "Niches covered" },
  ];

  return (
    <>
      <SEOHead
        title="YouTube SEO Consultation — SwishView"
        description="Book a private consultation with SwishView's SEO team. Real growth, real strategy — tailored to your channel."
      />

      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* floating gradient orbs — same language as /whyswishview */}
        <div
          className="pointer-events-none fixed -top-40 -left-40 w-[520px] h-[520px] rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, hsl(var(--primary) / 0.55), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none fixed top-1/2 -right-40 w-[520px] h-[520px] rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, hsl(24 95% 53% / 0.45), transparent 70%)",
          }}
        />

        <Navbar />

        {/* HERO */}
        <section className="relative pt-36 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <Reveal>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-xs tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                SEO Consultation · Private 1-on-1
              </Badge>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="font-display font-bold tracking-tight text-5xl sm:text-6xl lg:text-7xl leading-[1.05] mb-6">
                Every channel is different.
                <br />
                <span className="bg-gradient-to-r from-primary via-orange-500 to-primary bg-clip-text text-transparent">
                  Your growth plan should be too.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                Skip the pricing tables. Talk to a senior SEO strategist, get a
                real plan built around your niche, and see exactly what will
                move your numbers.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="flex flex-wrap gap-4 justify-center items-center">
                <Button
                  size="lg"
                  onClick={openBooking}
                  className="group h-14 px-9 rounded-full text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 transition-all"
                >
                  Book Free Consultation
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  30-min call · Google Meet
                </div>
              </div>
            </Reveal>

            {/* proof strip */}
            <Reveal delay={320}>
              <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {proof.map((p, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors"
                  >
                    <div className="text-3xl sm:text-4xl font-display font-bold text-foreground">
                      {p.k}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {p.v}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section className="relative py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-16 max-w-2xl mx-auto">
                <div className="inline-block text-xs tracking-[0.2em] uppercase text-primary font-semibold mb-4">
                  What's included
                </div>
                <h2 className="text-4xl sm:text-5xl font-display font-bold tracking-tight mb-4">
                  Everything a serious channel needs.
                </h2>
                <p className="text-muted-foreground text-lg">
                  Not a template. A living strategy your SEO lead executes with
                  you.
                </p>
              </div>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pillars.map((p, i) => (
                <Reveal key={i} delay={i * 60}>
                  <div className="group h-full p-8 rounded-3xl border border-border/70 bg-card/70 backdrop-blur-sm hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <p.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-display font-semibold mb-2">
                      {p.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {p.copy}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* HOW THE CALL WORKS */}
        <section className="relative py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <div className="inline-block text-xs tracking-[0.2em] uppercase text-primary font-semibold mb-4">
                  The consultation
                </div>
                <h2 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
                  30 focused minutes.
                </h2>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { t: "Channel scan", d: "We audit your channel before the call." },
                { t: "Live walkthrough", d: "You see the gaps on screen, in real time." },
                { t: "Custom roadmap", d: "A plan built for your niche and cadence." },
                { t: "Clear pricing", d: "Tailored quote after we understand you." },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="relative p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm h-full">
                    <div className="text-5xl font-display font-bold text-primary/20 mb-3">
                      0{i + 1}
                    </div>
                    <div className="font-semibold mb-1.5">{s.t}</div>
                    <div className="text-sm text-muted-foreground">{s.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST BAND */}
        <section className="relative py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <div className="rounded-3xl p-10 sm:p-14 border border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                    No fluff, no bots
                  </div>
                </div>
                <h3 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight mb-4">
                  You'll never hear a pricing script on this call.
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  It's a working session. Come with your channel, your goals,
                  and your questions. Leave with a plan you can actually run
                  with — whether you hire us or not.
                </p>
                <ul className="mt-8 grid sm:grid-cols-2 gap-3">
                  {[
                    "Real audit, done before the call",
                    "Senior SEO strategist, not a sales rep",
                    "Roadmap you can keep either way",
                    "No high-pressure pitch",
                  ].map((x, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative py-28 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <h2 className="text-4xl sm:text-6xl font-display font-bold tracking-tight mb-6">
                Ready when you are.
              </h2>
              <p className="text-muted-foreground text-lg mb-10">
                Pick a time that suits you. We'll take care of the rest.
              </p>
              <Button
                size="lg"
                onClick={openBooking}
                className="group h-14 px-10 rounded-full text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40"
              >
                <Zap className="w-4 h-4 mr-2" />
                Book Free Consultation
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Reveal>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default CreateSEO;
