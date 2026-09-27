import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/looseClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import SwishViewLogo from "@/components/SwishViewLogo";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Search, DollarSign, Presentation, Shuffle, PieChart, BadgeDollarSign,
  Edit3, CheckSquare, Megaphone, Hammer, ArrowRight, Rocket, Award,
} from "lucide-react";

/* ---------- Reveal on scroll ---------- */
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      transitionProperty: "opacity, transform", transitionDuration: "800ms",
      transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)", transitionDelay: `${delay}ms`,
      opacity: shown ? 1 : 0, transform: shown ? "translateY(0)" : "translateY(28px)",
    }}>{children}</div>
  );
};

/* Section wrapper — full-width page section */
const Section: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({
  children, className = "", id,
}) => (
  <section id={id} className={`w-full py-20 md:py-28 px-4 md:px-8 ${className}`}>
    <div className="max-w-7xl mx-auto">{children}</div>
  </section>
);

/*
  Nested left-pointing chevron/arrow bars — matches the Canva "Scope of Work"
  reference: smooth interlocking arrow bands fading from deep orange (left)
  to pale tan (right), with a giant faded number bottom-right.
*/
const ArrowBars: React.FC<{ number: number; activeIndex: number }> = ({ number, activeIndex }) => {
  const palettes = [
    ["#C24A18", "#CE5A20", "#DA6B29", "#E17E38", "#E9924D", "#F0A868", "#F4BD87"],
    ["#B8431A", "#C55322", "#D2652C", "#DE7A3B", "#E68F50", "#EEA66C", "#F3BC89"],
  ];
  const colors = palettes[activeIndex % palettes.length];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* base gradient fills any seam gaps between bands */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to right, ${colors[0]}, ${colors[colors.length - 1]})`,
        }}
      />

      {/* nested left-pointing arrow bands */}
      <div className="absolute inset-0 flex">
        {colors.map((c, i) => (
          <div
            key={i}
            className="h-full flex-1"
            style={{
              backgroundColor: c,
              clipPath: "polygon(100% 0%, 74% 50%, 100% 100%, 84% 100%, 58% 50%, 84% 0%)",
              marginLeft: i === 0 ? 0 : "-22%",
            }}
          />
        ))}
      </div>

      {/* giant ghost number, bottom-right */}
      <div
        className="absolute -bottom-6 right-2 font-black leading-none select-none pointer-events-none text-white/20"
        style={{ fontSize: "clamp(160px, 22vw, 300px)" }}
      >
        {number}
      </div>
    </div>
  );
};

/* ---------- Content ---------- */
const objectivesList = [
  { t: "Boost Discoverability with Video Optimization", d: "Appear in YouTube search & recommendations." },
  { t: "Maximize Reach through Targeted Audience Growth", d: "Attract the right audience organically." },
  { t: "Increase Engagement via Content Roadmapping", d: "Drive more likes, comments & shares." },
  { t: "Improve CTR with Metadata Optimization", d: "Create titles & thumbnails that get more clicks." },
  { t: "Extend Watch Time using SEO & Algorithm Strategy", d: "Keep viewers watching longer with optimized content." },
  { t: "Show Results Fast through Analytics & Growth Metrics", d: "Deliver measurable gains in 4–8 weeks." },
];

const scopeSlides = [
  { title: "Keyword Research & Strategy", items: [
    "Research region-based trending keywords in the client's niche (YouTube search + Google Trends + vidIQ / free TubeBuddy tools).",
    "Identify 5 long-tail, low-competition keywords to improve ranking chances.",
    "Create a video title formula for better CTR (click-through rate).",
  ]},
  { title: "Metadata Optimization", items: [
    "Title: Keyword-rich, click-worthy & under 60 characters.",
    "Description: SEO-friendly, first 150 characters keyword-focused + detailed outline with timestamps.",
    "Tags: Mix of main keywords, LSI (related) keywords, and branded tags.",
    "Thumbnail Strategy: Design or suggest CTR-optimized custom thumbnails.",
  ]},
  { title: "Engagement & Algorithm Boost", items: [
    "Add pinned comment with links & keywords to increase engagement.",
    "Suggest call-to-action hooks to improve likes, comments, and watch time.",
    "Add end screens & cards to improve session time.",
  ]},
  { title: "Channel Optimization", items: [
    "Audit the About section and rewrite for SEO.",
    "Optimize channel keywords & featured video.",
    "Add branded playlists for keyword targeting.",
  ]},
  { title: "Quick Off-Platform Boost", items: [
    "Free/Low-Cost Promotion",
    "Share videos in relevant UK/US Facebook groups, Reddit threads, and niche communities.",
    "Embed videos in a blog for extra traffic.",
    "Quora answers that link naturally to videos.",
  ]},
];

const deliverablesTimeline = {
  deliverables: [
    "Keyword Research Sheet",
    "Metadata for Videos",
    "3 Custom Thumbnails",
    "Channel Audit Report & Recommendations",
    "Quick Promotion Checklist",
  ],
  timeline: [
    "4–8 weeks",
    "Week 1–2: Keyword research & competitor analysis",
    "Week 3–5: Metadata & thumbnail optimisation",
    "Week 6–7: Channel audit & promotion strategy delivery",
  ],
};

const month1Items = [
  { icon: Search, t: "Keyword Research (US/blank/UK/Global focused)", d: "Identify 15–20 low-competition, trending keywords in the niche. Create a content keyword sheet with search volume & competition score." },
  { icon: Edit3, t: "Video Metadata Optimization", d: "Rewrite titles, descriptions, and tags for SEO. Add keyword-rich playlists for better internal linking." },
  { icon: CheckSquare, t: "Thumbnail Upgrade", d: "Design or suggest 3–4 CTR-friendly thumbnails for the highest-potential videos. Initial Off-Platform Push — share optimized videos in relevant groups, communities, and threads." },
  { icon: PieChart, t: "Channel Optimization", d: "Update channel description with keywords. Add channel tags, links, and branding." },
  { icon: Megaphone, t: "Initial Off-Platform Push", d: "Share optimized videos in relevant groups, communities, and threads." },
];

const month2Items = [
  { t: "Discover", d: "New Video Publishing — Script & title based on keyword research. Add strong hooks to retain viewers." },
  { t: "Plan", d: "Engagement Optimization — Add pinned comments to all videos with CTAs. Channel reputation management to boost engagement signals." },
  { t: "Act", d: "External Sharing Routine — Share videos to niche communities, relevant groups, and embed in blogs." },
  { t: "Reflect", d: "Internal Linking — Guide viewers to related videos. Establish keyword-based playlists." },
];

const month3Items = [
  { t: "Content Series Launch", d: "Publish a themed video series (3–4 parts) to encourage binge-watching." },
  { t: "Analytics Review & Optimization", d: "Analyse CTR, audience retention, and traffic sources in YouTube Analytics. Double down on formats & topics that perform best." },
  { t: "Final Optimization Sweep", d: "Update low-performing videos. Refresh old descriptions." },
];

/* Numbered pill */
const NumPill: React.FC<{ n: number; color: string; size?: number }> = ({ n, color, size = 40 }) => (
  <div
    className="rounded-full flex items-center justify-center text-white font-bold shadow-md shrink-0"
    style={{ background: color, width: size, height: size, fontSize: size * 0.42 }}
  >
    {n}
  </div>
);

export default function Roadmap() {
  const { slug } = useParams();
  const [rm, setRm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("roadmaps").select("*").eq("slug", slug).maybeSingle();
      if (!data) setNotFound(true); else setRm(data);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <LoadingSpinner />;
  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900">
      <div className="text-6xl mb-4">🎯</div>
      <h1 className="text-2xl font-bold mb-2">Roadmap not found</h1>
      <Link to="/" className="text-orange-600 underline mt-2">Go home</Link>
    </div>
  );

  const channelName = rm.channel_name || "Your Channel";
  const shades = ["#FBC375", "#F9A54A", "#F58432", "#EE6A25", "#E5591C", "#C64B18"];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SEOHead
        title={`${channelName} — YouTube Growth Roadmap by SwishView`}
        description={`Personalized 3-month YouTube SEO growth plan for ${channelName}.`}
      />
      <Navbar />

      <main className="pt-16">
        {/* ============ HERO / COVER ============ */}
        <Section className="relative overflow-hidden !py-10 md:!py-14">
          <div className="absolute top-0 right-0 w-[60%] h-full pointer-events-none" style={{
            background: "radial-gradient(ellipse 60% 90% at 100% 40%, rgba(249,115,22,0.35), rgba(251,191,36,0.2) 40%, transparent 70%)",
          }} />
          <div className="absolute top-0 left-0 w-[40%] h-full pointer-events-none" style={{
            background: "radial-gradient(ellipse 80% 100% at 0% 50%, rgba(253,224,175,0.4), transparent 70%)",
          }} />

          <Reveal>
            <div className="relative flex flex-col md:flex-row items-center gap-8 mb-16">
              {rm.channel_thumbnail ? (
                <img src={rm.channel_thumbnail} alt={channelName}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-4xl shadow-xl">
                  {channelName[0]}
                </div>
              )}
              <span className="text-gray-300 text-4xl font-light">×</span>
              <SwishViewLogo size="xl" />
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="relative text-5xl md:text-7xl font-black leading-[1.05] tracking-tight text-gray-900 max-w-5xl">
              YouTube SEO Growth Plan<br/>for <span className="text-orange-500">{channelName}</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="relative mt-6 text-gray-600 text-xl">by SwishView LLC</p>
          </Reveal>
          <Reveal delay={300}>
            <p className="relative mt-10 text-2xl md:text-3xl font-medium text-gray-800 italic">
              Get Seen. Get Loved. Get Growing.
            </p>
          </Reveal>
        </Section>



        {/* ============ TABLE OF CONTENTS ============ */}
        <Section className="bg-[#FBF7F1]">
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
              What we are going to discuss
            </h2>
          </Reveal>
          <div className="max-w-2xl mx-auto space-y-5">
            {["Objectives","Scope of Work","1st Month Plan","2nd Month Plan","3rd Month Plan","Deliverables & Reporting"].map((t, i) => (
              <Reveal key={t} delay={i * 80}>
                <div className="flex items-center gap-5 group">
                  <NumPill n={i + 1} color={shades[i]} size={48} />
                  <span className="text-xl md:text-2xl font-medium text-gray-800 group-hover:text-orange-500 transition-colors">
                    {i===2 ? <>1<sup>st</sup> Month Plan</> : i===3 ? <>2<sup>nd</sup> Month Plan</> : i===4 ? <>3<sup>rd</sup> Month Plan</> : t}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* ============ OBJECTIVES ============ */}
        <Section>
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
              Objectives of the 3-Month Growth Plan
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-[1fr_1.8fr] gap-12 md:gap-16 items-center">
            {/* Hex cluster */}
            <Reveal>
              <div className="relative w-full max-w-md mx-auto aspect-square">
                {[
                  { top: "0%", left: "25%", bg: "#FDE0B0", Icon: Search },
                  { top: "0%", left: "62%", bg: "#F9A54A", Icon: BadgeDollarSign },
                  { top: "33%", left: "6%",  bg: "#FBC375", Icon: Presentation },
                  { top: "33%", left: "81%", bg: "#EE6A25", Icon: Shuffle },
                  { top: "66%", left: "25%", bg: "#E5591C", Icon: DollarSign },
                  { top: "66%", left: "62%", bg: "#F58432", Icon: PieChart },
                ].map((h, i) => (
                  <div key={i} className="absolute w-[32%] aspect-square flex items-center justify-center hover:scale-110 transition-transform duration-300"
                    style={{ top: h.top, left: h.left, background: h.bg,
                      clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
                      animation: `float 3s ease-in-out ${i * 0.2}s infinite` }}>
                    <h.Icon className="w-1/2 h-1/2 text-white" strokeWidth={2} />
                  </div>
                ))}
                <style>{`@keyframes float { 0%,100% { transform: translateY(0)} 50% { transform: translateY(-6px) } }`}</style>
              </div>
            </Reveal>

            {/* List */}
            <div className="grid md:grid-cols-2 gap-x-10 gap-y-10">
              {objectivesList.map((o, i) => (
                <Reveal key={o.t} delay={i * 80}>
                  <div className="flex gap-4">
                    <NumPill n={i + 1} color={shades[i]} size={36} />
                    <div>
                      <div className="font-bold text-lg md:text-xl leading-tight text-gray-900">{o.t}</div>
                      <div className="text-sm md:text-base text-gray-600 mt-2">{o.d}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Section>

        {/* ============ SCOPE OF WORK (5 sections) ============ */}
        <Section className="bg-[#FBF7F1]">
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">Scope of Work</h2>
          </Reveal>
          <div className="space-y-8">
            {scopeSlides.map((s, idx) => (
              <Reveal key={s.title} delay={idx * 60}>
                <div className="relative w-full h-[360px] md:h-[420px] rounded-3xl overflow-hidden shadow-2xl">
                  <ArrowBars number={idx + 1} activeIndex={idx} />
                  <div className="relative h-full p-8 md:p-14 flex flex-col justify-center max-w-[65%]">
                    <h3 className="text-3xl md:text-4xl font-black text-white mb-6">{s.title}</h3>
                    <ul className="space-y-3 text-white text-base md:text-lg leading-relaxed font-medium">
                      {s.items.map((it) => (
                        <li key={it} className="flex gap-3">
                          <span className="text-white mt-1.5">•</span>
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}

            {/* Deliverables & Timeline card (6th) */}
            <Reveal delay={360}>
              <div className="relative w-full min-h-[420px] rounded-3xl overflow-hidden shadow-2xl">
                <ArrowBars number={6} activeIndex={5} />
                <div className="relative h-full p-8 md:p-14 flex flex-col justify-center ml-auto max-w-[70%]">
                  <h3 className="text-3xl md:text-4xl font-black text-gray-900 mb-8">Deliverables & Timeline</h3>
                  <div className="grid md:grid-cols-2 gap-8 text-gray-900">
                    <div>
                      <div className="font-bold text-lg mb-3">1. Deliverables</div>
                      <ul className="space-y-2 text-base font-medium">
                        {deliverablesTimeline.deliverables.map((d) => (
                          <li key={d} className="flex gap-2"><span>•</span><span>{d}</span></li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-bold text-lg mb-3">2. Timeline Total Duration:</div>
                      <ul className="space-y-2 text-base font-medium">
                        {deliverablesTimeline.timeline.map((d) => (
                          <li key={d} className="flex gap-2"><span>•</span><span>{d}</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* ============ 1st MONTH PLAN ============ */}
        <Section>
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">1st Month Plan</h2>
          </Reveal>
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-12 items-center max-w-6xl mx-auto">
            {/* Left col 1 & 3 */}
            <div className="space-y-14">
              {[month1Items[0], month1Items[2]].map((m, i) => (
                <Reveal key={m.t} delay={i * 100}>
                  <div className="md:text-right">
                    <div className="flex items-center md:justify-end gap-3 mb-2">
                      <div className="font-bold text-lg md:text-xl order-2 md:order-1">{m.t}</div>
                      <div className="order-1 md:order-2">
                        <NumPill n={i === 0 ? 1 : 3} color={i === 0 ? "#F9A54A" : "#E5591C"} size={32} />
                      </div>
                    </div>
                    <div className="text-sm md:text-base text-gray-600 leading-relaxed max-w-sm md:ml-auto">{m.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Center — 4 rings */}
            <Reveal>
              <div className="relative w-[280px] h-[280px] md:w-[340px] md:h-[340px]">
                {[
                  { top: 0, left: 0, ring: "#F9A54A", Icon: Search },
                  { top: 0, right: 0, ring: "#FBC375", Icon: BadgeDollarSign },
                  { bottom: 0, left: 0, ring: "#EE6A25", Icon: CheckSquare },
                  { bottom: 0, right: 0, ring: "#E5591C", Icon: PieChart },
                ].map((c: any, i) => (
                  <div key={i} className="absolute w-[55%] aspect-square rounded-full flex items-center justify-center"
                    style={{ ...c, border: `10px solid ${c.ring}`, background: "white",
                      animation: `float 3.4s ease-in-out ${i * 0.3}s infinite` }}>
                    <c.Icon className="w-10 h-10 md:w-12 md:h-12" style={{ color: c.ring }} strokeWidth={2} />
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Right col 2 & 4 */}
            <div className="space-y-14">
              {[month1Items[1], month1Items[3]].map((m, i) => (
                <Reveal key={m.t} delay={i * 100}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <NumPill n={i === 0 ? 2 : 4} color={i === 0 ? "#FBC375" : "#E5591C"} size={32} />
                      <div className="font-bold text-lg md:text-xl">{m.t}</div>
                    </div>
                    <div className="text-sm md:text-base text-gray-600 leading-relaxed max-w-sm">{m.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Item 5 centered */}
          <Reveal delay={200}>
            <div className="mt-16 max-w-2xl mx-auto text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <NumPill n={5} color="#EE6A25" size={32} />
                <div className="font-bold text-xl">{month1Items[4].t}</div>
              </div>
              <div className="text-base text-gray-600">{month1Items[4].d}</div>
            </div>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-10 mx-auto max-w-3xl text-center bg-green-50 border border-green-200 rounded-xl px-6 py-4 text-base text-gray-800">
              <span className="mr-2">✅</span>
              <strong>Expected Results by End of Month 1:</strong> Improved CTR from optimized titles/thumbnails. First signs of ranking movement in YouTube search.
            </div>
          </Reveal>
        </Section>

        {/* ============ 2nd MONTH PLAN ============ */}
        <Section className="bg-[#FBF7F1]">
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">2nd Month Plan</h2>
          </Reveal>

          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-10 md:gap-16 items-center max-w-6xl mx-auto">
            {/* Left — Discover (1), Reflect (4) */}
            <div className="space-y-16">
              {[{ item: month2Items[0], n: 1, color: "#EE6A25" }, { item: month2Items[3], n: 4, color: "#E5591C" }].map(({ item, n, color }) => (
                <Reveal key={item.t}>
                  <div className="md:text-right">
                    <div className="flex items-center md:justify-end gap-3 mb-2">
                      <div className="font-bold text-2xl md:text-3xl order-2 md:order-1">{item.t}</div>
                      <div className="order-1 md:order-2"><NumPill n={n} color={color} size={32} /></div>
                    </div>
                    <div className="text-sm md:text-base text-gray-600 leading-relaxed max-w-sm md:ml-auto">{item.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Center — 4 quadrant circle */}
            <Reveal>
              <div className="w-[260px] h-[260px] md:w-[320px] md:h-[320px] rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 shadow-2xl">
                <div className="bg-[#F58432] flex items-center justify-center"><Search className="w-14 h-14 text-white" /></div>
                <div className="bg-[#EE6A25] flex items-center justify-center"><Edit3 className="w-14 h-14 text-white" /></div>
                <div className="bg-[#E5591C] flex items-center justify-center"><Presentation className="w-14 h-14 text-white" /></div>
                <div className="bg-[#F9A54A] flex items-center justify-center"><Rocket className="w-14 h-14 text-white" /></div>
              </div>
            </Reveal>

            {/* Right — Plan (2), Act (3) */}
            <div className="space-y-16">
              {[{ item: month2Items[1], n: 2, color: "#EE6A25" }, { item: month2Items[2], n: 3, color: "#F9A54A" }].map(({ item, n, color }) => (
                <Reveal key={item.t}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <NumPill n={n} color={color} size={32} />
                      <div className="font-bold text-2xl md:text-3xl">{item.t}</div>
                    </div>
                    <div className="text-sm md:text-base text-gray-600 leading-relaxed max-w-sm">{item.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={200}>
            <div className="mt-14 mx-auto max-w-3xl text-center bg-green-50 border border-green-200 rounded-xl px-6 py-4 text-base text-gray-800">
              <span className="mr-2">✅</span>
              <strong>Expected Results by End of Month 2:</strong> Noticeable increase in watch time & engagement rate. More appearances in the "Suggested Videos" section.
            </div>
          </Reveal>
        </Section>

        {/* ============ 3rd MONTH PLAN ============ */}
        <Section>
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">3rd Month Plan</h2>
          </Reveal>

          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-10 md:gap-16 items-center max-w-6xl mx-auto">
            {/* Left — 3 items */}
            <div className="space-y-14">
              {month3Items.map((m, i) => (
                <Reveal key={m.t} delay={i * 100}>
                  <div className="md:text-right">
                    <div className="flex items-center md:justify-end gap-3 mb-2">
                      <div className="font-bold text-xl md:text-2xl order-2 md:order-1">{m.t}</div>
                      <div className="order-1 md:order-2">
                        <NumPill n={i + 1} color={["#FBC375","#F58432","#E5591C"][i]} size={32} />
                      </div>
                    </div>
                    <div className="text-sm md:text-base text-gray-600 leading-relaxed max-w-sm md:ml-auto">{m.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Center — vertical connected circles */}
            <Reveal>
              <div className="relative w-[140px] h-[420px]">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 140 420" fill="none" preserveAspectRatio="none">
                  <line x1="70" y1="100" x2="70" y2="150" stroke="#EE6A25" strokeWidth="2" strokeDasharray="4 6"/>
                  <line x1="70" y1="240" x2="70" y2="290" stroke="#EE6A25" strokeWidth="2" strokeDasharray="4 6"/>
                </svg>
                {[Search, Shuffle, PieChart].map((Icon, i) => (
                  <div key={i} className="absolute left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-[6px] border-[#EE6A25] bg-white flex items-center justify-center shadow-lg"
                    style={{ top: `${i * 150}px`, animation: `float 3s ease-in-out ${i * 0.3}s infinite` }}>
                    <Icon className="w-10 h-10 text-[#EE6A25]" strokeWidth={2} />
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Right — expected results */}
            <Reveal delay={300}>
              <div>
                <div className="font-bold text-2xl md:text-3xl mb-4">Expected Results by End of Month 3</div>
                <ul className="text-base md:text-lg text-gray-700 space-y-3 leading-relaxed">
                  <li className="flex gap-3"><span>•</span><span>Higher average view duration.</span></li>
                  <li className="flex gap-3"><span>•</span><span>Multiple videos ranking for target keywords in the US search.</span></li>
                  <li className="flex gap-3"><span>•</span><span>Consistent monthly organic growth of the channel.</span></li>
                </ul>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* ============ DELIVERABLES & REPORTING ============ */}
        <Section className="bg-[#FBF7F1]">
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">Deliverables & Reporting</h2>
          </Reveal>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { t:"Monthly Reporting", d:"Concise performance dashboards tracking key KPIs: views, watch-time, CTR, and engagement.", Icon: Megaphone },
              { t:"Growth Tracking", d:"Subscriber milestones, audience retention, and organic reach benchmarks monitored each month.", Icon: Hammer },
              { t:"Content Insights", d:"Detailed breakdown of high-performing videos, keyword impact, and optimization opportunities.", Icon: Shuffle },
              { t:"3-Month Growth Report", d:"Final milestone report with a scaling roadmap including SEO priorities, content strategy, and audience-building recommendations.", Icon: DollarSign },
            ].map((c, i) => (
              <Reveal key={c.t} delay={i * 100}>
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 h-full flex flex-col items-center text-center">
                  <div className="font-bold text-lg mb-3">{c.t}</div>
                  <div className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">{c.d}</div>
                  <div className="w-full h-px border-t-2 border-dashed border-[#EE6A25]/40 mb-5" />
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md`} style={{ background: ["#F9A54A","#EE6A25","#E5591C","#C64B18"][i] }}>0{i+1}</div>
                    <div className="relative bg-[#EE6A25] text-white text-xs font-bold px-4 py-1.5"
                      style={{ clipPath:"polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%)" }}>
                      Stage 0{i+1}
                    </div>
                  </div>
                  <c.Icon className="w-8 h-8 text-[#EE6A25]" />
                </div>
              </Reveal>
            ))}
          </div>
        </Section>


        {/* ============ CTA ============ */}
        <Section className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[45%] h-full pointer-events-none" style={{
            background: "radial-gradient(ellipse 60% 90% at 100% 50%, rgba(251,191,36,0.3), transparent 70%)",
          }} />
          <Reveal>
            <h2 className="relative text-3xl md:text-5xl font-black text-center mb-16 tracking-tight">
              LET'S GET YOUR YOUTUBE CHANNEL DISCOVERED!
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
            <Reveal>
              <div className="relative h-full min-h-[280px] bg-white rounded-2xl p-6 shadow-xl">
                <svg viewBox="0 0 400 240" className="w-full h-full">
                  <line x1="40" y1="20" x2="40" y2="210" stroke="#999" strokeWidth="1" />
                  <line x1="40" y1="210" x2="390" y2="210" stroke="#999" strokeWidth="1" />
                  {[100,90,80,70,60,50].map((v,i)=>(
                    <text key={v} x="10" y={30 + i*35} fontSize="10" fill="#666">{v}</text>
                  ))}
                  {["Month 0","Month 1","Month 2","Month 3"].map((m,i)=>(
                    <text key={m} x={60 + i*90} y="225" fontSize="10" fill="#666" textAnchor="middle">{m}</text>
                  ))}
                  <text x="60" y="237" fontSize="8" fill="#999" textAnchor="middle">(Before SEO)</text>
                  <polyline points="60,195 150,175 240,140 330,30" fill="none" stroke="#E5591C" strokeWidth="3" />
                  {["50 hrs","60 hrs","78 hrs","100 hrs"].map((v,i)=>{
                    const pts=[{x:60,y:195},{x:150,y:175},{x:240,y:140},{x:330,y:30}][i];
                    return (
                      <g key={v}>
                        <circle cx={pts.x} cy={pts.y} r="5" fill="#E5591C" />
                        <text x={pts.x+8} y={pts.y-8} fontSize="11" fontWeight="bold" fill="#E5591C">{v}</text>
                      </g>
                    );
                  })}
                  <text x="15" y="115" transform="rotate(-90 15 115)" fontSize="10" fill="#666">Watch Time (Hours)</text>
                </svg>
              </div>
            </Reveal>
<Reveal delay={150}>
              <div className="relative">
                <p className="text-lg text-gray-700 leading-relaxed mb-8">
                  With the right keywords, optimized content, and proven YouTube SEO strategies, your channel can attract the right audience without relying on ads.
                </p>

                <div className="relative flex items-center mb-8 z-10">
          <div className="w-24 h-24 md:w-28 md:h-28 shrink-0 z-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex flex-col items-center justify-center shadow-lg border-4 border-white">
            <Award className="w-8 h-8" />
            <div className="text-[9px] font-bold uppercase tracking-wide mt-0.5">Quality</div>
          </div>
                  <p
                    className="relative -ml-4 md:-ml-6 text-[#E67637] text-2xl md:text-4xl leading-[1.05] rotate-[-4deg]"
                    style={{ fontFamily: "'Sacramento', 'Amsterdam Three', cursive" }}
                  >
                    Don't just upload<br />videos make them<br />impossible to ignore
                  </p>
                </div>

                <Link to="/create-seo"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[#EE6A25] hover:bg-[#E5591C] text-white rounded-full font-bold text-base shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
                  Start Growing {channelName} <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </Reveal>
          </div>
        </Section>

   

        {/* ============ RESULTS ============ */}
        <Section className="relative overflow-hidden bg-white">
          <div className="absolute top-0 right-0 w-[45%] h-full pointer-events-none" style={{
            background: "radial-gradient(ellipse 55% 90% at 100% 50%, rgba(249,115,22,0.35), rgba(251,191,36,0.2) 40%, transparent 75%)",
          }} />
          <Reveal>
            <h2 className="relative text-5xl md:text-7xl font-black text-center mb-14 tracking-tight">Results</h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-10 max-w-4xl">
              <div className="text-xl font-bold text-gray-900 mb-4">Channel analytics</div>
              <div className="flex gap-6 border-b border-gray-200 mb-6 text-sm">
                <div className="pb-2 border-b-2 border-gray-900 font-semibold">Overview</div>
                <div className="pb-2 text-gray-500">Content</div>
                <div className="pb-2 text-gray-500">Audience</div>
                <div className="pb-2 text-gray-500">Trends</div>
              </div>
              <div className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
                Your channel got <span className="text-orange-500">98,913 views</span> in the last 28 days
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Views", value: "98.9K", sub: "42.3K more than usual" },
                  { label: "Watch time (hours)", value: "3.1K", sub: "605.2 more than usual" },
                  { label: "Subscribers", value: "+6.1k", sub: ">78% more than previous 28 days" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                    <div className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                      {s.value}
                      <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">↑</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 italic">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="relative mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-10 max-w-5xl ml-auto">
              <div className="flex items-start justify-between mb-4">
                <div className="text-lg font-bold text-gray-900">Channel analytics</div>
                <div className="text-xs bg-gray-100 rounded-full px-3 py-1 text-gray-700">Last 90 days</div>
              </div>
              <div className="flex gap-6 border-b border-gray-200 mb-6 text-sm">
                <div className="pb-2 text-gray-500">Overview</div>
                <div className="pb-2 text-gray-500">Content</div>
                <div className="pb-2 border-b-2 border-gray-900 font-semibold">Audience</div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                {[
                  { label: "Returning viewers", value: "291.3K" },
                  { label: "Unique viewers", value: "16.5M" },
                  { label: "Subscribers", value: "+6.4K" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-xs text-gray-500">{s.label}</div>
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                  </div>
                ))}
              </div>
              <svg viewBox="0 0 600 160" className="w-full h-32">
                <line x1="0" y1="140" x2="600" y2="140" stroke="#E5E7EB" />
                <polyline
                  points="0,120 60,115 120,125 180,90 240,70 300,95 360,45 420,80 480,35 540,90 600,130"
                  fill="none" stroke="#60A5FA" strokeWidth="2"
                />
                <polyline
                  points="0,135 60,132 120,134 180,128 240,125 300,130 360,120 420,128 480,118 540,132 600,138"
                  fill="none" stroke="#A78BFA" strokeWidth="2"
                />
              </svg>
              <div className="flex gap-4 text-xs text-gray-600 mt-2">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" />Returning viewers</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />New viewers</span>
              </div>
            </div>
          </Reveal>
        </Section>
      </main>

      {/* ============ GROWTH PLAN HERO — before footer ============ */}
      <section className="relative overflow-hidden bg-white px-4 md:px-8 py-20 md:py-24">
        <div className="absolute top-6 left-6 grid grid-cols-8 gap-1.5 opacity-60">
          {Array.from({ length: 40 }).map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-orange-300" />
          ))}
        </div>
        <div className="absolute bottom-6 right-6 grid grid-cols-10 gap-1.5 opacity-60">
          {Array.from({ length: 60 }).map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-orange-300" />
          ))}
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <h2 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight text-gray-900">
                YouTube Growth Plan<br />for{" "}
                <span className="text-orange-500 uppercase">{channelName}</span>
              </h2>
              <p className="mt-6 text-lg text-gray-600">
                Real Views. Real Growth. Tailored for Your Channel by
              </p>
              <div className="mt-6 flex items-center gap-4">
                <SwishViewLogo size="lg" />
                {rm.channel_thumbnail && (
                  <>
                    <span className="text-gray-400 text-2xl font-light">x</span>
                    <img src={rm.channel_thumbnail} alt={channelName}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg" />
                  </>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative w-full h-[340px] md:h-[420px]">
              <svg viewBox="0 0 600 400" className="absolute inset-0 w-full h-full">
                <defs>
                  <path id="rm-route-2" d="M 40 80 Q 200 40 300 130 T 560 220 Q 480 300 340 300 T 100 360" />
                </defs>
                <use href="#rm-route-2" fill="none" stroke="#E5E7EB" strokeWidth="34" strokeLinecap="round" />
                <use href="#rm-route-2" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="10 12" />
                <use href="#rm-route-2" fill="none" stroke="#F97316" strokeWidth="3" strokeDasharray="0 1000" strokeLinecap="round">
                  <animate attributeName="stroke-dasharray" from="0 1500" to="1500 0" dur="2.4s" fill="freeze" />
                </use>

                {[
                  { x: 300, y: 130, color: "#F97316", icon: "chart" },
                  { x: 560, y: 220, color: "#FBBF24", icon: "coin" },
                  { x: 340, y: 300, color: "#F97316", icon: "empty" },
                ].map((p, i) => (
                  <g key={i} style={{ animation: `float 3s ease-in-out ${i * 0.3}s infinite`, transformOrigin: `${p.x}px ${p.y}px` }}>
                    <path d={`M ${p.x} ${p.y - 34} C ${p.x - 26} ${p.y - 34} ${p.x - 26} ${p.y + 6} ${p.x} ${p.y + 26} C ${p.x + 26} ${p.y + 6} ${p.x + 26} ${p.y - 34} ${p.x} ${p.y - 34} Z`}
                      fill={p.color} stroke="#fff" strokeWidth="2" />
                    <circle cx={p.x} cy={p.y - 14} r="14" fill="#fff" />
                    {p.icon === "chart" && (
                      <g transform={`translate(${p.x - 8}, ${p.y - 22})`}>
                        <rect x="0" y="9" width="3.5" height="7" fill={p.color} />
                        <rect x="5" y="5" width="3.5" height="11" fill={p.color} />
                        <rect x="10" y="1" width="3.5" height="15" fill={p.color} />
                        <rect x="15" y="7" width="3.5" height="9" fill={p.color} />
                      </g>
                    )}
                    {p.icon === "coin" && (
                      <g transform={`translate(${p.x - 8}, ${p.y - 22})`}>
                        <circle cx="6" cy="10" r="6" fill={p.color} />
                        <circle cx="11" cy="6" r="5" fill={p.color} stroke="#fff" strokeWidth="1" />
                        <text x="11" y="9" fontSize="7" fontWeight="bold" fill="#fff" textAnchor="middle">$</text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}