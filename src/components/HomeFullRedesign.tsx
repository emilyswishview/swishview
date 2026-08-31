import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  X,
  AlertTriangle,
  Check,
  Plus,
  Minus,
} from "lucide-react";
import analyticsShot1 from "@/assets/analytics-screenshot-1.jpg";
import analyticsShot2 from "@/assets/analytics-screenshot-2.jpg";
import analyticsShot3 from "@/assets/analytics-screenshot-3.jpg";

/* -------------------- Reveal on scroll -------------------- */
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
      { threshold: 0.12 }
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

/* -------------------- Section chip -------------------- */
const SectionChip: React.FC<{ n?: number | string; label: string; dark?: boolean }> = ({
  n,
  label,
  dark,
}) => (
  <div
    className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium ${
      dark
        ? "bg-white/10 border border-white/15 text-pulse-300"
        : "bg-pulse-50 border border-pulse-200 text-pulse-700"
    }`}
  >
    {n !== undefined && (
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 text-xs font-semibold ${
          dark ? "bg-pulse-500 text-white" : "bg-pulse-500 text-white"
        }`}
      >
        {n}
      </span>
    )}
    <span>{label}</span>
  </div>
);

/* -------------------- Vertical flow step -------------------- */
const FlowStep: React.FC<{ label: string; index: number; last?: boolean }> = ({
  label,
  index,
  last,
}) => (
  <Reveal delay={index * 80}>
    <div className="flex flex-col items-center">
      <div className="group relative">
        <div className="absolute -inset-2 rounded-2xl bg-pulse-500/10 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative px-6 py-3 rounded-2xl border border-gray-200 bg-white shadow-elegant hover:shadow-elegant-hover transition-all hover:-translate-y-0.5">
          <span className="font-display text-sm md:text-base text-gray-900 whitespace-nowrap">
            {label}
          </span>
        </div>
      </div>
      {!last && <div className="my-2 h-8 w-px bg-gradient-to-b from-pulse-500/60 to-transparent" />}
    </div>
  </Reveal>
);

/* -------------------- FAQ item -------------------- */
const FAQItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-pulse-200/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-5 text-left"
      >
        <span className="font-display text-base md:text-lg text-gray-900">{q}</span>
        {open ? (
          <Minus className="w-5 h-5 text-pulse-500 flex-shrink-0" />
        ) : (
          <Plus className="w-5 h-5 text-pulse-500 flex-shrink-0" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-64 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-gray-600">{a}</p>
      </div>
    </div>
  );
};

const HomeFullRedesign: React.FC = () => {
  const navigate = useNavigate();

  const framework = [
    { icon: Search, title: "Discover", text: "Help YouTube understand your content." },
    { icon: MousePointerClick, title: "Attract", text: "Improve click-through rate." },
    { icon: Clock, title: "Engage", text: "Increase watch time." },
    { icon: Compass, title: "Expand", text: "Reach Search, Suggested, Home Feed & Google." },
    { icon: BarChart3, title: "Scale", text: "Use analytics to improve continuously." },
  ];

  const algorithm = [
    "Great Video",
    "YouTube Understands It",
    "People Click",
    "People Watch",
    "Algorithm Recommends",
    "Growth",
  ];

  const timeline = [
    "Individual Experts",
    "Worked with Hundreds of Creators",
    "Combined Experience",
    "Founded SwishView",
    "Helping Creators Worldwide",
  ];

  const phases = [
    {
      months: "Months 1–3",
      title: "Phase 1 — Foundation & Full Audience Rebuild",
      desc: "We don't just clean the channel up — we rebuild who YouTube thinks it's for, from the ground up, in one focused push.",
      chips: [
        "Channel makeover & branding",
        "Full SEO & metadata overhaul",
        "Structure & playlist architecture",
        "Complete audience mapping & re-alignment",
      ],
      outcome: (
        <>
          By month 3: a channel YouTube can finally read correctly —{" "}
          <span className="text-pulse-500 font-semibold">visible ranking movement</span> in search
          & suggested, and audience signals rebuilt from scratch.
        </>
      ),
    },
    {
      months: "Months 4–6",
      title: "Phase 2 — Growth & Optimization",
      desc: "With the foundation correctly read, we push consistency and engagement until the algorithm starts working in your favor on its own.",
      chips: [
        "Ongoing SEO content calendar",
        "Engagement flow (CTAs, end screens)",
        "Thumbnail & title refresh",
        "Analytics-based adjustments",
      ],
      outcome: (
        <>
          By month 6: a <span className="text-pulse-500 font-semibold">80–100%+</span> lift in
          watch time & returning viewers, markedly stronger "Suggested" and "Browse" traffic.
        </>
      ),
    },
    {
      months: "Months 7–9",
      title: "Phase 3 — Authority & Retention",
      desc: "Turn casual viewers into a loyal audience that returns for every single upload — and expand into the algorithm's fastest-growing surface.",
      chips: [
        "Mid-year creative refresh",
        "Playlist clustering for retention",
        "Shorts expansion strategy",
        "Algorithm clean-up & optimization",
      ],
      outcome: (
        <>
          By month 9: a <span className="text-pulse-500 font-semibold">150–200%+</span> surge in
          average view duration and retention — unmistakably authoritative in its niche.
        </>
      ),
    },
    {
      months: "Months 10–12",
      title: "Phase 4 — Monetization & Expansion",
      desc: "Convert twelve months of compounding growth into consistent, durable revenue — and hand you the playbook to keep it going.",
      chips: [
        "Monetization & compliance audit",
        "Revenue optimization (AdSense)",
        "Sponsorship & collab strategy",
        "Personalized growth playbook",
      ],
      outcome: (
        <>
          By month 12: <span className="text-pulse-500 font-semibold">500–600%+</span> growth in
          total organic reach, a fully monetization-ready channel, and a playbook that keeps it
          thriving.
        </>
      ),
    },
  ];

  const onboard = [
    {
      n: "01",
      title: "Dedicated SEO Manager",
      text: "An expert from your exact niche — music, gaming, finance, faith and more each get a specialist who already understands that audience.",
    },
    {
      n: "02",
      title: "Growth Manager",
      text: "Writes and distributes blog content built to expand your visibility beyond YouTube itself.",
    },
    {
      n: "03",
      title: "Backlink Manager",
      text: "Links your videos across relevant sites, building the kind of authority signals YouTube's algorithm rewards.",
    },
    {
      n: "04",
      title: "Reporting",
      text: "Monthly dashboards on views, watch time, CTR and engagement — nothing goes live without your approval first.",
    },
  ];

  const results = [
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
    { icon: FileText, title: "NDA", text: "Every engagement can be protected through a Non-Disclosure Agreement. Your ideas stay yours." },
    { icon: Lock, title: "Confidentiality", text: "Analytics, revenue, upcoming videos, sponsor discussions — everything stays confidential." },
    { icon: Shield, title: "Secure Workflow", text: "Proper permissions. Safe access. Professional handling." },
    { icon: UserCheck, title: "Dedicated Growth Manager", text: "One contact. One strategy. Complete transparency." },
    { icon: BarChart3, title: "Transparent Reporting", text: "No guessing. Everything is measurable." },
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

  const faqs = [
    { q: "Which countries would the viewers primarily come from?", a: "Primarily the United States, Canada, UK, and Australia — but we can target by geography based on your niche." },
    { q: "Would I approve all changes before they go live?", a: "Yes. Nothing gets published on your channel without your explicit approval first." },
    { q: "Is everything compliant with YouTube's policies?", a: "100%. Every strategy is built for YouTube's real ranking signals — never bots, never violations." },
    { q: "What happens if YouTube flags views as invalid traffic?", a: "It won't — our traffic is real, organic, and generated by legitimate discovery. We don't buy views." },
    { q: "Is my channel data kept confidential?", a: "Absolutely. NDAs are standard, and access is scoped strictly to what's required to do the work." },
    { q: "How long before I see results?", a: "Visible ranking movement typically appears within the first 3 months. Compounding growth kicks in from month 4 onward." },
  ];

  return (
    <div className="w-full">
      {/* ============================ HERO ============================ */}
      <section className="relative pt-24 md:pt-24 pb-8 md:pb-10 overflow-hidden bg-[#fdf8f2] lg:min-h-screen lg:flex lg:items-center">
        <div
          aria-hidden
          className="absolute -top-40 -right-32 w-[600px] h-[600px] rounded-full bg-pulse-300/30 blur-3xl animate-float"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-32 w-[500px] h-[500px] rounded-full bg-pulse-200/40 blur-3xl animate-float"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="container mx-auto px-6 md:px-36 relative w-full">
          <div className="max-w-4xl mx-auto lg:mx-0">
            <Reveal>
              <div className="flex items-center gap-2 mb-4 text-pulse-500 font-semibold tracking-widest text-xs">
                <span className="w-2 h-2 rounded-full bg-pulse-500" />
                CREATE. UPLOAD. GO VIRAL.
              </div>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="font-sans font-bold text-5xl md:text-7xl lg:text-[4.5rem] leading-[1.02] tracking-tight text-gray-900 mb-6">
                Great content deserves
                <br />
                to <span className="italic font-bold text-pulse-500">be found.</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-base md:text-lg text-gray-600 mb-6 max-w-2xl">
                SwishView is a growth partner for YouTube creators — we fix the part of the channel
                YouTube looks at, not the part your audience looks at, so the right people find your
                videos without a single dollar in ad spend.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="bg-pulse-500 hover:bg-pulse-600 text-white rounded-full px-8 shadow-elegant"
                  onClick={() => navigate("/request-callback")}
                >
                  Talk to a growth manager <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 border-gray-300"
                  onClick={() => {
                    document.getElementById("how-it-works-flow")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  See how it works
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 border-pulse-500/40 text-pulse-600 hover:bg-pulse-50"
                  onClick={() => navigate("/login")}
                >
                  Login
                </Button>
              </div>
            </Reveal>
          </div>

          {/* Wavy dashed flow with a single travelling dot through 4 clear stages */}
          <Reveal delay={400} className="mt-12 md:mt-16">
            <div className="relative max-w-6xl mx-auto">
              {/* Stage labels above */}
              <div className="grid grid-cols-4 mb-3">
                {["Video uploaded", "Algorithm confused", "Foundation fixed", "Recommended on autopilot"].map(
                  (t) => (
                    <div
                      key={t}
                      className="text-[10px] md:text-xs tracking-[0.18em] uppercase font-semibold text-gray-500 text-center"
                    >
                      {t}
                    </div>
                  )
                )}
              </div>

              <svg
                viewBox="0 0 1000 120"
                className="w-full h-20 md:h-28 overflow-visible"
                preserveAspectRatio="none"
              >
                <path
                  id="hero-flow-path"
                  d="M 20 60 Q 145 10, 270 60 T 520 60 T 770 60 T 980 60"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />
                {/* 4 stage markers */}
                {[
                  { cx: 20, cy: 60 },
           
                  { cx: 980, cy: 60 },
                ].map((p, i) => (
                  <g key={i}>
                    <circle cx={p.cx} cy={p.cy} r="6" fill="#fff" stroke="#f97316" strokeWidth="2.5" />
                  </g>
                ))}
                {/* Traveling dot with glow */}
                <circle r="10" fill="#f97316" opacity="0.35">
                  <animateMotion dur="6s" repeatCount="indefinite">
                    <mpath href="#hero-flow-path" />
                  </animateMotion>
                </circle>
                <circle r="7" fill="#f97316">
                  <animateMotion dur="6s" repeatCount="indefinite">
                    <mpath href="#hero-flow-path" />
                  </animateMotion>
                  <animate attributeName="r" values="6;8;6" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
          </Reveal>

        </div>
      </section>

      {/* ============================ WHO WE ARE (DARK) ============================ */}
      <section id="who-we-are" className="py-24 bg-[#0a0a0a] text-white relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-pulse-500/10 blur-3xl"
        />
        <div className="container mx-auto px-6 relative">
<div className="grid lg:grid-cols-[1.15fr,1fr] gap-16 items-stretch">
  <div>
    <Reveal>
      <SectionChip label="Who We Are" dark />
    </Reveal>
    <Reveal delay={100}>
      <h2 className="font-display text-3xl md:text-5xl mt-6 mb-8 leading-tight">
        Two creators. One frustration that became a company.
      </h2>
    </Reveal>
    <Reveal delay={200}>
      <div className="space-y-5 text-gray-300 text-base md:text-lg leading-relaxed">
        <p>
          Before SwishView existed, its founders were already living inside the creator
          world — filming, editing, collaborating, uploading. Not consultants looking in
          from the outside.{" "}
          <span className="text-white font-semibold">
            People who had actually hit "publish" and watched the view count sit at zero.
          </span>
        </p>
        <p>
          They noticed the same thing happening to almost everyone around them: creators were exceptional at making things, and almost completely on their own when it came to getting those things placed in front of the right eyes. Worse, the market that had grown up to "help" was full of resellers pushing bot traffic and fake engagement — traffic that looked good on a screenshot and quietly wrecked channel health behind the scenes.
        </p>
        <p>
          That gap —{" "}
          <span className="text-white font-semibold">
            brilliant creators, no real growth partner
          </span>{" "}
          — became the mission. Not another views vendor. A team whose only job is helping YouTube itself understand, trust, and recommend a channel to the audience that actually wants it.
        </p>
        <p>
          What began as two people helping a handful of channels is now a distributed team of specialists — because "organic growth" for a finance channel looks nothing like it does for a music channel, and we build for each niche on its own terms.
        </p>
      </div>
    </Reveal>
  </div>


 {/* Right column: now stretches full height */}
  <div className="flex flex-col h-full">
    <Reveal delay={200}>
      <div className="relative rounded-3xl p-6 md:p-12 bg-white/[0.03] border border-white/10 backdrop-blur">
        <div className="absolute -top-3 -left-3 w-20 h-20 rounded-2xl bg-pulse-500/20 blur-xl" />
        <div className="text-md font-semibold tracking-[0.22em] text-pulse-400 mb-5">
          SWISHVIEW TIMELINE
        </div>
        <div className="relative pl-6 ">
          <div className="absolute left-[10px] top-2 bottom-2 w-px bg-gradient-to-b from-pulse-500/70 via-pulse-500/30 to-transparent" />
          {[
            { year: "2016", title: "Individual Experts", body: "Working solo across SEO, brand, video." },
            { year: "2018", title: "Hundreds of Creators", body: "Across music, gaming, faith and finance." },
            { year: "2020", title: "Combined Experience", body: "Founders come together on one mission." },
            { year: "2022", title: "SwishView Founded", body: "A team built only for organic YouTube growth." },
            { year: "Today", title: "Helping Creators Worldwide", body: "A distributed niche-specialist team." },
          ].map((t, i) => (
            <Reveal key={t.title} delay={i * 120}>
              <div className="relative pb-3.5 last:pb-4">
                <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-pulse-500 ring-4 ring-pulse-500/20" />
                <div className="text-[14px] text-pulse-400/90 font-semibold tracking-wider">
                  {t.year}
                </div>
                <div className="text-white font-semibold mt-0.5 text-md">{t.title}</div>
                <div className="text-sm text-gray-400 mt-0.5 leading-snug">{t.body}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Reveal>

    {/* Pillar cards — grows to fill remaining height */}
    <div className="mt-6 grid grid-cols-3 gap-3 flex-1">
      {[
        {
          icon: Target,
          title: "Niche-specialist",
          body: "SEO & growth managers assigned by category.",
        },
        {
          icon: Shield,
          title: "Zero bots",
          body: "Built for YouTube's real ranking signals.",
        },
        {
          icon: Users,
          title: "Global",
          body: "A distributed team, so you're never waiting.",
        },
      ].map((p, i) => (
        <Reveal key={p.title} delay={300 + i * 120} className="h-full">
          <div className="group h-full flex flex-col rounded-2xl p-4 bg-white/[0.04] border border-white/10 hover:border-pulse-400/40 hover:bg-white/[0.07] hover:-translate-y-1 transition-all duration-300 backdrop-blur">
            <div className="w-9 h-9 rounded-lg bg-pulse-500/15 flex items-center justify-center mb-3 group-hover:bg-pulse-500 transition-colors">
              <p.icon className="w-4 h-4 text-pulse-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-display text-sm text-white mb-1 leading-snug">{p.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{p.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  </div>
</div>


        </div>
      </section>


      {/* ============================ CREATOR'S REALITY ============================ */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <SectionChip label="The Creator's Reality" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 mb-10 text-gray-900 leading-tight">
                You spend hours creating. Then… silence.
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
            <Reveal delay={300}>
              <p className="text-lg md:text-xl text-gray-700 italic">
                "Was my content not good enough, or did the right audience never see it?"
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================ ALGORITHM FLOW ============================ */}
      <section id="how-it-works-flow" className="py-24 bg-gradient-to-b from-white to-[#fdf8f2]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip label="Understanding the Algorithm" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 text-gray-900 max-w-3xl mx-auto leading-tight">
                Every stage matters. We strengthen all of them.
              </h2>
            </Reveal>
          </div>
          <div className="flex flex-col items-center">
            {algorithm.map((step, i) => (
              <FlowStep key={step} label={step} index={i} last={i === algorithm.length - 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ============================ GROWTH FRAMEWORK ============================ */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip label="Our Growth Framework" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 text-gray-900">
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

      {/* ============================ THE PART EVERYONE SKIPS ============================ */}
      <section className="py-24 bg-[#fdf8f2]">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-14">
            <Reveal>
              <SectionChip label="THE PART EVERYONE SKIPS" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 mb-4 text-gray-900 leading-tight">
                Why we keep saying "organic"
              </h2>
              <p className="text-gray-600 text-lg">
                There are three ways to try to grow a channel. Only one of them survives contact with
                the algorithm long-term.
              </p>
            </Reveal>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                accent: "bg-red-400",
                label: "OPTION 1",
                title: "Bot views",
                icon: X,
                iconClass: "text-red-500",
                items: [
                  "Cheap, and looks convincing on the surface",
                  "Doesn't survive YouTube's spam & invalid-traffic detection",
                  "Actively damages monetization eligibility",
                  "You often don't even know it's bots — the seller says \"real\"",
                ],
                result: "Result: channel health quietly wrecked",
                resultClass: "text-red-600",
              },
              {
                accent: "bg-yellow-400",
                label: "OPTION 2",
                title: "Paid ad views",
                icon: AlertTriangle,
                iconClass: "text-yellow-500",
                items: [
                  "Real people — but rarely the right people",
                  "A faith channel gets views from someone who never wanted it",
                  "YouTube gets confused about who to recommend you to",
                  "Growth stops the exact day the ad budget stops",
                ],
                result: "Result: money spent, algorithm still lost",
                resultClass: "text-yellow-700",
              },
              {
                accent: "bg-pulse-500",
                label: "WHAT WE DO",
                title: "Fix the foundation",
                icon: Check,
                iconClass: "text-pulse-500",
                items: [
                  "Slower to start — real research, on every video",
                  "YouTube learns exactly who your audience is",
                  "Views start arriving before you even promote the upload",
                  "Compounds — the algorithm keeps working after we're not",
                ],
                result: "Result: growth that outlives the contract",
                resultClass: "text-pulse-600",
                highlight: true,
              },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 120}>
                <div
                  className={`h-full rounded-3xl p-7 border transition-all hover:-translate-y-1 ${
                    c.highlight
                      ? "bg-white border-pulse-300 shadow-[0_20px_60px_-15px_rgba(249,115,22,0.35)] ring-1 ring-pulse-200/60"
                      : "bg-white border-gray-100 shadow-elegant hover:shadow-elegant-hover"
                  }`}
                >
                  <div className={`h-1.5 w-16 rounded-full mb-6 ${c.accent}`} />
                  <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                    {c.label}
                  </div>
                  <h3 className="font-display text-2xl mb-5 text-gray-900">{c.title}</h3>
                  <ul className="space-y-3 mb-6">
                    {c.items.map((it) => (
                      <li key={it} className="flex gap-3 text-sm text-gray-700">
                        <c.icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${c.iconClass}`} />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                  <div className={`text-sm font-semibold ${c.resultClass}`}>{c.result}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ 12-MONTH PROGRAM ============================ */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-14">
            <Reveal>
              <SectionChip label="THE 12-MONTH PROGRAM" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 mb-4 text-gray-900 leading-tight">
                What fixing the foundation actually looks like
              </h2>
              <p className="text-gray-600 text-lg">
                Four phases. Each one builds on the last — nothing here is a one-time trick.
              </p>
            </Reveal>
          </div>
          <div className="space-y-5">
            {phases.map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <div className="rounded-3xl border border-gray-200 bg-[#fdf8f2] p-7 md:p-10 hover:border-pulse-300 transition-colors">
                  <div className="text-pulse-500 font-semibold text-xs uppercase tracking-widest mb-3">
                    {p.months}
                  </div>
                  <h3 className="font-display text-xl md:text-2xl text-gray-900 mb-3">
                    {p.title}
                  </h3>
                  <p className="text-gray-700 mb-5">{p.desc}</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {p.chips.map((c) => (
                      <span
                        key={c}
                        className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <p className="text-gray-900 text-sm md:text-base">{p.outcome}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ DAY ONE / ONBOARD ============================ */}
      <section className="py-24 bg-[#fdf8f2]">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-14">
            <Reveal>
              <SectionChip label="DAY ONE" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 mb-4 text-gray-900 leading-tight">
                What you actually get when you onboard
              </h2>
              <p className="text-gray-600 text-lg mb-3">
                Not one generalist juggling five clients. A small team built around your channel
                specifically.
              </p>
              <p className="text-gray-900 text-base">
                And no — this isn't "ask ChatGPT for some keywords" work. A prompt doesn't log in
                for your channel every day. A person does.
              </p>
            </Reveal>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {onboard.map((o, i) => (
              <Reveal key={o.n} delay={i * 100}>
                <div className="h-full rounded-3xl bg-white border border-gray-100 p-6 shadow-elegant hover:shadow-elegant-hover hover:-translate-y-1 transition-all">
                  <div className="text-pulse-500 font-display text-sm mb-4">{o.n}</div>
                  <h3 className="font-display text-lg text-gray-900 mb-3">{o.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{o.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={400}>
            <div className="rounded-2xl bg-[#0a0a0a] text-white p-5 md:p-6 flex items-center gap-3 flex-wrap">
              <Lock className="w-5 h-5 text-pulse-400 flex-shrink-0" />
              <span className="text-sm md:text-base">
                When the program ends, growth{" "}
                <span className="text-pulse-400 font-semibold">doesn't</span> — because we fixed the
                algorithm, not rented a spike.
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================ REAL RESULTS ============================ */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip label="Real Results" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 text-gray-900">
                Not just numbers. Stories.
              </h2>
              <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
                Every result documents the client, the problem, what we changed, and the outcome.
              </p>
            </Reveal>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {results.map((c, i) => (
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

      {/* ============================ RECEIPTS ============================ */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip label="Receipts" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 text-gray-900">
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

      {/* ============================ CASE STUDIES ============================ */}
      <section className="py-24 bg-[#fdf8f2]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip label="Case Studies" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 text-gray-900">
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

      {/* ============================ BEYOND SEO ============================ */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip label="Beyond SEO" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 text-gray-900">
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

      {/* ============================ TRUST ============================ */}
      <section className="py-24 bg-[#fdf8f2]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip label="Why Creators Trust SwishView" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 text-gray-900">
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

      {/* ============================ WHY SWISHVIEW (DARK) ============================ */}
      <section className="py-24 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#1a0f08] text-white relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-pulse-500/25 blur-3xl animate-float"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-pulse-500/15 blur-3xl animate-float"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="container mx-auto px-6 relative">
          <div className="text-center mb-14">
            <Reveal>
              <SectionChip label="Why SwishView" dark />
              <h2 className="font-display text-3xl md:text-5xl mt-6">
                The complete growth partner.
              </h2>
            </Reveal>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-16">
            {whyList.map((w, i) => (
              <Reveal key={w} delay={i * 50}>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-pulse-400/40 transition-all">
                  <CheckCircle2 className="w-5 h-5 text-pulse-400 flex-shrink-0" />
                  <span className="text-sm md:text-base">{w}</span>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="max-w-3xl mx-auto text-center rounded-[2rem] p-10 md:p-14 bg-gradient-to-br from-pulse-500 to-pulse-700 relative overflow-hidden shadow-elegant-hover">
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.25),transparent_60%)]"
              />
              <h3 className="font-display text-3xl md:text-5xl mb-4 relative">
                Ready to be discovered?
              </h3>
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

      {/* ============================ FAQ ============================ */}
      <section className="py-24 bg-[#fdf8f2]">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <SectionChip label="BEFORE YOU ASK" />
              <h2 className="font-display text-3xl md:text-5xl mt-6 mb-10 text-gray-900">
                Common questions
              </h2>
            </Reveal>
            <div>
              {faqs.map((f, i) => (
                <Reveal key={f.q} delay={i * 60}>
                  <FAQItem q={f.q} a={f.a} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeFullRedesign;
