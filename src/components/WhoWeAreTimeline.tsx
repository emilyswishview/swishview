import React, { useEffect, useRef, useState } from "react";

const PILLARS = [
  {
    title: "Niche-specialist",
    body: "SEO & growth managers, assigned by category — music, gaming, education, faith, finance & more.",
  },
  {
    title: "Zero bots",
    body: "Every strategy is built for YouTube's real ranking signals — never artificial ones.",
  },
  {
    title: "Global",
    body: "A distributed team working across time zones, so your channel is never waiting.",
  },
];

const TIMELINE = [
  { year: "2016", title: "Individual Experts", body: "Working solo across SEO, brand, video." },
  { year: "2018", title: "Hundreds of Creators", body: "Across music, gaming, faith and finance." },
  { year: "2020", title: "Combined Experience", body: "The founders come together on one mission." },
  { year: "2022", title: "SwishView Founded", body: "A team built only for organic YouTube growth." },
  { year: "Today", title: "Helping Creators Worldwide", body: "Now a distributed niche-specialist team." },
];

const useReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
};

const WhoWeAreTimeline: React.FC = () => {
  const { ref, visible } = useReveal();

  return (
    <section
      ref={ref}
      className="relative w-full bg-[#0B0B0F] text-white py-20 sm:py-28 overflow-hidden"
    >
      <div className="pointer-events-none absolute -top-24 right-10 w-[360px] h-[360px] rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="container mx-auto max-w-6xl px-4 sm:px-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-orange-400 mb-6">
          <span className="w-2 h-2 rounded-full bg-orange-400" />
          WHO WE ARE
        </div>

        {/* Story */}
        <div className="grid lg:grid-cols-[1.15fr,1fr] gap-12 lg:gap-16 items-stretch">
          <div
            className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight max-w-xl">
              Two creators. One frustration that became a company.
            </h2>
            <div className="mt-8 space-y-5 text-gray-300 leading-relaxed max-w-xl">
              <p>
                Before SwishView existed, its founders were already inside the
                creator world — filming, editing, uploading. Not consultants
                looking in.{" "}
                <span className="text-white font-medium">
                  People who had hit "publish" and watched the view count sit
                  at zero.
                </span>
              </p>
              <p>
                They noticed the same thing happening around them: creators
                brilliant at making things, alone when it came to getting those
                things placed in front of the right eyes. Meanwhile the market
                that had grown up to "help" was full of resellers pushing bot
                traffic — screenshots that looked good, channel health quietly
                wrecked.
              </p>
              <p>
                That gap —{" "}
                <span className="text-white font-medium">
                  brilliant creators, no real growth partner
                </span>{" "}
                — became the mission. Not another views vendor. A team whose
                only job is helping YouTube itself understand, trust, and
                recommend a channel to the audience that actually wants it.
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div
            className={`relative transition-all duration-700 delay-200 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="h-full rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 sm:p-7 flex flex-col">
              <div className="text-xs font-semibold tracking-[0.22em] text-orange-400 mb-6">
                SWISHVIEW TIMELINE
              </div>
              <div className="relative pl-6">
                <div className="absolute left-[10px] top-2 bottom-2 w-px bg-gradient-to-b from-orange-500/60 via-orange-500/30 to-transparent" />
                {TIMELINE.map((t, i) => (
                  <div
                    key={t.title}
                    className={`relative pb-4 last:pb-0 transition-all duration-700 ${
                      visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"
                    }`}
                    style={{ transitionDelay: `${300 + i * 120}ms` }}
                  >
                    <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-500/20" />
                    <div className="text-xs text-orange-400/80 font-semibold tracking-wider">
                      {t.year}
                    </div>
                    <div className="text-white font-semibold mt-0.5 text-sm">
                      {t.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-snug">{t.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pillars — full width below for symmetry */}
        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          {PILLARS.map((p, i) => (
            <div
              key={p.title}
              className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${400 + i * 120}ms` }}
            >
              <h3 className="text-orange-400 font-semibold text-lg mb-2">
                {p.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhoWeAreTimeline;
