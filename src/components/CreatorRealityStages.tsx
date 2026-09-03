import React, { useEffect, useRef, useState } from "react";

const REALITY = ["Planning", "Recording", "Editing", "Thumbnails"];
const STAGES = [
  "Great Video",
  "YouTube Understands It",
  "People Click",
  "People Watch",
  "Algorithm Recommends",
  "Growth",
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

const CreatorRealityStages: React.FC = () => {
  const { ref, visible } = useReveal();

  return (
    <section ref={ref} className="relative w-full bg-[#FBF7F1] py-20 sm:py-28">
      <div className="container mx-auto max-w-6xl px-4 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* LEFT — The Creator's Reality */}
          <div
            className={`transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-orange-600 mb-5">
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-[11px] flex items-center justify-center">
                2
              </span>
              THE CREATOR'S REALITY
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-gray-900">
              You spend hours creating.
              <br />
              Then… <span className="text-orange-500">silence.</span>
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {REALITY.map((r, i) => (
                <div
                  key={r}
                  className={`rounded-2xl bg-white border border-gray-200 shadow-sm px-5 py-4 text-center font-medium text-gray-800 hover:border-orange-400 hover:shadow-md transition-all duration-500`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  {r}
                </div>
              ))}
            </div>
            <p className="mt-8 italic text-gray-500 text-lg leading-relaxed border-l-2 border-orange-400/60 pl-4">
              "Was my content not good enough, or did the right audience never
              see it?"
            </p>
          </div>

          {/* RIGHT — Every Stage Matters */}
          <div
            className={`transition-all duration-700 delay-200 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-orange-600 mb-5">
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-[11px] flex items-center justify-center">
                3
              </span>
              THE FIX
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-gray-900">
              Every stage matters.
              <br />
              <span className="text-orange-500">We strengthen all of them.</span>
            </h2>

            <div className="mt-8 relative">
              <div className="absolute left-1/2 top-4 bottom-4 w-px bg-gradient-to-b from-orange-500 via-orange-400/60 to-transparent -translate-x-1/2" />
              <div className="space-y-3">
                {STAGES.map((s, i) => (
                  <div
                    key={s}
                    className={`relative mx-auto max-w-xs rounded-full bg-white border border-gray-200 shadow-sm py-3 px-6 text-center font-medium text-gray-800 hover:border-orange-400 hover:shadow-md transition-all duration-500 ${
                      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CreatorRealityStages;
