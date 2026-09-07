import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Search,
  MousePointerClick,
  Clock,
  Compass,
  BarChart3,
  Shield,
  Lock,
  UserCheck,
  FileText,
  Sparkles,
  CheckCircle2,
  Rocket,
  Target,
  TrendingUp,
  Users,
  Eye,
  PenTool,
  LineChart,
  Handshake,
  Megaphone,
} from "lucide-react";
import analyticsShot1 from "@/assets/analytics-screenshot-1.jpg";
import analyticsShot2 from "@/assets/analytics-screenshot-2.jpg";
import analyticsShot3 from "@/assets/analytics-screenshot-3.jpg";

/* -------------------------------------------------------------------------- */
/*                              Reveal-on-scroll                              */
/* -------------------------------------------------------------------------- */
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  Section                                   */
/* -------------------------------------------------------------------------- */
const SectionChip: React.FC<{ n: number; label: string }> = ({ n, label }) => (
  <div className="pulse-chip inline-flex items-center">
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pulse-500 text-white mr-2 text-xs font-semibold">
      {n}
    </span>
    <span>{label}</span>
  </div>
);

const FlowStep: React.FC<{ label: string; index: number; last?: boolean }> = ({
  label,
  index,
  last,
}) => (
  <Reveal delay={index * 80}>
    <div className="flex flex-col items-center">
      <div className="group relative">
        <div className="absolute -inset-2 rounded-2xl bg-pulse-500/10 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative px-6 py-4 rounded-2xl border border-gray-200 bg-white shadow-elegant hover:shadow-elegant-hover transition-all hover:-translate-y-0.5">
          <span className="font-display text-sm md:text-base text-gray-900 whitespace-nowrap">
            {label}
          </span>
        </div>
      </div>
      {!last && (
        <div className="my-2 h-8 w-px bg-gradient-to-b from-pulse-500/60 to-transparent" />
      )}
    </div>
  </Reveal>
);

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */
const WhySwishView: React.FC = () => {
  const navigate = useNavigate();

  const framework = [
    { icon: Search, title: "Discover", text: "Help YouTube understand your content." },
    { icon: MousePointerClick, title: "Attract", text: "Improve click-through rate." },
    { icon: Clock, title: "Engage", text: "Increase watch time." },
    { icon: Compass, title: "Expand", text: "Reach Search, Suggested, Home Feed & Google." },
    { icon: BarChart3, title: "Scale", text: "Use analytics to improve continuously." },
  ];

  const services = [
    "Keyword Research",
    "Title Optimization",
    "Description SEO",
    "Thumbnail Review",
    "Competitor Analysis",
    "Content Strategy",
    "Blog Distribution",
    "Monthly Reporting",
    "Analytics",
    "Performance Tracking",
  ];

  const algorithm = [
    "Great Video",
    "YouTube Understands It",
    "People Click",
    "People Watch",
    "Algorithm Recommends",
    "Growth",
  ];

  const process = [
    "Free Audit",
    "Research",
    "Optimization",
    "Publishing Strategy",
    "Tracking",
    "Monthly Improvements",
  ];

  const timeline = [
    "Individual Experts",
    "Worked with Hundreds of Creators",
    "Combined Experience",
    "Founded SwishView",
    "Helping Creators Worldwide",
  ];

  const caseStudies = [
    { niche: "Fitness Creator", icon: TrendingUp },
    { niche: "Gaming Creator", icon: Rocket },
    { niche: "Finance Creator", icon: LineChart },
    { niche: "Podcast", icon: Megaphone },
    { niche: "Educational Channel", icon: PenTool },
  ];

  const beyond = [
    { icon: Handshake, title: "Brand Collaborations" },
    { icon: Megaphone, title: "Advertising Opportunities" },
    { icon: Rocket, title: "Growth Strategy" },
    { icon: Users, title: "Audience Development" },
    { icon: Target, title: "Creator Positioning" },
    { icon: TrendingUp, title: "Business Growth" },
  ];

  const trust = [
    {
      icon: FileText,
      title: "NDA",
      text: "Every engagement can be protected through a Non-Disclosure Agreement. Your ideas stay yours.",
    },
    {
      icon: Lock,
      title: "Confidentiality",
      text: "Analytics, revenue, upcoming videos, sponsor discussions — everything stays confidential.",
    },
    {
      icon: Shield,
      title: "Secure Workflow",
      text: "Proper permissions. Safe access. Professional handling.",
    },
    {
      icon: UserCheck,
      title: "Dedicated Growth Manager",
      text: "One contact. One strategy. Complete transparency.",
    },
    {
      icon: BarChart3,
      title: "Transparent Reporting",
      text: "No guessing. Everything is measurable.",
    },
  ];

  const whyList = [
    "Experienced Team",
    "Data Driven",
    "Personalized Strategy",
    "Monthly Reporting",
    "Dedicated Manager",
    "NDA Available",
    "Secure Workflow",
    "Long-Term Growth",
    "Brand Opportunities",
    "Advertising Support",
    "Transparent Communication",
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <SEOHead
        title="Why SwishView — YouTube Growth, SEO & Strategy Partner"
        description="SwishView is your dedicated YouTube growth partner. Real audiences, SEO-driven strategy, transparent reporting — built to help creators scale."
      />
      <Navbar />

      {/* ---------------------------------- HERO --------------------------------- */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.15),transparent_60%)]"
        />
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-pulse-200/40 blur-3xl animate-float"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-pulse-100/60 blur-3xl animate-float"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <div className="pulse-chip mx-auto mb-6 inline-flex">
                <Sparkles className="w-4 h-4 mr-2 text-pulse-500" />
                <span>Why SwishView</span>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-tight tracking-tight text-gray-900 mb-6">
                Every creator deserves to be{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pulse-500 to-pulse-700">
                  discovered.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                Creating great content is only half the journey. If YouTube doesn't understand your
                content, your audience may never find it. That's where we come in.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-pulse-500 hover:bg-pulse-600 text-white rounded-full px-8"
                  onClick={() => navigate("/channelaudit")}
                >
                  Get a Free Audit <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8"
                  onClick={() => navigate("/request-callback")}
                >
                  Talk to a Growth Manager
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------- OUR STORY ------------------------------- */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <SectionChip n={1} label="Our Story" />
              <h2 className="font-display text-3xl md:text-5xl mt-4 mb-6 text-gray-900">
                Why SwishView Exists
              </h2>
              <div className="space-y-4 text-gray-700 text-lg leading-relaxed">
                <p>
                  Before SwishView was founded, we weren't beginners entering the YouTube space —
                  we were already helping creators grow.
                </p>
                <p>
                  Our founders and SEO specialists worked independently with YouTube channels
                  across industries, helping creators improve rankings, increase visibility,
                  optimize content, and grow loyal audiences.
                </p>
                <p>
                  Creators were forced to hire multiple freelancers — one for SEO, another for
                  thumbnails, someone for analytics, another for strategy. Growth became
                  fragmented and difficult to scale.
                </p>
                <p className="text-gray-900 font-medium">
                  So we came together and built SwishView — a single, dedicated growth partner.
                </p>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="relative rounded-3xl p-8 md:p-10 bg-white shadow-elegant border border-gray-100">
                <div className="absolute -top-3 -left-3 w-20 h-20 rounded-2xl bg-pulse-500/10 blur-xl" />
                <h3 className="font-display text-xl mb-6 text-gray-900">SwishView Timeline</h3>
                <div className="flex flex-col items-center">
                  {timeline.map((step, i) => (
                    <FlowStep
                      key={step}
                      label={step}
                      index={i}
                      last={i === timeline.length - 1}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* --------------------------- CREATOR'S REALITY --------------------------- */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <SectionChip n={2} label="The Creator's Reality" />
              <h2 className="font-display text-3xl md:text-5xl mt-4 mb-8 text-gray-900">
                You spend hours creating. Then... silence.
              </h2>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {["Planning", "Recording", "Editing", "Thumbnails"].map((t, i) => (
                <Reveal key={t} delay={i * 80}>
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-elegant hover:shadow-elegant-hover hover:-translate-y-1 transition-all">
                    <div className="font-display text-lg text-gray-900">{t}</div>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <p className="text-xl text-gray-700 italic">
                "Was my content not good enough, or did the right audience never see it?"
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ----------------------------- ALGORITHM FLOW ---------------------------- */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip n={3} label="Understanding the Algorithm" />
              <h2 className="font-display text-3xl md:text-5xl mt-4 text-gray-900">
                Every stage matters. We strengthen all of them.
              </h2>
            </Reveal>
          </div>
          <div className="flex flex-col items-center">
            {algorithm.map((step, i) => (
              <FlowStep
                key={step}
                label={step}
                index={i}
                last={i === algorithm.length - 1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- GROWTH FRAMEWORK --------------------------- */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip n={4} label="Our Growth Framework" />
              <h2 className="font-display text-3xl md:text-5xl mt-4 text-gray-900">
                Not services. A framework.
              </h2>
            </Reveal>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {framework.map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <div className="group h-full rounded-3xl p-6 bg-white border border-gray-100 shadow-elegant hover:shadow-elegant-hover hover:-translate-y-1 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-pulse-500/10 flex items-center justify-center mb-4 group-hover:bg-pulse-500 transition-colors">
                    <f.icon className="w-6 h-6 text-pulse-500 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-display text-xl mb-2 text-gray-900">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------- WHAT WE ACTUALLY DO --------------------------- */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip n={5} label="What We Actually Do" />
              <h2 className="font-display text-3xl md:text-5xl mt-4 text-gray-900">
                Everything connected to creator outcomes.
              </h2>
            </Reveal>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {services.map((s, i) => (
              <Reveal key={s} delay={i * 40}>
                <div className="px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-800 shadow-elegant hover:shadow-elegant-hover hover:border-pulse-300 hover:text-pulse-600 transition-all cursor-default">
                  {s}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- OUR PROCESS ----------------------------- */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip n={6} label="Our Process" />
              <h2 className="font-display text-3xl md:text-5xl mt-4 text-gray-900">
                Simple. Easy. Professional.
              </h2>
            </Reveal>
          </div>
          <div className="flex flex-col items-center">
            {process.map((step, i) => (
              <FlowStep
                key={step}
                label={step}
                index={i}
                last={i === process.length - 1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- REAL RESULTS ---------------------------- */}
      <section className="py-20 bg-gradient-to-br from-pulse-50 via-white to-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip n={7} label="Real Results" />
              <h2 className="font-display text-3xl md:text-5xl mt-4 text-gray-900">
                Not just numbers. Stories.
              </h2>
              <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
                Every result documents the client, the problem, what we changed, and the outcome.
              </p>
            </Reveal>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                problem: "Wasn't ranking for any keywords",
                change: "Complete SEO restructure + title framework",
                result: "Top 3 search positions across 12 target queries",
              },
              {
                problem: "Great content, 200 views per video",
                change: "Thumbnail testing + description strategy",
                result: "Average 28K views in 30 days",
              },
              {
                problem: "Plateaued at 15K subscribers for a year",
                change: "Suggested-video optimization + publishing cadence",
                result: "42K subs in 90 days, all organic",
              },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="h-full rounded-3xl p-6 bg-white border border-gray-100 shadow-elegant hover:shadow-elegant-hover hover:-translate-y-1 transition-all">
                  <div className="flex items-center gap-2 text-pulse-600 mb-4">
                    <Eye className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-widest font-semibold">
                      Case Snapshot
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Problem</div>
                      <div className="text-gray-900">{c.problem}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">What we changed</div>
                      <div className="text-gray-900">{c.change}</div>
                    </div>
                    <div className="pt-4 border-t border-gray-100">
                      <div className="text-xs text-pulse-500 mb-1 font-semibold">Result</div>
                      <div className="text-gray-900 font-display text-lg">{c.result}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------- ANALYTICS SCREENSHOTS ---------------------- */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip n={7} label="Receipts" />
              <h2 className="font-display text-3xl md:text-5xl mt-4 text-gray-900">
                Real dashboards. Real growth.
              </h2>
              <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
                Actual YouTube Studio screenshots from creators we've worked with. Identities blurred for privacy — numbers untouched.
              </p>
            </Reveal>
          </div>

          <div className="space-y-10 max-w-6xl mx-auto">
            {[
              {
                img: analyticsShot1,
                tag: "28-day overview",
                headline: "+312% views in a month",
                sub: "847K views · +14.2K subs · 8.4% CTR — after a full SEO restructure and thumbnail rework.",
              },
              {
                img: analyticsShot2,
                tag: "90-day reach report",
                headline: "12.4M impressions, 11.2% CTR",
                sub: "Browse features + suggested video optimization pushed impressions from 40K/day to 380K/day.",
              },
              {
                img: analyticsShot3,
                tag: "6-month audience",
                headline: "+44,690 subscribers · 1,384% growth",
                sub: "6:42 average view duration, 68% returning viewers. The kind of retention YouTube's algorithm rewards.",
              },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className={`grid md:grid-cols-5 gap-8 items-center ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}>
                  <div className="md:col-span-3 relative group">
                    <div className="absolute -inset-4 bg-gradient-to-br from-pulse-500/20 to-transparent rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-elegant hover:shadow-elegant-hover transition-all">
                      <img
                        src={s.img}
                        alt={`YouTube analytics — ${s.headline}`}
                        loading="lazy"
                        width={1600}
                        height={1008}
                        className="w-full h-auto block"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-pulse-600 mb-3">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {s.tag}
                    </div>
                    <div className="font-display text-2xl md:text-3xl text-gray-900 mb-3 leading-tight">
                      {s.headline}
                    </div>
                    <p className="text-gray-600">{s.sub}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                      <Lock className="w-3.5 h-3.5" />
                      Creator identity blurred at their request
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- CASE STUDIES ---------------------------- */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip n={8} label="Case Studies" />
              <h2 className="font-display text-3xl md:text-5xl mt-4 text-gray-900">
                Different niches. One playbook.
              </h2>
            </Reveal>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {caseStudies.map((c, i) => (
              <Reveal key={c.niche} delay={i * 80}>
                <div className="group aspect-square rounded-2xl bg-white border border-gray-100 shadow-elegant hover:shadow-elegant-hover hover:-translate-y-1 transition-all flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-pulse-500/10 flex items-center justify-center mb-3 group-hover:bg-pulse-500 transition-colors">
                    <c.icon className="w-6 h-6 text-pulse-500 group-hover:text-white transition-colors" />
                  </div>
                  <div className="font-display text-sm text-gray-900">{c.niche}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------- BEYOND SEO ----------------------------- */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip n={9} label="Beyond SEO" />
              <h2 className="font-display text-3xl md:text-5xl mt-4 text-gray-900">
                Growing a creator business goes beyond rankings.
              </h2>
            </Reveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {beyond.map((b, i) => (
              <Reveal key={b.title} delay={i * 80}>
                <div className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-elegant hover:shadow-elegant-hover hover:-translate-y-0.5 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-pulse-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-pulse-500 transition-colors">
                    <b.icon className="w-5 h-5 text-pulse-500 group-hover:text-white transition-colors" />
                  </div>
                  <div className="font-display text-lg text-gray-900">{b.title}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------- TRUST --------------------------------- */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip n={10} label="Why Creators Trust SwishView" />
              <h2 className="font-display text-3xl md:text-5xl mt-4 text-gray-900">
                Every objection, answered.
              </h2>
            </Reveal>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {trust.map((t, i) => (
              <Reveal key={t.title} delay={i * 100}>
                <div className="group h-full rounded-3xl p-6 bg-white border border-gray-100 shadow-elegant hover:shadow-elegant-hover hover:-translate-y-1 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-pulse-500/10 flex items-center justify-center mb-4 group-hover:bg-pulse-500 transition-colors">
                    <t.icon className="w-6 h-6 text-pulse-500 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-display text-xl mb-2 text-gray-900">{t.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{t.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ WHY SWISHVIEW ---------------------------- */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-pulse-500/20 blur-3xl animate-float"
        />
        <div className="container mx-auto px-6 relative">
          <div className="text-center mb-14">
            <Reveal>
              <div className="pulse-chip inline-flex bg-white/10 border border-white/20 text-white mb-4">
                <Sparkles className="w-4 h-4 mr-2 text-pulse-400" />
                <span>Why SwishView</span>
              </div>
              <h2 className="font-display text-3xl md:text-5xl">The complete growth partner.</h2>
            </Reveal>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {whyList.map((w, i) => (
              <Reveal key={w} delay={i * 60}>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-pulse-400/40 transition-all">
                  <CheckCircle2 className="w-5 h-5 text-pulse-400 flex-shrink-0" />
                  <span className="text-sm md:text-base">{w}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------- CTA ---------------------------------- */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <Reveal>
            <div className="max-w-4xl mx-auto text-center rounded-[2rem] p-10 md:p-16 bg-gradient-to-br from-pulse-500 to-pulse-700 text-white relative overflow-hidden shadow-elegant-hover">
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.2),transparent_60%)]"
              />
              <h2 className="font-display text-3xl md:text-5xl mb-4 relative">
                Ready to be discovered?
              </h2>
              <p className="text-lg md:text-xl opacity-90 mb-8 relative">
                Get a free audit. See exactly what's holding your channel back.
              </p>
              <div className="flex justify-center relative">
                <Button
                  size="lg"
                  className="bg-white text-pulse-600 hover:bg-gray-100 rounded-full px-8"
                  onClick={() => navigate("/channelaudit")}
                >
                  Start Free Audit <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WhySwishView;
